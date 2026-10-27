// Client calls the edge function; rotates keys on failure.
import { supabase } from "@/integrations/supabase/client";
import { calcCost, estimateTokens } from "./costs";
import { markKey, nextActiveKey, statusFromHttp } from "./keyRotation";
import { PROVIDER_DEFAULTS } from "./storage";
import { streamUtgGenerate } from "./streamClient";
import { UtgKey, UtgProviderId } from "./types";

export interface GenerateOnceParams {
  provider: UtgProviderId;
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature: number;
  baseUrl?: string;
}

export interface GenerateOnceResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  usageEstimated: boolean;
}

export interface RotatingCallOpts {
  provider: UtgProviderId;
  model: string;
  userPrompt: string;
  temperature: number;
  keys: UtgKey[];
  setKeys: (next: UtgKey[]) => void;
  onDelta?: (text: string) => void;
  stream?: boolean;
}

export async function callWithRotation(opts: RotatingCallOpts): Promise<GenerateOnceResult> {
  let keys = opts.keys.slice();
  const tried = new Set<string>();
  const total = keys.filter(k => k.status === "active").length;
  if (total === 0) throw new Error(`No active API keys for ${opts.provider}`);

  for (let i = 0; i < total; i++) {
    const next = nextActiveKey(opts.provider, keys);
    if (!next || tried.has(next.id)) break;
    tried.add(next.id);

    try {
      const baseUrl = PROVIDER_DEFAULTS[opts.provider].baseUrl;
      const res = opts.stream
        ? await callEdgeStream({
            provider: opts.provider,
            model: opts.model,
            apiKey: next.value,
            baseUrl,
            userPrompt: opts.userPrompt,
            temperature: opts.temperature,
            onDelta: opts.onDelta,
          })
        : await callEdge({
            provider: opts.provider,
            model: opts.model,
            apiKey: next.value,
            baseUrl,
            userPrompt: opts.userPrompt,
            temperature: opts.temperature,
          });
      return res;
    } catch (e: any) {
      const code = typeof e?.status === "number" ? e.status : 0;
      const status = statusFromHttp(code || 500);
      keys = markKey(keys, next.id, status, e?.message);
      opts.setKeys(keys);
      if (code === 401 || code === 403 || code === 429) continue;
      continue;
    }
  }
  throw new Error(`All ${opts.provider} keys failed for this row`);
}

async function callEdge(body: {
  provider: UtgProviderId;
  model: string;
  apiKey: string;
  baseUrl: string;
  userPrompt: string;
  temperature: number;
}): Promise<GenerateOnceResult> {
  const { data, error } = await supabase.functions.invoke("upgraded-text-generate", { body });
  if (error) {
    const err = new Error(error.message || "edge error") as Error & { status?: number };
    err.status = (error as any).context?.status ?? 500;
    throw err;
  }
  if (!data || data.error) {
    const err = new Error(data?.error || "unknown error") as Error & { status?: number };
    err.status = data?.status ?? 500;
    throw err;
  }
  const inTok = data.usage?.prompt_tokens || estimateTokens(body.userPrompt);
  const outTok = data.usage?.completion_tokens || estimateTokens(data.text || "");
  const usageEstimated = !(data.usage?.prompt_tokens > 0 && data.usage?.completion_tokens > 0);
  return {
    text: data.text || "",
    promptTokens: inTok,
    completionTokens: outTok,
    cost: calcCost(body.provider, body.model, inTok, outTok),
    usageEstimated,
  };
}

async function callEdgeStream(body: {
  provider: UtgProviderId;
  model: string;
  apiKey: string;
  baseUrl: string;
  userPrompt: string;
  temperature: number;
  onDelta?: (text: string) => void;
}): Promise<GenerateOnceResult> {
  let fullText = "";
  let usage = { prompt_tokens: 0, completion_tokens: 0 };
  let errorMsg: string | null = null;

  await streamUtgGenerate(
    {
      provider: body.provider,
      model: body.model,
      apiKey: body.apiKey,
      baseUrl: body.baseUrl,
      userPrompt: body.userPrompt,
      temperature: body.temperature,
    },
    {
      onDelta: (t) => { fullText += t; body.onDelta?.(t); },
      onDone: (full, u) => { if (full) fullText = full; usage = u; },
      onError: (m) => { errorMsg = m; },
    },
  );

  if (errorMsg) {
    const err = new Error(errorMsg) as Error & { status?: number };
    const m = errorMsg.match(/^HTTP\s+(\d+)|Upstream\s+(\d+)/i);
    if (m) err.status = Number(m[1] || m[2]);
    throw err;
  }
  return {
    text: fullText,
    promptTokens: usage.prompt_tokens || estimateTokens(body.userPrompt),
    completionTokens: usage.completion_tokens || estimateTokens(fullText),
    cost: calcCost(
      body.provider,
      body.model,
      usage.prompt_tokens || estimateTokens(body.userPrompt),
      usage.completion_tokens || estimateTokens(fullText),
    ),
    usageEstimated: !(usage.prompt_tokens > 0 && usage.completion_tokens > 0),
  };
}
