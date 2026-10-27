import type { UtgCellValidation, UtgContentKind } from "./validation";

export function descriptionParagraphs(text: string): string[] {
  return text.trim().split(/\n\s*\n/).map(paragraph => paragraph.trim()).filter(Boolean);
}

export function buildParagraphRepairPrompt({ sourceEntry, paragraph, paragraphNumber, minWords, maxWords, bannedWords, previousOpeners, manualInstructions }: {
  sourceEntry: string;
  paragraph: string;
  paragraphNumber: number;
  minWords: number;
  maxWords: number;
  bannedWords: string[];
  previousOpeners: string[];
  manualInstructions?: string;
}): string {
  return `Repair paragraph ${paragraphNumber} only. Return one replacement paragraph and nothing else.

SOURCE FACT AUTHORITY:
${sourceEntry}

CURRENT PARAGRAPH:
${paragraph}

STRICT RULES:
- Write ${minWords}-${maxWords} Unicode words.
- Preserve only facts explicitly supported by the source. Do not infer or add facts.
- Remove all forbidden words or phrases: ${bannedWords.join(", ") || "None"}.
- Do not repeat facts merely to reach the word range.
- Use a natural opening unlike these recent openings: ${previousOpeners.join(" | ") || "None"}.
- Keep the paragraph's purpose and supported facts; change only what is necessary.${manualInstructions ? `\n- Additional user instruction: ${manualInstructions}` : ""}
- Return no label, note, list, quotation marks, or code fence.`;
}

export function buildQualityRepairPrompt({
  kind,
  sourceEntry,
  invalidOutput,
  validation,
  minWords,
  maxWords,
  paragraphs,
  bannedWords,
}: {
  kind: UtgContentKind;
  sourceEntry: string;
  invalidOutput: string;
  validation: UtgCellValidation;
  minWords: number;
  maxWords: number;
  paragraphs: number;
  bannedWords: string[];
}): string {
  const issueCodes = new Set(validation.issues.map(issue => issue.code));
  const rules = [
    kind === "image"
      ? `Keep the complete output between ${minWords} and ${maxWords} Unicode words.`
      : `Keep every paragraph between ${minWords} and ${maxWords} Unicode words.`,
    kind === "image" ? "Return one ALL CAPS headline only." : `Return exactly ${paragraphs} paragraphs separated by blank lines.`,
  ];
  if (issueCodes.has("banned")) rules.push(`Remove every forbidden word or phrase: ${bannedWords.join(", ") || "None"}.`);
  if (issueCodes.has("unresolved-variable")) rules.push("Replace every unresolved template variable with grounded prose or remove it.");
  if (issueCodes.has("paragraph-count")) rules.push(`Restructure the output into exactly ${paragraphs} paragraphs.`);
  if (issueCodes.has("too-short")) rules.push("Add only unused facts explicitly present in the source entry.");
  if (issueCodes.has("too-long")) rules.push("Remove repetition and the least important detail without dropping required facts.");
  if (issueCodes.has("repetition")) rules.push("Use a genuinely different opening and sentence structure without changing the facts.");

  return `Correct the invalid ${kind === "image" ? "headline" : "description"} below.\n\nSOURCE ENTRY:\n${sourceEntry}\n\nINVALID OUTPUT:\n${invalidOutput}\n\nVALIDATION FAILURES:\n${validation.issues.map(issue => `- ${issue.message}`).join("\n")}\n\nREQUIREMENTS:\n- Preserve only facts supported by the source entry.\n- ${rules.join("\n- ")}\n- Return only the corrected output with no notes or code fences.`;
}
