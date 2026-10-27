import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  FolderSearch,
  FileImage,
  Check,
  X,
  RefreshCw,
  ImageOff,
} from "lucide-react";
import { toast } from "sonner";
import {
  MissingImage,
  matchImagesByFilename,
  fileToDataUrl,
  createPlaceholderImage,
} from "@/lib/imagePathUtils";

interface ImagePathResolverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missingImages: MissingImage[];
  onResolve: (resolvedMappings: Map<string, string>) => void;
  onCancel: () => void;
  onUsePlaceholders: () => void;
}

interface ResolvedImage {
  id: string;
  newSrc: string;
  filename: string;
}

export const ImagePathResolverDialog = ({
  open,
  onOpenChange,
  missingImages,
  onResolve,
  onCancel,
  onUsePlaceholders,
}: ImagePathResolverDialogProps) => {
  const [resolvedImages, setResolvedImages] = useState<Map<string, ResolvedImage>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setResolvedImages(new Map());
      setProgress(0);
    }
  }, [open]);

  const resolvedCount = resolvedImages.size;
  const totalCount = missingImages.length;

  // Handle folder selection for auto-matching
  const handleBrowseFolder = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "image/*";
    // Note: webkitdirectory is for folder selection, but not all browsers support it
    // We'll use multiple file selection as fallback
    input.setAttribute("webkitdirectory", "");
    
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      setIsProcessing(true);
      setProgress(0);

      try {
        const fileArray = Array.from(files);
        const matches = matchImagesByFilename(missingImages, fileArray);
        
        let processed = 0;
        const newResolved = new Map(resolvedImages);

        for (const [id, file] of matches) {
          const dataUrl = await fileToDataUrl(file);
          newResolved.set(id, {
            id,
            newSrc: dataUrl,
            filename: file.name,
          });
          processed++;
          setProgress((processed / matches.size) * 100);
        }

        setResolvedImages(newResolved);
        
        if (matches.size > 0) {
          toast.success(`Auto-matched ${matches.size} image(s)`);
        } else {
          toast.info("No matching images found");
        }
      } catch (error) {
        console.error("Error processing folder:", error);
        toast.error("Failed to process files");
      } finally {
        setIsProcessing(false);
      }
    };

    input.click();
  };

  // Handle individual file selection
  const handleSelectFile = (missingImage: MissingImage) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const dataUrl = await fileToDataUrl(file);
        const newResolved = new Map(resolvedImages);
        newResolved.set(missingImage.id, {
          id: missingImage.id,
          newSrc: dataUrl,
          filename: file.name,
        });
        setResolvedImages(newResolved);
        toast.success(`Linked: ${file.name}`);
      } catch (error) {
        console.error("Error loading file:", error);
        toast.error("Failed to load image");
      }
    };

    input.click();
  };

  // Remove a resolved mapping
  const handleRemoveResolved = (id: string) => {
    const newResolved = new Map(resolvedImages);
    newResolved.delete(id);
    setResolvedImages(newResolved);
  };

  // Apply resolved images
  const handleApply = () => {
    const mappings = new Map<string, string>();
    for (const [id, resolved] of resolvedImages) {
      mappings.set(id, resolved.newSrc);
    }
    onResolve(mappings);
    onOpenChange(false);
  };

  // Use placeholders for all missing
  const handleUsePlaceholders = () => {
    onUsePlaceholders();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Missing Images Detected
          </DialogTitle>
          <DialogDescription>
            {totalCount} image(s) could not be loaded. Select replacement files or use placeholders.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button
            variant="outline"
            onClick={handleBrowseFolder}
            disabled={isProcessing}
            className="gap-2"
          >
            <FolderSearch className="h-4 w-4" />
            Browse Folder
          </Button>
          <div className="flex-1 text-sm text-muted-foreground flex items-center">
            {resolvedCount} of {totalCount} resolved
          </div>
        </div>

        {isProcessing && (
          <div className="mb-4">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Processing files...
            </p>
          </div>
        )}

        <ScrollArea className="flex-1 max-h-[300px] pr-4">
          <div className="space-y-3">
            {missingImages.map((missing) => {
              const resolved = resolvedImages.get(missing.id);
              return (
                <div
                  key={missing.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
                >
                  {/* Thumbnail or placeholder */}
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {resolved ? (
                      <img
                        src={resolved.newSrc}
                        alt="Resolved"
                        className="w-full h-full object-cover"
                      />
                    ) : missing.thumbnail ? (
                      <img
                        src={missing.thumbnail}
                        alt="Missing"
                        className="w-full h-full object-cover opacity-50"
                      />
                    ) : (
                      <ImageOff className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {resolved
                        ? resolved.filename
                        : missing.originalFilename || "Unknown file"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {missing.elementType && (
                        <span className="capitalize">{missing.elementType} • </span>
                      )}
                      {resolved ? (
                        <span className="text-green-500">Resolved</span>
                      ) : (
                        <span className="text-amber-500">Missing</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {resolved ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRemoveResolved(missing.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectFile(missing)}
                        className="gap-1"
                      >
                        <FileImage className="h-3 w-3" />
                        Select
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button variant="ghost" onClick={onCancel} className="sm:mr-auto">
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleUsePlaceholders}
            className="gap-2"
          >
            <ImageOff className="h-4 w-4" />
            Use Placeholders
          </Button>
          <Button
            onClick={handleApply}
            disabled={resolvedCount === 0}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            Apply ({resolvedCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
