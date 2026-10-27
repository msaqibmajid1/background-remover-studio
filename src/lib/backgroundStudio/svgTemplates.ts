import JSZip, { type JSZipObject } from "jszip";
import { canvasBlob, putStudioAsset } from "./storage";
import { newDesign, type StudioOverlay, type StudioTemplate } from "./types";
import { textLayer } from "./templates";
import { CINEMA_TEMPLATES, type TemplateSource } from "./templateBlueprints";
import { ensureStudioFont } from "./fonts";
export { CINEMA_TEMPLATES } from "./templateBlueprints";

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const MAX_SVG_BYTES = 20 * 1024 * 1024;
const MAX_PACK_BYTES = 100 * 1024 * 1024;
const definitions = new Set([
  "defs",
  "clipPath",
  "mask",
  "filter",
  "linearGradient",
  "radialGradient",
  "pattern",
  "marker",
]);
const graphics = new Set([
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polygon",
  "polyline",
  "image",
  "text",
  "use",
]);
const tags = new Set([
  ...definitions,
  ...graphics,
  "svg",
  "g",
  "tspan",
  "stop",
  "feColorMatrix",
  "feGaussianBlur",
  "feBlend",
  "feComposite",
  "feOffset",
  "feMerge",
  "feMergeNode",
  "feFlood",
  "feComponentTransfer",
  "feFuncR",
  "feFuncG",
  "feFuncB",
  "feFuncA",
]);
const attributes = new Set(
  "id x y x1 y1 x2 y2 cx cy r rx ry width height viewBox preserveAspectRatio transform d points fill fill-opacity fill-rule opacity stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset clip-path clip-rule clipPathUnits mask maskUnits maskContentUnits filter filterUnits primitiveUnits color-interpolation-filters gradientTransform gradientUnits spreadMethod offset stop-color stop-opacity patternTransform patternUnits patternContentUnits markerWidth markerHeight refX refY orient markerUnits marker-start marker-mid marker-end font-family font-size font-weight text-anchor dominant-baseline dx dy values type in in2 result stdDeviation mode operator k1 k2 k3 k4 flood-color flood-opacity slope intercept amplitude exponent tableValues".split(
    " ",
  ),
);
const reference = /^url\(#[\w:.-]+\)$/;
const localHref = /^#[\w:.-]+$/;
const embeddedImage =
  /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/;

// Imported SVGs are data, never executable markup. Reject active/external content.
export function sanitizeTemplateSvg(source: string): SVGSVGElement {
  if (new TextEncoder().encode(source).length > MAX_SVG_BYTES)
    throw new Error("Each SVG must be smaller than 20 MB.");
  if (/<!DOCTYPE|<!ENTITY/i.test(source))
    throw new Error("SVG document types and entities are not supported.");
  const document = new DOMParser().parseFromString(source, "image/svg+xml");
  const root = document.documentElement;
  if (
    root.localName !== "svg" ||
    root.namespaceURI !== SVG_NS ||
    document.querySelector("parsererror")
  )
    throw new Error("This is not a valid SVG template.");
  const nodes = [root, ...Array.from(root.querySelectorAll("*"))];
  if (nodes.length > 20000)
    throw new Error("The SVG has too many elements. Export a simpler design.");
  for (const node of nodes) {
    if (!tags.has(node.localName) || node.namespaceURI !== SVG_NS) {
      if (
        [
          "script",
          "foreignObject",
          "style",
          "animate",
          "animateTransform",
          "set",
        ].includes(node.localName)
      )
        throw new Error(
          "Active SVG content is not supported. Export a static design.",
        );
      node.remove();
      continue;
    }
    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.localName,
        value = attribute.value.trim();
      if (
        name === "xmlns" ||
        attribute.namespaceURI === "http://www.w3.org/2000/xmlns/"
      )
        continue;
      if (/^on/i.test(name) || name === "style")
        throw new Error(
          "SVG scripts and inline styles are not supported. Export a static SVG.",
        );
      if (name === "href") {
        if (attribute.namespaceURI && attribute.namespaceURI !== XLINK_NS)
          throw new Error("Unsupported SVG reference.");
        if (
          !(
            localHref.test(value) ||
            (node.localName === "image" && embeddedImage.test(value))
          )
        )
          throw new Error(
            "The SVG uses an external asset. Embed the images before importing.",
          );
      } else if (!attributes.has(name)) node.removeAttributeNode(attribute);
      else if (
        (/url\s*\(/i.test(value) && !reference.test(value)) ||
        /(?:javascript:|https?:|@import)/i.test(value)
      )
        throw new Error("External SVG references are not supported.");
    }
  }
  const viewBox = root
    .getAttribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  const width =
    Number.parseFloat(root.getAttribute("width") || "") || viewBox?.[2];
  const height =
    Number.parseFloat(root.getAttribute("height") || "") || viewBox?.[3];
  if (
    !width ||
    !height ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width > 16384 ||
    height > 16384 ||
    width * height > 40000000 ||
    width < 1 ||
    height < 1
  )
    throw new Error(
      "The SVG must have valid dimensions within the 40-megapixel canvas limit.",
    );
  if (
    viewBox &&
    (viewBox.length !== 4 ||
      viewBox.some((v) => !Number.isFinite(v)) ||
      viewBox[2] <= 0 ||
      viewBox[3] <= 0)
  )
    throw new Error("The SVG viewBox is invalid.");
  root.setAttribute("width", String(Math.round(width)));
  root.setAttribute("height", String(Math.round(height)));
  return root as unknown as SVGSVGElement;
}

function isDefinition(node: Element, root: Element) {
  let parent: Element | null = node;
  while (parent && parent !== root) {
    if (definitions.has(parent.localName)) return true;
    parent = parent.parentElement;
  }
  return false;
}
function paintNodes(root: SVGSVGElement) {
  return Array.from(root.querySelectorAll("*")).filter(
    (node) =>
      graphics.has(node.localName) &&
      !isDefinition(node, root) &&
      !node.closest("text")?.contains(node.parentElement),
  );
}
export function splitTemplateSvg(
  root: SVGSVGElement,
  main: Element | undefined,
  separate: Element[] = [],
) {
  const paint = paintNodes(root),
    index = main ? paint.indexOf(main) : -1;
  const split = (above: boolean) => {
    const clone = root.cloneNode(true) as SVGSVGElement;
    const clonedPaint = paintNodes(clone);
    for (let i = clonedPaint.length - 1; i >= 0; i--) {
      if (
        separate.includes(paint[i]) ||
        (index < 0 ? !above : above ? i <= index : i >= index)
      )
        clonedPaint[i].remove();
    }
    return new XMLSerializer().serializeToString(clone);
  };
  return {
    below: split(false),
    above: split(true),
    hasBelow: index > 0,
    hasAbove: index < 0 || index < paint.length - 1,
  };
}

function definitionSignature(root: SVGSVGElement): string {
  const node = (element: Element): unknown => [
    element.localName,
    Array.from(element.attributes)
      .filter(
        (attribute) =>
          attribute.namespaceURI !== "http://www.w3.org/2000/xmlns/",
      )
      .map((attribute) => [
        attribute.namespaceURI || "",
        attribute.localName,
        attribute.value,
      ])
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    Array.from(element.children).map(node),
  ];
  return JSON.stringify(Array.from(root.querySelectorAll("defs")).map(node));
}

export async function findBundledTemplateArtwork(
  artwork: string,
  preferredName = "",
) {
  const signature = definitionSignature(sanitizeTemplateSvg(artwork));
  if (signature === "[]")
    throw new Error(
      "This artwork has no original template definitions. Import the editable source template instead.",
    );
  const sources = [...CINEMA_TEMPLATES].sort(
    (a, b) =>
      Number(b.name === preferredName || b.file === preferredName) -
      Number(a.name === preferredName || a.file === preferredName),
  );
  for (const source of sources) {
    const response = await fetch(
      `/background-studio/cinema/${source.file}.svg`,
    );
    if (!response.ok)
      throw new Error(`Template download failed (${response.status}).`);
    const text = await response.text();
    if (definitionSignature(sanitizeTemplateSvg(text)) === signature)
      return { source, text };
  }
  throw new Error(
    "This is not one of the supplied editable templates. Its outlined lettering has been preserved; import editable text or add a text layer.",
  );
}
export type TemplatePhotoBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};
type Box = TemplatePhotoBox;

export function chooseAutomaticPhotoIndex(
  boxes: readonly TemplatePhotoBox[],
  width: number,
  height: number,
) {
  const candidates = boxes
    .map((box, index) => ({
      box,
      index,
      area: (box.width * box.height) / (width * height),
    }))
    .filter(
      ({ box, area }) =>
        area > 0.08 && box.width > width * 0.15 && box.height > height * 0.2,
    );
  if (!candidates.length) return undefined;
  if (candidates.length === 1) return candidates[0].index;

  const framed = candidates.filter(
    ({ box, area }) =>
      area < 0.9 &&
      box.width < width * 0.92 &&
      box.height < height * 0.96,
  );
  const pool = framed.length ? framed : candidates;
  return pool.reduce((best, candidate) => {
    const score = ({ box, area }: (typeof pool)[number]) => {
      const aspect = box.width / box.height;
      const centreX = (box.x + box.width / 2) / width;
      const centreY = (box.y + box.height / 2) / height;
      return (
        area * 5 +
        Math.min(aspect, 1 / aspect) * 1.25 +
        (box.height >= box.width ? 0.6 : 0) -
        Math.abs(centreX - 0.5) * 1.5 -
        Math.abs(centreY - 0.5) * 0.5
      );
    };
    return score(candidate) > score(best) ? candidate : best;
  }).index;
}

function ancestorHasAttribute(node: Element, attribute: "clip-path" | "mask") {
  let current: Element | null = node.parentElement;
  while (current) {
    if (current.hasAttribute(attribute)) return true;
    current = current.parentElement;
  }
  return false;
}

function isEditableSecondaryPhoto(
  node: Element,
  box: Box,
  width: number,
  height: number,
) {
  const area = (box.width * box.height) / (width * height);
  const inset = box.width < width * 0.9 && box.height < height * 0.9;
  const clipped = ancestorHasAttribute(node, "clip-path");
  const masked = ancestorHasAttribute(node, "mask");
  return area > 0.04 && area < 0.7 && inset && (clipped || !masked);
}

function transformedBox(node: SVGGraphicsElement): Box {
  const box = node.getBBox(),
    matrix = node.getCTM();
  if (!matrix) throw new Error("The SVG image area could not be measured.");
  const points = [
    [box.x, box.y],
    [box.x + box.width, box.y],
    [box.x, box.y + box.height],
    [box.x + box.width, box.y + box.height],
  ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
  const x = Math.min(...points.map((p) => p.x)),
    y = Math.min(...points.map((p) => p.y));
  return {
    x,
    y,
    width: Math.max(...points.map((p) => p.x)) - x,
    height: Math.max(...points.map((p) => p.y)) - y,
  };
}
function intersection(a: Box, b: Box): Box {
  const x = Math.max(a.x, b.x),
    y = Math.max(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(0, Math.min(a.x + a.width, b.x + b.width) - x),
    height: Math.max(0, Math.min(a.y + a.height, b.y + b.height) - y),
  };
}
function clipBounds(clip: Element, root: SVGSVGElement) {
  const measurement = document.createElementNS(SVG_NS, "g");
  const content = document.createElementNS(SVG_NS, "g");
  if (clip.hasAttribute("transform"))
    content.setAttribute("transform", clip.getAttribute("transform")!);
  for (const child of Array.from(clip.childNodes))
    content.appendChild(child.cloneNode(true));
  measurement.appendChild(content);
  root.appendChild(measurement);
  try {
    return measurement.getBBox();
  } finally {
    measurement.remove();
  }
}
function photoBox(node: SVGGraphicsElement, root: SVGSVGElement): Box {
  let box = intersection(transformedBox(node), {
    x: 0,
    y: 0,
    width: Number(root.getAttribute("width")),
    height: Number(root.getAttribute("height")),
  });
  let parent: Element | null = node;
  while (parent && parent !== root) {
    const clipId = parent
      .getAttribute("clip-path")
      ?.match(/^url\(#([\w:.-]+)\)$/)?.[1];
    const clip = clipId
      ? (root.getElementById(clipId) as SVGGraphicsElement | null)
      : null;
    const matrix = (parent as SVGGraphicsElement).getCTM?.();
    if (
      clip &&
      matrix &&
      clip.getAttribute("clipPathUnits") !== "objectBoundingBox"
    ) {
      const bounds = clipBounds(clip, root);
      const points = [
        [bounds.x, bounds.y],
        [bounds.x + bounds.width, bounds.y],
        [bounds.x, bounds.y + bounds.height],
        [bounds.x + bounds.width, bounds.y + bounds.height],
      ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
      const x = Math.min(...points.map((point) => point.x)),
        y = Math.min(...points.map((point) => point.y));
      box = intersection(box, {
        x,
        y,
        width: Math.max(...points.map((point) => point.x)) - x,
        height: Math.max(...points.map((point) => point.y)) - y,
      });
    }
    parent = parent.parentElement;
  }
  return box;
}

export async function svgToBitmap(
  blob: Blob,
  renderEdge = 0,
): Promise<ImageBitmap> {
  if (renderEdge) {
    const root = sanitizeTemplateSvg(await blob.text());
    const width = Number(root.getAttribute("width")),
      height = Number(root.getAttribute("height"));
    const ratio = Math.min(
      renderEdge / Math.max(width, height),
      16384 / Math.max(width, height),
      Math.sqrt(40000000 / (width * height)),
    );
    if (!root.hasAttribute("viewBox"))
      root.setAttribute("viewBox", `0 0 ${width} ${height}`);
    root.setAttribute("width", String(Math.max(1, Math.floor(width * ratio))));
    root.setAttribute(
      "height",
      String(Math.max(1, Math.floor(height * ratio))),
    );
    blob = new Blob([new XMLSerializer().serializeToString(root)], {
      type: "image/svg+xml",
    });
  }
  const url = URL.createObjectURL(blob),
    image = new Image();
  try {
    image.src = url;
    await image.decode();
    return await createImageBitmap(image);
  } finally {
    URL.revokeObjectURL(url);
  }
}
async function previewBlob(root: SVGSVGElement) {
  const bitmap = await svgToBitmap(
    new Blob([new XMLSerializer().serializeToString(root)], {
      type: "image/svg+xml",
    }),
  );
  try {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 360 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas
      .getContext("2d")!
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await canvasBlob(canvas, "image/webp", 0.85);
  } finally {
    bitmap.close();
  }
}

function isTextInBlueprint(
  node: Element,
  root: SVGSVGElement,
  blueprint: TemplateSource,
  paintIndex: number,
) {
  // Metal Rock stores its outlined lettering as individual paths inside
  // transformed groups. Paint-node indexes are unstable when the SVG is
  // sanitized, so identify those paths by their source transforms instead.
  if (blueprint.id === "metal-rock" || blueprint.id === "metal-rock-1") {
    if (node.localName !== "path") return false;
    const d = node.getAttribute("d") || "";
    let parent: Element | null = node;
    while (parent && parent !== root) {
      const transform = parent.getAttribute("transform") || "";
      if (
        transform.includes("860.463802") ||
        transform.includes("983.403083")
      )
        return true;
      parent = parent.parentElement;
    }
    return d.startsWith("M 273.589844 794.046875");
  }
  // Exact-source blueprints can distinguish lettering from overlapping decoration.
  if (blueprint.textPaintRanges)
    return blueprint.textPaintRanges.some(
      ([start, end]) => paintIndex >= start && paintIndex <= end,
    );
  if (!["path", "image", "text"].includes(node.localName)) return false;
  const box = photoBox(node as SVGGraphicsElement, root);
  return blueprint.texts.some(
    (text) =>
      box.width > 0.5 &&
      box.height > 1 &&
      box.width < text.width + 12 &&
      box.height < text.height + 12 &&
      box.x + box.width / 2 >= text.x - 6 &&
      box.x + box.width / 2 <= text.x + text.width + 6 &&
      box.y + box.height / 2 >= text.y - 8 &&
      box.y + box.height / 2 <= text.y + text.height + 8,
  );
}
function isPreservedPaintInBlueprint(
  blueprint: TemplateSource,
  paintIndex: number,
) {
  return (blueprint.preservePaintRanges || []).some(
    ([start, end]) => paintIndex >= start && paintIndex <= end,
  );
}
export function editableTemplateArtwork(
  root: SVGSVGElement,
  main: Element,
  separate: Element[],
  blueprint: TemplateSource,
) {
  const painted = paintNodes(root),
    original = root.cloneNode(true) as SVGSVGElement,
    originalPaint = paintNodes(original),
    firstIndex = painted.indexOf(main),
    preservedImages = new Set(
      (blueprint.preserveImageIndices || [])
        .map((index) =>
          painted.filter((node) => node.localName === "image")[index],
        )
        .filter((node): node is Element => !!node),
    );
  for (let index = originalPaint.length - 1; index >= 0; index--) {
    if (
      index <= firstIndex ||
      separate.includes(painted[index]) ||
      (isTextInBlueprint(painted[index], root, blueprint, index) &&
        !preservedImages.has(painted[index]) &&
        !isPreservedPaintInBlueprint(blueprint, index))
    )
      originalPaint[index].remove();
  }
  return new XMLSerializer().serializeToString(original);
}
function photoRasterSize(root: SVGSVGElement, photo: Element, box: Box) {
  const full = transformedBox(photo as SVGGraphicsElement);
  const density = Math.max(
    1,
    Math.min(
      Number(photo.getAttribute("width")) / Math.max(1, full.width),
      Number(photo.getAttribute("height")) / Math.max(1, full.height),
    ),
  );
  const width = Number(root.getAttribute("width")),
    height = Number(root.getAttribute("height"));
  const scale = Math.min(
    density,
    16384 / Math.max(width, height),
    Math.sqrt(40000000 / (width * height)),
  );
  return {
    width: Math.max(1, Math.round(box.width * scale)),
    height: Math.max(1, Math.round(box.height * scale)),
    scale,
  };
}
export function blueprintTextLayers(
  blueprint: TemplateSource,
  width: number,
  height: number,
): StudioOverlay[] {
  return blueprint.texts.map((text) => {
    const words = text.text.split(/\s+/),
      phrase = text.highlight?.split(/\s+/) || [];
    const first = phrase.length
      ? words.findIndex(
          (_, index) =>
            words.slice(index, index + phrase.length).join(" ") ===
            phrase.join(" "),
        )
      : -1;
    return {
      ...textLayer(
        text.text,
        text.x / width,
        text.y / height,
        text.width / width,
        text.color,
        text.size,
      ),
      name: text.name,
      height: text.height / height,
      templateCode: `${blueprint.id}:${text.name}`,
      font: text.font || "Anton",
      bold: false,
      align: "center",
      textStyle: {
        fontWeight: "normal",
        verticalAlign: "middle",
        textAlign: "center",
        autoFitText: true,
        lineHeight: 1.15,
        ...(first >= 0
          ? {
              wordStylesEnabled: true,
              wordStyles: phrase.map((_, index) => ({
                wordIndex: first + index,
                color: text.highlightColor || "#f73747",
              })),
            }
          : {}),
        ...text.style,
      },
    };
  });
}

async function secondaryPhoto(
  root: SVGSVGElement,
  photo: Element,
  box: Box,
  frame = true,
): Promise<StudioOverlay> {
  const clone = root.cloneNode(true) as SVGSVGElement;
  const size = photoRasterSize(root, photo, box);
  const paint = paintNodes(root),
    targetIndex = paint.indexOf(photo),
    cloned = paintNodes(clone);
  for (let i = cloned.length - 1; i >= 0; i--)
    if (i !== targetIndex) cloned[i].remove();
  const encode = async () => {
    const bitmap = await svgToBitmap(
      new Blob([new XMLSerializer().serializeToString(clone)], {
        type: "image/svg+xml",
      }),
      Math.max(
        Number(root.getAttribute("width")),
        Number(root.getAttribute("height")),
      ) * size.scale,
    );
    const canvas = document.createElement("canvas");
    try {
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext("2d")!;
      context.imageSmoothingQuality = "high";
      const scaleX = bitmap.width / Number(root.getAttribute("width")),
        scaleY = bitmap.height / Number(root.getAttribute("height"));
      context.drawImage(
        bitmap,
        box.x * scaleX,
        box.y * scaleY,
        box.width * scaleX,
        box.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      return await putStudioAsset(await canvasBlob(canvas));
    } finally {
      bitmap.close();
      canvas.width = canvas.height = 1;
    }
  };
  const assetKey = await encode();
  const white = document.createElement("canvas");
  white.width = white.height = 1;
  white.getContext("2d")!.fillStyle = "#ffffff";
  white.getContext("2d")!.fillRect(0, 0, 1, 1);
  const image = cloned[targetIndex];
  image.removeAttributeNS(XLINK_NS, "href");
  image.setAttribute("href", white.toDataURL());
  image.setAttribute("preserveAspectRatio", "none");
  return {
    ...textLayer(
      "",
      box.x / Number(root.getAttribute("width")),
      box.y / Number(root.getAttribute("height")),
      box.width / Number(root.getAttribute("width")),
    ),
    height: box.height / Number(root.getAttribute("height")),
    type: "logo",
    name: "Template inset photo",
    assetKey,
    maskAssetKey: frame ? await encode() : undefined,
  };
}

export async function importSvgTemplate(
  source: string,
  name: string,
): Promise<StudioTemplate> {
  const root = sanitizeTemplateSvg(source),
    width = Number(root.getAttribute("width")),
    height = Number(root.getAttribute("height"));
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-20000px;top:0;pointer-events:none;visibility:hidden";
  host.appendChild(root);
  document.body.appendChild(host);
  try {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(source),
    );
    const hash = Array.from(new Uint8Array(digest), (value) =>
      value.toString(16).padStart(2, "0"),
    ).join("");
    const blueprint = CINEMA_TEMPLATES.find((item) => item.hash === hash);
    const painted = paintNodes(root),
      visibleImages = painted.filter((node) => node.localName === "image");
    const preserve = new Set(
      (blueprint?.preserveImageIndices || []).map(
        (index) => visibleImages[index],
      ),
    );
    const photos = paintNodes(root)
      .filter((node) => node.localName === "image")
      .map((node) => ({
        node,
        box: photoBox(node as SVGGraphicsElement, root),
      }))
      .sort((a, b) => b.box.width * b.box.height - a.box.width * a.box.height);
    const automaticMainIndex = chooseAutomaticPhotoIndex(
      photos.map((photo) => photo.box),
      width,
      height,
    );
    const main =
      blueprint?.mainImageIndex !== undefined
        ? photos.find(
            (photo) => photo.node === visibleImages[blueprint.mainImageIndex!],
          )
        : automaticMainIndex === undefined
          ? undefined
          : photos[automaticMainIndex];
    const secondary = photos.filter(
      ({ node, box }) =>
        node !== main?.node &&
        !preserve.has(node) &&
        isEditableSecondaryPhoto(node, box, width, height) &&
        Number(node.getAttribute("width")) /
          Number(node.getAttribute("height")) >
          0.5 &&
        Number(node.getAttribute("width")) /
          Number(node.getAttribute("height")) <
          2,
    );
    const split = splitTemplateSvg(
        root,
        main?.node,
        secondary.map(({ node }) => node),
      ),
      design = newDesign(width, height);
    let sampleImage: StudioTemplate["sampleImage"];
    if (main) {
      // Flatten only the isolated photo with its original SVG masks, not its surrounding artwork.
      const photo = await secondaryPhoto(root, main.node, main.box, false);
      const size = photoRasterSize(root, main.node, main.box);
      sampleImage = {
        assetKey: photo.assetKey!,
        width: size.width,
        height: size.height,
        type: "image/png",
        name: `${blueprint?.file || "template"}-photo.png`,
      };
      design.subject = {
        ...design.subject,
        x: (main.box.x + main.box.width / 2) / width,
        y: (main.box.y + main.box.height / 2) / height,
        width: main.box.width / width,
        clipToPhotoArea: true,
      };
    }
    if (main)
      design.photoArea = {
        x: main.box.x / width,
        y: main.box.y / height,
        width: main.box.width / width,
        height: main.box.height / height,
      };
    if (split.hasBelow || !main)
      design.background = {
        ...design.background,
        type: "image",
        assetKey: await putStudioAsset(
          new Blob([main ? split.below : split.above], {
            type: "image/svg+xml",
          }),
        ),
      };
    const overlays: StudioOverlay[] = [];
    for (const photo of secondary)
      overlays.push(await secondaryPhoto(root, photo.node, photo.box));
    if (split.hasAbove && main)
      overlays.push({
        ...textLayer("", 0, 0, 1),
        type: "logo",
        name: "Original template artwork",
        height: 1,
        locked: true,
        assetKey: await putStudioAsset(
          new Blob([split.above], { type: "image/svg+xml" }),
        ),
      });
    if (blueprint) {
      for (const layer of overlays.filter(
        (layer) => layer.name === "Original template artwork",
      )) {
        layer.name = "Template artwork";
        layer.assetKey = await putStudioAsset(
          new Blob(
            [
              editableTemplateArtwork(
                root,
                main!.node,
                secondary.map((photo) => photo.node),
                blueprint,
              ),
            ],
            {
              type: "image/svg+xml",
            },
          ),
        );
      }
      overlays.push(...blueprintTextLayers(blueprint, width, height));
      for (const family of new Set(
        blueprint.texts.map((text) => text.font || "Anton"),
      ))
        await ensureStudioFont(family);
    }
    design.overlays = overlays;
    const id = crypto.randomUUID();
    design.templateId = id;
    return {
      id,
      name: name.replace(/\.[^.]+$/, "").slice(0, 100) || "Imported template",
      category: "Imported",
      design,
      previewKey: await putStudioAsset(await previewBlob(root)),
      outlinedText:
        !blueprint &&
        !root.querySelector("text") &&
        root.querySelectorAll("path").length > 20,
      revision: blueprint?.revision,
      sampleImage,
    };
  } finally {
    host.remove();
  }
}

async function entryBlob(entry: JSZipObject, limit: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let bytes = 0,
      failed = false;
    // JSZip implements this on ZipObject but omits it from its public typings.
    const stream = (
      entry as JSZipObject & {
        internalStream(type: "uint8array"): JSZip.JSZipStreamHelper<Uint8Array>;
      }
    ).internalStream("uint8array");
    stream
      .on("data", (chunk) => {
        bytes += chunk.length;
        if (bytes > limit) {
          failed = true;
          stream.pause();
          reject(new Error(`${entry.name}: decompressed file is too large.`));
        } else chunks.push(new Uint8Array(chunk));
      })
      .on("error", reject)
      .on("end", () => {
        if (!failed) resolve(new Blob(chunks));
      })
      .resume();
  });
}
export async function importTemplateFiles(
  files: File[],
  onTemplate: (template: StudioTemplate) => void,
): Promise<number> {
  let count = 0,
    total = 0;
  for (const file of files) {
    if (file.size > MAX_PACK_BYTES)
      throw new Error("Each template ZIP must be smaller than 100 MB.");
    if (/\.svg$/i.test(file.name)) {
      total += file.size;
      if (total > MAX_PACK_BYTES)
        throw new Error("Import at most 100 MB of templates at a time.");
      if (++count > 200)
        throw new Error("Import at most 200 templates at a time.");
      onTemplate(await importSvgTemplate(await file.text(), file.name));
    } else if (/\.zip$/i.test(file.name)) {
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const entries = Object.values(zip.files).filter(
        (entry) =>
          !entry.dir &&
          /\.svg$/i.test(entry.name) &&
          !entry.name.startsWith("__MACOSX/"),
      );
      if (!entries.length)
        throw new Error(
          `${file.name}: no SVG templates found. PNGs alone are flat images; import the SVG ZIP.`,
        );
      if (entries.length + count > 200)
        throw new Error("Import at most 200 templates at a time.");
      for (const entry of entries) {
        const blob = await entryBlob(
          entry,
          Math.min(MAX_SVG_BYTES, MAX_PACK_BYTES - total),
        );
        total += blob.size;
        onTemplate(
          await importSvgTemplate(
            await blob.text(),
            entry.name.split("/").pop()!,
          ),
        );
        count++;
      }
    } else throw new Error("Choose SVG templates or a ZIP containing SVGs.");
  }
  return count;
}
