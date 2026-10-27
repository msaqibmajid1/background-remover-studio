import React from "react";
import { Button } from "@/components/ui/button";
import { Undo, Redo, Save, FolderOpen, Sparkles, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";
import { HelpDialog } from "./HelpDialog";
import { MemoryIndicator } from "./MemoryIndicator";
import { SavedSessionsManager } from "./SavedSessionsManager";
import { TemplateRandomizer } from "./TemplateRandomizer";
import { ToolBackButton } from "@/components/ToolBackButton";
import { EditorImage, ExportSettings, CanvasElement, CanvasSize, Padding, ImageFilter } from "@/types/editor";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditorHeaderProps {
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onLoad: () => void;
  onStartFresh?: () => void;
  onClearCache?: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasImages: boolean;
  onRestartTutorial: () => void;
  undoPreview?: { thumbnail?: string; action: string } | null;
  redoPreview?: { thumbnail?: string; action: string } | null;
  // Image navigation
  onNavigateImage?: (direction: "prev" | "next") => void;
  onSelectImage?: (index: number) => void;
  // Sessions manager props
  images?: EditorImage[];
  currentImageIndex?: number;
  exportSettings?: ExportSettings;
  onLoadSession?: (data: {
    images: EditorImage[];
    currentImageIndex: number;
    exportSettings: ExportSettings;
  }) => void;
  onApplyRandomTemplates?: (
    updates: {
      imageIndex: number;
      elements: CanvasElement[];
      canvasSize?: CanvasSize;
      padding?: Padding;
      filter?: ImageFilter;
    }[]
  ) => void;
}

export const EditorHeader = React.memo(({
  onUndo,
  onRedo,
  onSave,
  onLoad,
  
  onStartFresh,
  onClearCache,
  canUndo,
  canRedo,
  hasImages,
  onRestartTutorial,
  undoPreview = null,
  redoPreview = null,
  onNavigateImage,
  onSelectImage,
  images = [],
  currentImageIndex = 0,
  exportSettings,
  onLoadSession,
  onApplyRandomTemplates,
}: EditorHeaderProps) => {
  return (
    <header className="h-14 border-b border-panel-border bg-panel flex items-center justify-between px-4 shadow-sm">
      <div className="flex items-center gap-2">
        <ToolBackButton />
        <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-white text-sm font-bold">PE</span>
          </div>
          Professional Image Editor
        </h1>
        <HelpDialog onRestartTutorial={onRestartTutorial} />
        
        
        {/* Image Navigator */}
        {images.length > 0 && onNavigateImage && (
          <div className="flex items-center gap-1 ml-4 bg-muted/50 rounded-lg px-2 py-1">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onNavigateImage("prev")}
              disabled={currentImageIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {onSelectImage ? (
              <Select
                value={currentImageIndex.toString()}
                onValueChange={(value) => onSelectImage(parseInt(value))}
              >
                <SelectTrigger className="h-6 w-16 text-xs border-0 bg-transparent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {images.map((img, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>
                      {idx + 1} / {images.length}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-xs font-medium min-w-[40px] text-center">
                {currentImageIndex + 1} / {images.length}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onNavigateImage("next")}
              disabled={currentImageIndex === images.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <HoverCard openDelay={300}>
          <HoverCardTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onUndo}
              disabled={!canUndo}
              className="gap-2"
              data-onboarding="shortcuts"
            >
              <Undo className="h-4 w-4" />
              Undo
            </Button>
          </HoverCardTrigger>
          {canUndo && undoPreview && (
            <HoverCardContent className="w-64">
              <div className="space-y-2">
                {undoPreview.thumbnail && (
                  <img
                    src={undoPreview.thumbnail}
                    alt="Undo preview"
                    className="w-full h-32 object-contain rounded border border-border bg-muted"
                  />
                )}
                <div className="text-sm font-medium">{undoPreview.action}</div>
                <div className="text-xs text-muted-foreground">
                  Click to restore this state
                </div>
              </div>
            </HoverCardContent>
          )}
        </HoverCard>
        
        <HoverCard openDelay={300}>
          <HoverCardTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onRedo}
              disabled={!canRedo}
              className="gap-2"
            >
              <Redo className="h-4 w-4" />
              Redo
            </Button>
          </HoverCardTrigger>
          {canRedo && redoPreview && (
            <HoverCardContent className="w-64">
              <div className="space-y-2">
                {redoPreview.thumbnail && (
                  <img
                    src={redoPreview.thumbnail}
                    alt="Redo preview"
                    className="w-full h-32 object-contain rounded border border-border bg-muted"
                  />
                )}
                <div className="text-sm font-medium">{redoPreview.action}</div>
                <div className="text-xs text-muted-foreground">
                  Click to restore this state
                </div>
              </div>
            </HoverCardContent>
          )}
        </HoverCard>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              disabled={!hasImages}
              className="gap-2"
              data-onboarding="export"
            >
              <Save className="h-4 w-4" />
              Save Project
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Save project (Ctrl+S)</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onLoad}
              className="gap-2"
            >
              <FolderOpen className="h-4 w-4" />
              Load Project
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Load project (Ctrl+O)</p>
          </TooltipContent>
        </Tooltip>
        
        
        {onStartFresh && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onStartFresh}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                New Session
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Start a fresh editing session</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {/* Sessions Manager */}
        {exportSettings && onLoadSession && (
          <SavedSessionsManager
            images={images}
            currentImageIndex={currentImageIndex}
            exportSettings={exportSettings}
            onLoadSession={onLoadSession}
          />
        )}
        
        {/* Template Randomizer */}
        {exportSettings && onApplyRandomTemplates && (
          <TemplateRandomizer
            images={images}
            currentImageIndex={currentImageIndex}
            exportSettings={exportSettings}
            onApplyRandomTemplates={onApplyRandomTemplates}
          />
        )}
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <MemoryIndicator onClearCache={onClearCache} />
        
        <KeyboardShortcutsDialog />
      </div>
    </header>
  );
});
