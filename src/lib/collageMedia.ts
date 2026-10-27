export const MEDIA_PREFIX = "collage-media:";
export const isStoredMedia = (value?: string): value is string => !!value?.startsWith(MEDIA_PREFIX);
export type MediaAsset = { id: string; url: string; thumbUrl: string; originalUrl?: string; dataUrl?: string };
export type MediaProject = { entries: { id: string; images: MediaAsset[] }[]; manualImages: MediaAsset[]; [key: string]: unknown };
export type MediaWrite = { key: string; blob: Blob };

export function dataUrlBlob(value: string): Blob {
  const comma = value.indexOf(",");
  if (comma < 0) throw new Error("Invalid embedded image");
  const header = value.slice(0, comma);
  const bytes = /;base64/i.test(header) ? atob(value.slice(comma + 1)) : decodeURIComponent(value.slice(comma + 1));
  const data = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) data[i] = bytes.charCodeAt(i);
  return new Blob([data], { type: header.slice(5).split(";")[0] || "image/png" });
}
export async function blobDataUrl(blob: Blob): Promise<string> {
  const data = new Uint8Array(await blob.arrayBuffer());
  const parts: string[] = [];
  for (let offset = 0; offset < data.length; offset += 32768) parts.push(String.fromCharCode(...data.subarray(offset, offset + 32768)));
  return `data:${blob.type || "image/png"};base64,${btoa(parts.join(""))}`;
}
async function smallThumbnail(blob: Blob): Promise<Blob> {
  if (blob.size <= 48000 || typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined") return blob;
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(blob);
    const scale = Math.min(256 / Math.max(bitmap.width, bitmap.height), 1);
    const canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)));
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await canvas.convertToBlob({ type: "image/webp", quality: 0.72 });
  } catch { return blob; }
  finally { bitmap?.close(); }
}
// Originals remain lossless; only the separate browser thumbnail is reduced.
export async function compactMediaAssets<T extends MediaAsset>(images: T[], write: (values: MediaWrite[]) => Promise<void>): Promise<T[]> {
  const writes: MediaWrite[] = [];
  const result: T[] = [];
  for (const image of images) {
    const embedded = new Map<string, { ref: string; blob: Blob }>();
    const next = { ...image };
    for (const field of ["dataUrl", "url", "originalUrl", "thumbUrl"] as const) {
      const value = image[field];
      if (!value?.startsWith("data:image/")) continue;
      let stored = embedded.get(value);
      if (!stored) {
        stored = { ref: `${MEDIA_PREFIX}${crypto.randomUUID()}`, blob: dataUrlBlob(value) };
        embedded.set(value, stored);
        writes.push({ key: stored.ref, blob: stored.blob });
      }
      next[field] = stored.ref;
    }
    const thumbnail = embedded.get(image.thumbUrl);
    if (thumbnail) {
      const smaller = await smallThumbnail(thumbnail.blob);
      if (smaller !== thumbnail.blob) {
        next.thumbUrl = `${MEDIA_PREFIX}${crypto.randomUUID()}`;
        writes.push({ key: next.thumbUrl, blob: smaller });
      }
    }
    result.push(embedded.size ? next : image);
  }
  if (writes.length) await write(writes);
  return result;
}
export async function portableAssets<T extends MediaAsset>(images: T[], read: (key: string) => Promise<Blob>): Promise<T[]> {
  const result: T[] = [];
  for (const image of images) {
    const next = { ...image };
    const resolved = new Map<string, string>();
    for (const field of ["dataUrl", "url", "originalUrl", "thumbUrl"] as const) {
      const ref = image[field];
      if (!isStoredMedia(ref)) continue;
      if (!resolved.has(ref)) resolved.set(ref, await blobDataUrl(await read(ref)));
      next[field] = resolved.get(ref)!;
    }
    result.push(next);
  }
  return result;
}
export class CollagePreviewCache {
  private items = new Map<string, { href: string; bytes: number }>();
  constructor(private revoke: (href: string) => void, readonly limit = 12, readonly byteLimit = 64 * 1024 * 1024) {}
  get(id: string) { return this.items.get(id)?.href; }
  put(id: string, href: string, bytes: number) {
    const old = this.items.get(id);
    if (old && old.href !== href) this.revoke(old.href);
    this.items.delete(id);
    this.items.set(id, { href, bytes });
    while (this.items.size > this.limit || (this.bytes > this.byteLimit && this.items.size > 1)) this.remove(this.items.keys().next().value!);
  }
  private remove(id: string) { const item = this.items.get(id); if (item) this.revoke(item.href); this.items.delete(id); }
  retain(ids: Set<string>) { for (const id of this.items.keys()) if (!ids.has(id)) this.remove(id); }
  clear() { for (const id of this.items.keys()) this.remove(id); }
  get bytes() { return [...this.items.values()].reduce((sum, item) => sum + item.bytes, 0); }
  snapshot() { return Object.fromEntries([...this.items].map(([id, item]) => [id, item.href])); }
}
