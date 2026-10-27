import { collageFilename } from "./collageGeometry";

export type CollageExportFormat = "jpg" | "png" | "svg";
export type CollageNaming = { mode: "number-term" | "number" | "term"; prefix: string; start: number; padding: number };
export type CollageExportSettings = { format: CollageExportFormat; quality: number; background: string; naming: CollageNaming; imagesPerPart: number; maxPartMB: number; autoDownload: boolean };
export const DEFAULT_COLLAGE_EXPORT: CollageExportSettings = {
  format: "jpg", quality: 90, background: "#ffffff",
  naming: { mode: "number-term", prefix: "", start: 1, padding: 3 },
  imagesPerPart: 50, maxPartMB: 100, autoDownload: true,
};

export function normalizeCollageExport(value?: Partial<CollageExportSettings>): CollageExportSettings {
  const naming = value?.naming;
  const integer = (value: number | undefined, fallback: number, min: number, max: number) => Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value!))) : fallback;
  return {
    format: ["jpg", "png", "svg"].includes(value?.format || "") ? value!.format! : DEFAULT_COLLAGE_EXPORT.format,
    quality: integer(value?.quality, 90, 10, 100),
    background: /^#[\da-f]{6}$/i.test(value?.background || "") ? value!.background! : "#ffffff",
    imagesPerPart: integer(value?.imagesPerPart, 50, 1, 500),
    maxPartMB: integer(value?.maxPartMB, 100, 10, 500),
    autoDownload: value?.autoDownload !== false,
    naming: {
      mode: ["number-term", "number", "term"].includes(naming?.mode || "") ? naming!.mode : "number-term",
      prefix: typeof naming?.prefix === "string" ? naming.prefix.slice(0, 60) : "",
      start: integer(naming?.start, 1, 1, 999999999),
      padding: integer(naming?.padding, 3, 1, 9),
    },
  };
}

export function collageExportName(term: string, index: number, naming: CollageNaming, used?: Set<string>) {
  const number = String(naming.start + index).padStart(naming.padding, "0");
  const title = collageFilename(term, "collage");
  const base = collageFilename([naming.prefix, naming.mode === "term" ? title : naming.mode === "number" ? number : `${number}-${title}`].filter(Boolean).join("-"), number);
  let name = base;
  let suffix = 2;
  while (used?.has(name.toLowerCase())) name = `${base}-${suffix++}`;
  used?.add(name.toLowerCase());
  return name;
}

export async function rasterizeCollage(svg: string, size: { width: number; height: number }, settings: CollageExportSettings): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  let canvas: HTMLCanvasElement | undefined;
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { image.src = ""; reject(new Error("Collage rendering timed out")); }, 45000);
      image.onload = () => { clearTimeout(timer); resolve(); };
      image.onerror = () => { clearTimeout(timer); reject(new Error("Could not render collage")); };
      image.src = url;
    });
    canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas context is unavailable");
    if (settings.format === "jpg") {
      context.fillStyle = settings.background;
      context.fillRect(0, 0, size.width, size.height);
    }
    context.drawImage(image, 0, 0);
    const mime = settings.format === "jpg" ? "image/jpeg" : "image/png";
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Collage encoding timed out")), 45000);
      canvas!.toBlob(blob => { clearTimeout(timer); resolve(blob); }, mime, settings.format === "jpg" ? settings.quality / 100 : undefined);
    });
    if (!blob || blob.type !== mime) throw new Error(`${settings.format.toUpperCase()} encoding failed`);
    return blob;
  } finally {
    if (canvas) { canvas.width = 0; canvas.height = 0; }
    URL.revokeObjectURL(url);
  }
}
