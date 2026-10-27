import type { MediaProject } from "./collageMedia";
import { storageRequest } from "./collageWorkerClient";
let savedEntries = new Map<string, MediaProject["entries"][number]>();
let nextProject: MediaProject | undefined;
let writing = false;
let waiters: { resolve: () => void; reject: (error: unknown) => void }[] = [];

// Coalesce pending saves and send only changed rows to the background worker.
async function writeLatest() {
  if (writing) return;
  writing = true;
  try {
    while (nextProject) {
      const project = nextProject;
      const listeners = waiters;
      nextProject = undefined; waiters = [];
      const { entries, ...header } = project;
      const changed = entries.filter(entry => savedEntries.get(entry.id) !== entry);
      try {
        await storageRequest("save", { header: { ...header, entryIds: entries.map(entry => entry.id) }, entries: changed });
        savedEntries = new Map(entries.map(entry => [entry.id, entry]));
        listeners.forEach(listener => listener.resolve());
      } catch (error) { listeners.forEach(listener => listener.reject(error)); }
    }
  } finally { writing = false; }
}

export async function collageProject<T>(action: "load" | "save", value?: T): Promise<T | undefined> {
  if (action === "load") {
    savedEntries.clear();
    return storageRequest<T | undefined>("load");
  }
  if (!value) throw new Error("No project supplied");
  return new Promise((resolve, reject) => {
    nextProject = value as unknown as MediaProject;
    waiters.push({ resolve: () => resolve(undefined), reject });
    void writeLatest();
  });
}
