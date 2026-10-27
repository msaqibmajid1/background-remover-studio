// @vitest-environment node
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaProject } from "./collageMedia";
const inline = "data:image/png;base64,AAECAwQFBgcICQ==";
const project = () => ({ version: 1, settings: { size: 1080 }, currentIndex: 4, manualImages: [], entries: Array.from({ length: 527 }, (_, i) => ({ id: `entry-${i}`, images: [{ id: `image-${i}`, url: inline, thumbUrl: inline, dataUrl: inline }], shape: { type: i % 2 ? "circle" : "diamond", x: i, y: i + 10 }, basePlacements: [{ zoom: 150, offsetX: 20 }] })) }) satisfies MediaProject;
const finished = (tx: IDBTransaction) => new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
beforeEach(() => { vi.restoreAllMocks(); vi.resetModules(); vi.stubGlobal("indexedDB", new IDBFactory()); });

describe("incremental collage project storage", () => {
  it("migrates a legacy project, preserves every canvas, and makes a portable lossless backup", async () => {
    const original = project();
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open("google-images-maker", 1); request.onupgradeneeded = () => request.result.createObjectStore("projects"); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const tx = db.transaction("projects", "readwrite"); const done = finished(tx); tx.objectStore("projects").put(original, "current"); await done; db.close();
    const storage = await import("./collageStorage");
    const packed = (await storage.loadStoredProject())! as ReturnType<typeof project>;
    expect(packed.entries).toHaveLength(527);
    expect(packed.entries[0].images[0].dataUrl).toMatch(/^collage-media:/);
    expect(packed.entries[526].shape).toEqual(original.entries[526].shape);
    expect(packed.entries[526].basePlacements).toEqual(original.entries[526].basePlacements);
    const backup = await storage.portableProjectBlob(packed);
    expect(JSON.parse(await backup.text())).toEqual(original);
    expect(await storage.loadStoredProject()).toEqual(packed);
  }, 15000);
  it("writes only an edited entry and never rewrites other entries for navigation or settings", async () => {
    const { collageProject } = await import("./collageProject");
    const original = project();
    const spy = vi.spyOn(IDBObjectStore.prototype, "put");
    await collageProject("save", original);
    spy.mockClear();
    await collageProject("save", { ...original, currentIndex: 50 });
    expect(spy.mock.contexts.filter(store => (store as IDBObjectStore).name === "entries")).toHaveLength(0);
    spy.mockClear();
    const entries = [...original.entries]; entries[50] = { ...entries[50], shape: { ...entries[50].shape, type: "diamond", x: 100 } };
    await collageProject("save", { ...original, entries });
    expect(spy.mock.contexts.filter(store => (store as IDBObjectStore).name === "entries")).toHaveLength(1);
    const restored = (await collageProject<ReturnType<typeof project>>("load"))!;
    expect(restored.entries[50].shape).toEqual(entries[50].shape);
    expect(restored.entries[49].shape).toEqual(entries[49].shape);
  }, 15000);
  it("coalesces queued saves and keeps the latest settings and row edits", async () => {
    const { collageProject } = await import("./collageProject");
    const original = project();
    await Promise.all(Array.from({ length: 10 }, (_, currentIndex) => collageProject("save", { ...original, currentIndex })));
    expect((await collageProject<MediaProject>("load"))!.currentIndex).toBe(9);
  }, 15000);
  it("refuses to export missing stored media rather than generating a broken backup", async () => {
    const { portableProjectBlob } = await import("./collageStorage");
    await expect(portableProjectBlob({ entries: [], manualImages: [{ id: "lost", url: "collage-media:lost", thumbUrl: "collage-media:lost" }] })).rejects.toThrow("missing from browser storage");
  });
  it("leaves the legacy saved project intact if media migration runs out of storage", async () => {
    const original = project();
    const db = await new Promise<IDBDatabase>(resolve => { const request = indexedDB.open("google-images-maker", 1); request.onupgradeneeded = () => request.result.createObjectStore("projects"); request.onsuccess = () => resolve(request.result); });
    const tx = db.transaction("projects", "readwrite"); const done = finished(tx); tx.objectStore("projects").put(original, "current"); await done; db.close();
    const put = IDBObjectStore.prototype.put;
    const spy = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (this: IDBObjectStore, ...args) { if (this.name === "media") throw new Error("Storage quota exceeded"); return put.apply(this, args); });
    const { loadStoredProject } = await import("./collageStorage");
    await expect(loadStoredProject()).rejects.toThrow("Storage quota exceeded");
    spy.mockRestore();
    const opened = await new Promise<IDBDatabase>(resolve => { const request = indexedDB.open("google-images-maker", 2); request.onsuccess = () => resolve(request.result); });
    const saved = await new Promise(resolve => { const request = opened.transaction("projects", "readonly").objectStore("projects").get("current"); request.onsuccess = () => resolve(request.result); });
    expect(saved).toEqual(original);
    opened.close();
  });
});
