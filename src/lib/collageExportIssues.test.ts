import { describe, expect, it } from "vitest";
import { collageExportIssues, exportIssueAdvice, normalizeExportFailures } from "./collageExportIssues";

const entry = (id: string) => ({ id, term: id, imageCount: 2, missingSlots: [] as number[], missingShape: false });
describe("collage issue inspection", () => {
  it("identifies export, loading and missing-slot errors without flagging unprocessed terms", () => {
    const entries = [entry("good"), entry("expired"), { ...entry("captcha"), imageCount: 0, error: "GOOGLE_CAPTCHA" }, { ...entry("missing"), missingSlots: [2] }, { ...entry("pending"), imageCount: 0, missingSlots: [1, 2], searchStatus: "pending" }];
    expect(collageExportIssues(entries, [{ id: "expired", serial: 2, term: "expired", error: "Base slot 1: Image download failed (403)" }])).toEqual([
      { id: "expired", serial: 2, term: "expired", kind: "export", error: "Base slot 1: Image download failed (403)" },
      { id: "captcha", serial: 3, term: "captcha", kind: "search", error: "GOOGLE_CAPTCHA" },
      { id: "missing", serial: 4, term: "missing", kind: "layout", error: "Select an image for base slot 2." },
    ]);
  });
  it("uses current project serials, removes deleted entries, and reports missing shape images", () => {
    const failures = [{ id: "deleted", serial: 1, term: "deleted", error: "Failed" }, { id: "moved", serial: 12, term: "old term", error: "Download failed" }];
    expect(collageExportIssues([{ ...entry("moved"), missingShape: true }], failures)).toEqual([{ id: "moved", serial: 1, term: "moved", kind: "export", error: "Download failed\nThe selected shape image is no longer available. Choose another shape image." }]);
  });
  it("loads only valid saved errors and gives relevant repair guidance", () => {
    const valid = { id: "one", term: "one", serial: 1, error: "GOOGLE_CAPTCHA" };
    expect(normalizeExportFailures([null, {}, valid, { ...valid, serial: -1 }])).toEqual([valid]);
    expect(normalizeExportFailures({})).toEqual([]);
    expect(exportIssueAdvice({ ...valid, kind: "search" })).toContain("source browser tab");
    expect(exportIssueAdvice({ ...valid, error: "PNG encoding failed", kind: "export" })).toContain("smaller canvas");
    expect(exportIssueAdvice({ ...valid, error: "Base slot 1: HTTP 403: The link may require sign-in", kind: "export" })).toContain("replace the indicated image");
  });
  it("keeps only five genuine failures among a hundred entries with their original serial numbers", () => {
    const entries = Array.from({ length: 100 }, (_, index) => entry(`entry-${index + 1}`));
    const serials = [5, 12, 30, 66, 98];
    const failures = serials.map(serial => ({ id: `entry-${serial}`, serial, term: `entry-${serial}`, error: "Image download failed (403)" }));
    expect(collageExportIssues(entries, failures).map(issue => issue.serial)).toEqual(serials);
  });
});
