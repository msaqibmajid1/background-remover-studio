import { describe, expect, it } from "vitest";
import { buildUtgFixTasks, countUtgFixTasks } from "./issueCategories";
import type { UtgRow } from "./types";

const rows: UtgRow[] = [
  {
    id: "1", serial: 1, entry: "One", status: "needs-fix",
    imageValidationStatus: "needs-fix",
    imageValidationIssues: [
      { code: "too-short", message: "short" },
      { code: "banned", message: "banned" },
    ],
    descValidationStatus: "valid",
  },
  {
    id: "2", serial: 2, entry: "Two", status: "error",
    imageValidationStatus: "valid",
    descValidationStatus: "needs-fix",
    descValidationIssues: [{ code: "paragraph-count", message: "paragraphs" }],
  },
  {
    id: "3", serial: 3, entry: "Three", status: "error",
    imageValidationStatus: "error",
    imageValidationIssues: [],
  },
  { id: "4", serial: 4, entry: "Four", status: "idle" },
];

describe("UTG issue categories", () => {
  it("deduplicates a cell that matches multiple selected categories", () => {
    expect(buildUtgFixTasks(rows, "both", ["image-word", "image-banned"])).toEqual([
      { rowId: "1", kind: "image" },
    ]);
  });

  it("counts paragraph and uncategorized failures separately", () => {
    expect(countUtgFixTasks(rows, "both", "desc-paragraph")).toBe(1);
    expect(countUtgFixTasks(rows, "both", "image-other")).toBe(1);
  });

  it("respects the active generation mode", () => {
    expect(buildUtgFixTasks(rows, "image", ["desc-paragraph"])).toEqual([]);
  });

  it("does not classify idle ungenerated cells as other issues", () => {
    expect(buildUtgFixTasks(rows, "both", ["image-other", "desc-other"])).toEqual([
      { rowId: "3", kind: "image" },
    ]);
  });
});
