import { useState, useCallback, useEffect } from "react";

export interface DownloadHistoryEntry {
  id: string;
  timestamp: number;
  urls: string[];
  successCount: number;
  failedCount: number;
  totalCount: number;
  zipFilename: string;
  settings: {
    prefix: string;
    startNumber: number;
    useOriginalFilenames: boolean;
    outputFormat: string;
    quality: number;
  };
}

const STORAGE_KEY = "image-downloader-history";
const MAX_ENTRIES = 50;

const loadFromStorage = (): DownloadHistoryEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveToStorage = (entries: DownloadHistoryEntry[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Storage full — silently fail
  }
};

export function useDownloadHistory() {
  const [history, setHistory] = useState<DownloadHistoryEntry[]>(() => loadFromStorage());

  // Sync to localStorage whenever history changes
  useEffect(() => {
    saveToStorage(history);
  }, [history]);

  const addEntry = useCallback((entry: Omit<DownloadHistoryEntry, "id" | "timestamp">) => {
    const newEntry: DownloadHistoryEntry = {
      ...entry,
      id: `dl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };
    setHistory((prev) => [newEntry, ...prev].slice(0, MAX_ENTRIES));
    return newEntry;
  }, []);

  const removeEntry = useCallback((id: string) => {
    setHistory((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return { history, addEntry, removeEntry, clearHistory };
}
