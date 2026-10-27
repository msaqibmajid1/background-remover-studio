export type RemovalMode = "general" | "portrait";
export type RemovalProgress = {
  stage: string;
  progress?: number;
  device?: string;
};
export type RemovalMask = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  device: string;
  model: string;
};
let worker: Worker | undefined;
let pending:
  | {
      id: string;
      resolve: (mask: RemovalMask) => void;
      reject: (error: Error) => void;
      progress?: (value: RemovalProgress) => void;
    }
  | undefined;
export function stopBackgroundRemoval() {
  worker?.terminate();
  worker = undefined;
  pending?.reject(
    new DOMException(
      "Processing stopped. This image remains pending.",
      "AbortError",
    ),
  );
  pending = undefined;
}
export function createBackgroundMask(
  file: Blob,
  mode: RemovalMode = "general",
  progress?: (value: RemovalProgress) => void,
  device: "auto" | "cpu" = "auto",
): Promise<RemovalMask> {
  if (pending)
    return Promise.reject(
      new Error(
        "Another image is processing. Stop it or wait for it to finish.",
      ),
    );
  if (!worker) {
    worker = new Worker(
      new URL("../workers/backgroundRemoval.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = ({ data }) => {
      if (!pending || data.id !== pending.id) return;
      if (data.type === "progress") {
        pending.progress?.(data.value);
        return;
      }
      const request = pending;
      pending = undefined;
      if (data.type === "result") request.resolve(data.mask);
      else
        request.reject(new Error(data.error || "Background removal failed."));
    };
    worker.onerror = () => {
      const request = pending;
      pending = undefined;
      worker?.terminate();
      worker = undefined;
      request?.reject(
        new Error(
          "The AI worker stopped. Try Portrait mode or reload; your saved images are preserved.",
        ),
      );
    };
  }
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    pending = { id, resolve, reject, progress };
    worker!.postMessage({ id, file, mode, device });
  });
}
export async function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          "This image could not be decoded. Use a valid JPG, PNG or WebP.",
        ),
      );
    };
    image.src = url;
  });
}
export async function removeBackground(image: HTMLImageElement): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable.");
  context.drawImage(image, 0, 0);
  const input = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Image encoding failed.")),
      "image/png",
    ),
  );
  const result = await createBackgroundMask(input);
  const small = document.createElement("canvas");
  small.width = result.width;
  small.height = result.height;
  const pixels = small
    .getContext("2d")!
    .createImageData(result.width, result.height);
  result.data.forEach((alpha, index) => {
    pixels.data.set([255, 255, 255, alpha], index * 4);
  });
  small.getContext("2d")!.putImageData(pixels, 0, 0);
  context.globalCompositeOperation = "destination-in";
  context.drawImage(small, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("PNG encoding failed.")),
      "image/png",
    ),
  );
}
