import JSZip from "jszip";
import { CollageImageExportError, type CollageImageFailure } from "./collageImageErrors";

export type BatchExportItem = { id: string; serial: number; term: string };
export type BatchExportFailure = BatchExportItem & { error: string; imageFailures?: CollageImageFailure[] };
export type BatchExportProgress = { processed: number; total: number; exported: number; parts: number; phase: "rendering" | "packing" | "complete"; term: string };
export type CollageZipPart = { id: string; name: string; size: number; count: number; firstSerial: number; lastSerial: number; createdAt: number };
export type BatchExportResult = { exported: number; failures: BatchExportFailure[]; remaining: BatchExportItem[]; stopped: boolean; parts: number };

async function blobBytes(blob: Blob): Promise<Uint8Array> {
  if (blob.arrayBuffer) return new Uint8Array(await blob.arrayBuffer());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error || new Error("Could not read exported image"));
    reader.readAsArrayBuffer(blob);
  });
}

// Only one ZIP part is held in memory; completed parts leave this function immediately.
export async function exportCollageParts<T extends BatchExportItem>(options: {
  items: T[];
  jobId: string;
  imagesPerPart: number;
  maxPartBytes: number;
  render: (item: T) => Promise<{ name: string; blob: Blob }>;
  onPart: (part: CollageZipPart, blob: Blob) => Promise<void>;
  onProgress?: (progress: BatchExportProgress) => void;
  onFailure?: (failure: BatchExportFailure) => void;
  shouldStop?: () => boolean;
}): Promise<BatchExportResult> {
  const { items, jobId } = options;
  const imageLimit = Math.max(1, Math.floor(options.imagesPerPart));
  const byteLimit = Math.max(1, options.maxPartBytes);
  let zip = new JSZip();
  let files: (BatchExportItem & { filename: string })[] = [];
  let bytes = 0;
  let processed = 0;
  let exported = 0;
  let parts = 0;
  let term = "";
  const failures: BatchExportFailure[] = [];
  const progress = (phase: BatchExportProgress["phase"]) => options.onProgress?.({ processed, total: items.length, exported, parts, phase, term });
  const flush = async () => {
    if (!files.length) return;
    progress("packing");
    zip.file("entries.json", JSON.stringify(files, null, 2));
    const blob = await zip.generateAsync({ type: "blob", compression: "STORE", streamFiles: true });
    const name = `collages-${jobId}-part-${String(parts + 1).padStart(3, "0")}.zip`;
    await options.onPart({ id: name, name, size: blob.size, count: files.length, firstSerial: files[0].serial, lastSerial: files[files.length - 1].serial, createdAt: Date.now() }, blob);
    parts++;
    exported += files.length;
    zip = new JSZip();
    files = [];
    bytes = 0;
  };
  for (const item of items) {
    if (options.shouldStop?.()) break;
    term = item.term;
    progress("rendering");
    let rendered: { name: string; blob: Blob };
    try { rendered = await options.render(item); }
    catch (error) {
      const failure = { id: item.id, serial: item.serial, term: item.term, error: error instanceof Error ? error.message : "Image export failed", ...(error instanceof CollageImageExportError ? { imageFailures: error.imageFailures } : {}) };
      failures.push(failure);
      options.onFailure?.(failure);
      processed++;
      progress("rendering");
      continue;
    }
    // A single oversized image gets its own part rather than failing the whole batch.
    const fileBytes = rendered.blob.size + new TextEncoder().encode(rendered.name).length * 2 + 128;
    if (files.length && (files.length >= imageLimit || bytes + fileBytes > byteLimit)) {
      await flush();
      if (options.shouldStop?.()) break;
    }
    zip.file(rendered.name, await blobBytes(rendered.blob));
    files.push({ id: item.id, serial: item.serial, term: item.term, filename: rendered.name });
    bytes += fileBytes;
    processed++;
    if (files.length >= imageLimit || bytes >= byteLimit) await flush();
    progress("rendering");
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  await flush();
  progress("complete");
  return { exported, failures, remaining: items.slice(processed).map(({ id, serial, term }) => ({ id, serial, term })), stopped: processed < items.length, parts };
}
