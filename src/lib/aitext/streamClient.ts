// Robust SSE parser for our generate-stream edge function.
// Handles partial JSON across chunks, CRLF, [DONE], and final flush.
import { SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/env";

export type PerCallUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  model?: string | null;
};

export type StructuredUsage = {
  image?: PerCallUsage;
  desc?: PerCallUsage;
  total?: { prompt_tokens: number; completion_tokens: number };
};

export type StreamEvent =
  | { type: "status"; status: "preparing" | "sending" | "generating" | "completed" | "error"; message?: string }
  | { type: "delta"; field: "image_text" | "detail_description"; text: string }
  | {
      type: "done";
      output: any;
      usage?: { prompt_tokens: number; completion_tokens: number } & { image?: PerCallUsage; desc?: PerCallUsage; total?: { prompt_tokens: number; completion_tokens: number } };
      image_model?: string;
      desc_model?: string;
      content_type?: string;
      sources?: { image: string[]; desc: string[] };
    }
  | { type: "error"; code: string; message: string };

export type StreamCallbacks = {
  onStatus?: (s: Extract<StreamEvent, { type: "status" }>) => void;
  onDelta?: (e: Extract<StreamEvent, { type: "delta" }>) => void;
  onDone?: (e: Extract<StreamEvent, { type: "done" }>) => void;
  onError?: (e: Extract<StreamEvent, { type: "error" }>) => void;
};

export async function streamGenerate(
  url: string,
  body: any,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e: any) {
    if (e?.name === "AbortError") return;
    callbacks.onError?.({ type: "error", code: "network", message: e?.message || "Network error" });
    return;
  }

  if (!resp.ok || !resp.body) {
    let msg = `HTTP ${resp.status}`;
    try { const j = await resp.json(); msg = j.error || j.message || msg; } catch {}
    callbacks.onError?.({ type: "error", code: `http_${resp.status}`, message: msg });
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let streamDone = false;
  let lastEventAt = Date.now();
  const STALL_MS = 30_000;

  const internalCtrl = new AbortController();
  const watchdog = setInterval(() => {
    if (Date.now() - lastEventAt > STALL_MS && !streamDone) {
      internalCtrl.abort();
      try { reader.cancel(); } catch {}
    }
  }, 5_000);

  const handleLine = (line: string) => {
    if (line.endsWith("\r")) line = line.slice(0, -1);
    if (!line) return;
    if (line.startsWith(":")) { lastEventAt = Date.now(); return; }
    if (!line.startsWith("data: ")) return;
    lastEventAt = Date.now();
    const json = line.slice(6).trim();
    if (json === "[DONE]") { streamDone = true; return; }
    try {
      const evt = JSON.parse(json) as StreamEvent;
      if (evt.type === "status") callbacks.onStatus?.(evt);
      else if (evt.type === "delta") callbacks.onDelta?.(evt);
      else if (evt.type === "done") callbacks.onDone?.(evt);
      else if (evt.type === "error") callbacks.onError?.(evt);
    } catch {
      // partial — ignore
    }
  };

  try {
    while (!streamDone) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch (e: any) {
        if (signal?.aborted) return;
        if (internalCtrl.signal.aborted) {
          callbacks.onError?.({ type: "error", code: "stalled", message: "No response from model for 30s — connection stalled." });
          return;
        }
        callbacks.onError?.({ type: "error", code: "stream_interrupted", message: e?.message || "Stream interrupted" });
        return;
      }
      if (chunk.done) break;
      lastEventAt = Date.now();
      buf += decoder.decode(chunk.value, { stream: true });

      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        handleLine(line);
      }
    }
    if (buf.trim()) for (const l of buf.split("\n")) handleLine(l);
  } finally {
    clearInterval(watchdog);
  }
}
