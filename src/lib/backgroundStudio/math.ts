import type { StudioDesign, StudioImage } from "./types";
export const studioImageReady = (image: Pick<StudioImage, "maskKey" | "useOriginal">) => !!image.maskKey || !!image.useOriginal;
export function fitOriginalSubject(image: Pick<StudioImage, "width" | "height">, design: StudioDesign) {
  const area = design.photoArea || { x: 0, y: 0, width: 1, height: 1 };
  const width = Math.max(area.width, area.height * design.height * image.width / image.height / design.width);
  return { ...design.subject, x: area.x + area.width / 2, y: area.y + area.height / 2, width: Math.min(10, width), rotation: 0, manual: false, clipToPhotoArea: !!design.photoArea };
}
export function maskBounds(
  alpha: ArrayLike<number>,
  width: number,
  height: number,
): [number, number, number, number] {
  let left = width,
    right = -1,
    top = height,
    bottom = -1;
  for (let i = 0; i < alpha.length; i++)
    if (alpha[i] > 24) {
      const x = i % width,
        y = Math.floor(i / width);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  return right < 0
    ? [0, 0, 1, 1]
    : [
        left / width,
        top / height,
        (right - left + 1) / width,
        (bottom - top + 1) / height,
      ];
}
export function fitSubject(
  image: Pick<StudioImage, "width" | "height" | "maskBounds">,
  design: StudioDesign,
) {
  const [x, y, w, h] = image.maskBounds || [0, 0, 1, 1];
  const area = design.photoArea || { x: 0, y: 0, width: 1, height: 1 };
  const wantedWidth = Math.min(
    (design.width * area.width * 0.8) / Math.max(0.01, w),
    (((design.height * area.height * 0.85) / Math.max(0.01, h)) * image.width) /
      image.height,
  );
  const subjectWidth = Math.min(10, wantedWidth / design.width);
  const subjectHeight =
    (subjectWidth * design.width * image.height) / image.width / design.height;
  return {
    ...design.subject,
    width: subjectWidth,
    x: area.x + area.width / 2 + (0.5 - x - w / 2) * subjectWidth,
    y: area.y + area.height / 2 + (0.5 - y - h / 2) * subjectHeight,
    rotation: 0,
    manual: false,
    clipToPhotoArea: !!design.photoArea,
  };
}
export function applyDesign(
  image: StudioImage,
  design: StudioDesign,
  fields: (
    | "background"
    | "shadow"
    | "outline"
    | "canvas"
    | "template"
    | "placement"
  )[],
): StudioImage {
  const result = { ...image, design: { ...image.design } };
  if (fields.includes("background"))
    result.design.background = structuredClone(design.background);
  if (fields.includes("shadow"))
    result.design.shadow = structuredClone(design.shadow);
  if (fields.includes("outline"))
    result.design.outline = structuredClone(design.outline);
  if (fields.includes("canvas")) {
    result.design.width = design.width;
    result.design.height = design.height;
  }
  if (fields.includes("template")) {
    result.design.background = structuredClone(design.background);
    result.design.overlays = design.overlays.map((layer) => ({
      ...layer,
      id: crypto.randomUUID(),
    }));
    result.design.templateId = design.templateId;
    result.design.photoArea = design.photoArea
      ? structuredClone(design.photoArea)
      : undefined;
    result.design.shadow = structuredClone(design.shadow);
    result.design.outline = structuredClone(design.outline);
  }
  if (fields.includes("placement"))
    result.design.subject = structuredClone(design.subject);
  return result;
}
export function morphology(
  input: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
): Uint8ClampedArray {
  if (!radius) return new Uint8ClampedArray(input);
  const r = Math.abs(Math.round(radius)),
    dilate = radius > 0;
  const pass = (source: Uint8ClampedArray, horizontal: boolean) => {
    const out = new Uint8ClampedArray(source.length),
      count = horizontal ? height : width,
      length = horizontal ? width : height;
    const index = (line: number, pos: number) =>
      horizontal ? line * width + pos : pos * width + line;
    for (let line = 0; line < count; line++) {
      const deque = new Int32Array(length);
      let head = 0,
        tail = 0,
        next = 0;
      for (let pos = 0; pos < length; pos++) {
        while (next <= Math.min(length - 1, pos + r)) {
          const value = source[index(line, next)];
          while (
            tail > head &&
            (dilate
              ? source[index(line, deque[tail - 1])] <= value
              : source[index(line, deque[tail - 1])] >= value)
          )
            tail--;
          deque[tail++] = next++;
        }
        while (tail > head && deque[head] < pos - r) head++;
        out[index(line, pos)] = source[index(line, deque[head])];
      }
    }
    return out;
  };
  return pass(pass(input, true), false);
}
export function outputName(
  pattern: string,
  image: Pick<StudioImage, "name">,
  index: number,
  extension: string,
  prefix = "",
) {
  const original = image.name.replace(/\.[^.]+$/, "");
  const name = pattern
    .split("{name}")
    .join(original)
    .split("{n}")
    .join(String(index + 1).padStart(3, "0"));
  const clean =
    Array.from(prefix + name, (char) => (char.charCodeAt(0) < 32 ? "_" : char))
      .join("")
      .replace(/[<>:"/\\|?*]/g, "_")
      .replace(/[. ]+$/g, "")
      .slice(0, 160) || "image";
  return (
    (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(clean)
      ? "_" + clean
      : clean) +
    "." +
    extension
  );
}
