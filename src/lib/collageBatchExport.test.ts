import JSZip from "jszip";
import { describe, expect, it, vi } from "vitest";
import { exportCollageParts, type CollageZipPart } from "./collageBatchExport";
import { CollageImageExportError } from "./collageImageErrors";

const items = (count: number) => Array.from({ length: count }, (_, index) => ({ id: `entry-${index + 1}`, serial: index + 1, term: `Term ${index + 1}` }));
const image = async (item: { serial: number }) => ({ name: `${String(item.serial).padStart(3, "0")}.jpg`, blob: new Blob([`image-${item.serial}`], { type: "image/jpeg" }) });
const readZip = async (blob: Blob) => {
  const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result as ArrayBuffer); reader.onerror = reject; reader.readAsArrayBuffer(blob);
  });
  return JSZip.loadAsync(new Uint8Array(bytes));
};

describe("bounded collage ZIP export", () => {
  it("keeps structured base/shape download errors in batch results", async () => {
    const imageFailures = [{ imageId: "shape", title: "Shape photo", roles: [{ kind: "shape" as const }], code: "http", httpStatus: 404, message: "HTTP 404: Original link expired" }];
    const result = await exportCollageParts({ items: items(1), jobId: "details", imagesPerPart: 50, maxPartBytes: 10000, render: async () => { throw new CollageImageExportError(imageFailures); }, onPart: vi.fn() });
    expect(result.failures[0].imageFailures).toEqual(imageFailures);
  });
  it("exports 527 entries in count-limited parts without dropping or duplicating images", async () => {
    const parts: { metadata: CollageZipPart; blob: Blob }[] = [];
    const result = await exportCollageParts({ items: items(527), jobId: "large", imagesPerPart: 100, maxPartBytes: 1024 * 1024, render: image, onPart: async (metadata, blob) => { parts.push({ metadata, blob }); } });
    expect(result).toMatchObject({ exported: 527, parts: 6, failures: [], remaining: [], stopped: false });
    expect(parts.map(part => part.metadata.count)).toEqual([100, 100, 100, 100, 100, 27]);
    const names: string[] = [];
    for (const part of parts) {
      const zip = await readZip(part.blob);
      names.push(...Object.keys(zip.files).filter(name => name.endsWith(".jpg")));
      expect(JSON.parse(await zip.file("entries.json")!.async("string"))).toHaveLength(part.metadata.count);
    }
    expect(new Set(names).size).toBe(527);
    expect(names[0]).toBe("001.jpg"); expect(names.at(-1)).toBe("527.jpg");
  }, 15000);

  it("also splits on byte budget and exports oversized individual images alone", async () => {
    const counts: number[] = [];
    const result = await exportCollageParts({ items: items(3), jobId: "bytes", imagesPerPart: 50, maxPartBytes: 500, render: async item => ({ name: `${item.serial}.png`, blob: new Blob(["x".repeat(item.serial === 2 ? 1000 : 220)]) }), onPart: async part => { counts.push(part.count); } });
    expect(counts).toEqual([1, 1, 1]);
    expect(result.exported).toBe(3);
  });

  it("isolates image failures and preserves original serials in the ZIP manifest", async () => {
    const parts: Blob[] = [];
    const onFailure = vi.fn();
    const result = await exportCollageParts({ items: items(3), jobId: "failure", imagesPerPart: 50, maxPartBytes: 10000, render: async item => { if (item.serial === 2) throw new Error("Original image expired"); if (item.serial === 3) expect(onFailure).toHaveBeenCalledOnce(); return image(item); }, onPart: async (_, blob) => { parts.push(blob); }, onFailure });
    expect(result).toMatchObject({ exported: 2, parts: 1, failures: [{ id: "entry-2", serial: 2, error: "Original image expired" }] });
    expect(onFailure).toHaveBeenCalledWith(result.failures[0]);
    const zip = await readZip(parts[0]);
    expect(Object.keys(zip.files)).toEqual(["001.jpg", "003.jpg", "entries.json"]);
    expect(JSON.parse(await zip.file("entries.json")!.async("string")).map((row: { serial: number }) => row.serial)).toEqual([1, 3]);
  });

  it("flushes a partial ZIP on stop and returns only unprocessed entries for continue", async () => {
    let stop = false;
    const onPart = vi.fn(async (_part: CollageZipPart, _blob: Blob) => undefined);
    const result = await exportCollageParts({ items: items(5), jobId: "stop", imagesPerPart: 50, maxPartBytes: 10000, render: async item => { if (item.serial === 2) stop = true; return image(item); }, onPart, shouldStop: () => stop });
    expect(result).toMatchObject({ exported: 2, parts: 1, stopped: true });
    expect(result.remaining.map(item => item.serial)).toEqual([3, 4, 5]);
    expect(onPart.mock.calls[0][0]).toMatchObject({ count: 2 });
  });

  it("does not generate an empty ZIP when every image fails or export is stopped before starting", async () => {
    const onPart = vi.fn();
    const options = { items: items(2), jobId: "empty", imagesPerPart: 50, maxPartBytes: 10000, render: async () => { throw new Error("Failed"); }, onPart };
    expect((await exportCollageParts(options)).failures).toHaveLength(2);
    expect((await exportCollageParts({ ...options, shouldStop: () => true })).remaining).toHaveLength(2);
    expect(onPart).not.toHaveBeenCalled();
  });
  it("does not start another part if storage pauses the export while flushing a byte-limited part", async () => {
    let stop = false;
    const result = await exportCollageParts({ items: items(3), jobId: "storage-stop", imagesPerPart: 50, maxPartBytes: 500, render: async item => ({ name: `${item.serial}.jpg`, blob: new Blob(["x".repeat(220)]) }), onPart: async () => { stop = true; }, shouldStop: () => stop });
    expect(result).toMatchObject({ exported: 1, parts: 1, stopped: true });
    expect(result.remaining.map(item => item.serial)).toEqual([2, 3]);
  });
});
