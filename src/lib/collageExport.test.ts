import { afterEach, describe, expect, it, vi } from "vitest";
import { collageExportName, DEFAULT_COLLAGE_EXPORT, normalizeCollageExport, rasterizeCollage } from "./collageExport";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("collage export", () => {
  it("uses JPG by default and normalizes saved settings", () => {
    expect(normalizeCollageExport()).toEqual(DEFAULT_COLLAGE_EXPORT);
    expect(normalizeCollageExport({ quality: 150, background: "invalid", naming: { mode: "number", prefix: "Album", start: -1, padding: 99 } })).toMatchObject({ quality: 100, background: "#ffffff", naming: { start: 1, padding: 9 } });
  });
  it("supports prefix, starting number, padding and filename modes", () => {
    const naming = { ...DEFAULT_COLLAGE_EXPORT.naming, prefix: "Batch", start: 25, padding: 4 };
    expect(collageExportName("TV News", 2, naming)).toBe("Batch-0027-TV-News");
    expect(collageExportName("TV News", 2, { ...naming, mode: "number" })).toBe("Batch-0027");
    expect(collageExportName("TV News", 2, { ...naming, mode: "term" })).toBe("Batch-TV-News");
  });
  it("sanitizes filenames and prevents case-insensitive duplicate ZIP entries", () => {
    const naming = { ...DEFAULT_COLLAGE_EXPORT.naming, mode: "term" as const };
    const used = new Set<string>();
    expect(collageExportName("TV/News", 0, naming, used)).toBe("TV-News");
    expect(collageExportName("TV:News", 1, naming, used)).toBe("TV-News-2");
    expect(collageExportName("tv-news", 2, naming, used)).toBe("tv-news-3");
  });

  const setupRaster = () => {
    const context = { fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() };
    const revoke = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: () => "blob:test", revokeObjectURL: revoke });
    vi.stubGlobal("Image", class { onload?: () => void; set src(_value: string) { queueMicrotask(() => this.onload?.()); } });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
    const encode = vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (callback, mime) {
      expect(this.width).toBe(1200);
      expect(this.height).toBe(630);
      callback(new Blob(["encoded"], { type: mime }));
    });
    return { context, encode, revoke };
  };
  it("encodes true JPEG at selected quality and flattens transparency onto selected background", async () => {
    const { context, encode, revoke } = setupRaster();
    const blob = await rasterizeCollage("<svg/>", { width: 1200, height: 630 }, { ...DEFAULT_COLLAGE_EXPORT, quality: 75, background: "#123456" });
    expect(blob.type).toBe("image/jpeg");
    expect(encode).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", 0.75);
    expect(context.fillStyle).toBe("#123456");
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 1200, 630);
    expect(context.fillRect.mock.invocationCallOrder[0]).toBeLessThan(context.drawImage.mock.invocationCallOrder[0]);
    expect(revoke).toHaveBeenCalledWith("blob:test");
  });
  it("preserves PNG transparency without using JPEG quality", async () => {
    const { context, encode } = setupRaster();
    expect((await rasterizeCollage("<svg/>", { width: 1200, height: 630 }, { ...DEFAULT_COLLAGE_EXPORT, format: "png" })).type).toBe("image/png");
    expect(encode).toHaveBeenCalledWith(expect.any(Function), "image/png", undefined);
    expect(context.fillRect).not.toHaveBeenCalled();
  });
  it("reports encoding failures and cleans up temporary URLs", async () => {
    const { encode, revoke } = setupRaster();
    encode.mockImplementation((callback) => callback(null));
    await expect(rasterizeCollage("<svg/>", { width: 1200, height: 630 }, DEFAULT_COLLAGE_EXPORT)).rejects.toThrow("JPG encoding failed");
    expect(revoke).toHaveBeenCalled();
  });
});
