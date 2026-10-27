import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  FileJson,
  Package,
  Zap,
  Download,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { EditorImage, ExportSettings } from "@/types/editor";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { extractFilename, generateThumbnail } from "@/lib/imagePathUtils";

interface ProjectExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: EditorImage[];
  currentImageIndex: number;
  exportSettings: ExportSettings;
  projectName?: string;
}

type ExportMode = "embedded" | "lightweight" | "zip";

export const ProjectExportDialog = ({
  open,
  onOpenChange,
  images,
  currentImageIndex,
  exportSettings,
  projectName = "project",
}: ProjectExportDialogProps) => {
  const [exportMode, setExportMode] = useState<ExportMode>("embedded");
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  // Helper to convert blob URL to base64
  const blobUrlToBase64 = async (url: string): Promise<string> => {
    if (!url.startsWith("blob:")) return url;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return url;
    }
  };

  // Export with embedded base64 images
  const exportEmbedded = async () => {
    setProgress(0);
    const total = images.length;

    const projectData = {
      version: "1.0",
      exportType: "embedded",
      timestamp: Date.now(),
      projectName,
      currentImageIndex,
      exportSettings,
      images: await Promise.all(
        images.map(async (img, idx) => {
          const base64Src = await blobUrlToBase64(img.src);
          const thumbnail = await generateThumbnail(img.src);
          
          // Convert element images too
          const convertedElements = await Promise.all(
            img.elements.map(async (element) => {
              if (
                element.type === "image" ||
                element.type === "logo" ||
                element.type === "watermark"
              ) {
                const elementSrc = await blobUrlToBase64(element.src);
                return {
                  ...element,
                  src: elementSrc,
                  originalFilename: extractFilename(element.src) || `element-${element.id}`,
                };
              }
              return element;
            })
          );

          setProgress(((idx + 1) / total) * 100);

          return {
            id: img.id,
            fileName: img.file?.name || `image-${idx}.png`,
            fileType: img.file?.type || "image/png",
            src: base64Src,
            thumbnail,
            originalWidth: img.originalWidth,
            originalHeight: img.originalHeight,
            canvasSize: img.canvasSize,
            elements: convertedElements,
            filter: img.filter,
            padding: img.padding,
          };
        })
      ),
    };

    const json = JSON.stringify(projectData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    saveAs(blob, `${projectName}-${Date.now()}.json`);
  };

  // Export with lightweight paths (for reloading with path resolver)
  const exportLightweight = async () => {
    setProgress(0);
    const total = images.length;

    const projectData = {
      version: "1.0",
      exportType: "lightweight",
      timestamp: Date.now(),
      projectName,
      currentImageIndex,
      exportSettings,
      images: await Promise.all(
        images.map(async (img, idx) => {
          // Generate thumbnails for preview during reload
          const thumbnail = await generateThumbnail(img.src);

          // Store element info with thumbnails but not full images
          const elementsWithMeta = await Promise.all(
            img.elements.map(async (element) => {
              if (
                element.type === "image" ||
                element.type === "logo" ||
                element.type === "watermark"
              ) {
                const elementThumb = await generateThumbnail(element.src, 40);
                return {
                  ...element,
                  src: "", // Clear src - will need resolution
                  originalFilename: extractFilename(element.src) || `element-${element.id}`,
                  thumbnail: elementThumb,
                  needsResolution: true,
                };
              }
              return element;
            })
          );

          setProgress(((idx + 1) / total) * 100);

          return {
            id: img.id,
            fileName: img.file?.name || `image-${idx}.png`,
            fileType: img.file?.type || "image/png",
            src: "", // Clear src - will need resolution
            thumbnail,
            originalFilename: img.file?.name || `image-${idx}.png`,
            originalWidth: img.originalWidth,
            originalHeight: img.originalHeight,
            canvasSize: img.canvasSize,
            elements: elementsWithMeta,
            filter: img.filter,
            padding: img.padding,
            needsResolution: true,
          };
        })
      ),
    };

    const json = JSON.stringify(projectData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    saveAs(blob, `${projectName}-lightweight-${Date.now()}.json`);
  };

  // Export as ZIP with images
  const exportZip = async () => {
    setProgress(0);
    const zip = new JSZip();
    const imagesFolder = zip.folder("images");
    const elementsFolder = zip.folder("elements");
    const total = images.length;

    // Process images
    const projectImages = await Promise.all(
      images.map(async (img, idx) => {
        // Add main image to zip
        const filename = img.file?.name || `image-${idx}.png`;
        try {
          const response = await fetch(img.src);
          const blob = await response.blob();
          imagesFolder?.file(filename, blob);
        } catch (error) {
          console.warn(`Failed to add ${filename} to zip`);
        }

        // Process elements
        const elementsWithPaths = await Promise.all(
          img.elements.map(async (element) => {
            if (
              element.type === "image" ||
              element.type === "logo" ||
              element.type === "watermark"
            ) {
              const elemFilename = `${element.id}.png`;
              try {
                const response = await fetch(element.src);
                const blob = await response.blob();
                elementsFolder?.file(elemFilename, blob);
              } catch (error) {
                console.warn(`Failed to add element ${element.id} to zip`);
              }
              return {
                ...element,
                src: `elements/${elemFilename}`,
                originalFilename: extractFilename(element.src) || elemFilename,
              };
            }
            return element;
          })
        );

        setProgress(((idx + 1) / total) * 100);

        return {
          id: img.id,
          fileName: filename,
          fileType: img.file?.type || "image/png",
          src: `images/${filename}`,
          originalWidth: img.originalWidth,
          originalHeight: img.originalHeight,
          canvasSize: img.canvasSize,
          elements: elementsWithPaths,
          filter: img.filter,
          padding: img.padding,
        };
      })
    );

    // Create project manifest
    const manifest = {
      version: "1.0",
      exportType: "zip",
      timestamp: Date.now(),
      projectName,
      currentImageIndex,
      exportSettings,
      images: projectImages,
    };

    zip.file("project.json", JSON.stringify(manifest, null, 2));

    // Generate and download zip
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${projectName}-${Date.now()}.zip`);
  };

  const handleExport = async () => {
    if (images.length === 0) {
      toast.error("No images to export");
      return;
    }

    setIsExporting(true);
    setProgress(0);

    try {
      switch (exportMode) {
        case "embedded":
          await exportEmbedded();
          toast.success("Project exported with embedded images");
          break;
        case "lightweight":
          await exportLightweight();
          toast.success("Lightweight project exported");
          break;
        case "zip":
          await exportZip();
          toast.success("Project exported as ZIP");
          break;
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Export Project
          </DialogTitle>
          <DialogDescription>
            Choose how you want to save your project with {images.length} image(s).
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={exportMode}
          onValueChange={(v) => setExportMode(v as ExportMode)}
          className="space-y-3"
        >
          {/* Embedded option */}
          <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer">
            <RadioGroupItem value="embedded" id="embedded" className="mt-1" />
            <Label htmlFor="embedded" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2 font-medium">
                <FileJson className="h-4 w-4 text-blue-500" />
                Quick Save (Embedded)
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                All images embedded as base64. Larger file size but fully portable.
              </p>
            </Label>
          </div>

          {/* Lightweight option */}
          <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer">
            <RadioGroupItem value="lightweight" id="lightweight" className="mt-1" />
            <Label htmlFor="lightweight" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2 font-medium">
                <Zap className="h-4 w-4 text-amber-500" />
                Portable Save (Lightweight)
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Small file with thumbnails. You'll select images when reloading.
              </p>
            </Label>
          </div>

          {/* ZIP option */}
          <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer">
            <RadioGroupItem value="zip" id="zip" className="mt-1" />
            <Label htmlFor="zip" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2 font-medium">
                <Package className="h-4 w-4 text-green-500" />
                Full Export (ZIP)
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                ZIP archive with separate image files. Best for sharing.
              </p>
            </Label>
          </div>
        </RadioGroup>

        {exportMode === "lightweight" && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p className="text-sm">
              When loading this project, you'll need to provide the original image files.
            </p>
          </div>
        )}

        {isExporting && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Exporting... {Math.round(progress)}%
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
