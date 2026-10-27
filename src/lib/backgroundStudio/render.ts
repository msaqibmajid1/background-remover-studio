import { drawElement } from "../canvasUtils";
import type { CanvasElement } from "@/types/editor";
import { morphology } from "./math";
import { studioAsset } from "./storage";
import { sanitizeTemplateSvg, svgToBitmap } from "./svgTemplates";
import { resolvedStudioText, studioTextElement } from "./text";
import { ensureStudioFont } from "./fonts";
import type { MaskStroke, StudioImage, StudioOverlay } from "./types";
export type StudioView = "design" | "cutout" | "original" | "compare" | "mask";
const makeCanvas = (width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
};
type Lease = { bitmap: ImageBitmap; release: () => void };
const rasters = new Map<
  string,
  { promise: Promise<ImageBitmap>; users: number }
>();
const cutouts = new Map<
  string,
  { promise: Promise<HTMLCanvasElement>; users: number }
>();
const strokeIds = new WeakMap<object, number>();
let strokeId = 0;
function pruneCutouts(all = false) {
  for (const [key, entry] of cutouts)
    if (!entry.users && (all || cutouts.size > 4)) {
      cutouts.delete(key);
      void entry.promise
        .then((canvas) => {
          canvas.width = canvas.height = 1;
        })
        .catch(() => {});
    }
}
async function raster(
  key: string,
  maxEdge: number,
  svgEdge: number,
): Promise<Lease> {
  const id = `${key}:${maxEdge}:${svgEdge}`;
  let entry = rasters.get(id);
  if (!entry) {
    entry = {
      users: 0,
      promise: (async () => {
        const blob = await studioAsset(key);
        let full: ImageBitmap;
        if (
          blob.type === "image/svg+xml" ||
          (!blob.type &&
            /^\s*(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(
              await blob.slice(0, 300).text(),
            ))
        ) {
          const svg = sanitizeTemplateSvg(await blob.text());
          full = await svgToBitmap(
            new Blob([new XMLSerializer().serializeToString(svg)], {
              type: "image/svg+xml",
            }),
            svgEdge,
          );
        } else full = await createImageBitmap(blob);
        if (!maxEdge || Math.max(full.width, full.height) <= maxEdge)
          return full;
        const scale = maxEdge / Math.max(full.width, full.height);
        try {
          return await createImageBitmap(full, {
            resizeWidth: Math.max(1, Math.round(full.width * scale)),
            resizeHeight: Math.max(1, Math.round(full.height * scale)),
            resizeQuality: "high",
          });
        } finally {
          full.close();
        }
      })(),
    };
    rasters.set(id, entry);
  }
  entry.users++;
  const release = () => {
    entry!.users--;
    for (const [name, value] of rasters)
      if (!value.users && (!maxEdge || rasters.size > 8)) {
        rasters.delete(name);
        void value.promise.then((image) => image.close()).catch(() => {});
      }
  };
  try {
    return { bitmap: await entry.promise, release };
  } catch (error) {
    rasters.delete(id);
    release();
    throw error;
  }
}
export function clearStudioRasters() {
  pruneCutouts(true);
  for (const [key, entry] of rasters)
    if (!entry.users) {
      rasters.delete(key);
      void entry.promise.then((bitmap) => bitmap.close()).catch(() => {});
    }
}
function brush(context: CanvasRenderingContext2D, stroke: MaskStroke) {
  const width = context.canvas.width,
    height = context.canvas.height,
    radius = Math.max(0.5, (stroke.size * Math.min(width, height)) / 2);
  context.save();
  context.globalCompositeOperation =
    stroke.mode === "erase" ? "destination-out" : "source-over";
  const dot = (x: number, y: number) => {
    if (stroke.hardness >= 0.99) context.fillStyle = "#ffffff";
    else {
      const gradient = context.createRadialGradient(
        x,
        y,
        radius * stroke.hardness,
        x,
        y,
        radius,
      );
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = gradient;
    }
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  };
  stroke.points.forEach((point, index) => {
    const previous = stroke.points[Math.max(0, index - 1)],
      dx = (point[0] - previous[0]) * width,
      dy = (point[1] - previous[1]) * height;
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot(dx, dy) / Math.max(1, radius / 3)),
    );
    for (let n = 1; n <= steps; n++)
      dot(
        previous[0] * width + (dx * n) / steps,
        previous[1] * height + (dy * n) / steps,
      );
  });
  context.restore();
}
function refinedMask(
  bitmap: ImageBitmap,
  image: StudioImage,
  width: number,
  height: number,
  activeStroke?: MaskStroke,
) {
  const small = makeCanvas(bitmap.width, bitmap.height),
    context = small.getContext("2d", { willReadFrequently: true })!;
  context.drawImage(bitmap, 0, 0);
  const pixels = context.getImageData(0, 0, small.width, small.height),
    alpha = new Uint8ClampedArray(small.width * small.height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = pixels.data[i * 4 + 3];
  const expanded = morphology(
    alpha,
    small.width,
    small.height,
    Math.round(
      (image.design.refine.edge * Math.max(small.width, small.height)) / 1024,
    ),
  );
  const contrast = 1 + image.design.refine.contrast / 25;
  for (let i = 0; i < alpha.length; i++)
    pixels.data.set(
      [
        255,
        255,
        255,
        Math.max(
          0,
          Math.min(255, ((expanded[i] / 255 - 0.5) * contrast + 0.5) * 255),
        ),
      ],
      i * 4,
    );
  context.putImageData(pixels, 0, 0);
  const mask = makeCanvas(width, height),
    target = mask.getContext("2d")!;
  target.filter = `blur(${(image.design.refine.feather * Math.max(width, height)) / 1024}px)`;
  target.imageSmoothingQuality = "high";
  target.drawImage(small, 0, 0, width, height);
  target.filter = "none";
  image.strokes.forEach((stroke) => brush(target, stroke));
  if (activeStroke) brush(target, activeStroke);
  small.width = small.height = 1;
  return mask;
}
function cover(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource & { width: number; height: number },
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.width, height / image.height);
  context.drawImage(
    image,
    (width - image.width * scale) / 2,
    (height - image.height * scale) / 2,
    image.width * scale,
    image.height * scale,
  );
}
async function preparedCutout(
  image: StudioImage,
  original: ImageBitmap,
  mask: () => Promise<ImageBitmap>,
  preview: boolean,
  stroke?: MaskStroke,
) {
  if (!strokeIds.has(image.strokes)) strokeIds.set(image.strokes, ++strokeId);
  const key = [
    image.id,
    image.originalKey,
    image.maskKey,
    image.useOriginal,
    original.width,
    original.height,
    strokeIds.get(image.strokes),
    JSON.stringify(image.design.refine),
  ].join(":");
  const cache = preview && !stroke;
  let entry = cache ? cutouts.get(key) : undefined;
  if (!entry) {
    entry = {
      users: 0,
      promise: (async () => {
        const canvas = makeCanvas(original.width, original.height),
          context = canvas.getContext("2d")!;
        context.imageSmoothingQuality = "high";
        try {
          context.drawImage(original, 0, 0, canvas.width, canvas.height);
          if (image.maskKey && !image.useOriginal) {
            const matte = refinedMask(
              await mask(),
              image,
              canvas.width,
              canvas.height,
              stroke,
            );
            context.globalCompositeOperation = "destination-in";
            context.drawImage(matte, 0, 0);
            context.globalCompositeOperation = "source-over";
            matte.width = matte.height = 1;
          }
          return canvas;
        } catch (error) {
          canvas.width = canvas.height = 1;
          throw error;
        }
      })(),
    };
    if (cache) cutouts.set(key, entry);
  }
  entry.users++;
  const release = () => {
    entry!.users--;
    if (!cache)
      void entry!.promise
        .then((canvas) => {
          canvas.width = canvas.height = 1;
        })
        .catch(() => {});
    pruneCutouts();
  };
  try {
    return { canvas: await entry.promise, release };
  } catch (error) {
    if (cutouts.get(key) === entry) cutouts.delete(key);
    release();
    throw error;
  }
}
function drawText(
  context: CanvasRenderingContext2D,
  layer: StudioOverlay,
  width: number,
  height: number,
) {
  drawElement(
    context,
    resolvedStudioText(studioTextElement(layer, { width, height })),
  );
}
function overlayElement(
  layer: StudioOverlay,
  width: number,
  height: number,
): CanvasElement {
  const common = {
    id: layer.id,
    x: layer.x * width,
    y: layer.y * height,
    width: layer.width * width,
    height: layer.height * height,
    rotation: layer.rotation,
    opacity: layer.opacity,
    zIndex: 1,
  };
  if (layer.type === "text")
    return {
      ...common,
      type: "text",
      content: layer.text,
      fontFamily: layer.font,
      fontSize: layer.fontSize,
      fontWeight: layer.bold ? "bold" : "normal",
      fontStyle: "normal",
      textDecoration: "none",
      textTransform: "none",
      color: layer.color,
      colorType: "solid",
      gradientColor: "",
      strokeColor: "#000000",
      strokeWidth: 0,
      textAlign: layer.align,
      verticalAlign: "top",
      lineHeight: 1.15,
      letterSpacing: 0,
      wordSpacing: 0,
      autoFitText: true,
      shadow: false,
      shadowColor: "#000000",
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      backgroundColor: "transparent",
      backgroundOpacity: 0,
      backgroundPadding: 0,
      backgroundRadius: 0,
      textBoxBorder: false,
      textBoxBorderColor: "#000000",
      textBoxBorderWidth: 0,
    };
  return {
    ...common,
    type: layer.type === "circle" ? "circle" : "rectangle",
    fillColor: layer.color,
    fillType: "solid",
    fillOpacity: layer.opacity,
    backgroundOpacity: 1,
    borderColor: layer.color,
    borderWidth: 0,
    borderOpacity: 0,
    borderStyle: "solid",
    cornerRadius: 0,
    dashed: false,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    shadow: false,
    shadowColor: "#000000",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  };
}
export async function renderStudio(
  image: StudioImage,
  options: {
    maxEdge?: number;
    outputScale?: number;
    view?: StudioView;
    compare?: number;
    stroke?: MaskStroke;
    whiteBackground?: boolean;
    templateOnly?: boolean;
  } = {},
): Promise<HTMLCanvasElement> {
  const { maxEdge = 1100, view = "design" } = options,
    design = image.design;
  const width = view === "design" ? design.width : image.width,
    height = view === "design" ? design.height : image.height;
  if (width * height > 40000000 || width > 16384 || height > 16384)
    throw new Error(
      "This output exceeds the browser's 40-megapixel canvas limit. Reduce the canvas dimensions.",
    );
  const outputScale = options.outputScale ?? 1;
  if (!Number.isFinite(outputScale) || outputScale <= 0)
    throw new Error("Choose a positive export scale.");
  const scale = maxEdge
    ? Math.min(outputScale, maxEdge / Math.max(width, height))
    : outputScale;
  const outputWidth = Math.max(1, Math.round(width * scale)),
    outputHeight = Math.max(1, Math.round(height * scale));
  if (
    outputWidth * outputHeight > 40000000 ||
    outputWidth > 16384 ||
    outputHeight > 16384
  )
    throw new Error(
      "Requested export exceeds the 40-megapixel browser limit. Reduce export scale.",
    );
  const canvas = makeCanvas(width * scale, height * scale),
    context = canvas.getContext("2d")!;
  context.imageSmoothingQuality = "high";
  const leases: Lease[] = [],
    assets = new Map<string, Promise<ImageBitmap>>();
  const get = (
    key: string,
    label: string,
    svgEdge = Math.max(canvas.width, canvas.height),
  ) => {
    const cacheKey = `${key}:${svgEdge}`;
    if (!assets.has(cacheKey))
      assets.set(
        cacheKey,
        raster(key, maxEdge ? Math.max(1600, maxEdge) : 0, svgEdge)
          .then((lease) => {
            leases.push(lease);
            return lease.bitmap;
          })
          .catch((error) => {
            throw new Error(
              `${label}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }),
      );
    return assets.get(cacheKey)!;
  };
  let cutout: HTMLCanvasElement | undefined,
    releaseCutout: (() => void) | undefined,
    emptyBitmap: ImageBitmap | undefined;
  try {
    if (view === "design")
      for (const layer of design.overlays.filter(
        (layer) => layer.visible && layer.type === "text",
      )) {
        const text = studioTextElement(layer, design);
        await ensureStudioFont(
          text.fontFamily,
          text.fontWeight,
          text.fontStyle,
        );
      }
    const original = options.templateOnly
      ? (emptyBitmap = await createImageBitmap(makeCanvas(1, 1)))
      : await get(image.originalKey, "Original image");
    if (view === "original") {
      context.drawImage(original, 0, 0, canvas.width, canvas.height);
      return canvas;
    }
    const emptyCanvas = options.templateOnly ? makeCanvas(1, 1) : undefined;
    const prepared = emptyCanvas
      ? {
          canvas: emptyCanvas,
          release: () => {
            emptyCanvas.width = emptyCanvas.height = 1;
          },
        }
      : await preparedCutout(
          image,
          original,
          () => get(image.maskKey!, "Cutout mask"),
          !!maxEdge,
          options.stroke,
        );
    cutout = prepared.canvas;
    releaseCutout = prepared.release;
    if (options.whiteBackground) {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (view !== "design") {
      if (view === "compare") {
        context.drawImage(original, 0, 0, canvas.width, canvas.height);
        const split = ((options.compare ?? 50) / 100) * canvas.width;
        context.save();
        context.beginPath();
        context.rect(0, 0, split, canvas.height);
        context.clip();
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(cutout, 0, 0, canvas.width, canvas.height);
        context.restore();
        context.fillStyle = "#1675d1";
        context.fillRect(split - 1, 0, 2, canvas.height);
      } else {
        if (view === "mask") {
          context.globalAlpha = 0.25;
          context.drawImage(original, 0, 0, canvas.width, canvas.height);
          context.globalAlpha = 1;
        }
        context.drawImage(cutout, 0, 0, canvas.width, canvas.height);
      }
      return canvas;
    }
    context.save();
    context.scale(canvas.width / width, canvas.height / height);
    const bg = design.background;
    if (bg.type === "solid" || bg.type === "gradient") {
      context.fillStyle = bg.color;
      if (bg.type === "gradient") {
        const angle = (bg.angle * Math.PI) / 180,
          dx = (Math.cos(angle) * width) / 2,
          dy = (Math.sin(angle) * height) / 2;
        const gradient = context.createLinearGradient(
          width / 2 - dx,
          height / 2 - dy,
          width / 2 + dx,
          height / 2 + dy,
        );
        gradient.addColorStop(0, bg.color);
        gradient.addColorStop(1, bg.secondary);
        context.fillStyle = gradient;
      }
      context.fillRect(0, 0, width, height);
    } else if (bg.type === "image" || bg.type === "blur") {
      context.save();
      context.fillStyle = bg.color;
      context.fillRect(0, 0, width, height);
      context.filter = `blur(${bg.type === "blur" ? bg.blur : 0}px)`;
      if (bg.type === "blur" || bg.assetKey)
        cover(
          context,
          bg.type === "blur"
            ? original
            : await get(bg.assetKey!, "Background image"),
          width,
          height,
        );
      context.restore();
    }
    const subject = design.subject,
      sw = subject.width * width,
      sh = (sw * image.height) / image.width;
    context.save();
    if (subject.clipToPhotoArea && design.photoArea) {
      const area = design.photoArea;
      context.beginPath();
      context.rect(
        area.x * width,
        area.y * height,
        area.width * width,
        area.height * height,
      );
      context.clip();
    }
    context.translate(subject.x * width, subject.y * height);
    context.rotate((subject.rotation * Math.PI) / 180);
    context.scale(subject.flipX ? -1 : 1, subject.flipY ? -1 : 1);
    if (design.outline.enabled && design.outline.width > 0) {
      const silhouette = makeCanvas(cutout.width, cutout.height),
        sctx = silhouette.getContext("2d")!;
      sctx.drawImage(cutout, 0, 0);
      sctx.globalCompositeOperation = "source-in";
      sctx.fillStyle = design.outline.color;
      sctx.fillRect(0, 0, silhouette.width, silhouette.height);
      for (let i = 0; i < 24; i++) {
        const angle = (i * Math.PI) / 12;
        context.drawImage(
          silhouette,
          -sw / 2 + Math.cos(angle) * design.outline.width,
          -sh / 2 + Math.sin(angle) * design.outline.width,
          sw,
          sh,
        );
      }
      silhouette.width = silhouette.height = 1;
    }
    if (design.shadow.enabled) {
      context.shadowColor = `${design.shadow.color}${Math.round(
        design.shadow.opacity * 255,
      )
        .toString(16)
        .padStart(2, "0")}`;
      context.shadowBlur = design.shadow.blur * scale;
      context.shadowOffsetX = design.shadow.x * scale;
      context.shadowOffsetY = design.shadow.y * scale;
    }
    context.drawImage(cutout, -sw / 2, -sh / 2, sw, sh);
    context.restore();
    for (const layer of design.overlays.filter((layer) => layer.visible)) {
      if (layer.type === "logo") {
        if (!layer.assetKey)
          throw new Error(
            "A logo layer is missing its image. Replace or remove the layer.",
          );
        let bitmap: ImageBitmap | HTMLCanvasElement = await get(
          layer.assetKey,
          layer.name || "Logo image",
          Math.max(layer.width * canvas.width, layer.height * canvas.height),
        );
        let masked: HTMLCanvasElement | undefined;
        if (layer.maskAssetKey) {
          const mask = await get(layer.maskAssetKey, "Template image frame");
          masked = makeCanvas(bitmap.width, bitmap.height);
          const mc = masked.getContext("2d")!;
          mc.imageSmoothingQuality = "high";
          cover(mc, bitmap, masked.width, masked.height);
          mc.globalCompositeOperation = "destination-in";
          mc.drawImage(mask, 0, 0, masked.width, masked.height);
          bitmap = masked;
        }
        context.save();
        context.globalAlpha = layer.opacity;
        context.translate(
          (layer.x + layer.width / 2) * width,
          (layer.y + layer.height / 2) * height,
        );
        context.rotate((layer.rotation * Math.PI) / 180);
        context.drawImage(
          bitmap,
          (-layer.width * width) / 2,
          (-layer.height * height) / 2,
          layer.width * width,
          layer.height * height,
        );
        context.restore();
        if (masked) masked.width = masked.height = 1;
      } else if (layer.type === "text") drawText(context, layer, width, height);
      else drawElement(context, overlayElement(layer, width, height));
    }
    context.restore();
    return canvas;
  } finally {
    leases.forEach((lease) => lease.release());
    releaseCutout?.();
    emptyBitmap?.close();
  }
}
