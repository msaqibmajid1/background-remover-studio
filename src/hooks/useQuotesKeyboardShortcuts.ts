import { useEffect, useCallback } from 'react';

interface QuotesKeyboardShortcutsProps {
  onGenerate: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canGenerate: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isGenerating: boolean;
}

export const useQuotesKeyboardShortcuts = ({
  onGenerate,
  onSave,
  onUndo,
  onRedo,
  canGenerate,
  canUndo,
  canRedo,
  isGenerating,
}: QuotesKeyboardShortcutsProps) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Check if user is typing in an input/textarea
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    // Ctrl/Cmd + G (Generate)
    if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !e.shiftKey) {
      e.preventDefault();
      if (canGenerate && !isGenerating) {
        onGenerate();
      }
    }

    // Ctrl/Cmd + S (Save Project)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      onSave();
    }

    // Ctrl/Cmd + Z (Undo)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (canUndo) {
        onUndo();
      }
    }

    // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z (Redo)
    if (((e.ctrlKey || e.metaKey) && e.key === 'y') || 
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
      e.preventDefault();
      if (canRedo) {
        onRedo();
      }
    }
  }, [onGenerate, onSave, onUndo, onRedo, canGenerate, canUndo, canRedo, isGenerating]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};
