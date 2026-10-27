export function normalizeBannedWords(...sources: Array<string | string[]>): string[] {
  const normalized = new Set<string>();
  for (const source of sources) {
    const values = Array.isArray(source) ? source : [source];
    for (const value of values) {
      for (const item of String(value || "").split(/[\n,;\u2022]+/)) {
        const clean = item
          .trim()
          .replace(/^[\s'"`/\\*-]+|[\s'"`/\\*-]+$/g, "")
          .replace(/\s+/g, " ")
          .toLowerCase();
        if (clean) normalized.add(clean);
      }
    }
  }
  return Array.from(normalized);
}

export function findBannedWords(text: string, bannedWords: string[]): string[] {
  const found = new Set<string>();
  for (const word of normalizeBannedWords(bannedWords)) {
    const pattern = escapeRegExp(word).replace(/\s+/g, "\\s+");
    const re = new RegExp(`(^|[^a-z0-9_])${pattern}(?=$|[^a-z0-9_])`, "i");
    if (re.test(text)) found.add(word);
  }
  return Array.from(found);
}

export function countBannedWordOccurrences(text: string, word: string): number {
  const clean = normalizeBannedWords(word)[0];
  if (!clean) return 0;
  const pattern = escapeRegExp(clean).replace(/\s+/g, "\\s+");
  const re = new RegExp(`(^|[^a-z0-9_])${pattern}(?=$|[^a-z0-9_])`, "gi");
  return Array.from(text.matchAll(re)).length;
}

export function findBannedWordViolations({ text, sourceText = "", bannedWords, toleranceLevel = 0 }: {
  text: string;
  sourceText?: string;
  bannedWords: string[];
  toleranceLevel?: number;
}): string[] {
  return normalizeBannedWords(bannedWords).filter(word => {
    const outputCount = countBannedWordOccurrences(text, word);
    if (outputCount === 0) return false;
    const sourceContainsWord = countBannedWordOccurrences(sourceText, word) > 0;
    const allowedCount = sourceContainsWord ? Math.max(0, Math.floor(Number(toleranceLevel) || 0)) : 0;
    return outputCount > allowedCount;
  });
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
