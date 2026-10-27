import { UtgRow, UtgSettings } from "./types";
import { countBannedWordOccurrences, normalizeBannedWords } from "./bannedWords";

export interface PromptContext {
  entry: string;
  serial: number;
  settings: UtgSettings;
  bannedWords: string[];
  previousOpeners: string[];
}

export type PromptKind = "image" | "description";

const COMMON_PROMPT_VARIABLES = [
  "{{ENTRY}}",
  "{{SERIAL}}",
  "{{TONE}}",
  "{{BANNED_WORDS}}",
  "{{ANTI_REP}}",
] as const;

export const PROMPT_VARIABLES_BY_KIND: Record<PromptKind, readonly string[]> = {
  image: [
    ...COMMON_PROMPT_VARIABLES,
    "{{MIN_WORDS}}",
    "{{MAX_WORDS}}",
  ],
  description: [
    ...COMMON_PROMPT_VARIABLES,
    "{{MIN_WORDS}}",
    "{{MAX_WORDS}}",
    "{{PARAGRAPHS}}",
  ],
};

export function buildContext(row: UtgRow | null, settings: UtgSettings, bannedWords: string[], previousOpeners: string[]): PromptContext {
  return {
    entry: row?.entry ?? "",
    serial: row?.serial ?? 0,
    settings,
    bannedWords,
    previousOpeners,
  };
}

export function renderPrompt(template: string, ctx: PromptContext, kind: PromptKind = "description"): string {
  const s = ctx.settings;
  const previous = ctx.previousOpeners.length ? ctx.previousOpeners.join(" | ") : "None";
  const normalizedBanned = normalizeBannedWords(ctx.bannedWords);
  const allowedTerms = normalizedBanned.filter(word => kind === "description" &&
    countBannedWordOccurrences(ctx.entry, word) > 0 && s.bannedWordsToleranceLevel > 0);
  const strictTerms = normalizedBanned.filter(word => !allowedTerms.includes(word));
  const banned = strictTerms.length ? strictTerms.join(", ") : "None";
  const allowanceRule = allowedTerms.length
    ? ` Source-listed exceptions may appear no more than ${s.bannedWordsToleranceLevel} time(s) each: ${allowedTerms.join(", ")}. This tolerance applies only because those terms occur in the supplied entry.`
    : "";
  const minWords = kind === "image" ? s.imageMin : s.descParagraphMin;
  const maxWords = kind === "image" ? s.imageMax : s.descParagraphMax;
  const map: Record<string, string> = {
    ENTRY: ctx.entry,
    SERIAL: String(ctx.serial),
    TONE: s.tone,
    BANNED_WORDS: banned,
    ANTI_REP: previous,
    MIN_WORDS: String(minWords),
    MAX_WORDS: String(maxWords),
    PARAGRAPHS: String(s.paragraphs),
  };

  const normalizedTemplate = migrateLegacyPromptVariables(template, kind);
  const templateIncludesBannedList = /\{\{\s*BANNED_WORDS\s*\}\}/i.test(normalizedTemplate);
  let out = normalizedTemplate.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/gi, (token, name: string) => {
    const value = map[name.toUpperCase()];
    return value === undefined ? token : value;
  });

  // A row prompt without its source entry cannot produce a grounded result.
  // Append it for older/custom templates that refer to a "supplied entry"
  // without including an entry variable.
  if (ctx.entry.trim() && !out.includes(ctx.entry.trim())) {
    out = `${out.trimEnd()}\n\nFACT AUTHORITY (supplied entry):\n${ctx.entry}`;
  }

  const forbiddenRule = templateIncludesBannedList
    ? "The supplied forbidden list allows zero matches; never reproduce the list itself."
    : `Forbidden words or phrases (zero allowed): ${banned}.`;
  const validationContract = kind === "image"
    ? `Return only one ALL CAPS output containing ${minWords}-${maxWords} Unicode words. Use only facts stated in the supplied entry. ${forbiddenRule}${allowanceRule} Do not return quotes, code fences, notes, or unresolved template variables.`
    : `Return only the finished output with exactly ${s.paragraphs} paragraphs separated by blank lines, each containing ${minWords}-${maxWords} Unicode words. Use only facts stated in the supplied entry, never invent details, never pad by repeating facts, and avoid the recent opening patterns. ${forbiddenRule}${allowanceRule} Do not return code fences, notes, or unresolved template variables.`;

  out = `${out.trimEnd()}\n\nNON-NEGOTIABLE FINAL VALIDATION CONTRACT:\n${validationContract}`;

  return out;
}

export function migrateLegacyPromptVariables(template: string, kind: PromptKind): string {
  const replacements: Record<string, string> = {
    ORIGINAL_ENTRY: "{{ENTRY}}",
    ORIGINAL_TEXT: "{{ENTRY}}",
    SOURCE_ENTRY: "{{ENTRY}}",
    SOURCE_TEXT: "{{ENTRY}}",
    FACT_AUTHORITY: "{{ENTRY}}",
    INPUT: "{{ENTRY}}",
    ROW_NUMBER: "{{SERIAL}}",
    BANNED: "{{BANNED_WORDS}}",
    PREVIOUS_OPENERS: "{{ANTI_REP}}",
    PREVIOUS_ROWS: "{{ANTI_REP}}",
    REPEATED_TERMS: "{{ANTI_REP}}",
    IMAGE_WORD_RANGE: "{{MIN_WORDS}}-{{MAX_WORDS}} words",
    DESC_WORD_RANGE: "{{MIN_WORDS}}-{{MAX_WORDS}} words",
    DESCRIPTION_WORD_RANGE: "{{MIN_WORDS}}-{{MAX_WORDS}} words",
    WORD_RANGE: "{{MIN_WORDS}}-{{MAX_WORDS}} words",
    IMAGE_MIN_WORDS: "{{MIN_WORDS}}",
    IMAGE_MAX_WORDS: "{{MAX_WORDS}}",
    DESCRIPTION_MIN_WORDS: "{{MIN_WORDS}}",
    DESCRIPTION_MAX_WORDS: "{{MAX_WORDS}}",
    DESC_MIN_WORDS: "{{MIN_WORDS}}",
    DESC_MAX_WORDS: "{{MAX_WORDS}}",
    PARAGRAPH_COUNT: "{{PARAGRAPHS}}",
  };

  const withoutModuleLines = template.replace(/^.*\{\{\s*MODULE\s*\}\}.*(?:\r?\n|$)/gim, "");
  const withParagraphSemantics = kind === "description"
    ? withoutModuleLines.replace(
        /keep\s+the\s+complete\s+(?:description|output)\s+between\s+\{\{\s*MIN_WORDS\s*\}\}\s+and\s+\{\{\s*MAX_WORDS\s*\}\}\s+words?\s+inclusive/gi,
        "Keep each paragraph between {{MIN_WORDS}} and {{MAX_WORDS}} words inclusive",
      )
    : withoutModuleLines;
  return withParagraphSemantics.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/gi, (token, name: string) =>
    replacements[name.toUpperCase()] ?? token,
  );
}

export function normalizePrompts<T extends { image: string; description: string }>(prompts: T): T {
  return {
    ...prompts,
    image: migrateLegacyPromptVariables(prompts.image, "image"),
    description: migrateLegacyPromptVariables(prompts.description, "description"),
  };
}

export function findUnresolvedPromptVariables(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(/\{\{\s*([A-Z0-9_]+)\s*\}\}/gi)) {
    found.add(`{{${match[1].toUpperCase()}}}`);
  }
  return Array.from(found);
}

export function firstWords(s: string, n = 5): string {
  return (s || "").trim().split(/\s+/).slice(0, n).join(" ");
}
