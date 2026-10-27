import { describe, expect, it } from "vitest";
import { buildParagraphRepairPrompt, buildQualityRepairPrompt, descriptionParagraphs } from "./qualityRepair";
import { validateUtgCell } from "./validation";

describe("targeted quality repair", () => {
  it("includes only relevant failure-specific instructions", () => {
    const validation = validateUtgCell({
      text: "A production headline that is far too long for this field",
      kind: "image",
      minWords: 3,
      maxWords: 5,
      bannedWords: ["production"],
    });
    const prompt = buildQualityRepairPrompt({
      kind: "image",
      sourceEntry: "Source entry",
      invalidOutput: "Invalid output",
      validation,
      minWords: 3,
      maxWords: 5,
      paragraphs: 3,
      bannedWords: ["production"],
    });
    expect(prompt).toContain("Too long");
    expect(prompt).toContain("Remove every forbidden word or phrase: production");
    expect(prompt).toContain("Return one ALL CAPS headline only");
    expect(prompt).not.toContain("Restructure the output into exactly 3 paragraphs");
  });

  it("builds a paragraph-only repair without asking for a full description rewrite", () => {
    const prompt = buildParagraphRepairPrompt({
      sourceEntry: "A show returned with its original cast.",
      paragraph: "The production returned with its original cast.",
      paragraphNumber: 2,
      minWords: 8,
      maxWords: 12,
      bannedWords: ["production"],
      previousOpeners: ["The series returned this week"],
      manualInstructions: "Keep the title first.",
    });
    expect(prompt).toContain("Repair paragraph 2 only");
    expect(prompt).toContain("8-12 Unicode words");
    expect(prompt).toContain("production");
    expect(prompt).toContain("Keep the title first");
    expect(descriptionParagraphs("One.\n\nTwo.")).toEqual(["One.", "Two."]);
  });
});
