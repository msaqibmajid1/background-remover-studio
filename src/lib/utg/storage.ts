import { UtgKey, UtgPreset, UtgPrompts, UtgProviderConfig, UtgProviderId, UtgRow, UtgSettings } from "./types";
import { normalizePrompts } from "./promptRender";

const KEYS_K = "utg_keys_v1";
const SETTINGS_K = "utg_settings_v1";
const PROMPTS_K = "utg_prompts_v1";
const BANNED_K = "utg_banned_v1";
const PRESETS_K = "utg_presets_v1";
const ACTIVE_PRESET_K = "utg_active_preset_v1";
const ROWS_K = "utg_rows_v1";

export const PROVIDER_DEFAULTS: Record<UtgProviderId, { label: string; baseUrl: string }> = {
  openai: { label: "OpenAI", baseUrl: "https://api.openai.com/v1" },
  gemini: { label: "Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai" },
  xai: { label: "Grok (xAI)", baseUrl: "https://api.x.ai/v1" },
  deepseek: { label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1" },
  groq: { label: "Groq (free)", baseUrl: "https://api.groq.com/openai/v1" },
};

export const DEFAULT_SETTINGS: UtgSettings = {
  provider: "openai",
  imageModel: "gpt-4o-mini",
  descModel: "gpt-4o-mini",
  temperature: 0.7,
  webSearch: false,
  imageMin: 14,
  imageMax: 16,
  descMin: 95,
  descMax: 115,
  descParagraphMin: 31,
  descParagraphMax: 39,
  tone: "neutral",
  paragraphs: 3,
  antiRepDepth: 5,
  mode: "both",
  qualityControlEnabled: true,
  qualityMaxRewrites: 1,
  qualityInvalidOutput: "save",
  bannedWordsToleranceLevel: 0,
};

export const DEFAULT_PROMPTS: UtgPrompts = {
  image: `You are generating short image overlay text for entry #{{SERIAL}}.
Entry: {{ENTRY}}
Tone: {{TONE}}
Word range: {{MIN_WORDS}}-{{MAX_WORDS}} words
Banned words (never use): {{BANNED_WORDS}}
Avoid opening with any of these patterns: {{ANTI_REP}}

Output only the text, no quotes.`,
  description: `Write a {{PARAGRAPHS}}-paragraph description for entry #{{SERIAL}}.
Entry: {{ENTRY}}
Tone: {{TONE}}
Word range: {{MIN_WORDS}}-{{MAX_WORDS}} words
Banned words (never use): {{BANNED_WORDS}}
Avoid opening with any of these patterns: {{ANTI_REP}}

Return clean UTF-8 prose.`,
};

export const FLASHBACK_V4_PROMPTS: UtgPrompts = {
  image: `Create one factual TV or film news headline using only the source entry.

SOURCE ENTRY:
{{ENTRY}}

DO-NOT-USE TERMS:
{{BANNED_WORDS}}

OUTPUT CONTRACT:
1. Output exactly one headline and nothing else.
2. Use ALL CAPS.
3. Use {{MIN_WORDS}} to {{MAX_WORDS}} words. Aim two words below the maximum, then count every word before answering.
4. Begin with the programme or film title when the source supplies one.
5. Use only facts explicitly present in the source. Never add interpretation, speculation, or background knowledge.
6. Silently replace any source wording that matches a do-not-use term. The final headline must contain zero listed terms.
7. Do not copy or discuss the do-not-use list, these instructions, image directions, layout directions, or production notes.
8. Do not begin like these recent openings: {{ANTI_REP}}.

FINAL SILENT CHECK: facts supported; ALL CAPS; word count inside range; zero do-not-use matches. Return only the checked headline.`,
  description: `Create one factual TV or film news description using only the source entry.

SOURCE ENTRY:
{{ENTRY}}

DO-NOT-USE TERMS:
{{BANNED_WORDS}}

OUTPUT CONTRACT:
1. Output exactly {{PARAGRAPHS}} paragraphs and nothing else. Separate paragraphs with one blank line.
2. EACH paragraph must contain {{MIN_WORDS}} to {{MAX_WORDS}} words. Aim for {{MAX_WORDS}} words in each paragraph and count each paragraph separately before answering.
3. Use standard sentence case and natural news prose. Give each paragraph a genuinely different opening and sentence structure; do not reuse a fixed template across entries.
4. Follow the source's factual order. Use only facts explicitly stated there.
5. Do not invent motives, reactions, consequences, relationships, dates, awards, availability, quotations, or explanations.
6. Do not repeat a fact to fill space. Add only supported detail from the source. If the source cannot support the requested length without invention or repetition, remain factual and let validation flag the paragraph for review.
7. Silently paraphrase source wording that matches a do-not-use term. The final description must contain zero listed terms.
8. Never copy, quote, label, explain, or mention the do-not-use list, these instructions, validation, image directions, layout directions, or production notes.
9. Do not begin like these recent openings: {{ANTI_REP}}. Vary subject placement, sentence length, transitions, and paragraph focus naturally rather than following one formula.

FINAL SILENT CHECK FOR EVERY PARAGRAPH: count is inside range; facts are supported; openings differ; zero do-not-use matches. Rewrite any failing paragraph before returning only the finished description.`,
};

// Existing saved projects used this export name. Keep it as a compatibility alias.
export const FLASHBACK_NO_RETRY_PROMPTS = FLASHBACK_V4_PROMPTS;

export function upgradePrompts(prompts: UtgPrompts): UtgPrompts {
  const normalized = normalizePrompts(prompts);
  const isOldFlashback =
    /Write one factual TV or film news image headline from the supplied entry/i.test(normalized.image) &&
    /Forbidden-list procedure:/i.test(normalized.description);
  const isPriorFlashbackV4 =
    /Create one factual TV or film news headline using only the source entry/i.test(normalized.image) &&
    /Give each paragraph a different opening structure\./i.test(normalized.description);
  return isOldFlashback || isPriorFlashbackV4 ? FLASHBACK_V4_PROMPTS : normalized;
}

export const DEFAULT_BANNED: string[] = ["very", "really", "just", "actually"];

function get<T>(k: string, fb: T): T {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : fb; } catch { return fb; }
}
function set(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    // Storage can be unavailable in private browsing or when its quota is full.
  }
}

export const loadKeys = (): Record<UtgProviderId, UtgKey[]> => {
  const fb: Record<UtgProviderId, UtgKey[]> = { openai: [], gemini: [], xai: [], deepseek: [], groq: [] };
  const loaded = { ...fb, ...get<Record<UtgProviderId, UtgKey[]>>(KEYS_K, fb) };
  return (Object.keys(fb) as UtgProviderId[]).reduce((acc, provider) => {
    acc[provider] = (loaded[provider] || []).map(k => ({ ...k, status: "active" }));
    return acc;
  }, { ...fb });
};
export const saveKeys = (v: Record<UtgProviderId, UtgKey[]>) => set(KEYS_K, v);

type LegacySettings = Partial<UtgSettings> & {
  bannedControlEnabled?: boolean;
  bannedMaxRewrites?: number;
  bannedInvalidOutput?: "save" | "discard";
  bannedWordAllowances?: Record<string, number>;
};

export function normalizeSettings(settings: LegacySettings): UtgSettings {
  const normalized = { ...DEFAULT_SETTINGS, ...settings };
  const { bannedWordAllowances: _discardedLegacyAllowances, ...cleanNormalized } = normalized;
  const requestedRewrites = Number(settings.qualityMaxRewrites ?? settings.bannedMaxRewrites ?? DEFAULT_SETTINGS.qualityMaxRewrites);
  const paragraphs = Math.max(1, Math.floor(Number(normalized.paragraphs) || DEFAULT_SETTINGS.paragraphs));
  const legacyDescMin = Math.max(0, Number(settings.descMin ?? DEFAULT_SETTINGS.descMin));
  const legacyDescMax = Math.max(legacyDescMin, Number(settings.descMax ?? DEFAULT_SETTINGS.descMax));
  const requestedParagraphMin = Number(settings.descParagraphMin ?? Math.floor(legacyDescMin / paragraphs));
  const requestedParagraphMax = Number(settings.descParagraphMax ?? Math.ceil(legacyDescMax / paragraphs));
  const descParagraphMin = Math.max(1, Math.floor(Number.isFinite(requestedParagraphMin) ? requestedParagraphMin : 1));
  const descParagraphMax = Math.max(descParagraphMin, Math.ceil(Number.isFinite(requestedParagraphMax) ? requestedParagraphMax : descParagraphMin));
  return {
    ...cleanNormalized,
    paragraphs,
    descParagraphMin,
    descParagraphMax,
    descMin: descParagraphMin * paragraphs,
    descMax: descParagraphMax * paragraphs,
    qualityControlEnabled: settings.qualityControlEnabled ?? settings.bannedControlEnabled ?? DEFAULT_SETTINGS.qualityControlEnabled,
    qualityMaxRewrites: Number.isFinite(requestedRewrites) ? Math.max(0, Math.floor(requestedRewrites)) : 0,
    qualityInvalidOutput: "save",
    bannedWordsToleranceLevel: Math.max(0, Math.floor(Number(normalized.bannedWordsToleranceLevel) || 0)),
  };
}

export const loadSettings = (): UtgSettings => normalizeSettings(get<Partial<UtgSettings>>(SETTINGS_K, {}));
export const saveSettings = (v: UtgSettings) => set(SETTINGS_K, v);

export const loadPrompts = (): UtgPrompts => upgradePrompts({ ...DEFAULT_PROMPTS, ...get<Partial<UtgPrompts>>(PROMPTS_K, {}) });
export const savePrompts = (v: UtgPrompts) => set(PROMPTS_K, v);

export const loadBanned = (): string[] => get<string[]>(BANNED_K, DEFAULT_BANNED);
export const saveBanned = (v: string[]) => set(BANNED_K, v);

export const loadPresets = (): UtgPreset[] => get<UtgPreset[]>(PRESETS_K, []).map(p => ({
  ...p,
  settings: normalizeSettings(p.settings),
  prompts: upgradePrompts(p.prompts),
}));
export const savePresets = (v: UtgPreset[]) => set(PRESETS_K, v);

export const loadActivePreset = (): string | null => get<string | null>(ACTIVE_PRESET_K, null);
export const saveActivePreset = (v: string | null) => set(ACTIVE_PRESET_K, v);

export const loadRows = (): UtgRow[] => get<UtgRow[]>(ROWS_K, []);
export const saveRows = (v: UtgRow[]) => set(ROWS_K, v);

export function buildProviderConfigs(keys: Record<UtgProviderId, UtgKey[]>): UtgProviderConfig[] {
  return (Object.keys(PROVIDER_DEFAULTS) as UtgProviderId[]).map(id => ({
    id, label: PROVIDER_DEFAULTS[id].label, baseUrl: PROVIDER_DEFAULTS[id].baseUrl, keys: keys[id] || [],
  }));
}
