import { createContext, useCallback, useContext, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { GenSettings } from "@/lib/aitext/genSettings";
import type { ProviderConfig } from "@/lib/aitext/providers";
import { streamGenerate } from "@/lib/aitext/streamClient";
import { SUPABASE_URL } from "@/integrations/supabase/env";

export type GenState = "idle" | "running" | "stopping" | "stopped" | "completed";
export type LiveStatus = "idle" | "preparing" | "sending" | "generating" | "completed" | "error";
export type ErrorMode = "stop" | "continue";
export type ProcessingMode = "sequential" | "parallel";

export type GenProgress = {
  total: number;
  completed: number;
  failed: number;
  stopped: number;
  promptTokens: number;
  completionTokens: number;
};

export type LiveState = {
  status: LiveStatus;
  index: number;
  total: number;
  inputId: string | null;
  entry: string | null;
  imageText: string;
  description: string;
  module: string | null;
  providerName: string | null;
  model: string | null;
  error: string | null;
};

export type LiveRowState = {
  status: LiveStatus;
  imageText: string;
  description: string;
  error: string | null;
};

export type RowDonePayload = {
  image_text: string | null;
  detail_description: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  image_prompt_tokens: number | null;
  image_completion_tokens: number | null;
  desc_prompt_tokens: number | null;
  desc_completion_tokens: number | null;
  image_model: string | null;
  desc_model: string | null;
  model: string | null;
  content_type: string | null;
  sources: { image: string[]; desc: string[] } | null;
};

export type RowEventHandlers = {
  onRowDone?: (inputId: string, payload: RowDonePayload) => void;
  onRowFailed?: (inputId: string, error: string) => void;
};

const initialLive: LiveState = {
  status: "idle", index: 0, total: 0, inputId: null, entry: null,
  imageText: "", description: "", module: null, providerName: null, model: null, error: null,
};

type RunPayload = {
  inputIds: string[];
  settings: GenSettings;
  provider: ProviderConfig;
  concurrency?: number;
  processingMode?: ProcessingMode;
  errorMode?: ErrorMode;
};

type Ctx = {
  state: GenState;
  progress: GenProgress;
  message: string | null;
  isRunning: boolean;
  live: LiveState;
  liveById: Record<string, LiveRowState>;
  pendingQueue: string[];
  generateMany: (payload: RunPayload) => Promise<void>;
  generateOne: (inputId: string, settings: GenSettings, provider: ProviderConfig, field?: "image_text" | "detail_description" | "all") => Promise<void>;
  resume: () => Promise<void>;
  restart: (opts: { clearResults: boolean }) => Promise<void>;
  stopAll: () => void;
  skipCurrent: () => void;
  retryCurrent: () => void;
  clearSession: () => void;
  clearAllPromptCaches: () => void;
  subscribeRowEvents: (handlers: RowEventHandlers) => () => void;
  rowSources: Record<string, { image: string[]; desc: string[] }>;
};

const GenerationContext = createContext<Ctx | null>(null);

const STREAM_URL = `${SUPABASE_URL}/functions/v1/aitext-generate-stream`;

export function GenerationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GenState>("idle");
  const [progress, setProgress] = useState<GenProgress>({
    total: 0, completed: 0, failed: 0, stopped: 0, promptTokens: 0, completionTokens: 0,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [live, setLive] = useState<LiveState>(initialLive);
  const [liveById, setLiveById] = useState<Record<string, LiveRowState>>({});
  const [pendingQueue, setPendingQueue] = useState<string[]>([]);
  const [rowSources, setRowSources] = useState<Record<string, { image: string[]; desc: string[] }>>({});

  const abortRef = useRef<AbortController | null>(null);
  const skipRef = useRef(false);
  const retryRef = useRef(false);
  const sessionRef = useRef(0);
  const queueRef = useRef<string[]>([]);
  const originalQueueRef = useRef<string[]>([]);
  const lastRunRef = useRef<{ settings: GenSettings; provider: ProviderConfig; concurrency: number; processingMode: ProcessingMode; errorMode: ErrorMode } | null>(null);
  const stopOnErrorRef = useRef(false);
  const singleAbortsRef = useRef<Map<string, AbortController>>(new Map());
  const rowEventHandlersRef = useRef<Set<RowEventHandlers>>(new Set());
  const { toast } = useToast();

  // Coalesce streaming deltas: accumulate text per row+field, flush at ~60ms.
  const pendingDeltasRef = useRef<Map<string, { image: string; desc: string }>>(new Map());
  const flushTimerRef = useRef<number | null>(null);
  const globalLiveTargetRef = useRef<string | null>(null);

  const flushDeltas = useCallback(() => {
    flushTimerRef.current = null;
    const buf = pendingDeltasRef.current;
    if (buf.size === 0) return;
    const snapshot = Array.from(buf.entries());
    buf.clear();
    const globalId = globalLiveTargetRef.current;

    setLiveById(prev => {
      const next = { ...prev };
      for (const [id, d] of snapshot) {
        const cur = next[id] || { status: "generating" as LiveStatus, imageText: "", description: "", error: null };
        next[id] = {
          ...cur,
          imageText: d.image ? cur.imageText + d.image : cur.imageText,
          description: d.desc ? cur.description + d.desc : cur.description,
        };
      }
      return next;
    });

    if (globalId) {
      const g = snapshot.find(([id]) => id === globalId)?.[1];
      if (g) {
        setLive(prev => ({
          ...prev,
          imageText: g.image ? prev.imageText + g.image : prev.imageText,
          description: g.desc ? prev.description + g.desc : prev.description,
        }));
      }
    }
  }, []);

  const queueDelta = useCallback((inputId: string, field: "image_text" | "detail_description", text: string) => {
    const buf = pendingDeltasRef.current;
    const cur = buf.get(inputId) || { image: "", desc: "" };
    if (field === "image_text") cur.image += text; else cur.desc += text;
    buf.set(inputId, cur);
    if (flushTimerRef.current == null) {
      flushTimerRef.current = window.setTimeout(flushDeltas, 60);
    }
  }, [flushDeltas]);

  const subscribeRowEvents = useCallback((handlers: RowEventHandlers) => {
    rowEventHandlersRef.current.add(handlers);
    return () => { rowEventHandlersRef.current.delete(handlers); };
  }, []);

  const emitRowDone = (inputId: string, payload: RowDonePayload) => {
    console.debug("[gen] row done — local patch", inputId, payload);
    rowEventHandlersRef.current.forEach(h => { try { h.onRowDone?.(inputId, payload); } catch {} });
  };
  const emitRowFailed = (inputId: string, error: string) => {
    console.debug("[gen] row failed — local patch", inputId, error);
    rowEventHandlersRef.current.forEach(h => { try { h.onRowFailed?.(inputId, error); } catch {} });
  };

  const validateInputs = (s: GenSettings, p: ProviderConfig | null): string | null => {
    if (!p) return "No active provider — open Providers and add one.";
    if (!p.apiKey) return `Provider "${p.name}" has no API key.`;
    if (!p.model) return `Provider "${p.name}" has no model selected.`;
    if (!s.module) return "Select a module before generating.";
    if (!s.mode) return "Select a generation mode.";
    if (s.mode !== "custom_only" && !s.userPrompt.trim()) return "User Prompt is required for the selected mode.";
    if (s.mode === "custom_only") {
      const has = (s.enableCustomImage && s.imageInstructions.trim()) || (s.enableCustomDesc && s.descInstructions.trim());
      if (!has) return "Custom-only mode requires at least one enabled non-empty custom instruction.";
    }
    return null;
  };

  const runOne = useCallback(async (
    inputId: string,
    entry: string,
    settings: GenSettings,
    provider: ProviderConfig,
    index: number,
    total: number,
    session: number | null,
    ctrl: AbortController,
    updateGlobalLive: boolean = true,
    field?: "image_text" | "detail_description" | "all",
  ): Promise<{ status: "done" | "failed" | "aborted"; usage?: { p: number; c: number }; error?: string }> => {
    if (session !== null && session !== sessionRef.current) return { status: "aborted" };

    if (updateGlobalLive) {
      setLive({
        status: "preparing", index, total, inputId, entry,
        imageText: "", description: "",
        module: settings.module, providerName: provider.name, model: provider.model, error: null,
      });
      globalLiveTargetRef.current = inputId;
    }
    console.debug("[gen] row started", inputId);
    setLiveById(prev => ({ ...prev, [inputId]: { status: "preparing", imageText: "", description: "", error: null } }));

    let finalUsage = { p: 0, c: 0 };
    let resolved: "done" | "failed" | "aborted" = "failed" as "done" | "failed" | "aborted";
    let errMsg: string | undefined;

    await streamGenerate(STREAM_URL, {
      input_id: inputId,
      provider: { type: provider.type, api_key: provider.apiKey, base_url: provider.baseUrl, model: provider.model, name: provider.name },
      module: settings.module,
      mode: settings.mode,
      ...(field ? { field } : {}),
      user_prompt: settings.userPrompt,
      custom_image: settings.imageInstructions,
      custom_desc: settings.descInstructions,
      enable_custom_image: settings.enableCustomImage,
      enable_custom_desc: settings.enableCustomDesc,
      web_search: settings.webSearch,
      settings: {
        tone: settings.tone,
        imageMin: settings.imageMin, imageMax: settings.imageMax,
        descMin: settings.descMin, descMax: settings.descMax,
        paragraphs: settings.paragraphs,
        bannedWords: settings.bannedWords,
        imageContentRules: settings.imageContentRules,
        descContentRules: settings.descContentRules,
        imageModel: settings.imageModel,
        descModel: settings.descModel,
      },
    }, {
      onStatus: (s) => {
        if (updateGlobalLive) setLive(prev => ({ ...prev, status: s.status }));
        setLiveById(prev => prev[inputId] ? { ...prev, [inputId]: { ...prev[inputId], status: s.status } } : prev);
      },
      onDelta: (d) => {
        queueDelta(inputId, d.field as "image_text" | "detail_description", d.text);
      },
      onDone: (e) => {
        // Flush any buffered deltas synchronously before applying final state.
        if (flushTimerRef.current != null) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null; }
        flushDeltas();
        const u: any = e.usage || {};
        const totalP = u.total?.prompt_tokens ?? u.prompt_tokens ?? 0;
        const totalC = u.total?.completion_tokens ?? u.completion_tokens ?? 0;
        finalUsage = { p: totalP, c: totalC };
        resolved = "done";
        if (updateGlobalLive) {
          setLive(prev => ({
            ...prev, status: "completed",
            imageText: e.output?.image_text || prev.imageText,
            description: e.output?.detail_description || prev.description,
          }));
        }
        setLiveById(prev => {
          const next = { ...prev };
          delete next[inputId];
          return next;
        });
        const sources = (e as any).sources || null;
        if (sources) {
          setRowSources(prev => ({ ...prev, [inputId]: sources }));
        }
        console.debug("[gen] row=%s sources=%o image=%o desc=%o", inputId, sources, u.image, u.desc);
        emitRowDone(inputId, {
          image_text: e.output?.image_text ?? null,
          detail_description: e.output?.detail_description ?? null,
          prompt_tokens: totalP,
          completion_tokens: totalC,
          image_prompt_tokens: u.image?.prompt_tokens ?? 0,
          image_completion_tokens: u.image?.completion_tokens ?? 0,
          desc_prompt_tokens: u.desc?.prompt_tokens ?? 0,
          desc_completion_tokens: u.desc?.completion_tokens ?? 0,
          image_model: (e as any).image_model ?? settings.imageModel ?? provider.model ?? null,
          desc_model: (e as any).desc_model ?? settings.descModel ?? provider.model ?? null,
          model: provider.model ?? null,
          content_type: (e as any).content_type ?? null,
          sources,
        });
      },
      onError: (e) => {
        errMsg = `${e.code}: ${e.message}`;
        resolved = "failed";
        if (updateGlobalLive) setLive(prev => ({ ...prev, status: "error", error: errMsg! }));
        setLiveById(prev => prev[inputId] ? { ...prev, [inputId]: { ...prev[inputId], status: "error", error: errMsg! } } : prev);
        emitRowFailed(inputId, errMsg!);
      },
    }, ctrl.signal);

    if (ctrl.signal.aborted) {
      setLiveById(prev => { const n = { ...prev }; delete n[inputId]; return n; });
      return { status: "aborted" };
    }
    if (resolved === "done") return { status: "done", usage: finalUsage };
    try { await supabase.from("aitext_inputs").update({ status: "failed", error_message: errMsg || "Generation failed" }).eq("id", inputId); } catch {}
    if (errMsg) toast({ title: "Generation failed", description: errMsg, variant: "destructive" });
    return { status: "failed", error: errMsg };
  }, [toast]);

  const generateMany = useCallback(async (payload: RunPayload) => {
    const { inputIds, settings, provider } = payload;
    const processingMode: ProcessingMode = payload.processingMode ?? "sequential";
    const errorMode: ErrorMode = payload.errorMode ?? "continue";
    const concurrency = processingMode === "sequential" ? 1 : Math.max(1, Math.min(10, payload.concurrency ?? 1));

    if (state === "running" || state === "stopping" || !inputIds.length) return;

    const err = validateInputs(settings, provider);
    if (err) { toast({ title: "Cannot start", description: err, variant: "destructive" }); return; }

    const session = sessionRef.current + 1;
    sessionRef.current = session;
    setState("running");
    setMessage(null);
    setProgress({ total: inputIds.length, completed: 0, failed: 0, stopped: 0, promptTokens: 0, completionTokens: 0 });
    skipRef.current = false;
    retryRef.current = false;
    stopOnErrorRef.current = false;
    queueRef.current = [...inputIds];
    setPendingQueue([...inputIds]);
    // Only set originalQueueRef when starting a NEW batch (not a resume).
    // Resume passes the remaining ids; restart passes the original ones explicitly.
    if (!originalQueueRef.current.length || originalQueueRef.current.length < inputIds.length) {
      originalQueueRef.current = [...inputIds];
    }
    lastRunRef.current = { settings, provider, concurrency, processingMode, errorMode };

    const { data: rows } = await supabase.from("aitext_inputs").select("id, raw_text").in("id", inputIds);
    const entryMap = new Map((rows || []).map((r: any) => [r.id, r.raw_text]));

    const limit = Math.max(1, Math.min(10, concurrency));
    let cursor = 0;
    const total = inputIds.length;
    const batchCtrl = new AbortController();
    abortRef.current = batchCtrl;
    const stopHandled = { handled: false };

    const worker = async () => {
      while (true) {
        if (session !== sessionRef.current) return;
        if (stopOnErrorRef.current) return;

        if (batchCtrl.signal.aborted && !retryRef.current) {
          if (!stopHandled.handled) {
            stopHandled.handled = true;
            const remaining = [...queueRef.current];
            if (remaining.length) {
              try { await supabase.from("aitext_inputs").update({ status: "pending" }).in("id", remaining); } catch {}
              setProgress(p => ({ ...p, stopped: p.stopped + remaining.length }));
            }
          }
          return;
        }

        const i = cursor++;
        if (i >= total) return;
        const id = inputIds[i];

        // If user manually triggered a regenerate for this row, let their action own it.
        if (singleAbortsRef.current.has(id)) {
          continue;
        }

        const r = await runOne(id, entryMap.get(id) || "", settings, provider, i, total, session, batchCtrl, true);
        if (session !== sessionRef.current) return;

        if (r.status === "aborted") {
          // Keep id in queue so resume re-runs it. Mark DB pending.
          await supabase.from("aitext_inputs").update({ status: "pending" }).eq("id", id);
          setProgress(p => ({ ...p, stopped: p.stopped + 1 }));
          continue;
        }

        queueRef.current = queueRef.current.filter(x => x !== id);
        setPendingQueue([...queueRef.current]);

        if (r.status === "done") {
          setProgress(p => ({
            ...p,
            completed: p.completed + 1,
            promptTokens: p.promptTokens + (r.usage?.p || 0),
            completionTokens: p.completionTokens + (r.usage?.c || 0),
          }));
        } else {
          setProgress(p => ({ ...p, failed: p.failed + 1 }));
          if (errorMode === "stop") {
            stopOnErrorRef.current = true;
            batchCtrl.abort();
            const remaining = inputIds.slice(cursor);
            if (remaining.length) {
              await supabase.from("aitext_inputs").update({ status: "pending" }).in("id", remaining);
            }
            return;
          }
        }
      }
    };

    const workers = Array.from({ length: Math.min(limit, total) }, () => worker());
    await Promise.all(workers);

    if (session !== sessionRef.current) return;
    if (stopOnErrorRef.current) {
      setState("stopped");
      setMessage("Stopped on error.");
    } else if (batchCtrl.signal.aborted) {
      setState("stopped");
      setMessage("Stopped — choose Continue or Restart below.");
    } else {
      setState("completed");
      setMessage("Complete.");
      queueRef.current = [];
      setPendingQueue([]);
      originalQueueRef.current = [];
    }
    abortRef.current = null;
  }, [state, runOne, toast]);

  const generateOne = useCallback(async (inputId: string, settings: GenSettings, provider: ProviderConfig, field?: "image_text" | "detail_description" | "all") => {
    const err = validateInputs(settings, provider);
    if (err) { toast({ title: "Cannot start", description: err, variant: "destructive" }); return; }

    singleAbortsRef.current.get(inputId)?.abort();
    const ctrl = new AbortController();
    singleAbortsRef.current.set(inputId, ctrl);

    try {
      const { data } = await supabase.from("aitext_inputs").select("raw_text").eq("id", inputId).maybeSingle();
      const entry = data?.raw_text || "";
      await runOne(inputId, entry, settings, provider, 0, 1, null, ctrl, false, field);
    } finally {
      if (singleAbortsRef.current.get(inputId) === ctrl) singleAbortsRef.current.delete(inputId);
    }
  }, [runOne, toast]);

  const resume = useCallback(async () => {
    const last = lastRunRef.current;
    const remaining = queueRef.current;
    if (!last || !remaining.length) {
      toast({ title: "Nothing to resume" });
      return;
    }
    await generateMany({
      inputIds: remaining,
      settings: last.settings,
      provider: last.provider,
      concurrency: last.concurrency,
      processingMode: last.processingMode,
      errorMode: last.errorMode,
    });
  }, [generateMany, toast]);

  const restart = useCallback(async (opts: { clearResults: boolean }) => {
    const last = lastRunRef.current;
    const original = originalQueueRef.current;
    if (!last || !original.length) {
      toast({ title: "Nothing to restart" });
      return;
    }
    if (opts.clearResults) {
      try {
        await supabase.from("aitext_outputs").delete().in("input_id", original);
      } catch {}
    }
    await supabase.from("aitext_inputs").update({ status: "pending", error_message: null }).in("id", original);
    // Reset original so generateMany re-stores it (same set).
    const ids = [...original];
    originalQueueRef.current = [];
    await generateMany({
      inputIds: ids,
      settings: last.settings,
      provider: last.provider,
      concurrency: last.concurrency,
      processingMode: last.processingMode,
      errorMode: last.errorMode,
    });
  }, [generateMany, toast]);

  const stopAll = useCallback(() => {
    if (state !== "running") return;
    setState("stopping");
    setMessage("Stopping…");
    abortRef.current?.abort();
    toast({ title: "Stop requested", description: "Choose Continue or Restart in the run bar." });
  }, [state, toast]);

  const skipCurrent = useCallback(() => {
    skipRef.current = true;
    abortRef.current?.abort();
  }, []);

  const retryCurrent = useCallback(() => {
    retryRef.current = true;
    abortRef.current?.abort();
  }, []);

  const clearSession = useCallback(() => {
    abortRef.current?.abort();
    sessionRef.current += 1;
    setState("idle");
    setMessage(null);
    setProgress({ total: 0, completed: 0, failed: 0, stopped: 0, promptTokens: 0, completionTokens: 0 });
    setLive(initialLive);
    setLiveById({});
    queueRef.current = [];
    originalQueueRef.current = [];
    setPendingQueue([]);
    setRowSources({});
  }, []);

  const clearAllPromptCaches = useCallback(() => {
    abortRef.current?.abort();
    sessionRef.current += 1;
    setLive(initialLive);
    setLiveById({});
    setPendingQueue([]);
    setRowSources({});
    queueRef.current = [];
    originalQueueRef.current = [];
    lastRunRef.current = null;
    setProgress({ total: 0, completed: 0, failed: 0, stopped: 0, promptTokens: 0, completionTokens: 0 });
    setMessage(null);
    setState("idle");
  }, []);

  return (
    <GenerationContext.Provider value={{
      state, progress, message,
      isRunning: state === "running" || state === "stopping",
      live,
      liveById,
      pendingQueue,
      generateMany, generateOne, resume, restart, stopAll, skipCurrent, retryCurrent, clearSession, clearAllPromptCaches, subscribeRowEvents,
      rowSources,
    }}>
      {children}
    </GenerationContext.Provider>
  );
}

export function useGeneration() {
  const ctx = useContext(GenerationContext);
  if (!ctx) throw new Error("useGeneration must be used within GenerationProvider");
  return ctx;
}
