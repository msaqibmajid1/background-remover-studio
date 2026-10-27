import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, Type, Image as ImageIcon, Square, Circle, ChevronLeft, ChevronRight, Trash2, Keyboard, Shapes, FilePlus } from "lucide-react";

import { EditorImage, ExportSettings, ImageFilter, Padding } from "@/types/editor";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LeftPanelProps {
  images: EditorImage[];
  currentImageIndex: number;
  currentImage: EditorImage | null;
  exportSettings: ExportSettings;
  autoSelectType: string;
  onAutoSelectTypeChange: (type: string) => void;
  onUploadImages: (files: FileList) => void;
  onNavigateImage: (direction: "prev" | "next") => void;
  onDeleteCurrentImage: () => void;
  onClearAllImages: () => void;
  onAddText: () => void;
  onAddLogo: (file: File) => void;
  onAddWatermark: (file: File, position: string) => void;
  onAddRectangle: () => void;
  onAddCircle: () => void;
  onAddParallelogram?: () => void;
  onAddParallelogramText?: () => void;
  onInsertBlankCanvas?: () => void;
  onEditBlankCanvas?: () => void;
  onCanvasSizeChange: (width: number, height: number) => void;
  onAspectRatioChange: (ratio: string) => void;
  onApplyCanvasSizeToAll: () => void;
  onFilterChange: (filter: ImageFilter) => void;
  onApplyFilterToAll: () => void;
  onPaddingChange: (padding: Padding) => void;
  onApplyPaddingToAll: () => void;
  onExportSettingsChange: (settings: Partial<ExportSettings>) => void;
  onDownloadCurrent: () => void;
  onDownloadAll: () => void;
}

export const LeftPanel = React.memo(({
  images,
  currentImageIndex,
  currentImage,
  exportSettings,
  autoSelectType,
  onAutoSelectTypeChange,
  onUploadImages,
  onNavigateImage,
  onDeleteCurrentImage,
  onClearAllImages,
  onAddText,
  onAddLogo,
  onAddWatermark,
  onAddRectangle,
  onAddCircle,
  onAddParallelogram,
  onAddParallelogramText,
  onInsertBlankCanvas,
  onEditBlankCanvas,
  onCanvasSizeChange,
  onAspectRatioChange,
  onApplyCanvasSizeToAll,
  onFilterChange,
  onApplyFilterToAll,
  onPaddingChange,
  onApplyPaddingToAll,
  onExportSettingsChange,
  onDownloadCurrent,
  onDownloadAll,
}: LeftPanelProps) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);
  const [watermarkDialogOpen, setWatermarkDialogOpen] = useState(false);
  const [watermarkFile, setWatermarkFile] = useState<File | null>(null);

  const handleLogoClick = () => {
    logoInputRef.current?.click();
  };

  const handleWatermarkClick = () => {
    watermarkInputRef.current?.click();
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAddLogo(file);
    }
  };

  const handleWatermarkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setWatermarkFile(file);
      setWatermarkDialogOpen(true);
    }
  };

  const handleWatermarkPosition = (position: string) => {
    if (watermarkFile) {
      onAddWatermark(watermarkFile, position);
      setWatermarkDialogOpen(false);
      setWatermarkFile(null);
    }
  };

  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <div className={`border-r border-panel-border bg-panel h-full overflow-hidden flex flex-col transition-all duration-200 ${isMinimized ? 'w-10' : 'w-80'}`}>
      {/* Header with minimize */}
      <div className="flex items-center justify-between px-2 py-2 border-b border-panel-border bg-muted/30 shrink-0">
        {!isMinimized && <span className="text-xs font-medium text-muted-foreground">Tools</span>}
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 ml-auto"
          onClick={() => setIsMinimized(!isMinimized)}
          title={isMinimized ? "Expand panel" : "Collapse panel"}
        >
          {isMinimized ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {!isMinimized && (
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Images Section */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3">Images</h3>
          <div className="space-y-3">
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => e.target.files && onUploadImages(e.target.files)}
              className="cursor-pointer"
              data-onboarding="upload-image"
            />

            {images.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{images.length} image(s) loaded</span>
                  <span className="font-medium">
                    {currentImageIndex + 1} / {images.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onNavigateImage("prev")}
                    disabled={currentImageIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onNavigateImage("next")}
                    disabled={currentImageIndex === images.length - 1}
                    className="flex-1"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={onDeleteCurrentImage}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Auto-select element on navigation */}
                <div>
                  <Label className="text-xs">Auto-select on Navigate</Label>
                  <Select value={autoSelectType.split(':')[0]} onValueChange={onAutoSelectTypeChange}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="first">First Element (Bottom)</SelectItem>
                      <SelectItem value="last">Last Element (Top)</SelectItem>
                      <SelectItem value="text">First Text Element</SelectItem>
                      <SelectItem value="image">First Image/Logo</SelectItem>
                      <SelectItem value="shape">First Shape</SelectItem>
                      <SelectItem value="recent">Recently Edited Type</SelectItem>
                      <SelectItem value="name">By Name Pattern...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Name pattern input */}
                {autoSelectType.startsWith('name') && (
                  <div>
                    <Label className="text-xs">Name contains</Label>
                    <Input 
                      className="h-8 text-xs" 
                      placeholder="e.g. title, header"
                      value={autoSelectType.includes(':') ? autoSelectType.split(':')[1] : ''}
                      onChange={(e) => onAutoSelectTypeChange(`name:${e.target.value}`)}
                    />
                  </div>
                )}

                {/* Keyboard shortcuts hint */}
                {images.length > 1 && (
                  <div className="p-2 bg-muted/50 rounded-md border border-border/50">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Keyboard className="h-3 w-3" />
                      <span className="font-medium">Navigation Shortcuts</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className="flex items-center gap-1">
                        <kbd className="px-1 py-0.5 bg-background rounded text-[10px] border">PgUp</kbd>
                        <span className="text-muted-foreground">Prev</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1 py-0.5 bg-background rounded text-[10px] border">PgDn</kbd>
                        <span className="text-muted-foreground">Next</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1 py-0.5 bg-background rounded text-[10px] border">Alt+←</kbd>
                        <span className="text-muted-foreground">Prev</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1 py-0.5 bg-background rounded text-[10px] border">Alt+→</kbd>
                        <span className="text-muted-foreground">Next</span>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={onClearAllImages}
                  className="w-full"
                >
                  Clear All Images
                </Button>
              </div>
            )}
          </div>
        </section>

        <Separator />

        {/* Insert Blank Canvas */}
        {onInsertBlankCanvas && (
          <section className="space-y-2">
            <Button
              variant="default"
              size="sm"
              className="w-full gap-2"
              onClick={onInsertBlankCanvas}
              title="Insert a blank canvas slide with colors, gradient, border, and watermark"
            >
              <FilePlus className="h-4 w-4" />
              Insert Blank Canvas
            </Button>
            {currentImage?.isBlankCanvas && onEditBlankCanvas && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={onEditBlankCanvas}
                title="Edit this blank canvas's background and add more slides"
              >
                <FilePlus className="h-4 w-4" />
                Edit Canvas Background
              </Button>
            )}
          </section>
        )}

        <Separator />

        {/* Add Elements Section */}
        <section data-onboarding="add-text">
          <h3 className="text-sm font-semibold text-foreground mb-3">Add Elements</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={onAddText} className="gap-2">
              <Type className="h-4 w-4" />
              Text
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogoClick} className="gap-2">
              <ImageIcon className="h-4 w-4" />
              Logo
            </Button>
            <Button variant="outline" size="sm" onClick={handleWatermarkClick} className="gap-2">
              <ImageIcon className="h-4 w-4" />
              Watermark
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onAddRectangle}
              className="gap-2"
              data-onboarding="add-shapes"
            >
              <Square className="h-4 w-4" />
              Rectangle
            </Button>
            <Button variant="outline" size="sm" onClick={onAddCircle} className="gap-2">
              <Circle className="h-4 w-4" />
              Circle
            </Button>
            {onAddParallelogram && (
              <Button variant="outline" size="sm" onClick={onAddParallelogram} className="gap-2" title="Add a parallelogram (skewed rectangle)">
                <Shapes className="h-4 w-4" />
                Parallelogram
              </Button>
            )}
            {onAddParallelogramText && (
              <Button variant="outline" size="sm" onClick={onAddParallelogramText} className="gap-2" title="Add editable text inside a parallelogram">
                <Type className="h-4 w-4" />
                Parallelogram Text
              </Button>
            )}
          </div>


          {/* Hidden file inputs */}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            className="hidden"
          />
          <input
            ref={watermarkInputRef}
            type="file"
            accept="image/*"
            onChange={handleWatermarkChange}
            className="hidden"
          />
        </section>

        <Separator />

        {/* Canvas Size Section */}
        {currentImage && (
          <>
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3">Canvas Size & Aspect Ratio</h3>
              <div className="space-y-3">
                <div>
                  <Label>Preset Ratios & Social Media</Label>
                  <Select
                    value={currentImage.canvasSize.aspectRatio}
                    onValueChange={onAspectRatioChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {/* Original */}
                      <SelectItem value="original">Original Size</SelectItem>
                      
                      {/* Preset Ratios with predefined sizes */}
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Preset Ratios</div>
                      <SelectItem value="1:1">Square 1:1 (800×800)</SelectItem>
                      <SelectItem value="4:3">4:3 Landscape (800×600)</SelectItem>
                      <SelectItem value="3:2">3:2 Landscape (900×600)</SelectItem>
                      <SelectItem value="16:9">16:9 Widescreen (1280×720)</SelectItem>
                      <SelectItem value="4:5">4:5 Portrait (800×1000)</SelectItem>
                      <SelectItem value="5:4">5:4 Landscape (1000×800)</SelectItem>
                      <SelectItem value="2:3">2:3 Portrait (600×900)</SelectItem>
                      <SelectItem value="9:16">9:16 Vertical (720×1280)</SelectItem>
                      
                      {/* Print Sizes */}
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Print</div>
                      <SelectItem value="A4">A4 Portrait (2480×3508)</SelectItem>
                      <SelectItem value="A4-landscape">A4 Landscape (3508×2480)</SelectItem>
                      
                      {/* Social Media */}
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Instagram</div>
                      <SelectItem value="instagram-post">Post (1080×1080)</SelectItem>
                      <SelectItem value="instagram-story">Story (1080×1920)</SelectItem>
                      <SelectItem value="instagram-reel">Reel (1080×1920)</SelectItem>
                      
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Facebook</div>
                      <SelectItem value="facebook-post">Post (1200×630)</SelectItem>
                      <SelectItem value="facebook-cover">Cover (820×312)</SelectItem>
                      <SelectItem value="facebook-story">Story (1080×1920)</SelectItem>
                      
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Twitter/X</div>
                      <SelectItem value="twitter-post">Post (1200×675)</SelectItem>
                      <SelectItem value="twitter-header">Header (1500×500)</SelectItem>
                      
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">YouTube</div>
                      <SelectItem value="youtube-thumbnail">Thumbnail (1280×720)</SelectItem>
                      <SelectItem value="youtube-banner">Banner (2560×1440)</SelectItem>
                      
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Other Platforms</div>
                      <SelectItem value="linkedin-post">LinkedIn Post (1200×627)</SelectItem>
                      <SelectItem value="linkedin-cover">LinkedIn Cover (1584×396)</SelectItem>
                      <SelectItem value="pinterest-pin">Pinterest Pin (1000×1500)</SelectItem>
                      <SelectItem value="tiktok-video">TikTok Video (1080×1920)</SelectItem>
                      <SelectItem value="whatsapp-status">WhatsApp Status (1080×1920)</SelectItem>
                      
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Custom</div>
                      <SelectItem value="custom">Custom Size</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Width (px)</Label>
                    <Input
                      type="number"
                      value={currentImage.canvasSize.width}
                      onChange={(e) =>
                        onCanvasSizeChange(
                          parseInt(e.target.value) || 0,
                          currentImage.canvasSize.height
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Height (px)</Label>
                    <Input
                      type="number"
                      value={currentImage.canvasSize.height}
                      onChange={(e) =>
                        onCanvasSizeChange(
                          currentImage.canvasSize.width,
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                </div>

                {images.length > 1 && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={onApplyCanvasSizeToAll}
                    className="w-full"
                  >
                    Apply Canvas Size to All Images
                  </Button>
                )}
              </div>
            </section>


            <Separator />

            {/* Image Filters Section */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3">Image Filters</h3>
              <div className="space-y-3">
                <div>
                  <Label>Filter</Label>
                  <Select
                    value={currentImage.filter.type}
                    onValueChange={(value: any) =>
                      onFilterChange({ ...currentImage.filter, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="grayscale">Grayscale</SelectItem>
                      <SelectItem value="sepia">Sepia</SelectItem>
                      <SelectItem value="invert">Invert</SelectItem>
                      <SelectItem value="brightness">Brightness</SelectItem>
                      <SelectItem value="contrast">Contrast</SelectItem>
                      <SelectItem value="saturation">Saturation</SelectItem>
                      <SelectItem value="blur">Blur</SelectItem>
                      <SelectItem value="hue-rotate">Hue Rotation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {["brightness", "contrast", "saturation", "blur", "hue-rotate"].includes(
                  currentImage.filter.type
                ) && (
                  <div>
                    <Label>
                      {currentImage.filter.type === "brightness" && "Brightness"}
                      {currentImage.filter.type === "contrast" && "Contrast"}
                      {currentImage.filter.type === "saturation" && "Saturation"}
                      {currentImage.filter.type === "blur" && "Blur Radius"}
                      {currentImage.filter.type === "hue-rotate" && "Hue Rotation"}
                      : {currentImage.filter.value || 100}
                      {currentImage.filter.type === "hue-rotate" ? "°" : "%"}
                    </Label>
                    <Slider
                      value={[currentImage.filter.value || 100]}
                      onValueChange={([value]) =>
                        onFilterChange({ ...currentImage.filter, value })
                      }
                      min={0}
                      max={currentImage.filter.type === "hue-rotate" ? 360 : 200}
                      step={1}
                    />
                  </div>
                )}

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onApplyFilterToAll}
                  className="w-full"
                >
                  Apply to All Images
                </Button>
              </div>
            </section>

            <Separator />

            {/* Image Padding Section */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3">Image Padding</h3>
              <div className="space-y-3">
                <div>
                  <Label>Padding Mode</Label>
                  <RadioGroup
                    value={currentImage.padding.mode}
                    onValueChange={(value: "outer" | "inner") =>
                      onPaddingChange({ ...currentImage.padding, mode: value })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="outer" id="outer" />
                      <Label htmlFor="outer">Outer Padding</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="inner" id="inner" />
                      <Label htmlFor="inner">Inner Padding</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Top</Label>
                    <Input
                      type="number"
                      value={currentImage.padding.top}
                      onChange={(e) =>
                        onPaddingChange({
                          ...currentImage.padding,
                          top: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Right</Label>
                    <Input
                      type="number"
                      value={currentImage.padding.right}
                      onChange={(e) =>
                        onPaddingChange({
                          ...currentImage.padding,
                          right: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Bottom</Label>
                    <Input
                      type="number"
                      value={currentImage.padding.bottom}
                      onChange={(e) =>
                        onPaddingChange({
                          ...currentImage.padding,
                          bottom: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Left</Label>
                    <Input
                      type="number"
                      value={currentImage.padding.left}
                      onChange={(e) =>
                        onPaddingChange({
                          ...currentImage.padding,
                          left: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>Padding Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={currentImage.padding.color}
                      onChange={(e) =>
                        onPaddingChange({
                          ...currentImage.padding,
                          color: e.target.value,
                        })
                      }
                      className="w-16 h-10"
                    />
                    <Input
                      type="text"
                      value={currentImage.padding.color}
                      onChange={(e) =>
                        onPaddingChange({
                          ...currentImage.padding,
                          color: e.target.value,
                        })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onApplyPaddingToAll}
                  className="w-full"
                >
                  Apply Padding to All Images
                </Button>
              </div>
            </section>
          </>
        )}

        <Separator />

        {/* Export Settings Section */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3">Export Settings</h3>
          <div className="space-y-3">
            <div>
              <Label>Quality</Label>
              <Select
                value={exportSettings.quality}
                onValueChange={(value: any) =>
                  onExportSettingsChange({ quality: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Original (No Compression)</SelectItem>
                  <SelectItem value="high">High (90% JPEG)</SelectItem>
                  <SelectItem value="medium">Medium (70%)</SelectItem>
                  <SelectItem value="low">Low (50%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>File Format</Label>
              <RadioGroup
                value={exportSettings.format}
                onValueChange={(value: "png" | "jpg") =>
                  onExportSettingsChange({ format: value })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="png" id="png" />
                  <Label htmlFor="png">PNG (Transparent Background)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="jpg" id="jpg" />
                  <Label htmlFor="jpg">JPG (Smaller File Size)</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label>File Naming</Label>
              <Select
                value={exportSettings.naming}
                onValueChange={(value: any) =>
                  onExportSettingsChange({ naming: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="numbers">Numbers (1, 2, 3...)</SelectItem>
                  <SelectItem value="original">Use Original Names</SelectItem>
                  <SelectItem value="custom">Custom Prefix + Number</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {exportSettings.naming === "custom" && (
              <div>
                <Label>Custom Prefix</Label>
                <Input
                  type="text"
                  placeholder="e.g., photo"
                  value={exportSettings.customPrefix || ""}
                  onChange={(e) =>
                    onExportSettingsChange({ customPrefix: e.target.value })
                  }
                />
              </div>
            )}

            <div className="space-y-2 pt-2">
              <Button
                className="w-full"
                onClick={onDownloadCurrent}
                disabled={!currentImage}
              >
                Download Current Image
              </Button>
              <Button
                className="w-full"
                variant="secondary"
                onClick={onDownloadAll}
                disabled={images.length === 0}
              >
                Download All Images (ZIP)
              </Button>
            </div>
          </div>
        </section>
      </div>
      )}

      {/* Watermark Position Dialog */}
      <Dialog open={watermarkDialogOpen} onOpenChange={setWatermarkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Watermark Position</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <Button onClick={() => handleWatermarkPosition("top-left")} variant="outline">
              Top Left
            </Button>
            <Button onClick={() => handleWatermarkPosition("top-right")} variant="outline">
              Top Right
            </Button>
            <Button onClick={() => handleWatermarkPosition("center")} variant="outline">
              Center
            </Button>
            <Button onClick={() => handleWatermarkPosition("bottom-left")} variant="outline">
              Bottom Left
            </Button>
            <Button onClick={() => handleWatermarkPosition("bottom-right")} variant="outline">
              Bottom Right
            </Button>
            <Button
              onClick={() => {
                if (watermarkFile) onAddWatermark(watermarkFile, "custom");
                setWatermarkDialogOpen(false);
                setWatermarkFile(null);
              }}
              variant="outline"
            >
              Custom
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});
