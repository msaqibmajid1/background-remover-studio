import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ClipboardPaste, ChevronDown, AlertTriangle, Check, Type } from "lucide-react";
import { TextElement, EditorImage } from "@/types/editor";

type ParseFormat = "newline" | "numbered" | "dash" | "custom";
type MismatchHandling = "keep" | "use-last" | "clear";

interface BatchUpdateTextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: EditorImage[];
  currentImageIndex: number;
  onUpdateTexts: (updates: { imageIndex: number; elementId: string; newContent: string }[]) => void;
}

interface TextElementInfo {
  element: TextElement;
  displayName: string;
  previewContent: string;
  count: number; // How many images have this element
}

export function BatchUpdateTextDialog({
  open,
  onOpenChange,
  images,
  currentImageIndex,
  onUpdateTexts,
}: BatchUpdateTextDialogProps) {
  const [text, setText] = useState("");
  const [format, setFormat] = useState<ParseFormat>("newline");
  const [customDelimiter, setCustomDelimiter] = useState("|||");
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [mismatchHandling, setMismatchHandling] = useState<MismatchHandling>("keep");
  const [previewOpen, setPreviewOpen] = useState(false);

  const currentImage = images[currentImageIndex];

  // Get text elements from current image as templates
  const textElements = useMemo((): TextElementInfo[] => {
    if (!currentImage) return [];

    const textEls = currentImage.elements.filter(
      (el): el is TextElement => el.type === "text"
    );

    return textEls.map((element, index) => {
      // Count how many images have this element
      // PRIMARY: Use templateCode for matching
      // FALLBACK: Use sourceElementId for legacy elements
      const templateCode = element.templateCode;
      const sourceId = element.sourceElementId || element.id;
      let count = 0;
      
      for (const img of images) {
        const hasElement = img.elements.some(
          (el) =>
            el.type === "text" &&
            (
              // Primary: match by templateCode
              (templateCode && el.templateCode === templateCode) ||
              // Fallback: match by sourceElementId (legacy)
              (!templateCode && (el.sourceElementId === sourceId || el.id === sourceId || el.id === element.id))
            )
        );
        if (hasElement) count++;
      }

      return {
        element,
        displayName: element.name || `Text ${index + 1}`,
        previewContent:
          element.content.length > 30
            ? element.content.substring(0, 30) + "..."
            : element.content,
        count,
      };
    });
  }, [currentImage, images]);

  // Auto-select first element if none selected
  useMemo(() => {
    if (!selectedElementId && textElements.length > 0) {
      setSelectedElementId(textElements[0].element.id);
    }
  }, [textElements, selectedElementId]);

  // Parse pasted text into individual texts
  const parsedTexts = useMemo((): string[] => {
    if (!text.trim()) return [];

    let lines: string[] = [];

    switch (format) {
      case "newline":
        lines = text
          .split(/\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        break;
      case "numbered":
        lines = text
          .split(/\n/)
          .map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim())
          .filter(Boolean);
        break;
      case "dash":
        lines = text
          .split(/\n/)
          .map((l) => l.replace(/^[-•]\s*/, "").trim())
          .filter(Boolean);
        break;
      case "custom":
        lines = text
          .split(customDelimiter)
          .map((l) => l.trim())
          .filter(Boolean);
        break;
    }

    return lines;
  }, [text, format, customDelimiter]);

  // Find matching elements across all images for the selected element
  const getMatchingElements = (selectedId: string) => {
    const selectedElement = textElements.find((t) => t.element.id === selectedId);
    if (!selectedElement) return [];

    // PRIMARY: Use templateCode for matching
    const templateCode = selectedElement.element.templateCode;
    // FALLBACK: Use sourceElementId for legacy elements
    const sourceId = selectedElement.element.sourceElementId || selectedElement.element.id;

    const matches: { imageIndex: number; elementId: string; currentContent: string }[] = [];

    images.forEach((img, imgIndex) => {
      let matchingEl: TextElement | undefined;

      // Primary: match by templateCode (most reliable)
      if (templateCode) {
        matchingEl = img.elements.find(
          (el) => el.type === "text" && el.templateCode === templateCode
        ) as TextElement | undefined;
      }

      // Fallback: match by sourceElementId (for legacy projects)
      if (!matchingEl) {
        matchingEl = img.elements.find(
          (el) =>
            el.type === "text" &&
            (el.sourceElementId === sourceId ||
              el.id === sourceId ||
              el.id === selectedId ||
              (el.sourceElementId && selectedElement.element.sourceElementId === el.sourceElementId))
        ) as TextElement | undefined;
      }

      if (matchingEl) {
        matches.push({
          imageIndex: imgIndex,
          elementId: matchingEl.id,
          currentContent: matchingEl.content,
        });
      }
    });

    return matches;
  };

  // Generate preview of text-to-image mapping
  const previewMapping = useMemo(() => {
    if (!selectedElementId) return [];

    const matches = getMatchingElements(selectedElementId);
    const mapping: { imageIndex: number; imageNumber: number; text: string; elementId: string }[] = [];

    matches.forEach((match, idx) => {
      let newText = "";
      if (idx < parsedTexts.length) {
        newText = parsedTexts[idx];
      } else {
        // Handle mismatch
        switch (mismatchHandling) {
          case "keep":
            newText = match.currentContent;
            break;
          case "use-last":
            newText = parsedTexts[parsedTexts.length - 1] || match.currentContent;
            break;
          case "clear":
            newText = "";
            break;
        }
      }

      mapping.push({
        imageIndex: match.imageIndex,
        imageNumber: match.imageIndex + 1,
        text: newText,
        elementId: match.elementId,
      });
    });

    return mapping;
  }, [selectedElementId, parsedTexts, mismatchHandling, images]);

  const matchCount = selectedElementId ? getMatchingElements(selectedElementId).length : 0;
  const textCount = parsedTexts.length;
  const hasMismatch = textCount !== matchCount && textCount > 0;

  const handleUpdate = () => {
    if (!selectedElementId || parsedTexts.length === 0) return;

    const updates = previewMapping.map((mapping) => ({
      imageIndex: mapping.imageIndex,
      elementId: mapping.elementId,
      newContent: mapping.text,
    }));

    onUpdateTexts(updates);
    setText("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" />
            Batch Update Text Content
          </DialogTitle>
          <DialogDescription>
            Update text content for a specific element across all {images.length} images.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Element Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Element to Update</Label>
            {textElements.length === 0 ? (
              <div className="text-sm text-muted-foreground p-3 border rounded-lg bg-muted/30">
                No text elements found on current image. Add text elements first.
              </div>
            ) : (
              <RadioGroup
                value={selectedElementId || ""}
                onValueChange={setSelectedElementId}
                className="space-y-2"
              >
                {textElements.map((info) => (
                  <div
                    key={info.element.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedElementId === info.element.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedElementId(info.element.id)}
                  >
                    <RadioGroupItem value={info.element.id} id={info.element.id} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Type className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm">{info.displayName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {info.count} images
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        "{info.previewContent}"
                      </p>
                    </div>
                    <div
                      className="w-4 h-4 rounded shrink-0"
                      style={{
                        backgroundColor: info.element.color,
                        fontFamily: info.element.fontFamily,
                      }}
                      title={`${info.element.fontFamily}`}
                    />
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>

          {/* Parsing Format */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Parsing Format</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as ParseFormat)}
              className="grid grid-cols-2 gap-2"
            >
              <div className="flex items-center space-x-2 p-2 rounded-md border border-border hover:bg-muted/50">
                <RadioGroupItem value="newline" id="fmt-newline" />
                <Label htmlFor="fmt-newline" className="text-sm cursor-pointer">
                  Newline separated
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2 rounded-md border border-border hover:bg-muted/50">
                <RadioGroupItem value="numbered" id="fmt-numbered" />
                <Label htmlFor="fmt-numbered" className="text-sm cursor-pointer">
                  Numbered (1. Text)
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2 rounded-md border border-border hover:bg-muted/50">
                <RadioGroupItem value="dash" id="fmt-dash" />
                <Label htmlFor="fmt-dash" className="text-sm cursor-pointer">
                  Dash/Bullet (- Text)
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2 rounded-md border border-border hover:bg-muted/50">
                <RadioGroupItem value="custom" id="fmt-custom" />
                <Label htmlFor="fmt-custom" className="text-sm cursor-pointer">
                  Custom delimiter
                </Label>
              </div>
            </RadioGroup>
            {format === "custom" && (
              <div className="flex items-center gap-2 mt-2">
                <Label className="text-xs text-muted-foreground">Delimiter:</Label>
                <input
                  type="text"
                  value={customDelimiter}
                  onChange={(e) => setCustomDelimiter(e.target.value)}
                  className="w-20 px-2 py-1 text-sm border rounded bg-background"
                  placeholder="|||"
                />
              </div>
            )}
          </div>

          {/* Text Input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Paste Texts ({parsedTexts.length} detected)
            </Label>
            <Textarea
              placeholder={`Paste your texts here...\n\nExample (${format === "newline" ? "one per line" : format === "numbered" ? "numbered list" : format === "dash" ? "dash prefixed" : "delimiter separated"}):\n${
                format === "newline"
                  ? "Text for image 1\nText for image 2\nText for image 3"
                  : format === "numbered"
                  ? "1. Text for image 1\n2. Text for image 2\n3. Text for image 3"
                  : format === "dash"
                  ? "- Text for image 1\n- Text for image 2\n- Text for image 3"
                  : "Text for image 1|||Text for image 2|||Text for image 3"
              }`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />

            {/* Status indicator */}
            {parsedTexts.length > 0 && selectedElementId && (
              <div
                className={`flex items-center gap-2 text-sm p-2 rounded-md ${
                  hasMismatch
                    ? "bg-amber-500/10 text-amber-600"
                    : "bg-green-500/10 text-green-600"
                }`}
              >
                {hasMismatch ? (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      {textCount} texts for {matchCount} images
                      {textCount < matchCount && ` - ${matchCount - textCount} images will ${mismatchHandling === "keep" ? "keep existing content" : mismatchHandling === "use-last" ? "use last text" : "be cleared"}`}
                      {textCount > matchCount && ` - ${textCount - matchCount} texts will be ignored`}
                    </span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>
                      {textCount} texts matched to {matchCount} images
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Mismatch Handling */}
          {hasMismatch && textCount < matchCount && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">When fewer texts than images:</Label>
              <RadioGroup
                value={mismatchHandling}
                onValueChange={(v) => setMismatchHandling(v as MismatchHandling)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="keep" id="mismatch-keep" />
                  <Label htmlFor="mismatch-keep" className="text-sm cursor-pointer">
                    Keep existing
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="use-last" id="mismatch-last" />
                  <Label htmlFor="mismatch-last" className="text-sm cursor-pointer">
                    Use last text
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="clear" id="mismatch-clear" />
                  <Label htmlFor="mismatch-clear" className="text-sm cursor-pointer">
                    Clear content
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Preview Mapping */}
          {previewMapping.length > 0 && parsedTexts.length > 0 && (
            <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${previewOpen ? "rotate-180" : ""}`}
                />
                Preview Mapping ({previewMapping.length} images)
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ScrollArea className="h-48 mt-2 border rounded-lg">
                  <div className="p-3 space-y-2">
                    {previewMapping.slice(0, 20).map((item) => (
                      <div
                        key={item.imageIndex}
                        className="flex gap-3 text-sm border-b border-border/50 pb-2 last:border-0"
                      >
                        <Badge variant="outline" className="shrink-0">
                          Image {item.imageNumber}
                        </Badge>
                        <span className="text-muted-foreground truncate">
                          "{item.text.length > 50 ? item.text.substring(0, 50) + "..." : item.text}"
                        </span>
                      </div>
                    ))}
                    {previewMapping.length > 20 && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        ... and {previewMapping.length - 20} more
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={parsedTexts.length === 0 || !selectedElementId || textElements.length === 0}
          >
            <ClipboardPaste className="h-4 w-4 mr-2" />
            Update {Math.min(parsedTexts.length, matchCount)} Text
            {Math.min(parsedTexts.length, matchCount) !== 1 && "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
