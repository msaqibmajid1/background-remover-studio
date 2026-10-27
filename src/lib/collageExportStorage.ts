import type { CollageZipPart } from "./collageBatchExport";

// Rendered ZIPs are separate from the user's editable project and survive refresh.
let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("google-images-maker-exports", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("parts");
      request.result.createObjectStore("files");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = undefined; reject(request.error); };
  });
  return database;
}

export async function listCollageZipParts(): Promise<CollageZipPart[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction("parts", "readonly").objectStore("parts").getAll();
    request.onsuccess = () => resolve((request.result as CollageZipPart[]).sort((a, b) => b.createdAt - a.createdAt || b.name.localeCompare(a.name)));
    request.onerror = () => reject(request.error);
  });
}

export async function storeCollageZipPart(part: CollageZipPart, blob: Blob) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["parts", "files"], "readwrite");
    tx.objectStore("parts").put(part, part.id);
    tx.objectStore("files").put(blob, part.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("ZIP storage interrupted"));
  });
}

export async function loadCollageZipPart(id: string): Promise<Blob> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction("files", "readonly").objectStore("files").get(id);
    request.onsuccess = () => request.result instanceof Blob ? resolve(request.result) : reject(new Error("ZIP part is no longer available. Export these entries again."));
    request.onerror = () => reject(request.error);
  });
}

export async function clearCollageZipParts() {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["parts", "files"], "readwrite");
    tx.objectStore("parts").clear();
    tx.objectStore("files").clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("ZIP cleanup interrupted"));
  });
}
