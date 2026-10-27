import { useState, useCallback } from 'react';

interface UndoHistoryEntry<T> {
  data: T;
  description: string;
  timestamp: number;
}

interface UseUndoHistoryOptions {
  maxHistory?: number;
}

export function useUndoHistory<T>(options: UseUndoHistoryOptions = {}) {
  const { maxHistory = 50 } = options;
  
  const [undoStack, setUndoStack] = useState<UndoHistoryEntry<T>[]>([]);
  const [redoStack, setRedoStack] = useState<UndoHistoryEntry<T>[]>([]);

  const pushToUndo = useCallback((data: T, description: string) => {
    setUndoStack(prev => {
      const newStack = [...prev, { data, description, timestamp: Date.now() }];
      return newStack.slice(-maxHistory);
    });
    setRedoStack([]);
  }, [maxHistory]);

  const undo = useCallback((): UndoHistoryEntry<T> | null => {
    if (undoStack.length === 0) return null;
    
    const lastEntry = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    
    return lastEntry;
  }, [undoStack]);

  const pushToRedo = useCallback((data: T, description: string) => {
    setRedoStack(prev => [...prev, { data, description, timestamp: Date.now() }]);
  }, []);

  const redo = useCallback((): UndoHistoryEntry<T> | null => {
    if (redoStack.length === 0) return null;
    
    const lastEntry = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    
    return lastEntry;
  }, [redoStack]);

  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  return {
    pushToUndo,
    pushToRedo,
    undo,
    redo,
    clearHistory,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undoDescription: undoStack[undoStack.length - 1]?.description,
    redoDescription: redoStack[redoStack.length - 1]?.description,
  };
}
