import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_PRICES, loadPrices, savePrices } from "./costs";
import { PROVIDER_DEFAULTS } from "./storage";
import type { UtgModelPrice, UtgProviderId } from "./types";

const MODEL_CACHE_KEY = "utg_model_catalog_v1";

type CachedCatalog = Partial<Record<UtgProviderId, UtgModelPrice[]>>;

function readCache(): CachedCatalog {
  try {
    return JSON.parse(localStorage.getItem(MODEL_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeCache(cache: CachedCatalog) {
  try {
    localStorage.setItem(MODEL_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* localStorage may be unavailable */
  }
}

export function mergeModelCatalog(
  provider: UtgProviderId,
  liveModels: Array<Partial<UtgModelPrice> & { modelId: string }>,
): UtgModelPrice[] {
  const fallback = loadPrices()[provider] || DEFAULT_PRICES[provider] || [];
  const byId = new Map<string, UtgModelPrice>();

  for (const item of fallback) {
    byId.set(item.modelId, { ...item, source: item.source || "fallback" });
  }

  for (const live of liveModels) {
    const known = byId.get(live.modelId);
    byId.set(live.modelId, {
      modelId: live.modelId,
      label: live.label || known?.label || live.modelId,
      inputPer1M: typeof live.inputPer1M === "number" ? live.inputPer1M : known?.inputPer1M || 0,
      outputPer1M: typeof live.outputPer1M === "number" ? live.outputPer1M : known?.outputPer1M || 0,
      supportsStructuredOutput: live.supportsStructuredOutput ?? known?.supportsStructuredOutput ?? true,
      source: known ? "fallback" : "live",
    });
  }

  return Array.from(byId.values()).sort((a, b) => {
    if (a.inputPer1M !== b.inputPer1M) return a.inputPer1M - b.inputPer1M;
    return a.modelId.localeCompare(b.modelId);
  });
}

export function loadModelCatalog(provider: UtgProviderId): UtgModelPrice[] {
  const cache = readCache();
  const cached = cache[provider] || [];
  return mergeModelCatalog(provider, cached);
}

export function cacheModelCatalog(provider: UtgProviderId, models: UtgModelPrice[]) {
  const cache = readCache();
  cache[provider] = models;
  writeCache(cache);

  const prices = loadPrices();
  savePrices({ ...prices, [provider]: models });
}

export async function fetchProviderModels(opts: {
  provider: UtgProviderId;
  apiKey: string;
}): Promise<UtgModelPrice[]> {
  const baseUrl = PROVIDER_DEFAULTS[opts.provider].baseUrl;
  const { data, error } = await supabase.functions.invoke("upgraded-text-models", {
    body: { provider: opts.provider, apiKey: opts.apiKey, baseUrl },
  });

  if (error) throw new Error(error.message || "Could not load provider models");
  if (!data || data.error) throw new Error(data?.error || "Could not load provider models");

  const live = Array.isArray(data.models) ? data.models : [];
  const merged = mergeModelCatalog(opts.provider, live);
  cacheModelCatalog(opts.provider, merged);
  return merged;
}

export function describeModelPrice(model: UtgModelPrice): string {
  const inPrice = model.inputPer1M > 0 ? `$${formatMoney(model.inputPer1M)}` : "price ?";
  const outPrice = model.outputPer1M > 0 ? `$${formatMoney(model.outputPer1M)}` : "$?";
  return `${inPrice} / ${outPrice}`;
}

function formatMoney(n: number): string {
  if (n >= 10) return n.toFixed(0);
  if (n >= 1) return n.toFixed(2).replace(/\.00$/, "");
  return n.toFixed(2);
}
