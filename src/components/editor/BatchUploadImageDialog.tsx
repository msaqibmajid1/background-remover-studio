import { useState, useMemo, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ImagePlus, ChevronDown, AlertTriangle, Check, Square, Circle,
  Upload, X, Info, Shuffle, ArrowUpAZ, ArrowDownAZ, FileImage, GripVertical
} from "lucide-react";
import { ShapeElement, EditorImage } from "@/types/editor";

type ArrangementMode = "as-uploaded" | "name-asc" | "name-desc" | "match-filename" | "random";
type MismatchHandling = "keep" | "use-last" | "clear";
type ImageFitMode = "cover" | "contain";

interface UploadedImage {
  file: File;
  dataUrl: string;
  filename: string;
}

interface ShapeElementInfo {
  element: ShapeElement;
  displayName: string;
  count: number;
}

interface BatchUploadImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: EditorImage[];
  currentImageIndex: number;
  onBatchUploadImages: (updates: {
    imageIndex: number;
    elementId: string;
    backgroundImage: string;
    backgroundOpacity?: number;
    backgroundImageFit?: ImageFitMode;
  }[]) => void;
}

export function BatchUploadImageDialog({
  open,
  onOpenChange,
  images,
  currentImageIndex,
  onBatchUploadImages,
}: BatchUploadImageDialogProps) {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [arrangement, setArrangement] = useState<ArrangementMode>("as-uploaded");
  const [mismatchHandling, setMismatchHandling] = useState<MismatchHandling>("keep");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [imageFit, setImageFit] = useState<ImageFitMode>("cover");
  const [overrideOpacity, setOverrideOpacity] = useState(false);
  const [opacityValue, setOpacityValue] = useState(100);
  const [skipExisting, setSkipExisting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentImage = images[currentImageIndex];

  // Get shape elements (rectangle/circle) from current image
  const shapeElements = useMemo((): ShapeElementInfo[] => {
    if (!currentImage) return [];

    const shapeEls = currentImage.elements.filter(
      (el): el is ShapeElement => el.type === "rectangle" || el.type === "circle"
    );

    return shapeEls.map((element, index) => {
      const templateCode = element.templateCode;
      const sourceId = element.sourceElementId || element.id;
      let count = 0;

      for (const img of images) {
        const hasElement = img.elements.some(
          (el) =>
            (el.type === "rectangle" || el.type === "circle") &&
            (
              (templateCode && el.templateCode === templateCode) ||
              (!templateCode && (el.sourceElementId === sourceId || el.id === sourceId || el.id === element.id))
            )
        );
        if (hasElement) count++;
      }

      return {
        element,
        displayName: element.name || `${element.type === "rectangle" ? "Rectangle" : "Circle"} ${index + 1}`,
        count,
      };
    });
  }, [currentImage, images]);

  // Auto-select first element
  useMemo(() => {
    if (!selectedElementId && shapeElements.length > 0) {
      setSelectedElementId(shapeElements[0].element.id);
    }
  }, [shapeElements, selectedElementId]);

  // Read files as data URLs
  const readFiles = useCallback((files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    Promise.all(
      imageFiles.map(
        (file) =>
          new Promise<UploadedImage>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              resolve({
                file,
                dataUrl: e.target?.result as string,
                filename: file.name,
              });
            };
            reader.readAsDataURL(file);
          })
      )
    ).then((newImages) => {
      setUploadedImages((prev) => [...prev, ...newImages]);
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      readFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      readFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Arrange images based on selected mode
  const arrangedImages = useMemo((): UploadedImage[] => {
    const imgs = [...uploadedImages];
    switch (arrangement) {
      case "name-asc":
        return imgs.sort((a, b) => a.filename.localeCompare(b.filename));
      case "name-desc":
        return imgs.sort((a, b) => b.filename.localeCompare(a.filename));
      case "random": {
        // Fisher-Yates shuffle (deterministic per render via useMemo)
        for (let i = imgs.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
        }
        return imgs;
      }
      case "match-filename":
        // Will be handled in preview mapping
        return imgs;
      default:
        return imgs;
    }
  }, [uploadedImages, arrangement]);

  // Find matching elements across all images
  const getMatchingElements = (selectedId: string) => {
    const selectedElement = shapeElements.find((s) => s.element.id === selectedId);
    if (!selectedElement) return [];

    const templateCode = selectedElement.element.templateCode;
    const sourceId = selectedElement.element.sourceElementId || selectedElement.element.id;

    const matches: { imageIndex: number; elementId: string; currentBgImage?: string; canvasFilename: string }[] = [];

    images.forEach((img, imgIndex) => {
      let matchingEl: ShapeElement | undefined;

      if (templateCode) {
        matchingEl = img.elements.find(
          (el) => (el.type === "rectangle" || el.type === "circle") && el.templateCode === templateCode
        ) as ShapeElement | undefined;
      }

      if (!matchingEl) {
        matchingEl = img.elements.find(
          (el) =>
            (el.type === "rectangle" || el.type === "circle") &&
            (el.sourceElementId === sourceId ||
              el.id === sourceId ||
              el.id === selectedId)
        ) as ShapeElement | undefined;
      }

      if (matchingEl) {
        matches.push({
          imageIndex: imgIndex,
          elementId: matchingEl.id,
          currentBgImage: matchingEl.backgroundImage,
          canvasFilename: img.file.name,
        });
      }
    });

    return matches;
  };

  // Filename matching helper
  const normalizeFilename = (name: string) => {
    return name.replace(/\.[^.]+$/, "").toLowerCase().trim();
  };

  // Generate preview mapping
  const previewMapping = useMemo(() => {
    if (!selectedElementId) return [];

    const matches = getMatchingElements(selectedElementId);
    const mapping: {
      imageIndex: number;
      imageNumber: number;
      elementId: string;
      uploadedImage: UploadedImage | null;
      currentBgImage?: string;
      skipped: boolean;
    }[] = [];

    if (arrangement === "match-filename") {
      // Match by filename
      const remainingUploads = [...arrangedImages];

      matches.forEach((match) => {
        const canvasBaseName = normalizeFilename(match.canvasFilename);
        let bestMatch: UploadedImage | null = null;
        let bestIdx = -1;

        // Exact match first
        for (let i = 0; i < remainingUploads.length; i++) {
          const uploadBaseName = normalizeFilename(remainingUploads[i].filename);
          if (uploadBaseName === canvasBaseName) {
            bestMatch = remainingUploads[i];
            bestIdx = i;
            break;
          }
        }

        // Substring match fallback
        if (!bestMatch) {
          for (let i = 0; i < remainingUploads.length; i++) {
            const uploadBaseName = normalizeFilename(remainingUploads[i].filename);
            if (canvasBaseName.includes(uploadBaseName) || uploadBaseName.includes(canvasBaseName)) {
              bestMatch = remainingUploads[i];
              bestIdx = i;
              break;
            }
          }
        }

        const shouldSkip = skipExisting && !!match.currentBgImage;

        if (bestMatch && bestIdx >= 0) {
          remainingUploads.splice(bestIdx, 1);
        }

        mapping.push({
          imageIndex: match.imageIndex,
          imageNumber: match.imageIndex + 1,
          elementId: match.elementId,
          uploadedImage: shouldSkip ? null : bestMatch,
          currentBgImage: match.currentBgImage,
          skipped: shouldSkip,
        });
      });
    } else {
      matches.forEach((match, idx) => {
        const shouldSkip = skipExisting && !!match.currentBgImage;
        let uploadedImage: UploadedImage | null = null;

        if (!shouldSkip) {
          if (idx < arrangedImages.length) {
            uploadedImage = arrangedImages[idx];
          } else {
            switch (mismatchHandling) {
              case "keep":
                uploadedImage = null; // Keep existing
                break;
              case "use-last":
                uploadedImage = arrangedImages[arrangedImages.length - 1] || null;
                break;
              case "clear":
                uploadedImage = { file: new File([], ""), dataUrl: "", filename: "__clear__" };
                break;
            }
          }
        }

        mapping.push({
          imageIndex: match.imageIndex,
          imageNumber: match.imageIndex + 1,
          elementId: match.elementId,
          uploadedImage: shouldSkip ? null : uploadedImage,
          currentBgImage: match.currentBgImage,
          skipped: shouldSkip,
        });
      });
    }

    return mapping;
  }, [selectedElementId, arrangedImages, arrangement, mismatchHandling, skipExisting, images]);

  const matchCount = selectedElementId ? getMatchingElements(selectedElementId).length : 0;
  const imageCount = arrangedImages.length;
  const hasMismatch = imageCount !== matchCount && imageCount > 0;

  const handleApply = () => {
    if (!selectedElementId || uploadedImages.length === 0) return;

    const updates = previewMapping
      .filter((m) => !m.skipped && m.uploadedImage)
      .map((m) => ({
        imageIndex: m.imageIndex,
        elementId: m.elementId,
        backgroundImage: m.uploadedImage!.filename === "__clear__" ? "" : m.uploadedImage!.dataUrl,
        backgroundOpacity: overrideOpacity ? opacityValue / 100 : undefined,
        backgroundImageFit: imageFit,
      }));

    onBatchUploadImages(updates);
    setUploadedImages([]);
    onOpenChange(false);
  };

  const handleClose = () => {
    setUploadedImages([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5" />
            Batch Upload Background Images
          </DialogTitle>
          <DialogDescription>
            Upload images and assign them to shape elements across all {images.length} canvas images.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Element Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Target Element</Label>
            {shapeElements.length === 0 ? (
              <div className="text-sm text-muted-foreground p-3 border rounded-lg bg-muted/30">
                No rectangle or circle elements found. Add shape elements first.
              </div>
            ) : (
              <RadioGroup
                value={selectedElementId || ""}
                onValueChange={setSelectedElementId}
                className="space-y-2"
              >
                {shapeElements.map((info) => (
                  <div
                    key={info.element.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedElementId === info.element.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedElementId(info.element.id)}
                  >
                    <RadioGroupItem value={info.element.id} id={`shape-${info.element.id}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {info.element.type === "rectangle" ? (
                          <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="font-medium text-sm">{info.displayName}</span>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {info.element.type}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {info.count} images
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {info.element.backgroundImage ? (
                          <img
                            src={info.element.backgroundImage}
                            alt="Current bg"
                            className="w-8 h-8 object-cover rounded border"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">No background image</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>

          {/* Image Upload Section */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Upload Images ({uploadedImages.length} uploaded for {matchCount} canvas images)
            </Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag & drop images here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports JPG, PNG, WebP, GIF
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Uploaded image thumbnails */}
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-6 gap-2 mt-2">
                {uploadedImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={img.dataUrl}
                      alt={img.filename}
                      className="w-full aspect-square object-cover rounded border"
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeUploadedImage(idx); }}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <p className="text-[9px] text-muted-foreground truncate mt-0.5">{img.filename}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Arrangement Options */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Image Arrangement</Label>
            <RadioGroup
              value={arrangement}
              onValueChange={(v) => setArrangement(v as ArrangementMode)}
              className="grid grid-cols-2 gap-2"
            >
              <div className="flex items-center space-x-2 p-2 rounded-md border border-border hover:bg-muted/50">
                <RadioGroupItem value="as-uploaded" id="arr-upload" />
                <Label htmlFor="arr-upload" className="text-sm cursor-pointer flex items-center gap-1">
                  <FileImage className="h-3.5 w-3.5" /> As uploaded
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2 rounded-md border border-border hover:bg-muted/50">
                <RadioGroupItem value="name-asc" id="arr-asc" />
                <Label htmlFor="arr-asc" className="text-sm cursor-pointer flex items-center gap-1">
                  <ArrowUpAZ className="h-3.5 w-3.5" /> Filename A-Z
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2 rounded-md border border-border hover:bg-muted/50">
                <RadioGroupItem value="name-desc" id="arr-desc" />
                <Label htmlFor="arr-desc" className="text-sm cursor-pointer flex items-center gap-1">
                  <ArrowDownAZ className="h-3.5 w-3.5" /> Filename Z-A
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2 rounded-md border border-border hover:bg-muted/50">
                <RadioGroupItem value="match-filename" id="arr-match" />
                <Label htmlFor="arr-match" className="text-sm cursor-pointer flex items-center gap-1">
                  <GripVertical className="h-3.5 w-3.5" /> Match by filename
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2 rounded-md border border-border hover:bg-muted/50 col-span-2">
                <RadioGroupItem value="random" id="arr-random" />
                <Label htmlFor="arr-random" className="text-sm cursor-pointer flex items-center gap-1">
                  <Shuffle className="h-3.5 w-3.5" /> Random shuffle
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Status indicator */}
          {uploadedImages.length > 0 && selectedElementId && (
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
                    {imageCount} images for {matchCount} canvas images
                    {imageCount < matchCount && ` — ${matchCount - imageCount} will ${mismatchHandling === "keep" ? "keep existing" : mismatchHandling === "use-last" ? "use last image" : "be cleared"}`}
                    {imageCount > matchCount && ` — ${imageCount - matchCount} images will be ignored`}
                  </span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>{imageCount} images matched to {matchCount} canvas images</span>
                </>
              )}
            </div>
          )}

          {/* Mismatch Handling */}
          {hasMismatch && imageCount < matchCount && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">When fewer images than canvas images:</Label>
              <RadioGroup
                value={mismatchHandling}
                onValueChange={(v) => setMismatchHandling(v as MismatchHandling)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="keep" id="mm-keep" />
                  <Label htmlFor="mm-keep" className="text-sm cursor-pointer">Keep existing</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="use-last" id="mm-last" />
                  <Label htmlFor="mm-last" className="text-sm cursor-pointer">Use last image</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="clear" id="mm-clear" />
                  <Label htmlFor="mm-clear" className="text-sm cursor-pointer">Clear image</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Additional Options */}
          <div className="space-y-3 border-t pt-3">
            <Label className="text-sm font-medium">Options</Label>

            {/* Image Fit Mode */}
            <div className="flex items-center justify-between">
              <Label className="text-sm">Image Fit</Label>
              <Select value={imageFit} onValueChange={(v) => setImageFit(v as ImageFitMode)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Cover (fill)</SelectItem>
                  <SelectItem value="contain">Contain (fit)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Override Opacity */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="override-opacity"
                  checked={overrideOpacity}
                  onCheckedChange={(c) => setOverrideOpacity(!!c)}
                />
                <Label htmlFor="override-opacity" className="text-sm cursor-pointer">
                  Set uniform opacity: {opacityValue}%
                </Label>
              </div>
              {overrideOpacity && (
                <Slider
                  value={[opacityValue]}
                  onValueChange={([v]) => setOpacityValue(v)}
                  min={0}
                  max={100}
                />
              )}
            </div>

            {/* Skip Existing */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="skip-existing"
                checked={skipExisting}
                onCheckedChange={(c) => setSkipExisting(!!c)}
              />
              <Label htmlFor="skip-existing" className="text-sm cursor-pointer">
                Skip elements that already have a background image
              </Label>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Images are stored as base64 in the project. Large images may increase project size.</span>
          </div>

          {/* Preview Mapping */}
          {previewMapping.length > 0 && uploadedImages.length > 0 && (
            <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${previewOpen ? "rotate-180" : ""}`}
                />
                Preview Mapping ({previewMapping.length} images)
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ScrollArea className="h-52 mt-2 border rounded-lg">
                  <div className="p-3 space-y-2">
                    {previewMapping.slice(0, 30).map((item) => (
                      <div
                        key={item.imageIndex}
                        className={`flex items-center gap-3 text-sm border-b border-border/50 pb-2 last:border-0 ${
                          item.skipped ? "opacity-50" : ""
                        }`}
                      >
                        <Badge variant="outline" className="shrink-0">
                          Image {item.imageNumber}
                        </Badge>
                        {/* Current bg thumbnail */}
                        <div className="w-8 h-8 border rounded bg-muted flex items-center justify-center shrink-0">
                          {item.currentBgImage ? (
                            <img src={item.currentBgImage} alt="" className="w-full h-full object-cover rounded" />
                          ) : (
                            <span className="text-[8px] text-muted-foreground">none</span>
                          )}
                        </div>
                        <span className="text-muted-foreground">→</span>
                        {/* New image thumbnail */}
                        <div className="w-8 h-8 border rounded bg-muted flex items-center justify-center shrink-0">
                          {item.skipped ? (
                            <span className="text-[8px] text-amber-500">skip</span>
                          ) : item.uploadedImage && item.uploadedImage.filename !== "__clear__" ? (
                            <img src={item.uploadedImage.dataUrl} alt="" className="w-full h-full object-cover rounded" />
                          ) : item.uploadedImage?.filename === "__clear__" ? (
                            <span className="text-[8px] text-destructive">clear</span>
                          ) : (
                            <span className="text-[8px] text-muted-foreground">keep</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground truncate flex-1">
                          {item.skipped
                            ? "Skipped (has image)"
                            : item.uploadedImage && item.uploadedImage.filename !== "__clear__"
                            ? item.uploadedImage.filename
                            : item.uploadedImage?.filename === "__clear__"
                            ? "Will be cleared"
                            : "Keep existing"}
                        </span>
                      </div>
                    ))}
                    {previewMapping.length > 30 && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        ...and {previewMapping.length - 30} more
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selectedElementId || uploadedImages.length === 0}
          >
            <ImagePlus className="h-4 w-4 mr-2" />
            Apply to {previewMapping.filter(m => !m.skipped && m.uploadedImage).length} Images
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
