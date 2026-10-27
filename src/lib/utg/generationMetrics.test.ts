import { describe, expect, it } from "vitest";
import { buildPendingGenerationTasks, calculateGenerationStats, calculateUsageTotals, estimatePendingGenerationCost } from "./generationMetrics";
import { DEFAULT_SETTINGS } from "./storage";
import type { UtgRow } from "./types";

const rows: UtgRow[] = [
  { id: "1", serial: 1, entry: "One", imageText: "IMAGE", description: "Desc", imageValidationStatus: "valid", descValidationStatus: "valid", status: "done" },
  { id: "2", serial: 2, entry: "Two", imageText: "IMAGE", imageValidationStatus: "needs-fix", status: "needs-fix" },
  { id: "3", serial: 3, entry: "Three", status: "idle" },
];

describe("UTG generation metrics", () => {
  it("calculates mode-aware generated, remaining, valid and needs-fix counts", () => {
    expect(calculateGenerationStats(rows, "both")).toMatchObject({
      totalRows: 3,
      generatedRows: 1,
      remainingRows: 2,
      validRows: 1,
      totalCells: 6,
      generatedCells: 3,
      remainingCells: 3,
      needsFixCells: 1,
      overallProgress: 50,
    });
  });

  it("builds tasks only for empty required cells", () => {
    expect(buildPendingGenerationTasks(rows, "both")).toEqual([
      { rowId: "2", kind: "desc" },
      { rowId: "3", kind: "image" },
      { rowId: "3", kind: "desc" },
    ]);
  });

  it("estimates only pending tasks from per-paragraph description limits", () => {
    const settings = { ...DEFAULT_SETTINGS, mode: "desc" as const, descParagraphMax: 20, paragraphs: 3, qualityControlEnabled: false };
    const tasks = [{ rowId: "3", kind: "desc" as const }];
    const first = estimatePendingGenerationCost({ rows, tasks, prompts: { image: "", description: "Prompt" }, settings });
    const withMoreParagraphs = estimatePendingGenerationCost({
      rows,
      tasks,
      prompts: { image: "", description: "Prompt" },
      settings: { ...settings, paragraphs: 6 },
    });
    expect(first).toBeGreaterThan(0);
    expect(withMoreParagraphs).toBeGreaterThan(first);
  });

  it("derives usage totals from per-cell cumulative accounting", () => {
    const usageRows: UtgRow[] = [{
      id: "u", serial: 1, entry: "Usage", status: "done",
      imagePromptTokens: 100, imageCompletionTokens: 10, imageCost: 0.001,
      descPromptTokens: 200, descCompletionTokens: 20, descCost: 0.002,
      descUsageEstimated: true,
      promptTokens: 9999, completionTokens: 9999, cost: 99,
    }];
    expect(calculateUsageTotals(usageRows)).toEqual({
      promptTokens: 300,
      completionTokens: 30,
      cost: 0.003,
      includesEstimates: true,
    });
  });
});
