// @vitest-environment node
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  applyDesign,
  fitSubject,
  maskBounds,
  morphology,
  outputName,
} from "./math";
import {
  newDesign,
  newProject,
  normalizeStudioProject,
  projectAssetKeys,
  type StudioImage,
} from "./types";
import { STUDIO_TEMPLATES, templateForImage } from "./templates";
import {
  importStudioProject,
  loadStudioProject,
  portableStudioParts,
  putStudioAsset,
  saveStudioProject,
  studioAsset,
} from "./storage";

const image = (id = "one"): StudioImage => ({
  id,
  name: "sample.jpg",
  type: "image/jpeg",
  width: 1600,
  height: 1200,
  originalKey: "original",
  thumbnailKey: "thumb",
  maskKey: "mask",
  status: "ready",
  design: newDesign(1600, 1200),
  strokes: [{ mode: "erase", size: 0.1, hardness: 1, points: [[0.2, 0.3]] }],
});

describe("Background Studio geometry and templates", () => {
  it("finds the foreground's normalized bounds, not the entire photo", () => {
    expect(maskBounds([0, 0, 0, 0, 255, 255, 0, 0, 0], 3, 3)).toEqual([
      1 / 3,
      1 / 3,
      2 / 3,
      1 / 3,
    ]);
    expect(maskBounds([0], 1, 1)).toEqual([0, 0, 1, 1]);
  });
  it("fits the detected subject inside a different canvas aspect ratio", () => {
    const subject = fitSubject(
      { width: 1600, height: 1200, maskBounds: [0.25, 0.1, 0.5, 0.8] },
      newDesign(1080, 1920),
    );
    expect(subject.width * 0.5).toBeCloseTo(0.8);
    expect(
      subject.y +
        ((subject.width * 1080 * 1200) / 1600 / 1920) * (0.1 + 0.4 - 0.5),
    ).toBeCloseTo(0.5);
  });
  it.each([1, 2, 4, -1, -2, -4])(
    "matches a brute-force edge filter with radius %s",
    (radius) => {
      const input = new Uint8ClampedArray(
        Array.from({ length: 35 }, (_, i) => (i * 71 + 13) % 256),
      );
      const expected = input.map((_, i) => {
        const values: number[] = [];
        for (
          let y = Math.max(0, Math.floor(i / 7) - Math.abs(radius));
          y <= Math.min(4, Math.floor(i / 7) + Math.abs(radius));
          y++
        )
          for (
            let x = Math.max(0, (i % 7) - Math.abs(radius));
            x <= Math.min(6, (i % 7) + Math.abs(radius));
            x++
          )
            values.push(input[y * 7 + x]);
        return radius > 0 ? Math.max(...values) : Math.min(...values);
      });
      expect(morphology(input, 7, 5, radius)).toEqual(expected);
    },
  );
  it("copies only chosen properties without changing masks, corrections or manual placement", () => {
    const target = image(),
      source = newDesign();
    source.background.color = "#ff0000";
    source.subject.x = 0.8;
    const result = applyDesign(target, source, ["background", "outline"]);
    expect(result.design.background.color).toBe("#ff0000");
    expect(result.design.subject).toEqual(target.design.subject);
    expect(result.strokes).toBe(target.strokes);
    expect(result.maskKey).toBe(target.maskKey);
    expect(result.design.width).toBe(1600);
    expect(target.design.background.color).toBe("#ffffff");
  });
  it("copies placement only when explicitly requested", () => {
    const source = newDesign();
    source.subject.x = 0.8;
    expect(applyDesign(image(), source, ["placement"]).design.subject.x).toBe(
      0.8,
    );
  });
  it("fits a cutout inside the imported template's photo area, not over its caption", () => {
    const design = newDesign(1080, 1350);
    design.photoArea = { x: 0, y: 0, width: 1, height: 0.76 };
    const subject = fitSubject(
      { width: 1000, height: 1600, maskBounds: [0.1, 0.1, 0.7, 0.8] },
      design,
    );
    const renderedHeight =
      (subject.width * design.width * 1600) / 1000 / design.height;
    expect(subject.y + (0.1 + 0.4 - 0.5) * renderedHeight).toBeCloseTo(0.38);
    expect(renderedHeight * 0.8).toBeLessThanOrEqual(0.76 * 0.85 + 0.00001);
  });
  it("provides 20 editable validated templates and retains manual edits by default", () => {
    expect(STUDIO_TEMPLATES).toHaveLength(20);
    expect(new Set(STUDIO_TEMPLATES.map((t) => t.id)).size).toBe(20);
    for (const template of STUDIO_TEMPLATES) {
      const p = newProject();
      p.templates = [template];
      expect(() => normalizeStudioProject(p)).not.toThrow();
    }
    const design = newDesign();
    design.subject = { ...design.subject, x: 0.2, manual: true };
    expect(templateForImage(STUDIO_TEMPLATES[0], design, false).subject.x).toBe(
      0.2,
    );
    expect(
      templateForImage(STUDIO_TEMPLATES[0], design, true).subject.x,
    ).not.toBe(0.2);
  });
  it("makes safe predictable filenames", () => {
    expect(outputName("{n}-{name}", { name: "a/b.jpg" }, 4, "jpg")).toBe(
      "005-a_b.jpg",
    );
    expect(outputName("CON", image(), 0, "png")).toBe("_CON.png");
    expect(outputName("...", image(), 0, "png")).toBe("image.png");
  });
  it("recovers interrupted processing without losing completed masks", () => {
    const p = newProject();
    p.images = [
      { ...image(), status: "processing" },
      { ...image("two"), maskKey: undefined, status: "processing" },
    ];
    p.activeId = "missing";
    const restored = normalizeStudioProject(p);
    expect(restored.images.map((i) => i.status)).toEqual(["ready", "pending"]);
    expect(restored.activeId).toBe("one");
  });
  it("rejects duplicate IDs and unsafe output dimensions", () => {
    const p = newProject();
    p.images = [image(), image()];
    expect(() => normalizeStudioProject(p)).toThrow(/duplicate/);
    p.images = [image()];
    p.images[0].design.width = 16000;
    p.images[0].design.height = 16000;
    expect(() => normalizeStudioProject(p)).toThrow(/megapixel/);
  });
});

describe("Background Studio durable and portable storage", () => {
  async function savedProject() {
    const p = newProject(),
      i = image();
    i.originalKey = await putStudioAsset(new Blob(["original"]));
    i.thumbnailKey = await putStudioAsset(new Blob(["thumb"]));
    i.maskKey = await putStudioAsset(new Blob(["mask"]));
    i.design.background.assetKey = await putStudioAsset(
      new Blob(["background"]),
    );
    i.design.background.type = "image";
    p.images = [i];
    p.activeId = i.id;
    return p;
  }
  it("commits originals, masks, strokes and placement before reporting save success", async () => {
    const p = await savedProject();
    p.images[0].design.subject.x = 0.37;
    await saveStudioProject(p);
    const restored = await loadStudioProject();
    expect(restored).toEqual(p);
    expect(await (await studioAsset(p.images[0].originalKey)).text()).toBe(
      "original",
    );
  });
  it("promotes locally imported bundled templates without losing project edits", async () => {
    const p = await savedProject();
    const localId = "locally-imported-brokenwood";
    const template = {
      id: localId,
      name: "THE BROKENWOOD MYSTERIES RETURNS WITH SIX BIZARRE MURDERS AND UNEXPECTED TWISTS IN RURAL NEW ZEALAND",
      category: "Imported" as const,
      design: newDesign(1080, 1350),
      outlinedText: true,
    };
    template.design.templateId = localId;
    const canonical = {
      ...structuredClone(template),
      id: "brokenwood-mysteries",
      revision: 1,
    };
    canonical.design.templateId = canonical.id;
    p.templates = [template, canonical];
    p.starterTemplate = structuredClone(template);
    p.images[0].design.templateId = localId;
    await saveStudioProject(p);

    const restored = await loadStudioProject();
    expect(restored?.templates).toHaveLength(1);
    expect(restored?.templates[0]).toMatchObject({
      id: "brokenwood-mysteries",
      name: template.name,
      outlinedText: true,
    });
    expect(restored?.templates[0].revision).toBe(1);
    expect(restored?.starterTemplate?.id).toBe("brokenwood-mysteries");
    expect(restored?.images[0].design.templateId).toBe("brokenwood-mysteries");
    expect(restored?.images[0].originalKey).toBe(p.images[0].originalKey);
  });
  it("promotes a locally imported Classic Memories template on project load", async () => {
    const p = await savedProject();
    const local = {
      id: "locally-imported-classic-memories",
      name: "CLASSIC MEMORIES",
      category: "Imported" as const,
      design: newDesign(1080, 1350),
      outlinedText: true,
    };
    local.design.templateId = local.id;
    p.templates = [local];
    p.starterTemplate = structuredClone(local);
    p.images[0].design.templateId = local.id;
    await saveStudioProject(p);

    const restored = await loadStudioProject();
    expect(restored?.templates).toHaveLength(1);
    expect(restored?.templates[0]).toMatchObject({
      id: "classic-memories",
      name: "Classic Memories",
    });
    expect(restored?.starterTemplate?.id).toBe("classic-memories");
    expect(restored?.images[0].design.templateId).toBe("classic-memories");
  });
  it("roundtrips multipart archives, remapping assets without replacing originals", async () => {
    const p = await savedProject();
    const files: File[] = [];
    for await (const part of portableStudioParts(p, 9))
      files.push(new File([part.blob], `part-${part.index}.zip`));
    expect(files.length).toBeGreaterThan(1);
    const restored = await importStudioProject(files.reverse());
    expect(restored.images[0].design).toEqual({
      ...p.images[0].design,
      background: {
        ...p.images[0].design.background,
        assetKey: restored.images[0].design.background.assetKey,
      },
    });
    expect(restored.images[0].strokes).toEqual(p.images[0].strokes);
    expect(restored.images[0].originalKey).not.toBe(p.images[0].originalKey);
    expect(await (await studioAsset(restored.images[0].maskKey!)).text()).toBe(
      "mask",
    );
    expect(projectAssetKeys(restored)).toHaveLength(4);
    expect(await (await studioAsset(p.images[0].originalKey)).text()).toBe(
      "original",
    );
  });
  it("rejects missing ZIP parts and preserves the current save", async () => {
    const p = await savedProject();
    await saveStudioProject(p);
    const files: File[] = [];
    for await (const part of portableStudioParts(p, 9))
      files.push(new File([part.blob], `${part.index}.zip`));
    await expect(importStudioProject(files.slice(0, 1))).rejects.toThrow(/all/);
    expect((await loadStudioProject())?.id).toBe(p.id);
  });
  it("preserves original mode, embedded fonts, template sample media and rich text in portable backups", async () => {
    const p = await savedProject();
    p.images[0].useOriginal = true;
    const layer = structuredClone(
      STUDIO_TEMPLATES.find((template) =>
        template.design.overlays.some((layer) => layer.type === "text"),
      )!.design.overlays.find((layer) => layer.type === "text")!,
    );
    layer.templateCode = "portable-text";
    layer.font = "Custom Font";
    layer.textStyle = {
      shadow: true,
      wordStylesEnabled: true,
      wordStyles: [{ wordIndex: 0, color: "#ff0000" }],
    };
    p.images[0].design.overlays = [layer];
    p.fonts = [
      {
        family: "Custom Font",
        assetKey: await putStudioAsset(new Blob(["font-file"])),
      },
    ];
    p.starterTemplate = {
      id: "sample",
      name: "Sample",
      category: "Imported",
      design: newDesign(),
      sampleImage: {
        assetKey: await putStudioAsset(new Blob(["sample-photo"])),
        width: 100,
        height: 100,
        type: "image/png",
        name: "sample.png",
      },
    };
    const files: File[] = [];
    for await (const part of portableStudioParts(p, 20))
      files.push(new File([part.blob], `${part.index}.zip`));
    const restored = await importStudioProject(files);
    expect(restored.images[0].useOriginal).toBe(true);
    expect(restored.images[0].design.overlays).toEqual([layer]);
    expect(await (await studioAsset(restored.fonts![0].assetKey)).text()).toBe(
      "font-file",
    );
    expect(
      await (
        await studioAsset(restored.starterTemplate!.sampleImage!.assetKey)
      ).text(),
    ).toBe("sample-photo");
  });
  it("backs up the starter template, vector artwork, preview and inset masks even before upload", async () => {
    const p = newProject(),
      design = newDesign(1080, 1350);
    const background = await putStudioAsset(
      new Blob(['<svg xmlns="http://www.w3.org/2000/svg"/>'], {
        type: "image/svg+xml",
      }),
    );
    const artwork = await putStudioAsset(new Blob(["artwork"]));
    const preview = await putStudioAsset(new Blob(["preview"]));
    const insetMask = await putStudioAsset(new Blob(["inset-mask"]));
    design.background = {
      ...design.background,
      type: "image",
      assetKey: background,
    };
    design.photoArea = { x: 0, y: 0, width: 1, height: 0.8 };
    design.overlays = [
      {
        ...STUDIO_TEMPLATES[0].design.overlays[0],
        type: "logo",
        assetKey: artwork,
        maskAssetKey: insetMask,
        name: "Template inset photo",
      },
    ];
    p.starterTemplate = {
      id: "imported",
      name: "Canva template",
      category: "Imported",
      design,
      previewKey: preview,
      outlinedText: true,
    };
    p.templates = [p.starterTemplate];
    p.workflow = "upload";
    expect(projectAssetKeys(p)).toHaveLength(4);
    const files: File[] = [];
    for await (const part of portableStudioParts(p, 20))
      files.push(new File([part.blob], `${part.index}.zip`));
    const restored = await importStudioProject(files);
    expect(restored.workflow).toBe("upload");
    expect(restored.starterTemplate?.outlinedText).toBe(true);
    expect(restored.starterTemplate?.design.photoArea).toEqual(
      design.photoArea,
    );
    const keys = projectAssetKeys(restored);
    expect(keys).toHaveLength(4);
    expect(keys.every((key) => !projectAssetKeys(p).includes(key))).toBe(true);
    expect(
      await (await studioAsset(restored.starterTemplate!.previewKey!)).text(),
    ).toBe("preview");
    expect(
      await (
        await studioAsset(
          restored.starterTemplate!.design.overlays[0].maskAssetKey!,
        )
      ).text(),
    ).toBe("inset-mask");
  });
  it("rejects mixed edits and missing media", async () => {
    const p = await savedProject(),
      zip = new JSZip();
    zip.file(
      "manifest.json",
      JSON.stringify({
        packId: "x",
        part: 1,
        total: 1,
        project: p,
        assets: [],
      }),
    );
    await expect(
      importStudioProject([
        new File([await zip.generateAsync({ type: "arraybuffer" })], "bad.zip"),
      ]),
    ).rejects.toThrow(/incomplete/);
  });
  it("reports missing assets without fetching arbitrary external URLs", async () => {
    await expect(studioAsset("https://example.com/image.jpg")).rejects.toThrow(
      /missing/,
    );
  });
  it("does not accept external original image URLs in legacy files", async () => {
    const file = new File(
      [
        JSON.stringify({
          type: "background-removal",
          images: [{ originalUrl: "https://example.com/private" }],
        }),
      ],
      "legacy.json",
    );
    await expect(importStudioProject([file])).rejects.toThrow(/embedded/);
  });
});
