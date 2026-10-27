// SSE client for the upgraded-text-generate edge function.
// Parses { type:"delta"|"done"|"error" } events emitted by our edge function.
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/integrations/supabase/env";

export type UtgStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; text: string; usage: { prompt_tokens: number; completion_tokens: number } }
  | { type: "error"; message: string };

export interface UtgStreamCallbacks {
  onDelta?: (text: string) => void;
  onDone?: (full: string, usage: { prompt_tokens: number; completion_tokens: number }) => void;
  onError?: (message: string) => void;
}

export interface UtgStreamRequest {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  userPrompt: string;
  systemPrompt?: string;
  temperature: number;
}

export async function streamUtgGenerate(
  body: UtgStreamRequest,
  cb: UtgStreamCallbacks,
  signal?: AbortSignal,
): Promise<{ httpStatus: number }> {
  const url = `${SUPABASE_URL}/functions/v1/upgraded-text-generate`;
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ ...body, stream: true }),
      signal,
    });
  } catch (e: any) {
    cb.onError?.(e?.message || "network error");
    return { httpStatus: 0 };
  }

  if (!resp.ok || !resp.body) {
    let msg = `HTTP ${resp.status}`;
    try { const j = await resp.json(); msg = j.error || msg; } catch { /* ignore */ }
    cb.onError?.(msg);
    return { httpStatus: resp.status };
  }

  // Some upstreams report failure with a JSON body inside a 200 response.
  const ctype = resp.headers.get("content-type") || "";
  if (!ctype.includes("text/event-stream")) {
    try {
      const j = await resp.json();
      if (j?.error) { cb.onError?.(j.error); return { httpStatus: j.status || resp.status }; }
    } catch { /* ignore */ }
    cb.onError?.("Non-SSE response from server");
    return { httpStatus: resp.status };
  }

  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let full = "";
  let usage = { prompt_tokens: 0, completion_tokens: 0 };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line || line.startsWith(":")) continue;
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload) as UtgStreamEvent;
          if (evt.type === "delta") { full += evt.text; cb.onDelta?.(evt.text); }
          else if (evt.type === "done") { full = evt.text || full; usage = evt.usage || usage; cb.onDone?.(full, usage); }
          else if (evt.type === "error") { cb.onError?.(evt.message); }
        } catch { /* partial */ }
      }
    }
  } catch (e: any) {
    if (signal?.aborted) return { httpStatus: resp.status };
    cb.onError?.(e?.message || "stream interrupted");
  }
  return { httpStatus: resp.status };
}
