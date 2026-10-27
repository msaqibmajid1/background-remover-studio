export type UtgProviderId = "openai" | "gemini" | "xai" | "deepseek" | "groq";

export type UtgMode = "image" | "desc" | "both";
export type UtgInvalidOutputMode = "save" | "discard";
export type UtgCellValidationStatus = "valid" | "needs-fix" | "error";
export type UtgValidationIssueCode = "empty" | "too-short" | "too-long" | "paragraph-count" | "banned" | "casing" | "unresolved-variable" | "prompt-echo" | "repetition";

export interface UtgValidationIssue {
  code: UtgValidationIssueCode;
  message: string;
}

export interface UtgKey {
  id: string;
  value: string;
  status: "active" | "failed" | "rate-limited" | "invalid";
  lastError?: string;
}

export interface UtgProviderConfig {
  id: UtgProviderId;
  label: string;
  baseUrl: string;
  keys: UtgKey[];
}

export interface UtgModelPrice {
  modelId: string;
  label: string;
  inputPer1M: number;
  outputPer1M: number;
  supportsStructuredOutput?: boolean;
  source?: "fallback" | "live" | "custom";
}

export interface UtgSettings {
  provider: UtgProviderId;
  imageModel: string;
  descModel: string;
  temperature: number;
  webSearch: boolean;
  imageMin: number;
  imageMax: number;
  descMin: number;
  descMax: number;
  descParagraphMin: number;
  descParagraphMax: number;
  tone: string;
  paragraphs: number;
  antiRepDepth: number;
  mode: UtgMode;
  qualityControlEnabled: boolean;
  qualityMaxRewrites: number;
  qualityInvalidOutput: UtgInvalidOutputMode;
  bannedWordsToleranceLevel: number;
}

export interface UtgPrompts {
  image: string;
  description: string;
}

export interface UtgRow {
  id: string;
  serial: number;
  entry: string;
  imageText?: string;
  description?: string;
  status: "idle" | "queued" | "running" | "done" | "needs-fix" | "error";
  error?: string;
  promptTokens?: number;
  completionTokens?: number;
  cost?: number;
  imagePromptTokens?: number;
  imageCompletionTokens?: number;
  imageCost?: number;
  descPromptTokens?: number;
  descCompletionTokens?: number;
  descCost?: number;
  imageUsageEstimated?: boolean;
  descUsageEstimated?: boolean;
  imageAttempts?: number;
  descAttempts?: number;
  imageBannedHits?: string[];
  descBannedHits?: string[];
  imageValidationStatus?: UtgCellValidationStatus;
  descValidationStatus?: UtgCellValidationStatus;
  imageError?: string;
  descError?: string;
  imageValidationIssues?: UtgValidationIssue[];
  descValidationIssues?: UtgValidationIssue[];
  version?: number;
}

export interface UtgPreset {
  id: string;
  name: string;
  settings: UtgSettings;
  prompts: UtgPrompts;
  bannedWords: string[];
  createdAt: number;
}

export interface UtgProjectFile {
  version: 1;
  exportedAt: string;
  rows: UtgRow[];
  settings: UtgSettings;
  prompts: UtgPrompts;
  bannedWords: string[];
  presets: UtgPreset[];
  activePresetId: string | null;
  provider: UtgProviderId;
  imageModel: string;
  descModel: string;
}
