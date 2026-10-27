import type { UtgPreset, UtgPrompts, UtgRow, UtgSettings } from "./types";

const DB_NAME = "canvas-codex-utg";
const DB_VERSION = 1;
const STORE_NAME = "row-snapshots";
const LATEST_KEY = "latest";
const PREVIOUS_KEY = "previous";
const LEGACY_KEYS = [
  "utg_rows_v1",
  "utg_settings_v1",
  "utg_prompts_v1",
  "utg_banned_v1",
  "utg_presets_v1",
  "utg_active_preset_v1",
];

export interface UtgWorkspaceState {
  rows: UtgRow[];
  settings: UtgSettings;
  prompts: UtgPrompts;
  bannedWords: string[];
  presets: UtgPreset[];
  activePresetId: string | null;
}

interface WorkspaceSnapshot extends UtgWorkspaceState {
  schemaVersion: 2;
  savedAt: string;
}

interface LegacyRowSnapshot {
  rows: UtgRow[];
  savedAt?: string;
}

let saveQueue: Promise<void> = Promise.resolve();

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed"));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction was aborted"));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("This browser does not support IndexedDB"));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open IndexedDB"));
  });
}

function isLegacyRowSnapshot(value: unknown): value is LegacyRowSnapshot {
  return Boolean(value && typeof value === "object" && Array.isArray((value as LegacyRowSnapshot).rows));
}

function isWorkspaceSnapshot(value: unknown): value is WorkspaceSnapshot {
  if (!isLegacyRowSnapshot(value)) return false;
  const snapshot = value as Partial<WorkspaceSnapshot>;
  return snapshot.schemaVersion === 2 && Boolean(snapshot.settings && snapshot.prompts && Array.isArray(snapshot.bannedWords));
}

export function buildDurableRowSnapshot(rows: UtgRow[], persistedRows: UtgRow[]): UtgRow[] {
  const persistedById = new Map(persistedRows.map(row => [row.id, row]));
  return rows.map(row => {
    if (row.status !== "running" && row.status !== "queued") return row;
    return persistedById.get(row.id) || { id: row.id, serial: row.serial, entry: row.entry, status: "idle" };
  });
}

export function buildDurableWorkspaceSnapshot(
  current: UtgWorkspaceState,
  persisted?: UtgWorkspaceState,
): UtgWorkspaceState {
  return {
    ...structuredClone(current),
    rows: buildDurableRowSnapshot(current.rows, persisted?.rows || []),
  };
}

async function readRawSnapshot(db: IDBDatabase, key: string): Promise<unknown> {
  const transaction = db.transaction(STORE_NAME, "readonly");
  const done = transactionDone(transaction);
  const value = await requestResult(transaction.objectStore(STORE_NAME).get(key));
  await done;
  return value;
}

function toWorkspace(value: unknown, fallback: UtgWorkspaceState): UtgWorkspaceState | undefined {
  if (isWorkspaceSnapshot(value)) {
    return {
      rows: value.rows,
      settings: value.settings,
      prompts: value.prompts,
      bannedWords: value.bannedWords,
      presets: value.presets || [],
      activePresetId: value.activePresetId || null,
    };
  }
  if (isLegacyRowSnapshot(value)) return { ...structuredClone(fallback), rows: value.rows };
  return undefined;
}

async function writeWorkspace(db: IDBDatabase, workspace: UtgWorkspaceState): Promise<void> {
  const latestRaw = await readRawSnapshot(db, LATEST_KEY);
  const latest = toWorkspace(latestRaw, workspace);
  const durable = buildDurableWorkspaceSnapshot(workspace, latest);
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const done = transactionDone(transaction);
  const store = transaction.objectStore(STORE_NAME);
  if (latestRaw) store.put(latestRaw, PREVIOUS_KEY);
  store.put({ ...durable, schemaVersion: 2, savedAt: new Date().toISOString() } satisfies WorkspaceSnapshot, LATEST_KEY);
  await done;
}

function cleanupLegacyStorage() {
  try { LEGACY_KEYS.forEach(key => localStorage.removeItem(key)); } catch { /* Best effort after durable save. */ }
}

export async function loadWorkspaceDurably(fallback: UtgWorkspaceState): Promise<UtgWorkspaceState> {
  const db = await openDatabase();
  try {
    const latestRaw = await readRawSnapshot(db, LATEST_KEY);
    const latest = toWorkspace(latestRaw, fallback);
    if (latest) {
      if (!isWorkspaceSnapshot(latestRaw)) await writeWorkspace(db, latest);
      cleanupLegacyStorage();
      return latest;
    }
    const previous = toWorkspace(await readRawSnapshot(db, PREVIOUS_KEY), fallback);
    if (previous) {
      await writeWorkspace(db, previous);
      cleanupLegacyStorage();
      return previous;
    }
    await writeWorkspace(db, fallback);
    cleanupLegacyStorage();
    return fallback;
  } finally {
    db.close();
  }
}

export function saveWorkspaceDurably(workspace: UtgWorkspaceState): Promise<void> {
  const snapshot = structuredClone(workspace);
  saveQueue = saveQueue.catch(() => undefined).then(async () => {
    const db = await openDatabase();
    try {
      await writeWorkspace(db, snapshot);
      cleanupLegacyStorage();
    } finally {
      db.close();
    }
  });
  return saveQueue;
}

export async function restorePreviousWorkspace(fallback: UtgWorkspaceState): Promise<UtgWorkspaceState> {
  await saveQueue.catch(() => undefined);
  const db = await openDatabase();
  try {
    const previous = toWorkspace(await readRawSnapshot(db, PREVIOUS_KEY), fallback);
    if (!previous) throw new Error("No previous autosave is available");
    await writeWorkspace(db, previous);
    cleanupLegacyStorage();
    return previous;
  } finally {
    db.close();
  }
}
