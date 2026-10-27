import { findBannedWordViolations } from "./bannedWords";
import { normalizeModelOutput } from "./outputNormalization";
import type {
  UtgCellValidationStatus,
  UtgMode,
  UtgRow,
  UtgSettings,
  UtgValidationIssue,
  UtgValidationIssueCode,
} from "./types";

export type UtgContentKind = "image" | "desc";

export interface UtgCellValidation {
  valid: boolean;
  wordCount: number;
  paragraphCount?: number;
  bannedHits: string[];
  issues: UtgValidationIssue[];
}

function normalizedOpener(text: string, words = 4): string {
  return (text.match(WORD_PATTERN) || [])
    .slice(0, words)
    .join(" ")
    .toLocaleLowerCase();
}

export function findRepeatedOpeners(text: string, previousOpeners: string[] = []): string[] {
  const paragraphs = text.trim().split(/\n\s*\n/).filter(Boolean);
  const seen = new Set(previousOpeners.map(opener => normalizedOpener(opener)).filter(Boolean));
  const repeated: string[] = [];
  for (const paragraph of paragraphs) {
    const opener = normalizedOpener(paragraph);
    if (!opener) continue;
    if (seen.has(opener)) repeated.push(opener);
    seen.add(opener);
  }
  return Array.from(new Set(repeated));
}

const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

export function countUtgWords(text: string): number {
  return (text.trim().match(WORD_PATTERN) || []).length;
}

export function countUtgParagraphs(text: string): number {
  return text.trim() ? text.trim().split(/\n\s*\n/).filter(paragraph => paragraph.trim()).length : 0;
}

export function countUtgParagraphWords(text: string): number[] {
  return text.trim()
    ? text.trim().split(/\n\s*\n/).filter(paragraph => paragraph.trim()).map(countUtgWords)
    : [];
}

export function uniqueMessages(messages: Array<string | undefined>): string | undefined {
  const unique = Array.from(new Set(messages.flatMap(message => message?.split(" | ") || []).map(message => message.trim()).filter(Boolean)));
  return unique.length ? unique.join(" | ") : undefined;
}

export function formatValidationIssues(issues: UtgValidationIssue[]): string | undefined {
  return uniqueMessages(issues.map(issue => issue.message));
}

export function detectPromptEcho(text: string, bannedHits: string[]): boolean {
  if (/\b(?:forbidden|banned)\s+(?:output\s+)?words?\s+(?:or\s+phrases?\s*)?:/i.test(text)) return true;
  return bannedHits.length >= 8;
}

function issue(code: UtgValidationIssueCode, message: string): UtgValidationIssue {
  return { code, message };
}

export function validateUtgCell({ text, kind, minWords, maxWords, expectedParagraphs, bannedWords, previousOpeners = [], sourceText = "", bannedWordsToleranceLevel = 0 }: {
  text: string;
  kind: UtgContentKind;
  minWords: number;
  maxWords: number;
  expectedParagraphs?: number;
  bannedWords: string[];
  previousOpeners?: string[];
  sourceText?: string;
  bannedWordsToleranceLevel?: number;
}): UtgCellValidation {
  const wordCount = countUtgWords(text);
  const paragraphCount = kind === "desc" ? countUtgParagraphs(text) : undefined;
  const bannedHits = findBannedWordViolations({
    text,
    sourceText,
    bannedWords,
    toleranceLevel: kind === "desc" ? bannedWordsToleranceLevel : 0,
  });
  const issues: UtgValidationIssue[] = [];

  if (!text.trim()) issues.push(issue("empty", "Output is empty"));
  if (kind === "image") {
    if (text.trim() && wordCount < minWords) issues.push(issue("too-short", `Too short: ${wordCount} words (min ${minWords})`));
    if (text.trim() && wordCount > maxWords) issues.push(issue("too-long", `Too long: ${wordCount} words (max ${maxWords})`));
  } else {
    countUtgParagraphWords(text).forEach((count, index) => {
      if (count < minWords) issues.push(issue("too-short", `Paragraph ${index + 1} too short: ${count} words (min ${minWords})`));
      if (count > maxWords) issues.push(issue("too-long", `Paragraph ${index + 1} too long: ${count} words (max ${maxWords})`));
    });
  }
  if (kind === "desc" && expectedParagraphs != null && paragraphCount !== expectedParagraphs) {
    issues.push(issue("paragraph-count", `Wrong paragraph count: ${paragraphCount} (required ${expectedParagraphs})`));
  }
  if (bannedHits.length > 0) issues.push(issue("banned", `Banned words remain: ${bannedHits.join(", ")}`));
  if (detectPromptEcho(text, bannedHits)) issues.push(issue("prompt-echo", "Output repeated prompt instructions or the banned list"));
  if (kind === "image" && /\p{Ll}/u.test(text)) issues.push(issue("casing", "Image text must be ALL CAPS"));
  const repeatedOpeners = findRepeatedOpeners(text, previousOpeners);
  if (repeatedOpeners.length > 0) issues.push(issue("repetition", `Repeated opening pattern: ${repeatedOpeners.join("; ")}`));

  return { valid: issues.length === 0, wordCount, paragraphCount, bannedHits, issues };
}

export function deriveUtgRowStatus(
  imageStatus: UtgCellValidationStatus | undefined,
  descStatus: UtgCellValidationStatus | undefined,
  mode: UtgMode,
): "done" | "needs-fix" | "error" {
  const required = mode === "image" ? [imageStatus] : mode === "desc" ? [descStatus] : [imageStatus, descStatus];
  if (required.includes("error")) return "error";
  return required.every(status => status === "valid") ? "done" : "needs-fix";
}

function validateRowCell(row: UtgRow, kind: UtgContentKind, settings: UtgSettings, bannedWords: string[], previousOpeners: string[] = []) {
  const text = kind === "image" ? row.imageText || "" : row.description || "";
  const existingStatus = kind === "image" ? row.imageValidationStatus : row.descValidationStatus;
  if (!text && existingStatus === "error") return null;
  if (!text) return undefined;
  return validateUtgCell({
    text,
    kind,
    minWords: kind === "image" ? settings.imageMin : settings.descParagraphMin,
    maxWords: kind === "image" ? settings.imageMax : settings.descParagraphMax,
    expectedParagraphs: kind === "desc" ? settings.paragraphs : undefined,
    bannedWords,
    previousOpeners,
    sourceText: row.entry,
    bannedWordsToleranceLevel: settings.bannedWordsToleranceLevel,
  });
}

export function revalidateUtgRow(row: UtgRow, settings: UtgSettings, bannedWords: string[], previousOpeners: string[] = []): UtgRow {
  if (row.status === "running" || row.status === "queued") return row;
  if (!row.imageText && !row.description && row.status !== "error") return row;
  const normalizedRow = {
    ...row,
    imageText: row.imageText ? normalizeModelOutput(row.imageText, "image") : row.imageText,
    description: row.description ? normalizeModelOutput(row.description, "desc") : row.description,
  };
  const image = validateRowCell(normalizedRow, "image", settings, bannedWords, previousOpeners);
  const desc = validateRowCell(normalizedRow, "desc", settings, bannedWords, previousOpeners);
  const imageValidationStatus = image === null ? "error" : image ? (image.valid ? "valid" : "needs-fix") : undefined;
  const descValidationStatus = desc === null ? "error" : desc ? (desc.valid ? "valid" : "needs-fix") : undefined;
  const imageError = image === null ? row.imageError : image ? formatValidationIssues(image.issues) : undefined;
  const descError = desc === null ? row.descError : desc ? formatValidationIssues(desc.issues) : undefined;

  return {
    ...normalizedRow,
    imageBannedHits: image ? image.bannedHits : row.imageBannedHits,
    descBannedHits: desc ? desc.bannedHits : row.descBannedHits,
    imageValidationIssues: image ? image.issues : row.imageValidationIssues,
    descValidationIssues: desc ? desc.issues : row.descValidationIssues,
    imageValidationStatus,
    descValidationStatus,
    imageError,
    descError,
    error: uniqueMessages([imageError, descError]),
    status: deriveUtgRowStatus(imageValidationStatus, descValidationStatus, settings.mode),
  };
}

export function revalidateUtgRows(rows: UtgRow[], settings: UtgSettings, bannedWords: string[]): UtgRow[] {
  return rows.map((row, index) => {
    const start = Math.max(0, index - settings.antiRepDepth);
    const previousOpeners = rows.slice(start, index).flatMap(previous => [
      normalizedOpener(previous.imageText || ""),
      normalizedOpener(previous.description || ""),
    ]).filter(Boolean);
    return revalidateUtgRow(row, settings, bannedWords, previousOpeners);
  });
}
