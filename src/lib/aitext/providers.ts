// Frontend provider registry. Stored in localStorage.
export type ProviderType = "openai" | "gemini" | "openai_compatible";

export type ProviderConfig = {
  id: string;
  schemaVersion?: number;
  type: ProviderType;
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  status: "unknown" | "valid" | "invalid";
  lastError?: string;
};

export const PROVIDER_TYPES: Record<ProviderType, {
  label: string;
  defaultBaseUrl: string;
  modelSuggestions: string[];
}> = {
  openai: {
    label: "OpenAI",
    defaultBaseUrl: "https://api.openai.com/v1",
    modelSuggestions: [
      "gpt-5.2", "gpt-5", "gpt-5-mini", "gpt-5-nano",
      "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano",
      "gpt-4o", "gpt-4o-mini",
      "o1", "o1-mini", "o1-pro",
      "o3", "o3-mini", "o4-mini",
      "chatgpt-4o-latest",
    ],
  },
  gemini: {
    label: "Google Gemini",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    modelSuggestions: [
      "gemini-3.1-pro-preview", "gemini-3-flash-preview",
      "gemini-3-pro-image-preview", "gemini-3.1-flash-image-preview",
      "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-flash-image",
      "gemini-2.0-flash", "gemini-2.0-flash-lite",
      "gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.5-flash-8b",
    ],
  },
  openai_compatible: {
    label: "OpenAI-Compatible (Custom)",
    defaultBaseUrl: "",
    modelSuggestions: [
      "llama-3.3-70b-instruct", "llama-3.1-70b-instruct", "llama-3.1-8b-instruct",
      "mistral-large-latest", "mistral-small-latest",
      "deepseek-chat", "deepseek-reasoner",
      "qwen-2.5-72b-instruct",
    ],
  },
};

const KEY = "provider_configs_v1";
const ACTIVE_KEY = "active_provider_id_v1";

const CURRENT_SCHEMA_VERSION = 1;

function migrateProvider(p: any): ProviderConfig {
  // v0 → v1: stamp schemaVersion so future migrations have a baseline.
  if (!p || typeof p !== "object") return p;
  if (!p.schemaVersion) p.schemaVersion = CURRENT_SCHEMA_VERSION;
  return p as ProviderConfig;
}

export function loadProviders(): ProviderConfig[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map(migrateProvider);
  } catch { return []; }
}

export function saveProviders(list: ProviderConfig[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function getActiveProviderId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveProviderId(id: string | null) {
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}

export function newProvider(type: ProviderType): ProviderConfig {
  const meta = PROVIDER_TYPES[type];
  return {
    id: crypto.randomUUID(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    type,
    name: meta.label,
    apiKey: "",
    baseUrl: meta.defaultBaseUrl,
    model: meta.modelSuggestions[0] || "",
    status: "unknown",
  };
}
