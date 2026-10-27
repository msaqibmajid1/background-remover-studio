import { calcCost, estimateTokens } from "./costs";
import type { UtgMode, UtgPrompts, UtgRow, UtgSettings } from "./types";

export interface UtgGenerationTask {
  rowId: string;
  kind: "image" | "desc";
}

export interface UtgGenerationStats {
  totalRows: number;
  generatedRows: number;
  remainingRows: number;
  validRows: number;
  totalCells: number;
  generatedCells: number;
  remainingCells: number;
  needsFixCells: number;
  overallProgress: number;
}

export interface UtgUsageTotals {
  promptTokens: number;
  completionTokens: number;
  cost: number;
  includesEstimates: boolean;
}

function requiredKinds(mode: UtgMode): Array<"image" | "desc"> {
  return mode === "image" ? ["image"] : mode === "desc" ? ["desc"] : ["image", "desc"];
}

export function buildPendingGenerationTasks(rows: UtgRow[], mode: UtgMode): UtgGenerationTask[] {
  const kinds = requiredKinds(mode);
  return rows.flatMap(row => kinds.flatMap(kind => {
    const filled = kind === "image" ? Boolean(row.imageText) : Boolean(row.description);
    return filled ? [] : [{ rowId: row.id, kind }];
  }));
}

export function calculateGenerationStats(rows: UtgRow[], mode: UtgMode): UtgGenerationStats {
  const kinds = requiredKinds(mode);
  let generatedRows = 0;
  let validRows = 0;
  let generatedCells = 0;
  let needsFixCells = 0;

  for (const row of rows) {
    const cells = kinds.map(kind => ({
      filled: kind === "image" ? Boolean(row.imageText) : Boolean(row.description),
      status: kind === "image" ? row.imageValidationStatus : row.descValidationStatus,
    }));
    generatedCells += cells.filter(cell => cell.filled).length;
    needsFixCells += cells.filter(cell => cell.status === "needs-fix" || cell.status === "error").length;
    if (cells.every(cell => cell.filled)) generatedRows++;
    if (cells.every(cell => cell.status === "valid")) validRows++;
  }

  const totalCells = rows.length * kinds.length;
  return {
    totalRows: rows.length,
    generatedRows,
    remainingRows: rows.length - generatedRows,
    validRows,
    totalCells,
    generatedCells,
    remainingCells: totalCells - generatedCells,
    needsFixCells,
    overallProgress: totalCells ? Math.round((generatedCells / totalCells) * 100) : 0,
  };
}

export function calculateUsageTotals(rows: UtgRow[]): UtgUsageTotals {
  return rows.reduce<UtgUsageTotals>((totals, row) => {
    const cellPromptTokens = (row.imagePromptTokens || 0) + (row.descPromptTokens || 0);
    const cellCompletionTokens = (row.imageCompletionTokens || 0) + (row.descCompletionTokens || 0);
    const cellCost = (row.imageCost || 0) + (row.descCost || 0);
    return {
      promptTokens: totals.promptTokens + (cellPromptTokens || row.promptTokens || 0),
      completionTokens: totals.completionTokens + (cellCompletionTokens || row.completionTokens || 0),
      cost: totals.cost + (cellCost || row.cost || 0),
      includesEstimates: totals.includesEstimates || Boolean(row.imageUsageEstimated || row.descUsageEstimated),
    };
  }, { promptTokens: 0, completionTokens: 0, cost: 0, includesEstimates: false });
}

export function estimatePendingGenerationCost(args: {
  rows: UtgRow[];
  tasks: UtgGenerationTask[];
  prompts: UtgPrompts;
  settings: UtgSettings;
  renderedPrompt?: (row: UtgRow, kind: "image" | "desc") => string;
}): number {
  const byId = new Map(args.rows.map(row => [row.id, row]));
  const rewriteMultiplier = args.settings.qualityControlEnabled ? 1 + args.settings.qualityMaxRewrites : 1;
  return args.tasks.reduce((total, task) => {
    const row = byId.get(task.rowId);
    if (!row) return total;
    const prompt = args.renderedPrompt?.(row, task.kind) || (task.kind === "image" ? args.prompts.image : args.prompts.description);
    const outputWords = task.kind === "image"
      ? args.settings.imageMax
      : args.settings.descParagraphMax * args.settings.paragraphs;
    const model = task.kind === "image" ? args.settings.imageModel : args.settings.descModel;
    const requestCost = calcCost(
      args.settings.provider,
      model,
      estimateTokens(prompt),
      Math.ceil(outputWords * 1.5),
    );
    return total + requestCost * rewriteMultiplier;
  }, 0);
}
