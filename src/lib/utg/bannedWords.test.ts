import { describe, expect, it } from "vitest";
import { countBannedWordOccurrences, findBannedWords, findBannedWordViolations, normalizeBannedWords } from "./bannedWords";

describe("banned word enforcement", () => {
  it("normalizes separators, quotes and duplicate casing", () => {
    expect(normalizeBannedWords([" Massive ", "'fresh'/", "massive"], "helm; chapter\nproduction")).toEqual([
      "massive", "fresh", "helm", "chapter", "production",
    ]);
  });

  it("matches case-insensitive whole words and phrases", () => {
    const hits = findBannedWords("A Massive production uses fresh sets, not refreshed ones.", [
      "massive", "production", "fresh", "new chapter",
    ]);
    expect(hits).toEqual(["massive", "production", "fresh"]);
  });

  it("allows a configured number only when the term exists in the source", () => {
    expect(countBannedWordOccurrences("Return, then return again.", "return")).toBe(2);
    expect(findBannedWordViolations({
      text: "The show will return once.",
      sourceText: "A return is planned.",
      bannedWords: ["return"],
      toleranceLevel: 1,
    })).toEqual([]);
    expect(findBannedWordViolations({
      text: "The show will return twice after its return.",
      sourceText: "A return is planned.",
      bannedWords: ["return"],
      toleranceLevel: 1,
    })).toEqual(["return"]);
    expect(findBannedWordViolations({
      text: "The show will return once.",
      sourceText: "The show is planned.",
      bannedWords: ["return"],
      toleranceLevel: 2,
    })).toEqual(["return"]);
  });
});
