import { UtgModelPrice, UtgProviderId } from "./types";

// Approximate USD per 1M tokens. User-editable in Settings.
export const DEFAULT_PRICES: Record<UtgProviderId, UtgModelPrice[]> = {
  openai: [
    { modelId: "gpt-4.1-nano", label: "gpt-4.1-nano", inputPer1M: 0.10, outputPer1M: 0.40, supportsStructuredOutput: true, source: "fallback" },
    { modelId: "gpt-4o-mini", label: "gpt-4o-mini", inputPer1M: 0.15, outputPer1M: 0.60, supportsStructuredOutput: true, source: "fallback" },
    { modelId: "gpt-5.4-nano", label: "gpt-5.4-nano", inputPer1M: 0.20, outputPer1M: 1.25, supportsStructuredOutput: true, source: "fallback" },
    { modelId: "gpt-4.1-mini", label: "gpt-4.1-mini", inputPer1M: 0.40, outputPer1M: 1.60, supportsStructuredOutput: true, source: "fallback" },
    { modelId: "gpt-5.4-mini", label: "gpt-5.4-mini", inputPer1M: 0.75, outputPer1M: 4.50, supportsStructuredOutput: true, source: "fallback" },
    { modelId: "gpt-4.1", label: "gpt-4.1", inputPer1M: 2.00, outputPer1M: 8.00, supportsStructuredOutput: true, source: "fallback" },
    { modelId: "gpt-4o", label: "gpt-4o", inputPer1M: 2.50, outputPer1M: 10.00, supportsStructuredOutput: true, source: "fallback" },
    { modelId: "gpt-5.4", label: "gpt-5.4", inputPer1M: 2.50, outputPer1M: 15.00, supportsStructuredOutput: true, source: "fallback" },
    { modelId: "gpt-5.5", label: "gpt-5.5", inputPer1M: 5.00, outputPer1M: 30.00, supportsStructuredOutput: true, source: "fallback" },
    { modelId: "gpt-5.4-pro", label: "gpt-5.4-pro", inputPer1M: 30.00, outputPer1M: 180.00, supportsStructuredOutput: true, source: "fallback" },
    { modelId: "gpt-5.5-pro", label: "gpt-5.5-pro", inputPer1M: 30.00, outputPer1M: 180.00, supportsStructuredOutput: true, source: "fallback" },
  ],
  gemini: [
    { modelId: "gemini-2.5-flash-lite", label: "gemini-2.5-flash-lite", inputPer1M: 0.10, outputPer1M: 0.40, supportsStructuredOutput: true, source: "fallback" },
    { modelId: "gemini-2.5-flash", label: "gemini-2.5-flash", inputPer1M: 0.30, outputPer1M: 2.50, supportsStructuredOutput: true, source: "fallback" },
    { modelId: "gemini-2.5-pro", label: "gemini-2.5-pro", inputPer1M: 1.25, outputPer1M: 10.00, supportsStructuredOutput: true, source: "fallback" },
    { modelId: "gemini-2.0-flash", label: "gemini-2.0-flash", inputPer1M: 0.10, outputPer1M: 0.40, supportsStructuredOutput: true, source: "fallback" },
  ],
  xai: [
    { modelId: "grok-4.3", label: "grok-4.3", inputPer1M: 1.25, outputPer1M: 2.50, supportsStructuredOutput: true, source: "fallback" },
    { modelId: "grok-4.20", label: "grok-4.20", inputPer1M: 1.25, outputPer1M: 2.50, supportsStructuredOutput: true, source: "fallback" },
    { modelId: "grok-build-0.1", label: "grok-build-0.1", inputPer1M: 1.00, outputPer1M: 2.00, supportsStructuredOutput: true, source: "fallback" },
    { modelId: "grok-3-mini", label: "grok-3-mini", inputPer1M: 0.30, outputPer1M: 0.50, supportsStructuredOutput: true, source: "fallback" },
  ],
  deepseek: [
    { modelId: "deepseek-chat", label: "deepseek-chat", inputPer1M: 0.27, outputPer1M: 1.10, supportsStructuredOutput: true, source: "fallback" },
    { modelId: "deepseek-reasoner", label: "deepseek-reasoner", inputPer1M: 0.55, outputPer1M: 2.19, supportsStructuredOutput: true, source: "fallback" },
  ],
  groq: [
    { modelId: "llama-3.3-70b-versatile", label: "llama-3.3-70b-versatile", inputPer1M: 0.59, outputPer1M: 0.79, supportsStructuredOutput: true, source: "fallback" },
    { modelId: "llama-3.1-8b-instant", label: "llama-3.1-8b-instant", inputPer1M: 0.05, outputPer1M: 0.08, supportsStructuredOutput: true, source: "fallback" },
    { modelId: "openai/gpt-oss-120b", label: "openai/gpt-oss-120b", inputPer1M: 0.15, outputPer1M: 0.75, supportsStructuredOutput: true, source: "fallback" },
    { modelId: "openai/gpt-oss-20b", label: "openai/gpt-oss-20b", inputPer1M: 0.10, outputPer1M: 0.50, supportsStructuredOutput: true, source: "fallback" },
    { modelId: "meta-llama/llama-4-maverick-17b-128e-instruct", label: "llama-4-maverick-17b", inputPer1M: 0.20, outputPer1M: 0.60, supportsStructuredOutput: true, source: "fallback" },
  ],
};

const PRICE_KEY = "utg_prices_v1";

export function loadPrices(): Record<UtgProviderId, UtgModelPrice[]> {
  try {
    const raw = localStorage.getItem(PRICE_KEY);
    if (!raw) return DEFAULT_PRICES;
    return { ...DEFAULT_PRICES, ...JSON.parse(raw) };
  } catch { return DEFAULT_PRICES; }
}
export function savePrices(v: Record<UtgProviderId, UtgModelPrice[]>) {
  try { localStorage.setItem(PRICE_KEY, JSON.stringify(v)); } catch {}
}

export function findPrice(provider: UtgProviderId, modelId: string): UtgModelPrice | null {
  const list = loadPrices()[provider] || [];
  return list.find(p => p.modelId === modelId) || null;
}

export function calcCost(provider: UtgProviderId, modelId: string, inTokens: number, outTokens: number): number {
  const p = findPrice(provider, modelId);
  if (!p) return 0;
  return (inTokens / 1_000_000) * p.inputPer1M + (outTokens / 1_000_000) * p.outputPer1M;
}

export function estimateTokens(text: string): number {
  // Rough heuristic: ~4 chars per token
  return Math.ceil((text || "").length / 4);
}
