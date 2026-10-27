import { ProviderType, PROVIDER_TYPES } from "./providers";

export function detectProviderType(key: string): ProviderType {
  const k = (key || "").trim();
  if (k.startsWith("AIza")) return "gemini";
  if (k.startsWith("sk-") || k.startsWith("sess-")) return "openai";
  return "openai_compatible";
}

export function pickDefaultModel(type: ProviderType, models: string[] | undefined): string {
  const suggestions = PROVIDER_TYPES[type].modelSuggestions;
  if (models && models.length) {
    for (const s of suggestions) {
      const match = models.find(m => m === s || m.endsWith(`/${s}`));
      if (match) return match;
    }
    return models[0];
  }
  return suggestions[0] || "";
}

export function providerLabel(type: ProviderType): string {
  return PROVIDER_TYPES[type].label;
}
