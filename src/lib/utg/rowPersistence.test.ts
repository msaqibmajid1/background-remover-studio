import { describe, expect, it } from "vitest";
import { buildDurableRowSnapshot, buildDurableWorkspaceSnapshot } from "./rowPersistence";
import { DEFAULT_SETTINGS } from "./storage";
import type { UtgRow } from "./types";

const persisted: UtgRow[] = [
  { id: "1", serial: 1, entry: "One", imageText: "SAVED", status: "done" },
  { id: "2", serial: 2, entry: "Two", status: "idle" },
];

describe("UTG durable row snapshots", () => {
  it("preserves the last completed value while a cell is streaming", () => {
    const current: UtgRow[] = [
      { ...persisted[0], imageText: "PARTIAL STREAM", status: "running" },
      { ...persisted[1], imageText: "COMPLETE", status: "done" },
    ];
    expect(buildDurableRowSnapshot(current, persisted)).toEqual([
      persisted[0],
      current[1],
    ]);
  });

  it("creates a safe idle record for a new row that is still streaming", () => {
    const current: UtgRow[] = [{ id: "3", serial: 3, entry: "Three", imageText: "PARTIAL", status: "running" }];
    expect(buildDurableRowSnapshot(current, [])).toEqual([
      { id: "3", serial: 3, entry: "Three", status: "idle" },
    ]);
  });

  it("checkpoints prompts, settings, banned words and rows in one workspace snapshot", () => {
    const previous = {
      rows: persisted,
      settings: DEFAULT_SETTINGS,
      prompts: { image: "OLD IMAGE", description: "OLD DESC" },
      bannedWords: ["old"],
      presets: [],
      activePresetId: null,
    };
    const current = {
      ...previous,
      rows: [{ ...persisted[0], imageText: "PARTIAL", status: "running" as const }],
      prompts: { image: "NEW IMAGE", description: "NEW DESC" },
      bannedWords: ["new"],
    };
    expect(buildDurableWorkspaceSnapshot(current, previous)).toEqual({
      ...current,
      rows: [persisted[0]],
    });
  });
});
