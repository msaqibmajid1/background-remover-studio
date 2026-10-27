import { useEffect } from 'react';

interface KeyboardShortcutsProps {
  onDelete: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onSelectAll: () => void;
  onDuplicate: () => void;
  onDeselect: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onRepeatLastAction?: () => void;
  hasSelection: boolean;
  canUndo: boolean;
  canRedo: boolean;
  hasImages: boolean;
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
  hasElements: boolean;
}

export const useKeyboardShortcuts = ({
  onDelete,
  onCopy,
  onPaste,
  onUndo,
  onRedo,
  onGroup,
  onUngroup,
  onMoveUp,
  onMoveDown,
  onMoveLeft,
  onMoveRight,
  onNavigatePrev,
  onNavigateNext,
  onSelectAll,
  onDuplicate,
  onDeselect,
  onBringToFront,
  onSendToBack,
  onBringForward,
  onSendBackward,
  onRepeatLastAction,
  hasSelection,
  canUndo,
  canRedo,
  hasImages,
  canNavigatePrev,
  canNavigateNext,
  hasElements,
}: KeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // F4 (Repeat Last Action) — works regardless of selection
      if (e.key === 'F4' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        if (onRepeatLastAction) {
          e.preventDefault();
          onRepeatLastAction();
          return;
        }
      }

      // Delete or Backspace key
      if ((e.key === 'Delete' || e.key === 'Backspace') && hasSelection) {
        e.preventDefault();
        onDelete();
      }

      // Escape key (Deselect)
      if (e.key === 'Escape' && hasSelection) {
        e.preventDefault();
        onDeselect();
      }

      // Ctrl/Cmd + A (Select All)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && hasElements) {
        e.preventDefault();
        onSelectAll();
      }

      // Ctrl/Cmd + D (Duplicate)
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && hasSelection) {
        e.preventDefault();
        onDuplicate();
      }

      // Ctrl/Cmd + Z (Undo)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && canUndo) {
        e.preventDefault();
        onUndo();
      }

      // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z (Redo)
      if (((e.ctrlKey || e.metaKey) && e.key === 'y') || 
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
        if (canRedo) {
          e.preventDefault();
          onRedo();
        }
      }

      // Ctrl/Cmd + C (Copy)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && hasSelection) {
        e.preventDefault();
        onCopy();
      }

      // Ctrl/Cmd + V (Paste)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        onPaste();
      }

      // Ctrl/Cmd + G (Group)
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !e.shiftKey && hasSelection) {
        e.preventDefault();
        onGroup();
      }

      // Ctrl/Cmd + Shift + G (Ungroup)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'g' && hasSelection) {
        e.preventDefault();
        onUngroup();
      }


      // Ctrl/Cmd + Shift + ] (Bring to Front)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === ']' && hasSelection) {
        e.preventDefault();
        onBringToFront();
      }

      // Ctrl/Cmd + Shift + [ (Send to Back)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '[' && hasSelection) {
        e.preventDefault();
        onSendToBack();
      }

      // Ctrl/Cmd + ] (Bring Forward)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === ']' && hasSelection) {
        e.preventDefault();
        onBringForward();
      }

      // Ctrl/Cmd + [ (Send Backward)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === '[' && hasSelection) {
        e.preventDefault();
        onSendBackward();
      }

      // Page Up / Alt+Left / Left Arrow (Navigate to previous image)
      // Left arrow navigates only if no element is selected
      if ((e.key === 'PageUp' || (e.altKey && e.key === 'ArrowLeft') || 
          (e.key === 'ArrowLeft' && !hasSelection && !e.altKey)) && canNavigatePrev) {
        e.preventDefault();
        onNavigatePrev();
      }

      // Page Down / Alt+Right / Right Arrow (Navigate to next image)
      // Right arrow navigates only if no element is selected
      if ((e.key === 'PageDown' || (e.altKey && e.key === 'ArrowRight') || 
          (e.key === 'ArrowRight' && !hasSelection && !e.altKey)) && canNavigateNext) {
        e.preventDefault();
        onNavigateNext();
      }

      // Arrow keys (with Shift for 10px movement) - only without Alt modifier
      if (hasSelection && !e.altKey) {
        const step = e.shiftKey ? 10 : 1;
        
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          onMoveUp();
        }
        
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          onMoveDown();
        }
        
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          onMoveLeft();
        }
        
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          onMoveRight();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onDelete, onCopy, onPaste, onUndo, onRedo, onGroup, onUngroup,
    onMoveUp, onMoveDown, onMoveLeft, onMoveRight,
    onNavigatePrev, onNavigateNext, onSelectAll, onDuplicate, onDeselect,
    onBringToFront, onSendToBack, onBringForward, onSendBackward,
    onRepeatLastAction,
    hasSelection, canUndo, canRedo, hasImages, canNavigatePrev, canNavigateNext, hasElements
  ]);
};
