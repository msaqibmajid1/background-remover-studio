import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Archive } from "lucide-react";

interface ZipExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  format: 'png' | 'jpeg';
  totalImages: number;
  onExport: (
    zipFilename: string, 
    imagePattern: string, 
    onProgress: (current: number, total: number) => void
  ) => Promise<void>;
}

export const ZipExportDialog = ({
  open,
  onOpenChange,
  format,
  totalImages,
  onExport,
}: ZipExportDialogProps) => {
  const [zipFilename, setZipFilename] = useState("quotes");
  const [imagePattern, setImagePattern] = useState("quote-{n}");
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setIsExporting(false);
      setProgress({ current: 0, total: 0 });
    }
  }, [open]);

  const handleExport = async () => {
    setIsExporting(true);
    setProgress({ current: 0, total: totalImages });
    
    try {
      await onExport(zipFilename, imagePattern, (current, total) => {
        setProgress({ current, total });
      });
    } finally {
      setIsExporting(false);
      setProgress({ current: 0, total: 0 });
      onOpenChange(false);
    }
  };

  const previewFilename = imagePattern.replace("{n}", "1") + `.${format}`;

  return (
    <Dialog open={open} onOpenChange={isExporting ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Export as ZIP ({format.toUpperCase()})
          </DialogTitle>
        </DialogHeader>

        {isExporting ? (
          <div className="py-6 space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Packaging images...
              </p>
              <p className="text-lg font-semibold text-foreground">
                {progress.current} / {progress.total}
              </p>
            </div>
            <Progress 
              value={progress.total > 0 ? (progress.current / progress.total) * 100 : 0} 
              className="h-3"
            />
            <p className="text-xs text-center text-muted-foreground">
              {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}% complete
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="zipFilename">ZIP Filename</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="zipFilename"
                  value={zipFilename}
                  onChange={(e) => setZipFilename(e.target.value)}
                  placeholder="quotes"
                />
                <span className="text-sm text-muted-foreground">.zip</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imagePattern">Image Naming Pattern</Label>
              <Input
                id="imagePattern"
                value={imagePattern}
                onChange={(e) => setImagePattern(e.target.value)}
                placeholder="quote-{n}"
              />
              <p className="text-xs text-muted-foreground">
                Use <code className="bg-muted px-1 rounded">{"{n}"}</code> for image number. 
                Preview: <span className="font-medium">{previewFilename}</span>
              </p>
            </div>

            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <p>Ready to export <strong>{totalImages}</strong> images as {format.toUpperCase()}</p>
            </div>
          </div>
        )}

        <DialogFooter>
          {!isExporting && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleExport} disabled={!zipFilename.trim()}>
                <Archive className="h-4 w-4 mr-2" />
                Export ZIP
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
