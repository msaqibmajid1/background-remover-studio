import type { BatchExportFailure } from "./collageBatchExport";
import { validImageFailures } from "./collageImageErrors";

export type CollageExportIssue = BatchExportFailure & { kind: "export" | "search" | "layout" };
type IssueEntry = { id: string; term: string; imageCount: number; error?: string; searchStatus?: string; missingSlots: number[]; missingShape: boolean };

export function normalizeExportFailures(value: unknown): BatchExportFailure[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is BatchExportFailure => !!item && typeof item.id === "string" && typeof item.error === "string" && typeof item.term === "string" && Number.isInteger(item.serial) && item.serial > 0).map(item => ({ ...item, ...(item.imageFailures ? { imageFailures: validImageFailures(item.imageFailures) } : {}) }));
}

export function collageExportIssues(entries: IssueEntry[], failures: BatchExportFailure[]): CollageExportIssue[] {
  const byId = new Map(failures.map(failure => [failure.id, failure]));
  return entries.flatMap((entry, index) => {
    const failure = byId.get(entry.id);
    const messages: string[] = [];
    if (failure) messages.push(failure.error);
    if (entry.error) messages.push(entry.error);
    if (!entry.error && entry.searchStatus === "failed") messages.push("Image search failed with no results.");
    if (entry.imageCount > 0 && entry.missingSlots.length) messages.push(`Select an image for base slot${entry.missingSlots.length > 1 ? "s" : ""} ${entry.missingSlots.join(", ")}.`);
    if (entry.missingShape) messages.push("The selected shape image is no longer available. Choose another shape image.");
    if (!messages.length) return [];
    return [{ id: entry.id, serial: index + 1, term: entry.term, error: [...new Set(messages)].join("\n"), kind: failure ? "export" : entry.error || entry.searchStatus === "failed" ? "search" : "layout", ...(failure?.imageFailures ? { imageFailures: failure.imageFailures } : {}) }];
  });
}

export function exportIssueAdvice(issue: CollageExportIssue): string {
  if (issue.kind === "search" && /captcha|consent|sign.?in|login/i.test(issue.error)) return "Complete the check in the source browser tab, then retry this search.";
  if (issue.kind === "layout") return "Open this entry in the editor and select an image for each missing base or shape slot.";
  if (issue.kind === "search") return "Retry the image search or choose a manually uploaded image in the editor.";
  if (/encod|render|canvas|memory/i.test(issue.error)) return "Try a smaller canvas size or JPG export. Check that every selected image is available.";
  return "Retry this export. If the original image remains unavailable, open the editor and replace the indicated image.";
}
