import { compactMediaAssets, isStoredMedia, portableAssets, type MediaAsset, type MediaProject, type MediaWrite } from "./collageMedia";
let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("google-images-maker", 2);
    let blocked = false;
    request.onupgradeneeded = () => {
      for (const name of ["projects", "media", "entries"]) if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name);
    };
    request.onsuccess = () => {
      const db = request.result;
      if (blocked) { db.close(); return; }
      db.onversionchange = () => { db.close(); database = undefined; };
      resolve(db);
    };
    request.onerror = () => { database = undefined; reject(request.error || new Error("Could not open project storage")); };
    request.onblocked = () => { blocked = true; database = undefined; reject(new Error("Close other Google Images Maker tabs, then reload this tab to upgrade project storage.")); };
  });
  return database;
}
const completed = (tx: IDBTransaction) => new Promise<void>((resolve, reject) => {
  tx.oncomplete = () => resolve();
  tx.onerror = () => reject(tx.error || new Error("Project storage failed"));
  tx.onabort = () => reject(tx.error || new Error("Project storage interrupted"));
});
const result = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
async function writeMedia(values: MediaWrite[]) {
  const db = await openDatabase();
  const tx = db.transaction("media", "readwrite");
  const done = completed(tx);
  for (const item of values) tx.objectStore("media").put(item.blob, item.key);
  await done;
}
export const compactStoredImages = <T extends MediaAsset>(images: T[]) => compactMediaAssets(images, writeMedia);
export async function storedMediaBlob(key: string): Promise<Blob> {
  const db = await openDatabase();
  const blob = await result(db.transaction("media", "readonly").objectStore("media").get(key));
  if (!(blob instanceof Blob)) throw new Error("This image is missing from browser storage. Reload its project backup or replace the image.");
  return blob;
}
export async function compactStoredProject<T extends MediaProject>(project: T): Promise<T> {
  const entries: MediaProject["entries"] = [];
  for (const entry of project.entries) entries.push({ ...entry, images: await compactStoredImages(entry.images) });
  return { ...project, entries, manualImages: await compactStoredImages(project.manualImages) };
}
async function portableStoredAssets(images: MediaAsset[]) {
  const keys = [...new Set(images.flatMap(image => [image.dataUrl, image.url, image.originalUrl, image.thumbUrl].filter(isStoredMedia)))];
  const db = await openDatabase();
  const store = db.transaction("media", "readonly").objectStore("media");
  const blobs = await Promise.all(keys.map(key => result(store.get(key))));
  const media = new Map(keys.map((key, index) => [key, blobs[index]]));
  return portableAssets(images, async key => {
    const blob = media.get(key);
    if (!(blob instanceof Blob)) throw new Error("This image is missing from browser storage. Reload its project backup or replace the image.");
    return blob;
  });
}
export async function saveStoredProject(header: Record<string, unknown>, entries: MediaProject["entries"]) {
  const compact: MediaProject["entries"] = [];
  for (const entry of entries) compact.push({ ...entry, images: await compactStoredImages(entry.images) });
  const manualImages = await compactStoredImages((header.manualImages || []) as MediaAsset[]);
  const db = await openDatabase();
  const tx = db.transaction(["projects", "entries"], "readwrite");
  const done = completed(tx);
  for (const entry of compact) tx.objectStore("entries").put(entry, entry.id);
  tx.objectStore("projects").put({ storageVersion: 2, header: { ...header, manualImages } }, "current");
  await done;
}
export async function loadStoredProject(): Promise<MediaProject | undefined> {
  const db = await openDatabase();
  const current = await result(db.transaction("projects", "readonly").objectStore("projects").get("current"));
  if (!current) return undefined;
  if (current.storageVersion === 2) {
    const { entryIds, ...header } = current.header;
    const store = db.transaction("entries", "readonly").objectStore("entries");
    const entries = await Promise.all((entryIds as string[]).map(id => result(store.get(id))));
    if (entries.some(entry => !entry)) throw new Error("Some saved entries are missing. Load your project backup.");
    return { ...header, entries } as MediaProject;
  }
  // Do not replace the legacy save until all originals are safely stored.
  const project = await compactStoredProject(current as MediaProject);
  const { entries, ...header } = project;
  await saveStoredProject({ ...header, entryIds: entries.map(entry => entry.id) }, entries);
  return project;
}
export async function portableProjectBlob(project: MediaProject): Promise<Blob> {
  const { entries, manualImages, ...header } = project;
  const chunks: BlobPart[] = [JSON.stringify(header).slice(0, -1), `${Object.keys(header).length ? "," : ""}"manualImages":[`];
  for (let index = 0; index < manualImages.length; index++) {
    if (index) chunks.push(",");
    chunks.push(new Blob([JSON.stringify((await portableStoredAssets([manualImages[index]]))[0])]));
  }
  chunks.push('],"entries":[');
  for (let index = 0; index < entries.length; index++) {
    if (index) chunks.push(",");
    chunks.push(new Blob([JSON.stringify({ ...entries[index], images: await portableStoredAssets(entries[index].images) })]));
  }
  chunks.push("]}");
  return new Blob(chunks, { type: "application/json" });
}
