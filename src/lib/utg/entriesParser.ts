import { UtgRow } from "./types";

const RX = /^\s*(\d+)[.\)\:\-\s]+(.+)$/;

export function parseEntries(raw: string): UtgRow[] {
  const lines = raw.split(/\r?\n/);
  const out: UtgRow[] = [];
  let auto = 1;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const m = RX.exec(t);
    const serial = m ? parseInt(m[1], 10) : auto;
    const entry = m ? m[2].trim() : t;
    if (!entry) continue;
    out.push({
      id: crypto.randomUUID(),
      serial,
      entry,
      status: "idle",
    });
    auto = Math.max(auto, serial) + 1;
  }
  return out;
}

export function appendEntries(existing: UtgRow[], raw: string): UtgRow[] {
  const start = existing.reduce((m, r) => Math.max(m, r.serial), 0);
  const parsed = parseEntries(raw);
  return [
    ...existing,
    ...parsed.map((r, i) => ({ ...r, serial: start + i + 1 })),
  ];
}

export function serializeEntries(rows: UtgRow[]): string {
  return rows.map(r => `${r.serial}. ${r.entry}`).join("\n");
}
