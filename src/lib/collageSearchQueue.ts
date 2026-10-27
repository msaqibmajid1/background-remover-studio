type QueueEntry = { term: string; images: unknown[]; error?: string; searchStatus?: string };

export const searchTerms = (text: string) => text.split(/\r?\n/).map(term => term.trim()).filter(Boolean);

// Count occurrences, not unique terms: duplicate input rows are separate canvases.
export function restoreSearchQueue<T extends QueueEntry>(entries: T[], text: string, create: (term: string) => T): T[] {
  if (!entries.length) return entries;
  const represented = new Map<string, number>();
  entries.forEach(entry => represented.set(entry.term.trim(), (represented.get(entry.term.trim()) || 0) + 1));
  const missing = searchTerms(text).filter(term => {
    const count = represented.get(term) || 0;
    if (!count) return true;
    represented.set(term, count - 1);
    return false;
  });
  return [...entries.map(entry => entry.searchStatus === "loading" ? { ...entry, searchStatus: entry.error ? "failed" : entry.images.length ? "ready" : "pending" } : entry), ...missing.map(create)];
}

export const pendingSearches = <T extends QueueEntry>(entries: T[]) => entries.filter(entry => !entry.images.length && !entry.error && entry.searchStatus !== "failed");
export const failedSearches = <T extends QueueEntry>(entries: T[]) => entries.filter(entry => !entry.images.length && (!!entry.error || entry.searchStatus === "failed"));
