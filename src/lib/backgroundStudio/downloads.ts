export type StudioDownload = {
  id: string;
  name: string;
  size: number;
  count: number;
  kind: "images" | "project";
  createdAt: number;
  temporary?: boolean;
};
let database: Promise<IDBDatabase> | undefined;
function open() {
  return (database ||= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("background-studio-downloads", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("parts");
      request.result.createObjectStore("files");
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        database = undefined;
      };
      resolve(request.result);
    };
    request.onerror = () => {
      database = undefined;
      reject(request.error);
    };
  }));
}
export async function studioDownloads(): Promise<StudioDownload[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const request = db.transaction("parts").objectStore("parts").getAll();
    request.onsuccess = () =>
      resolve(
        (request.result as StudioDownload[]).sort(
          (a, b) => b.createdAt - a.createdAt,
        ),
      );
    request.onerror = () => reject(request.error);
  });
}
export async function cacheStudioDownload(part: StudioDownload, blob: Blob) {
  const db = await open();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["parts", "files"], "readwrite");
    tx.objectStore("parts").put(part, part.id);
    tx.objectStore("files").put(blob, part.id);
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () =>
      reject(
        tx.error ||
          new Error(
            "Download cache storage is full. Download completed parts, remove cached files and export the remaining images.",
          ),
      );
  });
}
export async function studioDownloadBlob(id: string): Promise<Blob> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const request = db.transaction("files").objectStore("files").get(id);
    request.onsuccess = () =>
      request.result instanceof Blob
        ? resolve(request.result)
        : reject(
            new Error(
              "This cached file is no longer available. Export the images again.",
            ),
          );
    request.onerror = () => reject(request.error);
  });
}
export async function removeStudioDownload(id: string) {
  const db = await open();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["parts", "files"], "readwrite");
    tx.objectStore("parts").delete(id);
    tx.objectStore("files").delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () =>
      reject(tx.error || new Error("Could not remove cached file."));
  });
}
