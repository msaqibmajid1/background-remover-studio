import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Type,
  Image,
  Square,
  Circle,
  Star,
  Pentagon,
  Minus,
  ArrowRight,
  FileText,
  Palette,
  Download,
  Upload,
  Save,
  FolderOpen,
  Copy,
  Clipboard,
  Layers,
  Undo,
  Redo,
  Trash2,
} from "lucide-react";

interface CommandPaletteProps {
  onAddText: () => void;
  onAddLogo: () => void;
  onAddWatermark: () => void;
  onAddRectangle: () => void;
  onAddCircle: () => void;
  onAddStar: () => void;
  onAddPolygon: () => void;
  onAddLine: () => void;
  onAddArrow: () => void;
  onOpenTextTemplates: () => void;
  onOpenTemplates: () => void;
  onUploadImages: () => void;
  onDownloadCurrent: () => void;
  onDownloadAll: () => void;
  onSaveProject: () => void;
  onLoadProject: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  hasImages: boolean;
}

export const CommandPalette = ({
  onAddText,
  onAddLogo,
  onAddWatermark,
  onAddRectangle,
  onAddCircle,
  onAddStar,
  onAddPolygon,
  onAddLine,
  onAddArrow,
  onOpenTextTemplates,
  onOpenTemplates,
  onUploadImages,
  onDownloadCurrent,
  onDownloadAll,
  onSaveProject,
  onLoadProject,
  onCopy,
  onPaste,
  onUndo,
  onRedo,
  onDelete,
  canUndo,
  canRedo,
  hasSelection,
  hasImages,
}: CommandPaletteProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search commands..." />
      <CommandList>
        <CommandEmpty>No commands found.</CommandEmpty>
        
        <CommandGroup heading="File">
          <CommandItem onSelect={() => runCommand(onUploadImages)}>
            <Upload className="mr-2 h-4 w-4" />
            <span>Upload Images</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(onSaveProject)}>
            <Save className="mr-2 h-4 w-4" />
            <span>Save Project</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(onLoadProject)}>
            <FolderOpen className="mr-2 h-4 w-4" />
            <span>Load Project</span>
          </CommandItem>
          {hasImages && (
            <>
              <CommandItem onSelect={() => runCommand(onDownloadCurrent)}>
                <Download className="mr-2 h-4 w-4" />
                <span>Download Current Image</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(onDownloadAll)}>
                <Download className="mr-2 h-4 w-4" />
                <span>Download All Images</span>
              </CommandItem>
            </>
          )}
        </CommandGroup>

        <CommandGroup heading="Edit">
          {canUndo && (
            <CommandItem onSelect={() => runCommand(onUndo)}>
              <Undo className="mr-2 h-4 w-4" />
              <span>Undo</span>
              <span className="ml-auto text-xs text-muted-foreground">Ctrl+Z</span>
            </CommandItem>
          )}
          {canRedo && (
            <CommandItem onSelect={() => runCommand(onRedo)}>
              <Redo className="mr-2 h-4 w-4" />
              <span>Redo</span>
              <span className="ml-auto text-xs text-muted-foreground">Ctrl+Y</span>
            </CommandItem>
          )}
          {hasSelection && (
            <>
              <CommandItem onSelect={() => runCommand(onCopy)}>
                <Copy className="mr-2 h-4 w-4" />
                <span>Copy Element</span>
                <span className="ml-auto text-xs text-muted-foreground">Ctrl+C</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(onDelete)}>
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete Element</span>
                <span className="ml-auto text-xs text-muted-foreground">Delete</span>
              </CommandItem>
            </>
          )}
          <CommandItem onSelect={() => runCommand(onPaste)}>
            <Clipboard className="mr-2 h-4 w-4" />
            <span>Paste Element</span>
            <span className="ml-auto text-xs text-muted-foreground">Ctrl+V</span>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Add Elements">
          <CommandItem onSelect={() => runCommand(onAddText)}>
            <Type className="mr-2 h-4 w-4" />
            <span>Add Text</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(onAddRectangle)}>
            <Square className="mr-2 h-4 w-4" />
            <span>Add Rectangle</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(onAddCircle)}>
            <Circle className="mr-2 h-4 w-4" />
            <span>Add Circle</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(onAddStar)}>
            <Star className="mr-2 h-4 w-4" />
            <span>Add Star</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(onAddPolygon)}>
            <Pentagon className="mr-2 h-4 w-4" />
            <span>Add Polygon</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(onAddLine)}>
            <Minus className="mr-2 h-4 w-4" />
            <span>Add Line</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(onAddArrow)}>
            <ArrowRight className="mr-2 h-4 w-4" />
            <span>Add Arrow</span>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Images & Assets">
          <CommandItem
            onSelect={() => {
              setOpen(false);
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) onAddLogo();
              };
              input.click();
            }}
          >
            <Image className="mr-2 h-4 w-4" />
            <span>Add Logo</span>
          </CommandItem>
          <CommandItem 
            onSelect={() => {
              setOpen(false);
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) onAddWatermark();
              };
              input.click();
            }}
          >
            <Image className="mr-2 h-4 w-4" />
            <span>Add Watermark</span>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Templates">
          <CommandItem onSelect={() => runCommand(onOpenTextTemplates)}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Text Templates</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(onOpenTemplates)}>
            <Layers className="mr-2 h-4 w-4" />
            <span>Design Templates</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
