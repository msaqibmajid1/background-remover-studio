import { describe, expect, it } from "vitest";
import { countUtgParagraphWords, countUtgWords, deriveUtgRowStatus, detectPromptEcho, revalidateUtgRows, uniqueMessages, validateUtgCell } from "./validation";
import { DEFAULT_SETTINGS } from "./storage";

describe("UTG validation", () => {
  it("detects prompt or banned-list echoes", () => {
    expect(detectPromptEcho("FORBIDDEN OUTPUT WORDS OR PHRASES: source, return", ["source", "return"])).toBe(true);
    expect(detectPromptEcho("A clean factual headline", [])).toBe(false);
  });
  it("requires word limits and no banned hits for image text", () => {
    expect(validateUtgCell({
      text: "A VALID SHORT HEADLINE",
      kind: "image",
      minWords: 3,
      maxWords: 6,
      bannedWords: ["production"],
    }).valid).toBe(true);
    expect(validateUtgCell({
      text: "A PRODUCTION HEADLINE",
      kind: "image",
      minWords: 3,
      maxWords: 6,
      bannedWords: ["production"],
    }).valid).toBe(false);
  });

  it("applies source-dependent banned-word allowances", () => {
    const base = {
      text: "The series will return with the original cast.",
      kind: "desc" as const,
      minWords: 5,
      maxWords: 12,
      expectedParagraphs: 1,
      bannedWords: ["return"],
      bannedWordsToleranceLevel: 1,
    };
    expect(validateUtgCell({ ...base, sourceText: "The return was announced." }).bannedHits).toEqual([]);
    expect(validateUtgCell({ ...base, sourceText: "The series was announced." }).bannedHits).toEqual(["return"]);
    expect(validateUtgCell({ ...base, kind: "image", expectedParagraphs: undefined, sourceText: "The return was announced." }).bannedHits)
      .toEqual(["return"]);
  });

  it("requires exact paragraphs for descriptions", () => {
    const result = validateUtgCell({
      text: "First clean paragraph here.\n\nSecond clean paragraph here.",
      kind: "desc",
      minWords: 3,
      maxWords: 6,
      expectedParagraphs: 2,
      bannedWords: ["chapter"],
    });
    expect(result.valid).toBe(true);
    expect(result.paragraphCount).toBe(2);
    expect(countUtgParagraphWords("First clean paragraph here.\n\nSecond clean paragraph here.")).toEqual([4, 4]);
  });

  it("reports the exact description paragraph outside its word range", () => {
    const result = validateUtgCell({
      text: "One two three four.\n\nOne two.\n\nOne two three four five six.",
      kind: "desc",
      minWords: 3,
      maxWords: 5,
      expectedParagraphs: 3,
      bannedWords: [],
    });
    expect(result.issues.map(issue => issue.message)).toEqual([
      "Paragraph 2 too short: 2 words (min 3)",
      "Paragraph 3 too long: 6 words (max 5)",
      "Repeated opening pattern: one two three four",
    ]);
  });

  it("marks both-mode rows done only when both cells are valid", () => {
    expect(deriveUtgRowStatus("valid", "valid", "both")).toBe("done");
    expect(deriveUtgRowStatus("valid", "needs-fix", "both")).toBe("needs-fix");
    expect(deriveUtgRowStatus("valid", undefined, "both")).toBe("needs-fix");
    expect(deriveUtgRowStatus("valid", undefined, "image")).toBe("done");
  });

  it("counts accented names as complete Unicode words", () => {
    expect(countUtgWords("WILL TRENT RETURNS WITH RAMÓN RODRÍGUEZ")).toBe(6);
  });

  it("reports image casing as a structured issue", () => {
    const result = validateUtgCell({
      text: "Mixed Case Headline",
      kind: "image",
      minWords: 3,
      maxWords: 5,
      bannedWords: [],
    });
    expect(result.issues.map(issue => issue.code)).toContain("casing");
  });

  it("flags repeated paragraph and recent-row opening patterns", () => {
    const result = validateUtgCell({
      text: "The series returns with its cast.\n\nThe series returns with new episodes.",
      kind: "desc",
      minWords: 5,
      maxWords: 8,
      expectedParagraphs: 2,
      bannedWords: [],
      previousOpeners: ["The series returns with familiar faces"],
    });
    expect(result.issues.map(issue => issue.code)).toContain("repetition");
  });

  it("revalidates an 85-row batch with Unicode names and structured statuses", () => {
    const rows = Array.from({ length: 85 }, (_, index) => ({
      id: String(index + 1),
      serial: index + 1,
      entry: "Source",
      imageText: "will trent returns with ramón rodríguez on abc tonight",
      description: "First clean paragraph.\n\nSecond clean paragraph.\n\nThird clean paragraph.",
      status: "done" as const,
    }));
    const settings = { ...DEFAULT_SETTINGS, imageMin: 8, imageMax: 10, descParagraphMin: 3, descParagraphMax: 5, paragraphs: 3, antiRepDepth: 0, mode: "both" as const };
    const result = revalidateUtgRows(rows, settings, []);
    expect(result).toHaveLength(85);
    expect(result.every(row => row.status === "done")).toBe(true);
    expect(result.every(row => row.imageText === row.imageText?.toUpperCase())).toBe(true);
  });

  it("preserves cross-row repetition checks during batch revalidation", () => {
    const settings = { ...DEFAULT_SETTINGS, imageMin: 4, imageMax: 8, mode: "image" as const, antiRepDepth: 2 };
    const result = revalidateUtgRows([
      { id: "1", serial: 1, entry: "One", imageText: "THE SERIES RETURNS WITH CAST", status: "done" },
      { id: "2", serial: 2, entry: "Two", imageText: "THE SERIES RETURNS WITH STARS", status: "done" },
    ], settings, []);
    expect(result[1].imageValidationIssues?.map(issue => issue.code)).toContain("repetition");
    expect(result[1].status).toBe("needs-fix");
  });

  it("deduplicates combined validation errors", () => {
    expect(uniqueMessages(["Banned words remain: keep", "Banned words remain: keep | Too short"])).toBe("Banned words remain: keep | Too short");
  });
});
