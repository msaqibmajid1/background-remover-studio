import type { UtgContentKind } from "./validation";

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```[^\n]*\n?([\s\S]*?)\n?```$/);
  return match ? match[1].trim() : trimmed;
}

function stripWrappingQuotes(text: string): string {
  const pairs: Array<[string, string]> = [["\"", "\""], ["'", "'"], ["“", "”"]];
  const pair = pairs.find(([start, end]) => text.startsWith(start) && text.endsWith(end));
  return pair && text.length > 1 ? text.slice(pair[0].length, -pair[1].length).trim() : text;
}

export function normalizeModelOutput(text: string, kind: UtgContentKind): string {
  let normalized = stripWrappingQuotes(stripCodeFence(text).replace(/\r\n?/g, "\n").trim());
  if (kind === "image") {
    normalized = normalized.replace(/\s+/g, " ").trim().toUpperCase();
  } else {
    normalized = normalized
      .split("\n")
      .map(line => line.replace(/[\t ]+/g, " ").trim())
      .join("\n")
      .replace(/\n{2,}/g, "\n\n")
      .trim();
  }
  return normalized;
}
