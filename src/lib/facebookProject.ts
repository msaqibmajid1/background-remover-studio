const database = new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open('facebook-extractor', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('projects');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
export async function facebookProject(action: 'load' | 'save' | 'clear', value?: unknown): Promise<any> {
  const db = await database;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('projects', action === 'load' ? 'readonly' : 'readwrite');
    const store = transaction.objectStore('projects');
    const request = action === 'load' ? store.get('current') : action === 'clear' ? store.delete('current') : store.put(value, 'current');
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Project save interrupted'));
  });
}
