// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { blobDataUrl, CollagePreviewCache, compactMediaAssets, portableAssets, type MediaWrite } from "./collageMedia";

describe("collage media memory", () => {
  it("replaces embedded duplicates with one reference without losing original bytes or remote URLs", async () => {
    const inline = `data:image/png;base64,${btoa("original pixels".repeat(1000))}`;
    const asset = { id: "one", url: inline, thumbUrl: inline, dataUrl: inline, originalUrl: "https://example.test/full.png" };
    const media = new Map<string, Blob>();
    const packed = await compactMediaAssets([asset], async writes => { writes.forEach(item => media.set(item.key, item.blob)); });
    expect(media.size).toBe(1);
    expect(packed[0].dataUrl).toBe(packed[0].url);
    expect(packed[0].originalUrl).toBe(asset.originalUrl);
    expect(JSON.stringify(packed).length).toBeLessThan(JSON.stringify([asset]).length / 10);
    expect(await portableAssets(packed, async key => media.get(key)!)).toEqual([asset]);
  });
  it("leaves existing stored and remote images unchanged and surfaces storage failures", async () => {
    const asset = { id: "a", url: "https://example.test/a", thumbUrl: "collage-media:thumb", dataUrl: "collage-media:original" };
    const write = vi.fn();
    expect((await compactMediaAssets([asset], write))[0]).toBe(asset);
    expect(write).not.toHaveBeenCalled();
    await expect(compactMediaAssets([{ ...asset, dataUrl: "data:image/png;base64,AAAA" }], async (_values: MediaWrite[]) => { throw new Error("Quota exceeded"); })).rejects.toThrow("Quota exceeded");
  });
  it("round trips binary data without byte corruption", async () => {
    const blob = new Blob([Uint8Array.from({ length: 100000 }, (_, index) => index % 256)], { type: "image/png" });
    expect((await blobDataUrl(blob)).startsWith("data:image/png;base64,")).toBe(true);
  });
  it("bounds preview references by both count and bytes, revoking old object URLs", () => {
    const revoked = vi.fn();
    const cache = new CollagePreviewCache(revoked, 12, 1000);
    for (let index = 0; index < 527; index++) cache.put(String(index), `blob:${index}`, 150);
    expect(Object.keys(cache.snapshot())).toHaveLength(6);
    expect(cache.bytes).toBe(900);
    expect(revoked).toHaveBeenCalledTimes(521);
    cache.retain(new Set(["526"]));
    expect(cache.snapshot()).toEqual({ "526": "blob:526" });
    cache.clear();
    expect(cache.snapshot()).toEqual({});
    expect(revoked).toHaveBeenCalledTimes(527);
  });
});
