import JSZip from "jszip";
import {
  newDesign,
  newProject,
  normalizeStudioProject,
  projectAssetKeys,
  type StudioProject,
  type StudioImage,
} from "./types";
import { bundledTemplateForName } from "./templateBlueprints";
let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  return (database ||= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("background-studio", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("projects");
      request.result.createObjectStore("media");
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        database = undefined;
      };
      resolve(request.result);
    };
    request.onerror = () => {
      database = undefined;
      reject(request.error);
    };
    request.onblocked = () => {
      database = undefined;
      reject(
        new Error("Close other Background Removal tabs to update storage."),
      );
    };
  }));
}
async function transact<T>(
  store: "projects" | "media",
  key: string,
  value?: T,
): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      store,
      value === undefined ? "readonly" : "readwrite",
    );
    const request =
      value === undefined
        ? tx.objectStore(store).get(key)
        : tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve(value === undefined ? request.result : value);
    tx.onerror = tx.onabort = () =>
      reject(
        tx.error ||
          new Error(
            "Project storage failed. Save a project backup before closing.",
          ),
      );
  });
}
export const saveStudioProject = (project: StudioProject) =>
  transact("projects", "current", project);

function migrateBundledTemplates(project: StudioProject) {
  const remappedIds = new Map<string, string>();
  let changed = false;
  const migrate = (template: NonNullable<StudioProject["starterTemplate"]>) => {
    const source = bundledTemplateForName(template.name);
    if (!source) return template;
    if (template.id !== source.id) remappedIds.set(template.id, source.id);
    if (template.design.templateId && template.design.templateId !== source.id)
      remappedIds.set(template.design.templateId, source.id);
    if (
      template.id === source.id &&
      template.name === source.name &&
      template.design.templateId === source.id
    )
      return template;
    changed = true;
    return {
      ...template,
      id: source.id,
      name: source.name,
      design: { ...template.design, templateId: source.id },
    };
  };

  const templatesById = new Map<
    string,
    { template: StudioProject["templates"][number]; canonical: boolean }
  >();
  for (const template of project.templates) {
    const next = migrate(template);
    const existing = templatesById.get(next.id),
      canonical = template.id === next.id;
    if (!existing) templatesById.set(next.id, { template: next, canonical });
    else {
      changed = true;
      if (
        (canonical && !existing.canonical) ||
        (canonical &&
          existing.canonical &&
          (next.revision || 0) > (existing.template.revision || 0))
      )
        templatesById.set(next.id, { template: next, canonical });
    }
  }
  const templates = [...templatesById.values()].map(({ template }) => template);
  if (templates.length !== project.templates.length) changed = true;
  const starterTemplate = project.starterTemplate
    ? migrate(project.starterTemplate)
    : undefined;
  const images = project.images.map((image) => {
    const id = image.design.templateId;
    const nextId = id ? remappedIds.get(id) : undefined;
    if (!nextId) return image;
    changed = true;
    return {
      ...image,
      design: { ...image.design, templateId: nextId },
    };
  });

  return changed
    ? { ...project, templates, starterTemplate, images }
    : project;
}

export async function loadStudioProject() {
  const value = await transact("projects", "current");
  if (!value) return undefined;
  const normalized = normalizeStudioProject(value);
  const project = migrateBundledTemplates(normalized);
  if (project !== normalized) await saveStudioProject(project);
  return project;
}
export async function putStudioAsset(blob: Blob, key = crypto.randomUUID()) {
  await transact("media", key, blob);
  return key;
}
export async function studioAsset(key: string): Promise<Blob> {
  const blob = await transact("media", key);
  if (!(blob instanceof Blob))
    throw new Error(
      "An image or mask is missing from browser storage. Load its project backup or replace it.",
    );
  return blob;
}
export async function canvasBlob(
  canvas: HTMLCanvasElement,
  type = "image/png",
  quality = 0.92,
) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob && blob.type === type
          ? resolve(blob)
          : reject(
              new Error(
                "The browser could not encode the selected format. Try PNG or reduce the canvas size.",
              ),
            ),
      type,
      quality,
    ),
  );
}
export async function readStudioUpload(file: File): Promise<StudioImage> {
  if (!/^image\/(jpeg|png|webp|gif|bmp|avif)$/.test(file.type))
    throw new Error(`${file.name}: use JPG, PNG, WebP, GIF, BMP or AVIF.`);
  const bitmap = await createImageBitmap(file);
  try {
    if (
      bitmap.width > 16384 ||
      bitmap.height > 16384 ||
      bitmap.width * bitmap.height > 40000000
    )
      throw new Error(
        `${file.name}: this image exceeds the 40-megapixel / 16,384px browser limit.`,
      );
    const originalKey = await putStudioAsset(file);
    const thumbnail = document.createElement("canvas"),
      ratio = Math.min(1, 180 / Math.max(bitmap.width, bitmap.height));
    thumbnail.width = Math.max(1, Math.round(bitmap.width * ratio));
    thumbnail.height = Math.max(1, Math.round(bitmap.height * ratio));
    thumbnail
      .getContext("2d")!
      .drawImage(bitmap, 0, 0, thumbnail.width, thumbnail.height);
    return {
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type,
      width: bitmap.width,
      height: bitmap.height,
      originalKey,
      thumbnailKey: await putStudioAsset(
        await canvasBlob(thumbnail, "image/webp", 0.78),
      ),
      status: "pending",
      design: newDesign(bitmap.width, bitmap.height),
      strokes: [],
    };
  } finally {
    bitmap.close();
  }
}
export async function maskBlob(
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!,
    pixels = ctx.createImageData(width, height);
  for (let i = 0; i < alpha.length; i++)
    pixels.data.set([255, 255, 255, alpha[i]], i * 4);
  ctx.putImageData(pixels, 0, 0);
  return canvasBlob(canvas);
}
export async function* portableStudioParts(
  project: StudioProject,
  maxBytes = 150 * 1024 * 1024,
): AsyncGenerator<{ blob: Blob; index: number; total: number }> {
  const keys = projectAssetKeys(project),
    groups: string[][] = [[]];
  let bytes = 0;
  for (const key of keys) {
    const asset = await studioAsset(key);
    if (bytes && bytes + asset.size > maxBytes) {
      groups.push([]);
      bytes = 0;
    }
    groups.at(-1)!.push(key);
    bytes += asset.size;
  }
  const packId = crypto.randomUUID();
  for (let index = 0; index < groups.length; index++) {
    const zip = new JSZip();
    zip.file(
      "manifest.json",
      JSON.stringify({
        packId,
        part: index + 1,
        total: groups.length,
        project,
        assets: groups[index],
      }),
    );
    for (const key of groups[index])
      zip.file(`media/${key}`, await (await studioAsset(key)).arrayBuffer());
    yield {
      blob: await zip.generateAsync({ type: "blob", compression: "STORE" }),
      index: index + 1,
      total: groups.length,
    };
  }
}
export async function importStudioProject(
  files: File[],
): Promise<StudioProject> {
  if (files.length === 1 && files[0].name.toLowerCase().endsWith(".json"))
    return importLegacyProject(JSON.parse(await files[0].text()));
  let packId = "",
    total = 0,
    project: StudioProject | undefined,
    serialized = "";
  const parts = new Set<number>(),
    assets = new Set<string>(),
    manifests: { file: File; keys: string[] }[] = [];
  for (const file of files) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const raw = await zip.file("manifest.json")?.async("string");
    if (!raw) throw new Error("This ZIP is not a Background Studio project.");
    const manifest = JSON.parse(raw);
    if (
      typeof manifest.packId !== "string" ||
      !manifest.packId ||
      !Number.isInteger(manifest.part) ||
      !Number.isInteger(manifest.total) ||
      manifest.total < 1 ||
      manifest.part < 1 ||
      manifest.part > manifest.total ||
      !Array.isArray(manifest.assets)
    )
      throw new Error("Invalid project archive manifest.");
    if (packId && (packId !== manifest.packId || total !== manifest.total))
      throw new Error("Select parts from the same project backup.");
    if (parts.has(manifest.part))
      throw new Error("A project archive part was selected twice.");
    const signature = JSON.stringify(manifest.project);
    if (serialized && signature !== serialized)
      throw new Error(
        "Project parts contain different edits. Select parts from one backup.",
      );
    serialized = signature;
    packId = manifest.packId;
    total = manifest.total;
    parts.add(manifest.part);
    project ||= normalizeStudioProject(manifest.project);
    for (const key of manifest.assets) {
      if (typeof key !== "string" || !/^[\w-]{1,200}$/.test(key))
        throw new Error("Invalid media identifier in project archive.");
      const entry = zip.file(`media/${key}`);
      if (!entry) throw new Error("A media file is missing from this archive.");
      if (assets.has(key))
        throw new Error("Duplicate media in project backup parts.");
      assets.add(key);
    }
    manifests.push({ file, keys: manifest.assets });
  }
  if (!project || parts.size !== total)
    throw new Error(
      `Select all ${total || "required"} project ZIP parts before loading. The current project was not replaced.`,
    );
  for (const key of projectAssetKeys(project))
    if (!assets.has(key))
      throw new Error(
        "The backup is incomplete. The current project was not replaced.",
      );
  // New IDs avoid overwriting assets used by the currently open project.
  const remap = new Map<string, string>();
  // Extract one part at a time instead of retaining the entire project in RAM.
  for (const { file, keys } of manifests) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    for (const key of keys)
      remap.set(
        key,
        await putStudioAsset(await zip.file(`media/${key}`)!.async("blob")),
      );
  }
  const mapped = JSON.parse(
    JSON.stringify(project, (key, value) =>
      [
        "originalKey",
        "thumbnailKey",
        "maskKey",
        "assetKey",
        "previewKey",
        "maskAssetKey",
      ].includes(key) && typeof value === "string"
        ? remap.get(value) || value
        : value,
    ),
  );
  return normalizeStudioProject(mapped);
}
async function importLegacyProject(value: unknown): Promise<StudioProject> {
  const data = value as {
    type?: string;
    images?: {
      id?: string;
      fileName?: string;
      fileType?: string;
      originalUrl?: string;
      processedUrl?: string;
    }[];
    selectedImageId?: string;
    backgroundColor?: string;
  };
  if (data.type !== "background-removal" || !Array.isArray(data.images))
    throw new Error(
      "Choose a Background Removal JSON project or Studio ZIP backup.",
    );
  const project = newProject();
  project.workflow = "edit";
  for (const old of data.images) {
    if (
      typeof old.originalUrl !== "string" ||
      !/^data:image\/(png|jpeg|webp|gif|bmp|avif);base64,/.test(old.originalUrl)
    )
      throw new Error(
        "Legacy projects must contain embedded original images, not external URLs.",
      );
    const original = await (await fetch(old.originalUrl)).blob();
    const image = await readStudioUpload(
      new File([original], old.fileName || "image.png", {
        type: original.type,
      }),
    );
    if (old.processedUrl) {
      if (!/^data:image\/(png|jpeg|webp);base64,/.test(old.processedUrl))
        throw new Error("Invalid processed image in legacy project.");
      const bitmap = await createImageBitmap(
        await (await fetch(old.processedUrl)).blob(),
      );
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d")!;
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
      const pixels = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        ).data,
        alpha = new Uint8ClampedArray(canvas.width * canvas.height);
      for (let i = 0; i < alpha.length; i++) alpha[i] = pixels[i * 4 + 3];
      image.maskKey = await putStudioAsset(
        await maskBlob(alpha, canvas.width, canvas.height),
      );
      image.status = "ready";
    }
    if (data.backgroundColor && /^#[0-9a-f]{6}$/i.test(data.backgroundColor))
      image.design.background = {
        ...image.design.background,
        type: "solid",
        color: data.backgroundColor,
      };
    project.images.push(image);
    if (old.id === data.selectedImageId) project.activeId = image.id;
  }
  project.activeId ||= project.images[0]?.id || null;
  return normalizeStudioProject(project);
}
