import { UtgPrompts, UtgRow, UtgSettings, UtgProviderId } from "./types";

function dl(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const csvEscape = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;

export function exportCSV(rows: UtgRow[]) {
  const header = [
    "#", "Entry", "Image Text", "Description", "Status",
    "Total Input Tokens", "Total Output Tokens", "Total Attempts", "Actual Cost",
    "Image Input Tokens", "Image Output Tokens", "Image Attempts", "Image Cost", "Image Validation", "Image Banned Hits",
    "Description Input Tokens", "Description Output Tokens", "Description Attempts", "Description Cost", "Description Validation", "Description Banned Hits",
  ];
  const lines = [header.map(csvEscape).join(",")];
  rows.forEach(r => {
    lines.push([
      String(r.serial), r.entry, r.imageText || "", r.description || "",
      r.status,
      String(r.promptTokens || 0), String(r.completionTokens || 0), String((r.imageAttempts || 0) + (r.descAttempts || 0)),
      (r.cost || 0).toFixed(6),
      String(r.imagePromptTokens || 0), String(r.imageCompletionTokens || 0), String(r.imageAttempts || 0),
      (r.imageCost || 0).toFixed(6), r.imageValidationStatus || "", (r.imageBannedHits || []).join(", "),
      String(r.descPromptTokens || 0), String(r.descCompletionTokens || 0), String(r.descAttempts || 0),
      (r.descCost || 0).toFixed(6), r.descValidationStatus || "", (r.descBannedHits || []).join(", "),
    ].map(csvEscape).join(","));
  });
  dl(`utg-export-${Date.now()}.csv`, "\uFEFF" + lines.join("\n"), "text/csv;charset=utf-8");
}

export function exportJSON(rows: UtgRow[]) {
  dl(`utg-export-${Date.now()}.json`, JSON.stringify(rows, null, 2), "application/json");
}

const providerExportKey = (provider: UtgProviderId) => provider === "xai" ? "grok" : provider;

function buildProviderModels(settings: UtgSettings) {
  const defaults = {
    openai: { description: "gpt-4.1-nano", imageText: "gpt-4.1-nano" },
    gemini: { description: "gemini-2.5-flash", imageText: "gemini-2.5-flash" },
    grok: { description: "grok-4-fast-non-reasoning", imageText: "grok-4-fast-non-reasoning" },
    deepseek: { description: "deepseek-chat", imageText: "deepseek-chat" },
    groq: { description: "llama-3.3-70b-versatile", imageText: "llama-3.3-70b-versatile" },
  };
  const activeProvider = providerExportKey(settings.provider);
  return {
    ...defaults,
    [activeProvider]: {
      description: settings.descModel,
      imageText: settings.imageModel,
    },
  };
}

const tokenBlock = (inputTokens = 0, outputTokens = 0) => ({
  input_tokens: inputTokens,
  output_tokens: outputTokens,
  total_tokens: inputTokens + outputTokens,
});

export function exportConversationJSON(rows: UtgRow[], settings: UtgSettings, prompts: UtgPrompts, bannedWords: string[]) {
  const payload = {
    version: 2,
    exported_at: new Date().toISOString(),
    settings: {
      provider: providerExportKey(settings.provider),
      providerModels: buildProviderModels(settings),
      tone: settings.tone,
      imageTextPrompt: prompts.image || "",
      descriptionPrompt: prompts.description || "",
      descMin: settings.descParagraphMin * settings.paragraphs,
      descMax: settings.descParagraphMax * settings.paragraphs,
      descParagraphs: settings.paragraphs,
      imgMin: settings.imageMin,
      imgMax: settings.imageMax,
      bannedWords,
      webSearch: settings.webSearch,
      temperature: settings.temperature,
      antiRepCount: settings.antiRepDepth,
    },
    rows: rows.map(row => ({
      id: row.serial,
      entry: row.entry,
      image_text: row.imageText || "",
      description: row.description || "",
      tokens: {
        image_text: tokenBlock(row.imagePromptTokens || 0, row.imageCompletionTokens || 0),
        description: tokenBlock(row.descPromptTokens || 0, row.descCompletionTokens || 0),
      },
      generationMeta: {
        image_text: null,
        description: null,
      },
      errors: {
        ...(row.imageError ? { image_text: row.imageError } : {}),
        ...(row.descError ? { description: row.descError } : {}),
        ...(row.error ? { row: row.error } : {}),
      },
      validationErrors: {
        ...(row.imageValidationIssues?.length ? { image_text: row.imageValidationIssues.map(issue => issue.message) } : {}),
        ...(row.descValidationIssues?.length ? { description: row.descValidationIssues.map(issue => issue.message) } : {}),
      },
    })),
  };

  dl(`utg-conv-export-${Date.now()}.json`, JSON.stringify(payload, null, 2), "application/json");
}

export function exportMarkdown(rows: UtgRow[]) {
  const header = `| # | Entry | Image Text | Description |\n| --- | --- | --- | --- |`;
  const body = rows.map(r =>
    `| ${r.serial} | ${(r.entry || "").replace(/\|/g, "\\|")} | ${(r.imageText || "").replace(/\|/g, "\\|")} | ${(r.description || "").replace(/\|/g, "\\|")} |`
  ).join("\n");
  dl(`utg-export-${Date.now()}.md`, `${header}\n${body}\n`, "text/markdown");
}

export function buildXlsxRows(rows: UtgRow[]) {
  return rows.map(r => ({
    "Sr. No.": r.serial,
    "Image Text": r.imageText || "",
    Description: r.description || "",
  }));
}

export async function exportXLSX(rows: UtgRow[]) {
  try {
    const XLSX = await import("xlsx");
    const data = buildXlsxRows(rows);
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 10 }, { wch: 42 }, { wch: 110 }];
    ws["!autofilter"] = { ref: `A1:C${Math.max(1, rows.length + 1)}` };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "UTG");
    XLSX.writeFile(wb, `utg-export-${Date.now()}.xlsx`);
  } catch {
    // xlsx package missing; fall back to CSV
    exportCSV(rows);
  }
}
