import type { UtgMode, UtgRow, UtgValidationIssueCode } from "./types";

export type UtgFixCategory =
  | "image-word"
  | "image-banned"
  | "image-other"
  | "desc-word"
  | "desc-banned"
  | "desc-paragraph"
  | "desc-other";

export interface UtgFixTask {
  rowId: string;
  kind: "image" | "desc";
}

const WORD_CODES = new Set<UtgValidationIssueCode>(["too-short", "too-long"]);

function matchesCategory(row: UtgRow, category: UtgFixCategory): boolean {
  const image = category.startsWith("image-");
  const suffix = category.replace(image ? "image-" : "desc-", "");
  const issues = image ? row.imageValidationIssues || [] : row.descValidationIssues || [];
  const status = image ? row.imageValidationStatus : row.descValidationStatus;
  const codes = new Set(issues.map(issue => issue.code));

  if (suffix === "word") return issues.some(issue => WORD_CODES.has(issue.code));
  if (suffix === "banned") return codes.has("banned");
  if (suffix === "paragraph") return codes.has("paragraph-count");

  const known = image
    ? new Set<UtgValidationIssueCode>(["too-short", "too-long", "banned"])
    : new Set<UtgValidationIssueCode>(["too-short", "too-long", "banned", "paragraph-count"]);
  const failedWithoutStructuredIssues = (status === "error" || status === "needs-fix") && issues.length === 0;
  return issues.some(issue => !known.has(issue.code)) || failedWithoutStructuredIssues;
}

export function buildUtgFixTasks(rows: UtgRow[], mode: UtgMode, categories: UtgFixCategory[]): UtgFixTask[] {
  const selected = new Set(categories);
  const tasks = new Map<string, UtgFixTask>();

  for (const row of rows) {
    if (mode !== "desc") {
      const matched = (["image-word", "image-banned", "image-other"] as UtgFixCategory[])
        .some(category => selected.has(category) && matchesCategory(row, category));
      if (matched) tasks.set(`${row.id}:image`, { rowId: row.id, kind: "image" });
    }
    if (mode !== "image") {
      const matched = (["desc-word", "desc-banned", "desc-paragraph", "desc-other"] as UtgFixCategory[])
        .some(category => selected.has(category) && matchesCategory(row, category));
      if (matched) tasks.set(`${row.id}:desc`, { rowId: row.id, kind: "desc" });
    }
  }

  return Array.from(tasks.values());
}

export function countUtgFixTasks(rows: UtgRow[], mode: UtgMode, category: UtgFixCategory): number {
  return buildUtgFixTasks(rows, mode, [category]).length;
}
