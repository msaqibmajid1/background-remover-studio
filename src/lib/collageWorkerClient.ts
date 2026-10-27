import type { MediaAsset, MediaProject } from "./collageMedia";
let worker: Worker | undefined;
let sequence = 0;
const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
export async function storageRequest<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (typeof Worker === "undefined") {
    const storage = await import("./collageStorage");
    switch (action) {
      case "load": return await storage.loadStoredProject() as T;
      case "save": return await storage.saveStoredProject(payload.header as Record<string, unknown>, payload.entries as MediaProject["entries"]) as T;
      case "compact": return await storage.compactStoredImages(payload.images as MediaAsset[]) as T;
      case "import": return await storage.compactStoredProject(JSON.parse(await (payload.file as File).text())) as T;
      case "export": return await storage.portableProjectBlob(payload.project as MediaProject) as T;
      case "blob": return await storage.storedMediaBlob(payload.key as string) as T;
    }
    throw new Error("Unknown project storage request");
  }
  if (!worker) {
    worker = new Worker(new URL("../workers/collageStorage.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }) => {
      const request = pending.get(data.id);
      if (!request) return;
      pending.delete(data.id);
      if (data.error) request.reject(new Error(data.error)); else request.resolve(data.value);
    };
    worker.onerror = () => {
      for (const request of pending.values()) request.reject(new Error("Project background worker stopped. Save a backup and reload this tab."));
      pending.clear(); worker?.terminate(); worker = undefined;
    };
  }
  return new Promise<T>((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
    try { worker!.postMessage({ ...payload, id, action }); }
    catch (error) { pending.delete(id); reject(error); }
  });
}
export const compactCollageImages = <T extends MediaAsset>(images: T[]) => storageRequest<T[]>("compact", { images });
export const loadCollageMedia = (key: string) => storageRequest<Blob>("blob", { key });
export const importCollageProject = <T>(file: File) => storageRequest<T>("import", { file });
export const exportCollageProject = (project: unknown) => storageRequest<Blob>("export", { project });
