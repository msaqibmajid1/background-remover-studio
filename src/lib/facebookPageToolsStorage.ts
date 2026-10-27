let database: Promise<IDBDatabase> | undefined;
function open() {
  return database ||= new Promise((resolve, reject) => {
    const request = indexedDB.open("facebook-page-tools", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("projects");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = undefined; reject(request.error); };
  });
}
export async function pageToolsProject<T>(key: "cloner" | "deleter" | "monetization" | "insights" | "replies", value?: T): Promise<T | undefined> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("projects", value === undefined ? "readonly" : "readwrite");
    const store = tx.objectStore("projects");
    const request = value === undefined ? store.get(key) : store.put(value, key);
    tx.oncomplete = () => resolve(value === undefined ? request.result : value);
    tx.onerror = tx.onabort = () => reject(tx.error || new Error("Project could not be saved"));
  });
}
