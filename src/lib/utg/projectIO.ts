import { UtgPreset, UtgProjectFile, UtgPrompts, UtgRow, UtgSettings, UtgProviderId } from "./types";

export function buildProject(args: {
  rows: UtgRow[]; settings: UtgSettings; prompts: UtgPrompts;
  bannedWords: string[]; presets: UtgPreset[]; activePresetId: string | null;
}): UtgProjectFile {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    rows: args.rows,
    settings: args.settings,
    prompts: args.prompts,
    bannedWords: args.bannedWords,
    presets: args.presets,
    activePresetId: args.activePresetId,
    provider: args.settings.provider,
    imageModel: args.settings.imageModel,
    descModel: args.settings.descModel,
  };
}

export function downloadProject(p: UtgProjectFile) {
  const blob = new Blob([JSON.stringify(p, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `utg-project-${Date.now()}.json`; a.click();
  URL.revokeObjectURL(url);
}

export function parseProject(text: string): UtgProjectFile {
  const p = JSON.parse(text);
  if (!p || p.version !== 1) throw new Error("Unsupported project file");
  if (!Array.isArray(p.rows)) throw new Error("Missing rows");
  return p as UtgProjectFile;
}
