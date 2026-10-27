import JSZip from "jszip";
import { saveAs } from "file-saver";
import { EditorImage, ExportSettings } from "@/types/editor";
import { renderImageToCanvas } from "./canvasUtils";

export const exportImage = async (
  image: EditorImage,
  settings: ExportSettings,
  imageElement: HTMLImageElement,
  loadedImages: Map<string, HTMLImageElement>,
  index: number,
  totalImages: number
): Promise<{ blob: Blob; filename: string }> => {
  // Create off-screen canvas
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  // Render image to canvas
  await renderImageToCanvas(image, ctx, imageElement, loadedImages);

  // Determine quality
  let quality = 0.92;
  switch (settings.quality) {
    case "high":
      quality = 0.9;
      break;
    case "medium":
      quality = 0.7;
      break;
    case "low":
      quality = 0.5;
      break;
    case "original":
      quality = 1.0;
      break;
  }

  // Generate filename
  let filename = "";
  switch (settings.naming) {
    case "numbers":
      filename = `${index + 1}`;
      break;
    case "original":
      filename = image.file.name.replace(/\.[^/.]+$/, "");
      break;
    case "custom":
      filename = `${settings.customPrefix || "image"}_${index + 1}`;
      break;
  }
  filename += settings.format === "png" ? ".png" : ".jpg";

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve({ blob, filename });
        } else {
          reject(new Error("Failed to create blob"));
        }
      },
      settings.format === "png" ? "image/png" : "image/jpeg",
      quality
    );
  });
};

export const downloadImage = async (
  image: EditorImage,
  settings: ExportSettings,
  imageElement: HTMLImageElement,
  loadedImages: Map<string, HTMLImageElement>
) => {
  const { blob, filename } = await exportImage(
    image,
    settings,
    imageElement,
    loadedImages,
    0,
    1
  );
  saveAs(blob, filename);
};

export const downloadAllImages = async (
  images: EditorImage[],
  settings: ExportSettings,
  imageElements: Map<string, HTMLImageElement>,
  loadedImages: Map<string, HTMLImageElement>,
  onProgress?: (current: number, total: number) => void
) => {
  const zip = new JSZip();

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const imageElement = imageElements.get(image.id);
    if (!imageElement) continue;

    if (onProgress) onProgress(i + 1, images.length);

    const { blob, filename } = await exportImage(
      image,
      settings,
      imageElement,
      loadedImages,
      i,
      images.length
    );
    zip.file(filename, blob);
  }

  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, "exported-images.zip");
};
