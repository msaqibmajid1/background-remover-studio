import { UtgKey, UtgProviderId } from "./types";

const cursor: Partial<Record<UtgProviderId, number>> = {};

export function nextActiveKey(provider: UtgProviderId, keys: UtgKey[]): UtgKey | null {
  const active = keys.filter(k => k.status === "active");
  if (active.length === 0) return null;
  const idx = (cursor[provider] ?? 0) % active.length;
  cursor[provider] = (idx + 1) % active.length;
  return active[idx];
}

export function markKey(keys: UtgKey[], id: string, status: UtgKey["status"], error?: string): UtgKey[] {
  return keys.map(k => k.id === id ? { ...k, lastError: error } : k);
}

export function statusFromHttp(code: number): UtgKey["status"] {
  if (code === 401 || code === 403) return "invalid";
  if (code === 429) return "rate-limited";
  if (code === 402) return "failed";
  return "failed";
}

export function resetCursor(provider?: UtgProviderId) {
  if (provider) cursor[provider] = 0;
  else for (const k of Object.keys(cursor) as UtgProviderId[]) cursor[k] = 0;
}
