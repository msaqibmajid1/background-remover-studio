// Centralized generation settings persisted in localStorage.
import { ModuleId } from "./modules";

export type GenMode = "custom_only" | "prompt_only" | "both";
export type ProcessingMode = "sequential" | "parallel";
export type ErrorMode = "stop" | "continue";

export type GenSettings = {
  // Active module + mode (no auto behavior — user must choose)
  module: ModuleId | null;
  mode: GenMode;
  userPrompt: string;
  processingMode: ProcessingMode;
  errorMode: ErrorMode;
  concurrency: number;

  // Models retained for batch flow compatibility.
  imageModel: string;
  descModel: string;
  tone: string;
  imageMin: number;
  imageMax: number;
  descMin: number;
  descMax: number;
  paragraphs: number;
  bannedWords: string[];
  webSearch: boolean;
  imageContentRules: string;
  imageInstructions: string;
  enableCustomImage: boolean;
  descContentRules: string;
  descInstructions: string;
  enableCustomDesc: boolean;
};

const KEY = "gen_settings_v3";

export const PRESET_MODELS = [
  { value: "gpt-5.4", label: "GPT-5.4" },
  { value: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
  { value: "gpt-5.4-nano", label: "GPT-5.4 Nano" },
  { value: "gpt-5", label: "GPT-5" },
  { value: "gpt-5-mini", label: "GPT-5 Mini" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
];

export const DEFAULT_SETTINGS: GenSettings = {
  module: null,
  mode: "both",
  userPrompt: "",
  processingMode: "sequential",
  errorMode: "continue",
  concurrency: 1,
  imageModel: "gpt-5-mini",
  descModel: "gpt-5-mini",
  tone: "",
  imageMin: 14,
  imageMax: 16,
  descMin: 95,
  descMax: 115,
  paragraphs: 3,
  bannedWords: [],
  webSearch: false,
  imageContentRules:
    "Sentence 1 must begin with the main subject, artist, band, or title.\nKeep exact years/dates only if present in the entry.\nNo poetic, cinematic, or dramatic filler.",
  imageInstructions: "",
  enableCustomImage: false,
  descContentRules:
    "Paragraph 1 starts with the main subject and expands the entry.\nParagraph 2 starts with the musician/artist/band member and focuses on their role.\nParagraph 3 starts with the band/artist name and focuses on achievements, records, songs, albums.",
  descInstructions: "",
  enableCustomDesc: false,
};

export function loadSettings(): GenSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: GenSettings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

/** Clears persisted prompt state so the next reload uses pure defaults. */
export function resetPromptState() {
  try {
    localStorage.removeItem(KEY);
    // Defensive: also wipe any legacy keys.
    localStorage.removeItem("gen_settings_v1");
    localStorage.removeItem("gen_settings_v2");
  } catch {}
}
