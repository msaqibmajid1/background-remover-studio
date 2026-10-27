/**
 * Last-action recorder. Keeps the most recent user-driven action in a
 * module-level singleton so any tool (Canvas, Quotes, Collage, ...) can
 * record + repeat without prop drilling. F4 invokes `repeatLastAction`.
 *
 * Action.run is a closure: it should re-resolve "current selection /
 * current image" from live state at replay time, NOT capture stale ids.
 */
import { useEffect, useRef, useState } from "react";

export interface LastAction {
  /** Human label shown in toasts/UI ("Change color", "Apply Word Styler", ...) */
  label: string;
  /** Replay closure. Should be safe to call when no selection — return early. */
  run: () => void;
  /** Owner tag — used to clear actions when leaving a tool. */
  scope?: string;
}

let _lastAction: LastAction | null = null;
const _listeners = new Set<(a: LastAction | null) => void>();

function notify() {
  for (const l of _listeners) l(_lastAction);
}

export function recordLastAction(action: LastAction) {
  _lastAction = action;
  notify();
}

export function repeatLastAction(): boolean {
  if (!_lastAction) return false;
  try {
    _lastAction.run();
    return true;
  } catch (e) {
    console.error("[repeatLastAction] failed:", e);
    return false;
  }
}

export function getLastAction(): LastAction | null {
  return _lastAction;
}

export function clearLastAction(scope?: string) {
  if (scope && _lastAction?.scope !== scope) return;
  _lastAction = null;
  notify();
}

/**
 * Hook giving a stable `record` function + reactive `lastLabel` for UI.
 * `scope` clears prior actions belonging to a different tool on mount,
 * so F4 only ever replays something appropriate to the current tool.
 */
export function useLastAction(scope: string) {
  const [lastLabel, setLastLabel] = useState<string | null>(
    _lastAction?.scope === scope ? _lastAction.label : null
  );
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  useEffect(() => {
    // Drop any action belonging to a different tool when this tool mounts.
    if (_lastAction && _lastAction.scope !== scope) {
      clearLastAction();
    }
    const listener = (a: LastAction | null) => {
      setLastLabel(a && a.scope === scopeRef.current ? a.label : null);
    };
    _listeners.add(listener);
    return () => {
      _listeners.delete(listener);
    };
  }, [scope]);

  const record = (label: string, run: () => void) => {
    recordLastAction({ label, run, scope: scopeRef.current });
  };

  return { record, repeat: repeatLastAction, lastLabel };
}
