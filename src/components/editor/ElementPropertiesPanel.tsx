import { CanvasElement, TextElement, ShapeElement, ImageElement, WordStyle } from "@/types/editor";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Bold, Italic, Underline, Strikethrough, Type, AlignLeft, AlignCenter, AlignRight, AlignJustify, MoveUp, MoveDown, Trash2, Copy, RotateCcw, WandSparkles, AlignCenterHorizontal, AlignCenterVertical, AlignStartVertical, AlignEndVertical, Palette, Layers, Move, ClipboardPaste, Lock, Unlock, Unlink, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { useState, useRef } from "react";
import { calculateOptimalFontSize } from "@/lib/textAutoFit";
import { FontPicker } from "./FontPicker";
import { loadGoogleFont } from "@/hooks/useGoogleFonts";
import { ColorPickerPopover } from "./ColorPickerPopover";
import { TextStylePresetPicker } from "./TextStylePresetPicker";
import { TextStylePreset } from "@/data/textStylePresets";
import { WordStylerDialog } from "./WordStylerDialog";
import { ImageColorPalettePicker } from "./ImageColorPalettePicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const fontWeightOptions = [
  { value: "normal", label: "Default" },
  { value: "100", label: "Thin" },
  { value: "200", label: "Extra Light" },
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra Bold" },
  { value: "900", label: "Black" },
];

// Organized text path options by category
const textPathCategories = [
  {
    label: "Basic",
    options: [
      { value: "none", label: "None (Straight)" },
      { value: "circle", label: "Circle" },
      { value: "wave", label: "Wave" },
      { value: "arc-up", label: "Arc Up" },
      { value: "arc-down", label: "Arc Down" },
      { value: "spiral", label: "Spiral" },
      { value: "heart", label: "Heart" },
      { value: "diamond", label: "Diamond" },
    ]
  },
  {
    label: "Stars & Geometric",
    options: [
      { value: "star-5", label: "5-Point Star" },
      { value: "star-6", label: "6-Point Star" },
      { value: "star-8", label: "8-Point Star" },
      { value: "hexagon", label: "Hexagon" },
      { value: "pentagon", label: "Pentagon" },
      { value: "octagon", label: "Octagon" },
      { value: "triangle", label: "Triangle" },
      { value: "square-path", label: "Square" },
    ]
  },
  {
    label: "Waves & Curves",
    options: [
      { value: "zigzag", label: "Zigzag" },
      { value: "sine-wave", label: "Sine Wave" },
      { value: "double-wave", label: "Double Wave" },
      { value: "triple-wave", label: "Triple Wave" },
      { value: "smooth-wave", label: "Smooth Wave" },
      { value: "sharp-wave", label: "Sharp Wave" },
    ]
  },
  {
    label: "Symbols",
    options: [
      { value: "infinity", label: "Infinity ∞" },
      { value: "figure-8", label: "Figure 8" },
      { value: "clover", label: "Clover" },
      { value: "cross", label: "Cross" },
      { value: "plus", label: "Plus" },
      { value: "moon", label: "Moon" },
      { value: "sun", label: "Sun" },
      { value: "cloud", label: "Cloud" },
    ]
  },
  {
    label: "Arrows & Lines",
    options: [
      { value: "arrow-up", label: "Arrow Up" },
      { value: "arrow-down", label: "Arrow Down" },
      { value: "arrow-left", label: "Arrow Left" },
      { value: "arrow-right", label: "Arrow Right" },
      { value: "chevron", label: "Chevron" },
      { value: "double-chevron", label: "Double Chevron" },
    ]
  },
  {
    label: "Nature",
    options: [
      { value: "flower", label: "Flower" },
      { value: "leaf", label: "Leaf" },
      { value: "tree", label: "Tree" },
      { value: "mountain", label: "Mountain" },
      { value: "drop", label: "Water Drop" },
      { value: "flame", label: "Flame" },
    ]
  },
  {
    label: "Abstract",
    options: [
      { value: "swirl", label: "Swirl" },
      { value: "tornado", label: "Tornado" },
      { value: "helix", label: "Helix" },
      { value: "dna", label: "DNA" },
      { value: "ribbon", label: "Ribbon" },
      { value: "banner", label: "Banner" },
    ]
  },
  {
    label: "Letter Shapes",
    options: [
      { value: "s-curve", label: "S Curve" },
      { value: "u-shape", label: "U Shape" },
      { value: "v-shape", label: "V Shape" },
      { value: "w-shape", label: "W Shape" },
      { value: "m-shape", label: "M Shape" },
      { value: "n-shape", label: "N Shape" },
    ]
  },
  {
    label: "Decorative",
    options: [
      { value: "scallop", label: "Scallop" },
      { value: "bracket", label: "Bracket" },
      { value: "parenthesis", label: "Parenthesis" },
      { value: "brace", label: "Brace" },
      { value: "scroll", label: "Scroll" },
      { value: "flourish", label: "Flourish" },
    ]
  },
  {
    label: "Complex Shapes",
    options: [
      { value: "butterfly", label: "Butterfly" },
      { value: "crown", label: "Crown" },
      { value: "shield", label: "Shield" },
      { value: "badge", label: "Badge" },
      { value: "medal", label: "Medal" },
      { value: "frame", label: "Frame" },
    ]
  },
  {
    label: "Geometric Patterns",
    options: [
      { value: "circle-half", label: "Half Circle" },
      { value: "circle-quarter", label: "Quarter Circle" },
      { value: "ellipse", label: "Ellipse" },
      { value: "oval", label: "Oval" },
      { value: "egg", label: "Egg" },
      { value: "teardrop", label: "Teardrop" },
    ]
  },
  {
    label: "Fun Shapes",
    options: [
      { value: "lightning", label: "Lightning" },
      { value: "bolt", label: "Bolt" },
      { value: "spark", label: "Spark" },
      { value: "explosion", label: "Explosion" },
      { value: "burst", label: "Burst" },
      { value: "splash", label: "Splash" },
    ]
  },
  {
    label: "Speech & Bubbles",
    options: [
      { value: "speech-bubble", label: "Speech Bubble" },
      { value: "thought-bubble", label: "Thought Bubble" },
      { value: "callout", label: "Callout" },
    ]
  },
  {
    label: "Banners & Flags",
    options: [
      { value: "ribbon-banner", label: "Ribbon Banner" },
      { value: "flag", label: "Flag" },
      { value: "pennant", label: "Pennant" },
      { value: "streamer", label: "Streamer" },
    ]
  },
  {
    label: "Tech",
    options: [
      { value: "circuit", label: "Circuit" },
      { value: "pulse", label: "Pulse" },
      { value: "soundwave", label: "Soundwave" },
      { value: "frequency", label: "Frequency" },
    ]
  },
  {
    label: "Organic",
    options: [
      { value: "blob", label: "Blob" },
      { value: "amoeba", label: "Amoeba" },
      { value: "cell", label: "Cell" },
      { value: "organic-1", label: "Organic 1" },
      { value: "organic-2", label: "Organic 2" },
    ]
  },
  {
    label: "Custom",
    options: [
      { value: "custom", label: "Custom SVG Path" },
    ]
  },
];

// Helper to get label for current value
const getTextPathLabel = (value: string): string => {
  for (const category of textPathCategories) {
    const option = category.options.find(o => o.value === value);
    if (option) return option.label;
  }
  return "None (Straight)";
};

interface ElementPropertiesPanelProps {
  element: CanvasElement;
  onUpdate: (element: CanvasElement) => void;
  onUpdatePreview?: (element: CanvasElement) => void;
  onDelete: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  canApplyToAll: boolean;
  onApplyToAll?: (styleOnly: boolean) => void;
  onApplyStyleToAll?: () => void;
  onBatchUpdateText?: () => void;
  onBatchUploadImage?: () => void;
  hasMultipleImages?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundImageSrc?: string | null;
  isBlankCanvas?: boolean;
  onApplyImageToCanvasBackground?: (src: string, opacity: number, convertToBlank?: boolean) => void;
}

export const ElementPropertiesPanel = ({
  element,
  onUpdate,
  onUpdatePreview,
  onDelete,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  canApplyToAll,
  onApplyToAll,
  onApplyStyleToAll,
  onBatchUpdateText,
  onBatchUploadImage,
  hasMultipleImages = false,
  canvasWidth = 800,
  canvasHeight = 600,
  backgroundImageSrc = null,
  isBlankCanvas = false,
  onApplyImageToCanvasBackground,
}: ElementPropertiesPanelProps) => {
  // Preview function for slider drags (no undo snapshot), falls back to onUpdate
  const preview = onUpdatePreview || onUpdate;
  const [transformOpen, setTransformOpen] = useState(true);
  const [wordStylerOpen, setWordStylerOpen] = useState(false);
  const [imageColorPickerOpen, setImageColorPickerOpen] = useState(false);
  const [typographyOpen, setTypographyOpen] = useState(true);
  const [appearanceOpen, setAppearanceOpen] = useState(true);
  const [effectsOpen, setEffectsOpen] = useState(true);
  const backgroundImageRef = useRef<HTMLInputElement>(null);
  const [canvasPromptSrc, setCanvasPromptSrc] = useState<string | null>(null);
  const [canvasPromptOpacity, setCanvasPromptOpacity] = useState(100);
  const [canvasPromptConvert, setCanvasPromptConvert] = useState(true);

  // Quick align functions
  const alignToLeft = () => onUpdate({ ...element, x: 0 });
  const alignToCenter = () => onUpdate({ ...element, x: (canvasWidth - element.width) / 2 });
  const alignToRight = () => onUpdate({ ...element, x: canvasWidth - element.width });
  const alignToTop = () => onUpdate({ ...element, y: 0 });
  const alignToMiddle = () => onUpdate({ ...element, y: (canvasHeight - element.height) / 2 });
  const alignToBottom = () => onUpdate({ ...element, y: canvasHeight - element.height });

  const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Only shapes support background images
    if (element.type !== "rectangle" && element.type !== "circle") return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (element.type === "rectangle" || element.type === "circle") {
        onUpdate({ ...element, backgroundImage: src });
        // Always prompt to also apply to the canvas background (convert slide if needed)
        if (onApplyImageToCanvasBackground) {
          setCanvasPromptSrc(src);
          setCanvasPromptOpacity(100);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-1">
      {/* Apply to All Buttons */}
      {canApplyToAll && onApplyToAll && (
        <div className="space-y-2 pb-3 border-b">
          <Button size="sm" variant="outline" onClick={() => onApplyToAll(false)} className="w-full">
            Apply to All Images
          </Button>
          {onApplyStyleToAll && (
            <Button size="sm" variant="outline" onClick={onApplyStyleToAll} className="w-full">
              Apply Style Only...
            </Button>
          )}
        </div>
      )}

      {/* Text Content */}
      {element.type === "text" && (
        <div className="py-3 border-b space-y-3">
          {/* Element Name */}
          <div>
            <Label className="text-xs">Element Name</Label>
            <Input
              value={element.name || ""}
              onChange={(e) => onUpdate({ ...element, name: e.target.value })}
              placeholder="e.g., Title, Caption, Author"
              className="mt-1"
            />
          </div>

          {/* Template Code with regenerate option */}
          {element.templateCode && (
            <div>
              <Label className="text-xs text-muted-foreground">Template Code</Label>
              <div className="flex items-center gap-1.5 mt-1">
                <code className="text-xs font-mono bg-muted px-2 py-1.5 rounded flex-1 text-muted-foreground truncate">
                  {element.templateCode}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 shrink-0"
                  title="Break link — regenerate template code to unlink this element from its clones on other images"
                  onClick={() => {
                    const newCode = `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
                    onUpdate({ ...element, templateCode: newCode });
                    toast.success("Template code regenerated — this element is now unlinked from its clones on other images");
                  }}
                >
                  <Unlink className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Used for batch operations across images. Click <Unlink className="h-2.5 w-2.5 inline" /> to break the link.
              </p>
            </div>
          )}

          {/* Content */}
          <div>
            <Label className="text-xs">Content</Label>
            <Textarea
              value={element.content}
              onChange={(e) => {
                const newContent = e.target.value;
                if (element.autoFitText) {
                  const optimalSize = calculateOptimalFontSize({ ...element, content: newContent });
                  onUpdate({ ...element, content: newContent, fontSize: optimalSize });
                } else {
                  onUpdate({ ...element, content: newContent });
                }
              }}
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Batch Update Content Button */}
          {hasMultipleImages && onBatchUpdateText && (
            <Button
              size="sm"
              variant="outline"
              onClick={onBatchUpdateText}
              className="w-full"
            >
              <ClipboardPaste className="h-4 w-4 mr-2" />
              Batch Update Content
            </Button>
          )}
        </div>
      )}

      {/* Transform & Position */}
      <Collapsible open={transformOpen} onOpenChange={setTransformOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/50 px-2 rounded">
          <span className="text-sm font-semibold flex items-center gap-2">
            <Move className="h-4 w-4" />
            Transform & Position
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${transformOpen ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2 px-2">
          {/* Quick Align to Canvas */}
          <div>
            <Label className="text-xs mb-1 block">Quick Align to Canvas</Label>
            <div className="grid grid-cols-6 gap-1">
              <Button size="sm" variant="outline" onClick={alignToLeft} title="Align Left" className="p-1">
                <AlignLeft className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={alignToCenter} title="Center Horizontal" className="p-1">
                <AlignCenterHorizontal className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={alignToRight} title="Align Right" className="p-1">
                <AlignRight className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={alignToTop} title="Align Top" className="p-1">
                <AlignStartVertical className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={alignToMiddle} title="Center Vertical" className="p-1">
                <AlignCenterVertical className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={alignToBottom} title="Align Bottom" className="p-1">
                <AlignEndVertical className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">X</Label>
              <Input
                type="number"
                value={Math.round(element.x)}
                onChange={(e) => onUpdate({ ...element, x: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label className="text-xs">Y</Label>
              <Input
                type="number"
                value={Math.round(element.y)}
                onChange={(e) => onUpdate({ ...element, y: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs flex items-center gap-1">
                Width
                {element.type === "text" && (element as import("@/types/editor").TextElement).dimensionsLocked && (
                  <Lock className="h-3 w-3 text-amber-500" />
                )}
              </Label>
              <Input
                type="number"
                value={Math.round(element.width)}
                disabled={element.type === "text" && (element as import("@/types/editor").TextElement).dimensionsLocked}
                className={element.type === "text" && (element as import("@/types/editor").TextElement).dimensionsLocked ? "opacity-50" : ""}
                onChange={(e) => {
                  const newWidth = parseInt(e.target.value) || 1;
                  if (element.type === "text" && element.autoFitText) {
                    const optimalSize = calculateOptimalFontSize({ ...element, width: newWidth });
                    onUpdate({ ...element, width: newWidth, fontSize: optimalSize });
                  } else {
                    onUpdate({ ...element, width: newWidth });
                  }
                }}
              />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1">
                Height
                {element.type === "text" && (element as import("@/types/editor").TextElement).dimensionsLocked && (
                  <Lock className="h-3 w-3 text-amber-500" />
                )}
              </Label>
              <Input
                type="number"
                value={Math.round(element.height)}
                disabled={element.type === "text" && (element as import("@/types/editor").TextElement).dimensionsLocked}
                className={element.type === "text" && (element as import("@/types/editor").TextElement).dimensionsLocked ? "opacity-50" : ""}
                onChange={(e) => {
                  const newHeight = parseInt(e.target.value) || 1;
                  if (element.type === "text" && element.autoFitText) {
                    const optimalSize = calculateOptimalFontSize({ ...element, height: newHeight });
                    onUpdate({ ...element, height: newHeight, fontSize: optimalSize });
                  } else {
                    onUpdate({ ...element, height: newHeight });
                  }
                }}
              />
            </div>
          </div>

          {/* Lock Dimensions Toggle (Text elements only) */}
          {element.type === "text" && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="space-y-0.5">
                <Label className="text-xs flex items-center gap-1">
                  {(element as import("@/types/editor").TextElement).dimensionsLocked ? (
                    <Lock className="h-3 w-3 text-amber-500" />
                  ) : (
                    <Unlock className="h-3 w-3" />
                  )}
                  Lock Dimensions
                </Label>
                <p className="text-[10px] text-muted-foreground">Prevent width/height changes</p>
              </div>
              <Switch
                checked={(element as import("@/types/editor").TextElement).dimensionsLocked || false}
                onCheckedChange={(checked) => {
                  onUpdate({ ...element, dimensionsLocked: checked });
                  if (checked) {
                    toast.success(`Dimensions locked at ${Math.round(element.width)}×${Math.round(element.height)}px`);
                  } else {
                    toast.success("Dimensions unlocked. You can now resize freely.");
                  }
                }}
              />
            </div>
          )}

          {/* Rotation */}
          <div>
            <Label className="text-xs">Rotation: {element.rotation}°</Label>
            <Slider
              value={[element.rotation]}
              onValueChange={([value]) => preview({ ...element, rotation: value })}
              onValueCommit={([value]) => onUpdate({ ...element, rotation: value })}
              min={0}
              max={360}
              step={1}
            />
          </div>

          {/* Opacity */}
          <div>
            <Label className="text-xs">Opacity: {Math.round(element.opacity * 100)}%</Label>
            <Slider
              value={[element.opacity * 100]}
              onValueChange={([value]) => preview({ ...element, opacity: value / 100 })}
              onValueCommit={([value]) => onUpdate({ ...element, opacity: value / 100 })}
              min={0}
              max={100}
            />
          </div>

          {/* Layer Controls */}
          <div>
            <Label className="text-xs">Layer Order</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Button size="sm" variant="outline" onClick={onBringToFront}>
                Bring to Front
              </Button>
              <Button size="sm" variant="outline" onClick={onSendToBack}>
                Send to Back
              </Button>
            </div>
          </div>


          {/* Skew Controls */}
          <div className="space-y-2 border-t pt-3">
            <Label className="text-xs font-semibold text-primary">Skew</Label>
            <div>
              <Label className="text-xs">Skew X: {element.skewX || 0}°</Label>
              <Slider
                value={[element.skewX || 0]}
                onValueChange={([value]) => preview({ ...element, skewX: value })}
                onValueCommit={([value]) => onUpdate({ ...element, skewX: value })}
                min={-45}
                max={45}
                step={1}
              />
            </div>
            <div>
              <Label className="text-xs">Skew Y: {element.skewY || 0}°</Label>
              <Slider
                value={[element.skewY || 0]}
                onValueChange={([value]) => preview({ ...element, skewY: value })}
                onValueCommit={([value]) => onUpdate({ ...element, skewY: value })}
                min={-45}
                max={45}
                step={1}
              />
            </div>
            {(element.skewX !== 0 || element.skewY !== 0) && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onUpdate({ ...element, skewX: 0, skewY: 0 })}
                className="w-full"
              >
                Reset Skew
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Typography (Text only) */}
      {element.type === "text" && (
        <Collapsible open={typographyOpen} onOpenChange={setTypographyOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/50 px-2 rounded border-t">
            <span className="text-sm font-semibold flex items-center gap-2">
              <Type className="h-4 w-4" />
              Typography
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${typographyOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2 px-2">
          {/* Style Presets */}
            <div>
              <Label className="text-xs">Style Presets</Label>
              <TextStylePresetPicker
                onApply={(preset) => {
                  loadGoogleFont(preset.fontFamily);
                  // Build the updated element with preset styles
                  const updatedElement = {
                    ...element,
                    fontFamily: preset.fontFamily,
                    fontWeight: preset.fontWeight,
                    color: preset.color,
                    colorType: preset.colorType,
                    gradientColor: preset.gradientColor || element.gradientColor,
                    strokeColor: preset.strokeColor,
                    strokeWidth: preset.strokeWidth,
                    shadow: preset.shadow,
                    shadowColor: preset.shadowColor,
                    shadowBlur: preset.shadowBlur,
                    shadowOffsetX: preset.shadowOffsetX,
                    shadowOffsetY: preset.shadowOffsetY,
                    letterSpacing: preset.letterSpacing,
                    textTransform: preset.textTransform as any,
                    curveAngle: preset.curveAngle || 0,
                  };
                  
                  // If autoFitText is enabled, recalculate optimal font size
                  // Otherwise use the preset's font size
                  if (element.autoFitText) {
                    const optimalSize = calculateOptimalFontSize(updatedElement);
                    onUpdate({ ...updatedElement, fontSize: optimalSize });
                  } else {
                    onUpdate({ ...updatedElement, fontSize: preset.fontSize });
                  }
                }}
              />
            </div>

          {/* Font Family */}
            <div>
              <Label className="text-xs">Font</Label>
              <FontPicker
                value={element.fontFamily}
                onChange={(value) => {
                  loadGoogleFont(value);
                  onUpdate({ ...element, fontFamily: value });
                }}
              />
            </div>

            {/* Font Weight */}
            <div>
              <Label className="text-xs">Font Weight</Label>
              <Select
                value={element.fontWeight}
                onValueChange={(value) => onUpdate({ ...element, fontWeight: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontWeightOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label} ({option.value})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Auto-fit Text */}
            <div className="flex items-center justify-between p-2 rounded-md border bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-xs flex items-center gap-1.5">
                  Auto-fit Text
                  {element.autoFitText && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 font-medium">ON</span>
                  )}
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  {element.autoFitText 
                    ? `Auto-calculated: ${element.fontSize}px` 
                    : "Adjust font size to fit element bounds"}
                </p>
              </div>
              <Switch
                checked={element.autoFitText}
                onCheckedChange={(checked) => {
                  if (checked) {
                    // Calculate optimal font size when turning on auto-fit
                    const optimalSize = calculateOptimalFontSize(element);
                    onUpdate({ ...element, autoFitText: checked, fontSize: optimalSize });
                    toast.success("Auto-fit enabled. Font will resize with element.");
                  } else {
                    onUpdate({ ...element, autoFitText: checked });
                    toast.success(`Auto-fit disabled. Font size kept at ${element.fontSize}px.`);
                  }
                }}
              />
            </div>

            {/* Font Size */}
            <div>
              <Label className="text-xs flex items-center gap-2">
                Size: {element.fontSize}px
                {element.autoFitText && (
                  <span className="text-[9px] text-emerald-600">(auto)</span>
                )}
              </Label>
              <Slider
                value={[element.fontSize]}
                onValueChange={([value]) => preview({ ...element, fontSize: value })}
                onValueCommit={([value]) => onUpdate({ ...element, fontSize: value })}
                min={8}
                max={200}
                step={1}
                disabled={element.autoFitText}
                className={element.autoFitText ? "opacity-50 cursor-not-allowed" : ""}
              />
              {element.autoFitText && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Font size auto-adjusts when you resize the element. Turn off to adjust manually.
                </p>
              )}
            </div>

            {/* Style Buttons */}
            <div>
              <Label className="text-xs">Style</Label>
              <div className="grid grid-cols-4 gap-1 mt-1">
                <Button
                  size="sm"
                  variant={element.fontWeight === "bold" ? "default" : "outline"}
                  onClick={() => onUpdate({ ...element, fontWeight: element.fontWeight === "bold" ? "normal" : "bold" })}
                  title="Bold"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={element.fontStyle === "italic" ? "default" : "outline"}
                  onClick={() => onUpdate({ ...element, fontStyle: element.fontStyle === "italic" ? "normal" : "italic" })}
                  title="Italic"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={element.textDecoration === "underline" ? "default" : "outline"}
                  onClick={() => onUpdate({ ...element, textDecoration: element.textDecoration === "underline" ? "none" : "underline" })}
                  title="Underline"
                >
                  <Underline className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={element.textDecoration === "line-through" ? "default" : "outline"}
                  onClick={() => onUpdate({ ...element, textDecoration: element.textDecoration === "line-through" ? "none" : "line-through" })}
                  title="Strikethrough"
                >
                  <Strikethrough className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Text Transform */}
            <div>
              <Label className="text-xs">Transform</Label>
              <div className="grid grid-cols-4 gap-1 mt-1">
                <Button
                  size="sm"
                  variant={element.textTransform === "none" ? "default" : "outline"}
                  onClick={() => onUpdate({ ...element, textTransform: "none" })}
                  className="text-xs"
                  title="Normal"
                >
                  Aa
                </Button>
                <Button
                  size="sm"
                  variant={element.textTransform === "uppercase" ? "default" : "outline"}
                  onClick={() => onUpdate({ ...element, textTransform: "uppercase" })}
                  className="text-xs font-semibold"
                  title="Uppercase"
                >
                  AA
                </Button>
                <Button
                  size="sm"
                  variant={element.textTransform === "lowercase" ? "default" : "outline"}
                  onClick={() => onUpdate({ ...element, textTransform: "lowercase" })}
                  className="text-xs"
                  title="Lowercase"
                >
                  aa
                </Button>
                <Button
                  size="sm"
                  variant={element.textTransform === "capitalize" ? "default" : "outline"}
                  onClick={() => onUpdate({ ...element, textTransform: "capitalize" })}
                  className="text-xs"
                  title="Capitalize"
                >
                  Aa+
                </Button>
              </div>
            </div>

            {/* Alignment Section */}
            <div className="pt-2 border-t">
              <Label className="text-xs font-semibold text-primary">Alignment</Label>
            </div>

            {/* Text Align (Horizontal) */}
            <div>
              <Label className="text-xs">Horizontal Align</Label>
              <div className="grid grid-cols-4 gap-1 mt-1">
                <Button
                  size="sm"
                  variant={element.textAlign === "left" ? "default" : "outline"}
                  onClick={() => onUpdate({ ...element, textAlign: "left" })}
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={element.textAlign === "center" ? "default" : "outline"}
                  onClick={() => onUpdate({ ...element, textAlign: "center" })}
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={element.textAlign === "right" ? "default" : "outline"}
                  onClick={() => onUpdate({ ...element, textAlign: "right" })}
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={element.textAlign === "justify" ? "default" : "outline"}
                  onClick={() => onUpdate({ ...element, textAlign: "justify" })}
                >
                  <AlignJustify className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Vertical Align */}
            <div>
              <Label className="text-xs">Vertical Align</Label>
              <div className="grid grid-cols-3 gap-1 mt-1">
                <Button
                  size="sm"
                  variant={element.verticalAlign === "top" ? "default" : "outline"}
                  onClick={() => onUpdate({ ...element, verticalAlign: "top" })}
                  className="text-xs"
                >
                  Top
                </Button>
                <Button
                  size="sm"
                  variant={element.verticalAlign === "middle" ? "default" : "outline"}
                  onClick={() => onUpdate({ ...element, verticalAlign: "middle" })}
                  className="text-xs"
                >
                  Middle
                </Button>
                <Button
                  size="sm"
                  variant={element.verticalAlign === "bottom" ? "default" : "outline"}
                  onClick={() => onUpdate({ ...element, verticalAlign: "bottom" })}
                  className="text-xs"
                >
                  Bottom
                </Button>
              </div>
            </div>

            {/* Spacing Section */}
            <div className="pt-2 border-t">
              <Label className="text-xs font-semibold text-primary">Spacing</Label>
            </div>

            {/* Line Height */}
            <div>
              <Label className="text-xs">Line Height: {element.lineHeight.toFixed(1)}</Label>
              <Slider
                value={[element.lineHeight * 10]}
                onValueChange={([value]) => preview({ ...element, lineHeight: value / 10 })}
                onValueCommit={([value]) => onUpdate({ ...element, lineHeight: value / 10 })}
                min={5}
                max={30}
                step={1}
              />
            </div>

            {/* Letter Spacing */}
            <div>
              <Label className="text-xs">Letter Spacing: {element.letterSpacing}</Label>
              <Slider
                value={[element.letterSpacing]}
                onValueChange={([value]) => preview({ ...element, letterSpacing: value })}
                onValueCommit={([value]) => onUpdate({ ...element, letterSpacing: value })}
                min={-10}
                max={50}
                step={1}
              />
            </div>

            {/* Word Spacing */}
            <div>
              <Label className="text-xs">Word Spacing: {element.wordSpacing}</Label>
              <Slider
                value={[element.wordSpacing]}
                onValueChange={([value]) => preview({ ...element, wordSpacing: value })}
                onValueCommit={([value]) => onUpdate({ ...element, wordSpacing: value })}
                min={-10}
                max={50}
                step={1}
              />
            </div>

            {/* Text Curve Effect */}
            <div className="pt-2 border-t">
              <Label className="text-xs font-semibold text-primary">Text Curve</Label>
            </div>
            <div>
              <Label className="text-xs">Curve Angle: {element.curveAngle || 0}°</Label>
              <Slider
                value={[element.curveAngle || 0]}
                onValueChange={([value]) => preview({ ...element, curveAngle: value })}
                onValueCommit={([value]) => onUpdate({ ...element, curveAngle: value })}
                min={-180}
                max={180}
                step={5}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Bend text along a circular path. 0° = straight text.</p>
            </div>

            {/* Text Path Following */}
            <div className="pt-2 border-t">
              <Label className="text-xs font-semibold text-primary">Text Path</Label>
            </div>
            <div>
              <Label className="text-xs">Path Shape</Label>
              <Select
                value={element.textPath || "none"}
                onValueChange={(value: any) => onUpdate({ ...element, textPath: value })}
              >
                <SelectTrigger>
                  <SelectValue>{getTextPathLabel(element.textPath || "none")}</SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto bg-popover z-50">
                  {textPathCategories.map((category) => (
                    <div key={category.label}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                        {category.label}
                      </div>
                      {category.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {element.textPath && element.textPath !== "none" && (
              <>
                <div>
                  <Label className="text-xs">Path Offset: {element.pathOffset || 0}%</Label>
                  <Slider
                    value={[element.pathOffset || 0]}
                    onValueChange={([value]) => preview({ ...element, pathOffset: value })}
                    onValueCommit={([value]) => onUpdate({ ...element, pathOffset: value })}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>
                {element.textPath === "custom" && (
                  <div>
                    <Label className="text-xs">Custom SVG Path</Label>
                    <Input
                      type="text"
                      value={element.customPath || ""}
                      onChange={(e) => onUpdate({ ...element, customPath: e.target.value })}
                      placeholder="M 0 50 Q 50 0 100 50"
                      className="font-mono text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Enter SVG path data (d attribute)</p>
                  </div>
                )}
              </>
            )}

            {/* Word Styler Section */}
            <div className="pt-2 border-t space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-primary">Word Styler</Label>
                {element.wordStylesEnabled && element.wordStyles?.length ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground"
                    onClick={() => onUpdate({ ...element, wordStyles: [], wordStylesEnabled: false })}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => setWordStylerOpen(true)}
                >
                  <WandSparkles className="h-3.5 w-3.5 mr-1.5" />
                  Edit Word Styles
                </Button>
                {backgroundImageSrc && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setImageColorPickerOpen(true)}
                    title="Extract colors from background image"
                  >
                    <Palette className="h-3.5 w-3.5 mr-1.5" />
                    From Image
                  </Button>
                )}
              </div>
              <WordStylerDialog
                open={wordStylerOpen}
                onOpenChange={setWordStylerOpen}
                element={element}
                onApply={(wordStyles, enabled, bgPadding, bgRadius, rules) => onUpdate({ 
                  ...element, 
                  wordStyles, 
                  wordStylesEnabled: enabled,
                  wordStyleBgPadding: bgPadding,
                  wordStyleBgRadius: bgRadius,
                  wordStyleRules: rules
                })}
              />
              <ImageColorPalettePicker
                open={imageColorPickerOpen}
                onOpenChange={setImageColorPickerOpen}
                imageSrc={backgroundImageSrc}
                words={(() => {
                  let text = element.content;
                  if (element.textTransform === "uppercase") text = text.toUpperCase();
                  else if (element.textTransform === "lowercase") text = text.toLowerCase();
                  else if (element.textTransform === "capitalize") text = text.replace(/\b\w/g, c => c.toUpperCase());
                  return text.split(/\s+/).filter(w => w.length > 0);
                })()}
                onApply={(wordStyles, bgPadding, bgRadius) => onUpdate({ 
                  ...element, 
                  wordStyles, 
                  wordStylesEnabled: true,
                  wordStyleBgPadding: bgPadding,
                  wordStyleBgRadius: bgRadius
                })}
                bgPadding={element.wordStyleBgPadding}
                bgRadius={element.wordStyleBgRadius}
              />
              {element.wordStylesEnabled && element.wordStyles?.length ? (
                <p className="text-xs text-muted-foreground">
                  Words have custom styling applied
                </p>
              ) : null}
            </div>

            {/* Color Section */}
            <div className="pt-2 border-t">
              <Label className="text-xs font-semibold text-primary">Color</Label>
            </div>

            {/* Color Type Tabs */}
            <Tabs value={element.colorType} onValueChange={(value: "solid" | "gradient") => onUpdate({ ...element, colorType: value })}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="solid">Solid</TabsTrigger>
                <TabsTrigger value="gradient">Gradient</TabsTrigger>
              </TabsList>
              
              <TabsContent value="solid" className="space-y-2 mt-2">
                <ColorPickerPopover
                  label="Text Color"
                  color={element.color}
                  onChange={(color) => onUpdate({ ...element, color })}
                />
              </TabsContent>
              
              <TabsContent value="gradient" className="space-y-3 mt-2">
                {/* Gradient Direction */}
                <div>
                  <Label className="text-xs">Direction</Label>
                  <div className="grid grid-cols-5 gap-1 mt-1">
                    <Button
                      size="sm"
                      variant={element.gradientDirection === "horizontal" || !element.gradientDirection ? "default" : "outline"}
                      onClick={() => onUpdate({ ...element, gradientDirection: "horizontal" })}
                      className="h-8 text-xs"
                      title="Horizontal"
                    >
                      →
                    </Button>
                    <Button
                      size="sm"
                      variant={element.gradientDirection === "vertical" ? "default" : "outline"}
                      onClick={() => onUpdate({ ...element, gradientDirection: "vertical" })}
                      className="h-8 text-xs"
                      title="Vertical"
                    >
                      ↓
                    </Button>
                    <Button
                      size="sm"
                      variant={element.gradientDirection === "diagonal-down" ? "default" : "outline"}
                      onClick={() => onUpdate({ ...element, gradientDirection: "diagonal-down" })}
                      className="h-8 text-xs"
                      title="Diagonal Down"
                    >
                      ↘
                    </Button>
                    <Button
                      size="sm"
                      variant={element.gradientDirection === "diagonal-up" ? "default" : "outline"}
                      onClick={() => onUpdate({ ...element, gradientDirection: "diagonal-up" })}
                      className="h-8 text-xs"
                      title="Diagonal Up"
                    >
                      ↗
                    </Button>
                    <Button
                      size="sm"
                      variant={element.gradientDirection === "radial" ? "default" : "outline"}
                      onClick={() => onUpdate({ ...element, gradientDirection: "radial" })}
                      className="h-8 text-xs"
                      title="Radial"
                    >
                      ◎
                    </Button>
                  </div>
                </div>

                {/* Gradient Colors */}
                <div className="grid grid-cols-2 gap-2">
                  <ColorPickerPopover
                    label="Start Color"
                    color={element.gradientStartColor || "#ff0000"}
                    onChange={(color) => {
                      const dir = element.gradientDirection || "horizontal";
                      const endColor = element.gradientEndColor || "#ffff00";
                      const gradientStr = dir === "radial" 
                        ? `radial-gradient(circle, ${color} 0%, ${endColor} 100%)`
                        : `linear-gradient(${dir === "horizontal" ? "90deg" : dir === "vertical" ? "180deg" : dir === "diagonal-down" ? "135deg" : "45deg"}, ${color} 0%, ${endColor} 100%)`;
                      onUpdate({ ...element, gradientStartColor: color, gradientColor: gradientStr });
                    }}
                  />
                  <ColorPickerPopover
                    label="End Color"
                    color={element.gradientEndColor || "#ffff00"}
                    onChange={(color) => {
                      const dir = element.gradientDirection || "horizontal";
                      const startColor = element.gradientStartColor || "#ff0000";
                      const gradientStr = dir === "radial" 
                        ? `radial-gradient(circle, ${startColor} 0%, ${color} 100%)`
                        : `linear-gradient(${dir === "horizontal" ? "90deg" : dir === "vertical" ? "180deg" : dir === "diagonal-down" ? "135deg" : "45deg"}, ${startColor} 0%, ${color} 100%)`;
                      onUpdate({ ...element, gradientEndColor: color, gradientColor: gradientStr });
                    }}
                  />
                </div>

                {/* Gradient Preview */}
                <div 
                  className="h-8 w-full rounded border border-border"
                  style={{ background: element.gradientColor || "linear-gradient(90deg, #ff0000 0%, #ffff00 100%)" }}
                />

                {/* Gradient Presets */}
                <div>
                  <Label className="text-xs">Presets</Label>
                  <div className="grid grid-cols-6 gap-1 mt-1">
                    {[
                      { start: "#ff0000", end: "#ffff00", name: "Sunset" },
                      { start: "#667eea", end: "#764ba2", name: "Purple" },
                      { start: "#f093fb", end: "#f5576c", name: "Pink" },
                      { start: "#4facfe", end: "#00f2fe", name: "Ocean" },
                      { start: "#43e97b", end: "#38f9d7", name: "Mint" },
                      { start: "#fa709a", end: "#fee140", name: "Peach" },
                      { start: "#a8edea", end: "#fed6e3", name: "Pastel" },
                      { start: "#ffecd2", end: "#fcb69f", name: "Warm" },
                      { start: "#ff9a9e", end: "#fecfef", name: "Rose" },
                      { start: "#a18cd1", end: "#fbc2eb", name: "Lavender" },
                      { start: "#fad0c4", end: "#ffd1ff", name: "Blush" },
                      { start: "#30cfd0", end: "#330867", name: "Night" },
                      { start: "#f5af19", end: "#f12711", name: "Fire" },
                      { start: "#00c6fb", end: "#005bea", name: "Sky" },
                      { start: "#c471f5", end: "#fa71cd", name: "Neon" },
                      { start: "#11998e", end: "#38ef7d", name: "Forest" },
                      { start: "#fc5c7d", end: "#6a82fb", name: "Candy" },
                      { start: "#ffd89b", end: "#19547b", name: "Dawn" },
                    ].map((preset, i) => {
                      const dir = element.gradientDirection || "horizontal";
                      const gradientStr = dir === "radial" 
                        ? `radial-gradient(circle, ${preset.start} 0%, ${preset.end} 100%)`
                        : `linear-gradient(${dir === "horizontal" ? "90deg" : dir === "vertical" ? "180deg" : dir === "diagonal-down" ? "135deg" : "45deg"}, ${preset.start} 0%, ${preset.end} 100%)`;
                      return (
                        <Button
                          key={i}
                          size="sm"
                          variant="outline"
                          onClick={() => onUpdate({ 
                            ...element, 
                            gradientColor: gradientStr,
                            gradientStartColor: preset.start,
                            gradientEndColor: preset.end
                          })}
                          className="h-6 w-full p-0"
                          style={{ background: `linear-gradient(90deg, ${preset.start} 0%, ${preset.end} 100%)` }}
                          title={preset.name}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Custom Gradient Input */}
                <div>
                  <Label className="text-xs">Custom CSS Gradient</Label>
                  <Input
                    type="text"
                    value={element.gradientColor}
                    onChange={(e) => onUpdate({ ...element, gradientColor: e.target.value })}
                    placeholder="linear-gradient(90deg, #ff0000 0%, #00ff00 100%)"
                    className="font-mono text-xs mt-1"
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Stroke */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Stroke (Outline)</Label>
                <Switch
                  checked={element.strokeWidth > 0}
                  onCheckedChange={(checked) => onUpdate({ ...element, strokeWidth: checked ? 2 : 0 })}
                />
              </div>
              {element.strokeWidth > 0 && (
                <>
                  <ColorPickerPopover
                    label="Stroke Color"
                    color={element.strokeColor}
                    onChange={(color) => onUpdate({ ...element, strokeColor: color })}
                  />
                  <div>
                    <Label className="text-xs">Width: {element.strokeWidth}px</Label>
                  <Slider
                      value={[element.strokeWidth]}
                      onValueChange={([value]) => preview({ ...element, strokeWidth: value })}
                      onValueCommit={([value]) => onUpdate({ ...element, strokeWidth: value })}
                      min={1}
                      max={20}
                      step={1}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Text Box Background Section */}
            <div className="pt-2 border-t">
              <Label className="text-xs font-semibold text-primary">Text Box Fill & Border</Label>
            </div>
            
            {/* Background/Fill */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Fill</Label>
                <Switch
                  checked={element.backgroundOpacity > 0}
                  onCheckedChange={(checked) => onUpdate({ 
                    ...element, 
                    backgroundOpacity: checked ? 1 : 0,
                    backgroundColor: element.backgroundColor === "transparent" ? "#ffffff" : element.backgroundColor
                  })}
                />
              </div>
              {element.backgroundOpacity > 0 && (
                <>
                  {/* Fill Type Tabs */}
                  <Tabs value={element.textBoxFillType || "solid"} onValueChange={(value: "solid" | "gradient") => onUpdate({ ...element, textBoxFillType: value })}>
                    <TabsList className="grid w-full grid-cols-2 h-7">
                      <TabsTrigger value="solid" className="text-xs">Solid</TabsTrigger>
                      <TabsTrigger value="gradient" className="text-xs">Gradient</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="solid" className="space-y-2 mt-2">
                      <ColorPickerPopover
                        label="Fill Color"
                        color={element.backgroundColor === "transparent" ? "#ffffff" : element.backgroundColor}
                        onChange={(color) => onUpdate({ ...element, backgroundColor: color })}
                      />
                    </TabsContent>
                    
                    <TabsContent value="gradient" className="space-y-2 mt-2">
                      {/* Gradient Direction */}
                      <div>
                        <Label className="text-xs">Direction</Label>
                        <div className="grid grid-cols-5 gap-1 mt-1">
                          {[
                            { value: "horizontal", label: "→" },
                            { value: "vertical", label: "↓" },
                            { value: "diagonal-down", label: "↘" },
                            { value: "diagonal-up", label: "↗" },
                            { value: "radial", label: "◎" },
                          ].map((dir) => (
                            <Button
                              key={dir.value}
                              size="sm"
                              variant={(element.textBoxGradientDirection || "horizontal") === dir.value ? "default" : "outline"}
                              onClick={() => onUpdate({ ...element, textBoxGradientDirection: dir.value as any })}
                              className="h-7 text-xs"
                            >
                              {dir.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <ColorPickerPopover
                          label="Start"
                          color={element.textBoxGradientStartColor || "#ffffff"}
                          onChange={(color) => {
                            const dir = element.textBoxGradientDirection || "horizontal";
                            const endColor = element.textBoxGradientEndColor || "#000000";
                            const gradientStr = dir === "radial" 
                              ? `radial-gradient(circle, ${color} 0%, ${endColor} 100%)`
                              : `linear-gradient(${dir === "horizontal" ? "90deg" : dir === "vertical" ? "180deg" : dir === "diagonal-down" ? "135deg" : "45deg"}, ${color} 0%, ${endColor} 100%)`;
                            onUpdate({ ...element, textBoxGradientStartColor: color, textBoxGradientFill: gradientStr });
                          }}
                        />
                        <ColorPickerPopover
                          label="End"
                          color={element.textBoxGradientEndColor || "#000000"}
                          onChange={(color) => {
                            const dir = element.textBoxGradientDirection || "horizontal";
                            const startColor = element.textBoxGradientStartColor || "#ffffff";
                            const gradientStr = dir === "radial" 
                              ? `radial-gradient(circle, ${startColor} 0%, ${color} 100%)`
                              : `linear-gradient(${dir === "horizontal" ? "90deg" : dir === "vertical" ? "180deg" : dir === "diagonal-down" ? "135deg" : "45deg"}, ${startColor} 0%, ${color} 100%)`;
                            onUpdate({ ...element, textBoxGradientEndColor: color, textBoxGradientFill: gradientStr });
                          }}
                        />
                      </div>
                      {element.textBoxGradientFill && (
                        <div 
                          className="h-6 w-full rounded border border-border"
                          style={{ background: element.textBoxGradientFill }}
                        />
                      )}
                    </TabsContent>
                  </Tabs>

                  <div>
                    <Label className="text-xs">Opacity: {Math.round(element.backgroundOpacity * 100)}%</Label>
                    <Slider
                      value={[element.backgroundOpacity * 100]}
                      onValueChange={([value]) => preview({ ...element, backgroundOpacity: value / 100 })}
                      onValueCommit={([value]) => onUpdate({ ...element, backgroundOpacity: value / 100 })}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Padding: {element.backgroundPadding}px</Label>
                    <Slider
                      value={[element.backgroundPadding]}
                      onValueChange={([value]) => preview({ ...element, backgroundPadding: value })}
                      onValueCommit={([value]) => onUpdate({ ...element, backgroundPadding: value })}
                      min={0}
                      max={50}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Corner Radius: {element.backgroundRadius}px</Label>
                    <Slider
                      value={[element.backgroundRadius]}
                      onValueChange={([value]) => preview({ ...element, backgroundRadius: value })}
                      onValueCommit={([value]) => onUpdate({ ...element, backgroundRadius: value })}
                      min={0}
                      max={50}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Text Box Border */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Border</Label>
                <Switch
                  checked={element.textBoxBorder}
                  onCheckedChange={(checked) => onUpdate({ ...element, textBoxBorder: checked })}
                />
              </div>
              {element.textBoxBorder && (
                <>
                  <ColorPickerPopover
                    label="Border Color"
                    color={element.textBoxBorderColor}
                    onChange={(color) => onUpdate({ ...element, textBoxBorderColor: color })}
                  />
                  <div>
                    <Label className="text-xs">Width: {element.textBoxBorderWidth}px</Label>
                    <Slider
                      value={[element.textBoxBorderWidth]}
                      onValueChange={([value]) => preview({ ...element, textBoxBorderWidth: value })}
                      onValueCommit={([value]) => onUpdate({ ...element, textBoxBorderWidth: value })}
                      min={1}
                      max={20}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Style</Label>
                    <Select
                      value={element.textBoxBorderStyle || "solid"}
                      onValueChange={(value: "solid" | "dashed" | "dotted" | "double" | "groove" | "ridge") => onUpdate({ ...element, textBoxBorderStyle: value })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">━━━ Solid</SelectItem>
                        <SelectItem value="dashed">┅┅┅ Dashed</SelectItem>
                        <SelectItem value="dotted">┈┈┈ Dotted</SelectItem>
                        <SelectItem value="double">═══ Double</SelectItem>
                        <SelectItem value="groove">▬▬▬ Groove</SelectItem>
                        <SelectItem value="ridge">▰▰▰ Ridge</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dash Pattern (only for dashed/dotted) */}
                  {(element.textBoxBorderStyle === "dashed" || element.textBoxBorderStyle === "dotted") && (
                    <div>
                      <Label className="text-xs">Dash Pattern</Label>
                      <Select
                        value={JSON.stringify(element.textBoxBorderDashPattern || (element.textBoxBorderStyle === "dotted" ? [2, 4] : [5, 5]))}
                        onValueChange={(value) => onUpdate({ ...element, textBoxBorderDashPattern: JSON.parse(value) })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="[2,4]">Dotted (2,4)</SelectItem>
                          <SelectItem value="[5,5]">Short Dash (5,5)</SelectItem>
                          <SelectItem value="[10,10]">Medium Dash (10,10)</SelectItem>
                          <SelectItem value="[15,15]">Long Dash (15,15)</SelectItem>
                          <SelectItem value="[20,5]">Long-Short (20,5)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs">Border Radius: {element.textBoxBorderRadius || 0}px</Label>
                    <Slider
                      value={[element.textBoxBorderRadius || 0]}
                      onValueChange={([value]) => preview({ ...element, textBoxBorderRadius: value })}
                      onValueCommit={([value]) => onUpdate({ ...element, textBoxBorderRadius: value })}
                      min={0}
                      max={50}
                    />
                  </div>

                  {/* Border Sides - Excel-like selection */}
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs font-semibold">Border Sides</Label>
                    <div className="flex items-center justify-center gap-2">
                      {/* Visual border selector grid */}
                      <div className="relative w-20 h-20 bg-muted/30 rounded">
                        {/* Preview box */}
                        <div className="absolute inset-3 bg-background rounded-sm border-2 border-muted" />
                        {/* Top border button */}
                        <Button
                          size="sm"
                          variant={element.textBoxBorderTop !== false ? "default" : "outline"}
                          onClick={() => onUpdate({ ...element, textBoxBorderTop: element.textBoxBorderTop === false })}
                          className="absolute top-0 left-1/2 -translate-x-1/2 h-3 w-12 p-0 rounded-b-none"
                          title="Top Border"
                        />
                        {/* Bottom border button */}
                        <Button
                          size="sm"
                          variant={element.textBoxBorderBottom !== false ? "default" : "outline"}
                          onClick={() => onUpdate({ ...element, textBoxBorderBottom: element.textBoxBorderBottom === false })}
                          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-3 w-12 p-0 rounded-t-none"
                          title="Bottom Border"
                        />
                        {/* Left border button */}
                        <Button
                          size="sm"
                          variant={element.textBoxBorderLeft !== false ? "default" : "outline"}
                          onClick={() => onUpdate({ ...element, textBoxBorderLeft: element.textBoxBorderLeft === false })}
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-12 p-0 rounded-r-none"
                          title="Left Border"
                        />
                        {/* Right border button */}
                        <Button
                          size="sm"
                          variant={element.textBoxBorderRight !== false ? "default" : "outline"}
                          onClick={() => onUpdate({ ...element, textBoxBorderRight: element.textBoxBorderRight === false })}
                          className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-12 p-0 rounded-l-none"
                          title="Right Border"
                        />
                      </div>
                      {/* Quick preset buttons */}
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onUpdate({ ...element, textBoxBorderTop: true, textBoxBorderRight: true, textBoxBorderBottom: true, textBoxBorderLeft: true })}
                          className="h-6 text-[10px] px-2"
                        >
                          All
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onUpdate({ ...element, textBoxBorderTop: false, textBoxBorderRight: false, textBoxBorderBottom: false, textBoxBorderLeft: false })}
                          className="h-6 text-[10px] px-2"
                        >
                          None
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onUpdate({ ...element, textBoxBorderTop: true, textBoxBorderBottom: true, textBoxBorderLeft: false, textBoxBorderRight: false })}
                          className="h-6 text-[10px] px-2"
                        >
                          H
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onUpdate({ ...element, textBoxBorderTop: false, textBoxBorderBottom: false, textBoxBorderLeft: true, textBoxBorderRight: true })}
                          className="h-6 text-[10px] px-2"
                        >
                          V
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Border Shadow */}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Border Shadow</Label>
                      <Switch
                        checked={element.textBoxBorderShadow || false}
                        onCheckedChange={(checked) => onUpdate({ ...element, textBoxBorderShadow: checked })}
                      />
                    </div>
                    {element.textBoxBorderShadow && (
                      <>
                        <ColorPickerPopover
                          label="Shadow Color"
                          color={element.textBoxBorderShadowColor || "rgba(0,0,0,0.5)"}
                          onChange={(color) => onUpdate({ ...element, textBoxBorderShadowColor: color })}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Offset X</Label>
                            <Input
                              type="number"
                              value={element.textBoxBorderShadowOffsetX || 0}
                              onChange={(e) => onUpdate({ ...element, textBoxBorderShadowOffsetX: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Offset Y</Label>
                            <Input
                              type="number"
                              value={element.textBoxBorderShadowOffsetY || 0}
                              onChange={(e) => onUpdate({ ...element, textBoxBorderShadowOffsetY: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Blur: {element.textBoxBorderShadowBlur || 4}px</Label>
                          <Slider
                            value={[element.textBoxBorderShadowBlur || 4]}
                            onValueChange={([value]) => preview({ ...element, textBoxBorderShadowBlur: value })}
                            onValueCommit={([value]) => onUpdate({ ...element, textBoxBorderShadowBlur: value })}
                            min={0}
                            max={30}
                            step={1}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Appearance (Shapes) */}
      {(element.type === "rectangle" || element.type === "circle" || element.type === "star" || element.type === "polygon") && (
        <Collapsible open={appearanceOpen} onOpenChange={setAppearanceOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/50 px-2 rounded border-t">
            <span className="text-sm font-semibold flex items-center gap-2">
              <Type className="h-4 w-4" />
              Appearance
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${appearanceOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2 px-2">
            {/* Fill Type Tabs */}
            <Tabs value={element.fillType || "solid"} onValueChange={(value: "solid" | "gradient") => onUpdate({ ...element, fillType: value })}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="solid">Solid</TabsTrigger>
                <TabsTrigger value="gradient">Gradient</TabsTrigger>
              </TabsList>
              
              <TabsContent value="solid" className="space-y-2 mt-2">
                <ColorPickerPopover
                  label="Fill Color"
                  color={element.fillColor}
                  onChange={(color) => onUpdate({ ...element, fillColor: color })}
                />
                <div>
                  <Label className="text-xs">Opacity: {Math.round(element.fillOpacity * 100)}%</Label>
                  <Slider
                    value={[element.fillOpacity * 100]}
                    onValueChange={([value]) => preview({ ...element, fillOpacity: value / 100 })}
                    onValueCommit={([value]) => onUpdate({ ...element, fillOpacity: value / 100 })}
                    min={0}
                    max={100}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="gradient" className="space-y-2 mt-2">
                <Label className="text-xs">Gradient Presets</Label>
                <div className="grid grid-cols-3 gap-1 mb-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onUpdate({ ...element, gradientFill: "linear-gradient(90deg, #ff0000 0%, #ffff00 100%)" })}
                    className="h-8 p-0"
                    style={{ background: "linear-gradient(90deg, #ff0000 0%, #ffff00 100%)" }}
                  />
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onUpdate({ ...element, gradientFill: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)" })}
                    className="h-8 p-0"
                    style={{ background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)" }}
                  />
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onUpdate({ ...element, gradientFill: "linear-gradient(90deg, #f093fb 0%, #f5576c 100%)" })}
                    className="h-8 p-0"
                    style={{ background: "linear-gradient(90deg, #f093fb 0%, #f5576c 100%)" }}
                  />
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onUpdate({ ...element, gradientFill: "linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)" })}
                    className="h-8 p-0"
                    style={{ background: "linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)" }}
                  />
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onUpdate({ ...element, gradientFill: "linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)" })}
                    className="h-8 p-0"
                    style={{ background: "linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)" }}
                  />
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onUpdate({ ...element, gradientFill: "linear-gradient(90deg, #fa709a 0%, #fee140 100%)" })}
                    className="h-8 p-0"
                    style={{ background: "linear-gradient(90deg, #fa709a 0%, #fee140 100%)" }}
                  />
                </div>
                <Label className="text-xs">Custom Gradient</Label>
                <Input
                  type="text"
                  value={element.gradientFill || "linear-gradient(90deg, #667eea 0%, #764ba2 100%)"}
                  onChange={(e) => onUpdate({ ...element, gradientFill: e.target.value })}
                  placeholder="linear-gradient(90deg, #ff0000 0%, #00ff00 100%)"
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Example: linear-gradient(90deg, #ff0000 0%, #00ff00 100%)
                </p>
                  <div>
                    <Label className="text-xs">Opacity: {Math.round(element.fillOpacity * 100)}%</Label>
                    <Slider
                      value={[element.fillOpacity * 100]}
                      onValueChange={([value]) => preview({ ...element, fillOpacity: value / 100 })}
                      onValueCommit={([value]) => onUpdate({ ...element, fillOpacity: value / 100 })}
                      min={0}
                      max={100}
                    />
                  </div>
              </TabsContent>
            </Tabs>

            {/* Background Image */}
            {(element.type === "rectangle" || element.type === "circle") && (
              <div className="space-y-2 border-t pt-3">
                <Label className="text-xs">Background Image</Label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => backgroundImageRef.current?.click()} className="flex-1">
                    {element.backgroundImage ? "Change Image" : "Upload Image"}
                  </Button>
                  {hasMultipleImages && onBatchUploadImage && (
                    <Button size="sm" variant="outline" onClick={onBatchUploadImage} title="Batch Upload Images">
                      <ImagePlus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <input
                  ref={backgroundImageRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundImageUpload}
                  className="hidden"
                />
                {element.backgroundImage && (
                  <div>
                    <Label className="text-xs">Image Opacity: {Math.round(element.backgroundOpacity * 100)}%</Label>
                    <Slider
                      value={[element.backgroundOpacity * 100]}
                      onValueChange={([value]) => preview({ ...element, backgroundOpacity: value / 100 })}
                      onValueCommit={([value]) => onUpdate({ ...element, backgroundOpacity: value / 100 })}
                      min={0}
                      max={100}
                    />
                  </div>
                )}
                {isBlankCanvas && element.backgroundImage && (
                  <div className="space-y-2 border rounded-md p-2 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Sync with canvas background</Label>
                      <Switch
                        checked={!!(element as any).syncWithCanvasBackground}
                        onCheckedChange={(c) => {
                          // Mirror the shape's own image opacity so previews are identical.
                          const opacityPct = Math.round((element.backgroundOpacity ?? 1) * 100);
                          onUpdate({
                            ...element,
                            syncWithCanvasBackground: c,
                            canvasSyncOpacity: opacityPct,
                          } as any);
                          if (!onApplyImageToCanvasBackground) return;
                          if (c && element.backgroundImage) {
                            onApplyImageToCanvasBackground(element.backgroundImage, opacityPct);
                          } else if (!c) {
                            onApplyImageToCanvasBackground("", 100);
                          }
                        }}
                      />
                    </div>
                    {(element as any).syncWithCanvasBackground && (
                      <div>
                        <Label className="text-xs">
                          Synced opacity: {Math.round((element.backgroundOpacity ?? 1) * 100)}%
                        </Label>
                        <Slider
                          value={[Math.round((element.backgroundOpacity ?? 1) * 100)]}
                          min={0}
                          max={100}
                          onValueChange={([v]) => {
                            // Mirror both fields so the shape and canvas render identically.
                            onUpdate({
                              ...element,
                              backgroundOpacity: v / 100,
                              canvasSyncOpacity: v,
                            } as any);
                            if (onApplyImageToCanvasBackground && element.backgroundImage) {
                              onApplyImageToCanvasBackground(element.backgroundImage, v);
                            }
                          }}
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Controls the opacity of the image both inside the shape and on the canvas background so the two previews match exactly.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Border */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Border</Label>
                <Switch
                  checked={element.borderWidth > 0}
                  onCheckedChange={(checked) => onUpdate({ ...element, borderWidth: checked ? 2 : 0 })}
                />
              </div>
              {element.borderWidth > 0 && (
                <>
                  <ColorPickerPopover
                    label="Border Color"
                    color={element.borderColor}
                    onChange={(color) => onUpdate({ ...element, borderColor: color })}
                  />
                  <div>
                    <Label className="text-xs">Width: {element.borderWidth}px</Label>
                    <Slider
                      value={[element.borderWidth]}
                      onValueChange={([value]) => preview({ ...element, borderWidth: value })}
                      onValueCommit={([value]) => onUpdate({ ...element, borderWidth: value })}
                      min={1}
                      max={50}
                      step={1}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Opacity: {Math.round(element.borderOpacity * 100)}%</Label>
                    <Slider
                      value={[element.borderOpacity * 100]}
                      onValueChange={([value]) => preview({ ...element, borderOpacity: value / 100 })}
                      onValueCommit={([value]) => onUpdate({ ...element, borderOpacity: value / 100 })}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Style</Label>
                    <Select
                      value={element.borderStyle}
                      onValueChange={(value: "solid" | "dashed" | "dotted" | "double" | "groove" | "ridge") => onUpdate({ ...element, borderStyle: value, dashed: value === "dashed" || value === "dotted" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">━━━ Solid</SelectItem>
                        <SelectItem value="dashed">┅┅┅ Dashed</SelectItem>
                        <SelectItem value="dotted">┈┈┈ Dotted</SelectItem>
                        <SelectItem value="double">═══ Double</SelectItem>
                        <SelectItem value="groove">▬▬▬ Groove</SelectItem>
                        <SelectItem value="ridge">▰▰▰ Ridge</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dash Pattern (only for dashed/dotted) */}
                  {(element.borderStyle === "dashed" || element.borderStyle === "dotted") && (
                    <div>
                      <Label className="text-xs">Dash Pattern</Label>
                      <Select
                        value={JSON.stringify(element.borderDashPattern || (element.borderStyle === "dotted" ? [2, 4] : [5, 5]))}
                        onValueChange={(value) => onUpdate({ ...element, borderDashPattern: JSON.parse(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="[2,4]">Dotted (2,4)</SelectItem>
                          <SelectItem value="[5,5]">Short Dash (5,5)</SelectItem>
                          <SelectItem value="[10,10]">Medium Dash (10,10)</SelectItem>
                          <SelectItem value="[15,15]">Long Dash (15,15)</SelectItem>
                          <SelectItem value="[20,5]">Long-Short (20,5)</SelectItem>
                          <SelectItem value="[10,5,2,5]">Dash-Dot (10,5,2,5)</SelectItem>
                          <SelectItem value="[15,3,3,3]">Dash-Dot-Dot (15,3,3,3)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Border Sides - Excel-like selection */}
                  {element.type === "rectangle" && (
                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-xs font-semibold">Border Sides</Label>
                      <div className="flex items-center justify-center gap-2">
                        {/* Visual border selector grid */}
                        <div className="relative w-20 h-20 bg-muted/30 rounded">
                          {/* Preview box */}
                          <div className="absolute inset-3 bg-background rounded-sm border-2 border-muted" />
                          {/* Top border button */}
                          <Button
                            size="sm"
                            variant={element.borderTop !== false ? "default" : "outline"}
                            onClick={() => onUpdate({ ...element, borderTop: element.borderTop === false })}
                            className="absolute top-0 left-1/2 -translate-x-1/2 h-3 w-12 p-0 rounded-b-none"
                            title="Top Border"
                          />
                          {/* Bottom border button */}
                          <Button
                            size="sm"
                            variant={element.borderBottom !== false ? "default" : "outline"}
                            onClick={() => onUpdate({ ...element, borderBottom: element.borderBottom === false })}
                            className="absolute bottom-0 left-1/2 -translate-x-1/2 h-3 w-12 p-0 rounded-t-none"
                            title="Bottom Border"
                          />
                          {/* Left border button */}
                          <Button
                            size="sm"
                            variant={element.borderLeft !== false ? "default" : "outline"}
                            onClick={() => onUpdate({ ...element, borderLeft: element.borderLeft === false })}
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-12 p-0 rounded-r-none"
                            title="Left Border"
                          />
                          {/* Right border button */}
                          <Button
                            size="sm"
                            variant={element.borderRight !== false ? "default" : "outline"}
                            onClick={() => onUpdate({ ...element, borderRight: element.borderRight === false })}
                            className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-12 p-0 rounded-l-none"
                            title="Right Border"
                          />
                        </div>
                        {/* Quick preset buttons */}
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onUpdate({ ...element, borderTop: true, borderRight: true, borderBottom: true, borderLeft: true })}
                            className="h-6 text-[10px] px-2"
                          >
                            All
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onUpdate({ ...element, borderTop: false, borderRight: false, borderBottom: false, borderLeft: false })}
                            className="h-6 text-[10px] px-2"
                          >
                            None
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onUpdate({ ...element, borderTop: true, borderBottom: true, borderLeft: false, borderRight: false })}
                            className="h-6 text-[10px] px-2"
                          >
                            H
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onUpdate({ ...element, borderTop: false, borderBottom: false, borderLeft: true, borderRight: true })}
                            className="h-6 text-[10px] px-2"
                          >
                            V
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Border Shadow */}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Border Shadow</Label>
                      <Switch
                        checked={element.borderShadow || false}
                        onCheckedChange={(checked) => onUpdate({ ...element, borderShadow: checked })}
                      />
                    </div>
                    {element.borderShadow && (
                      <>
                        <ColorPickerPopover
                          label="Shadow Color"
                          color={element.borderShadowColor || "rgba(0,0,0,0.5)"}
                          onChange={(color) => onUpdate({ ...element, borderShadowColor: color })}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Offset X</Label>
                            <Input
                              type="number"
                              value={element.borderShadowOffsetX || 0}
                              onChange={(e) => onUpdate({ ...element, borderShadowOffsetX: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Offset Y</Label>
                            <Input
                              type="number"
                              value={element.borderShadowOffsetY || 0}
                              onChange={(e) => onUpdate({ ...element, borderShadowOffsetY: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Blur: {element.borderShadowBlur || 4}px</Label>
                          <Slider
                            value={[element.borderShadowBlur || 4]}
                            onValueChange={([value]) => preview({ ...element, borderShadowBlur: value })}
                            onValueCommit={([value]) => onUpdate({ ...element, borderShadowBlur: value })}
                            min={0}
                            max={30}
                            step={1}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Border Radius (Rectangle only) */}
            {element.type === "rectangle" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Border Radius</Label>
                  <Switch
                    checked={(element.cornerRadius || 0) > 0}
                    onCheckedChange={(checked) => onUpdate({ ...element, cornerRadius: checked ? 10 : 0 })}
                  />
                </div>
                {(element.cornerRadius || 0) > 0 && (
                  <div>
                    <Label className="text-xs">Radius: {element.cornerRadius}px</Label>
                    <Slider
                      value={[element.cornerRadius || 0]}
                      onValueChange={([value]) => preview({ ...element, cornerRadius: value })}
                      onValueCommit={([value]) => onUpdate({ ...element, cornerRadius: value })}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Padding */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Padding</Label>
                <Switch
                  checked={element.paddingTop > 0 || element.paddingRight > 0 || element.paddingBottom > 0 || element.paddingLeft > 0}
                  onCheckedChange={(checked) => onUpdate({ 
                    ...element, 
                    paddingTop: checked ? 10 : 0,
                    paddingRight: checked ? 10 : 0,
                    paddingBottom: checked ? 10 : 0,
                    paddingLeft: checked ? 10 : 0
                  })}
                />
              </div>
              {(element.paddingTop > 0 || element.paddingRight > 0) && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Top</Label>
                    <Input
                      type="number"
                      value={element.paddingTop}
                      onChange={(e) => onUpdate({ ...element, paddingTop: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Right</Label>
                    <Input
                      type="number"
                      value={element.paddingRight}
                      onChange={(e) => onUpdate({ ...element, paddingRight: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Bottom</Label>
                    <Input
                      type="number"
                      value={element.paddingBottom}
                      onChange={(e) => onUpdate({ ...element, paddingBottom: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Left</Label>
                    <Input
                      type="number"
                      value={element.paddingLeft}
                      onChange={(e) => onUpdate({ ...element, paddingLeft: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Star Points */}
            {element.type === "star" && (
              <div className="space-y-2 border-t pt-3">
                <Label className="text-xs">Star Points: {element.points || 5}</Label>
                <Slider
                  value={[element.points || 5]}
                  onValueChange={([value]) => preview({ ...element, points: value })}
                  onValueCommit={([value]) => onUpdate({ ...element, points: value })}
                  min={3}
                  max={12}
                  step={1}
                />
              </div>
            )}

            {/* Polygon Sides */}
            {element.type === "polygon" && (
              <div className="space-y-2 border-t pt-3">
                <Label className="text-xs">Polygon Sides: {element.sides || 6}</Label>
                <Slider
                  value={[element.sides || 6]}
                  onValueChange={([value]) => preview({ ...element, sides: value })}
                  onValueCommit={([value]) => onUpdate({ ...element, sides: value })}
                  min={3}
                  max={12}
                  step={1}
                />
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Line & Arrow Appearance */}
      {(element.type === "line" || element.type === "arrow") && (
        <Collapsible open={appearanceOpen} onOpenChange={setAppearanceOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/50 px-2 rounded border-t">
            <span className="text-sm font-semibold flex items-center gap-2">
              <Type className="h-4 w-4" />
              Line Formatting
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${appearanceOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2 px-2">
            {/* Stroke Width */}
            <div>
              <Label className="text-xs">Line Width: {element.strokeWidth}px</Label>
              <Slider
                value={[element.strokeWidth]}
                onValueChange={([value]) => preview({ ...element, strokeWidth: value })}
                onValueCommit={([value]) => onUpdate({ ...element, strokeWidth: value })}
                min={1}
                max={50}
                step={1}
              />
            </div>

            {/* Stroke Color */}
            <ColorPickerPopover
              label="Line Color"
              color={element.strokeColor}
              onChange={(color) => onUpdate({ ...element, strokeColor: color })}
            />

            {/* Dashed Line */}
            <div className="flex items-center justify-between">
              <Label className="text-xs">Dashed Line</Label>
              <Switch
                checked={element.dashed}
                onCheckedChange={(checked) => onUpdate({ ...element, dashed: checked })}
              />
            </div>

            {element.dashed && (
              <div>
                <Label className="text-xs">Dash Pattern</Label>
                <Select
                  value={JSON.stringify(element.dashArray || [5, 5])}
                  onValueChange={(value) => onUpdate({ ...element, dashArray: JSON.parse(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="[5,5]">Short Dash (5,5)</SelectItem>
                    <SelectItem value="[10,10]">Medium Dash (10,10)</SelectItem>
                    <SelectItem value="[15,15]">Long Dash (15,15)</SelectItem>
                    <SelectItem value="[20,5]">Long-Short (20,5)</SelectItem>
                    <SelectItem value="[10,5,2,5]">Dash-Dot (10,5,2,5)</SelectItem>
                    <SelectItem value="[15,3,3,3]">Dash-Dot-Dot (15,3,3,3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Line Cap */}
            <div>
              <Label className="text-xs">Line Cap</Label>
              <Select
                value={element.lineCap || "butt"}
                onValueChange={(value: "butt" | "round" | "square") => onUpdate({ ...element, lineCap: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="butt">Butt (flat)</SelectItem>
                  <SelectItem value="round">Round</SelectItem>
                  <SelectItem value="square">Square</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Line Join */}
            <div>
              <Label className="text-xs">Line Join</Label>
              <Select
                value={element.lineJoin || "miter"}
                onValueChange={(value: "miter" | "round" | "bevel") => onUpdate({ ...element, lineJoin: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="miter">Miter (sharp)</SelectItem>
                  <SelectItem value="round">Round</SelectItem>
                  <SelectItem value="bevel">Bevel (flat)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Effects */}
      <Collapsible open={effectsOpen} onOpenChange={setEffectsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/50 px-2 rounded border-t">
          <span className="text-sm font-semibold flex items-center gap-2">
            <Type className="h-4 w-4" />
            Effects
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${effectsOpen ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2 px-2">
          {/* Shadow */}
          {(element.type === "text" || element.type === "rectangle" || element.type === "circle" || element.type === "star" || element.type === "polygon") && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Shadow</Label>
                <Switch
                  checked={element.shadow}
                  onCheckedChange={(checked) => onUpdate({ ...element, shadow: checked })}
                />
              </div>
              {element.shadow && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Offset X</Label>
                      <Input
                        type="number"
                        value={element.type === "text" ? element.shadowOffsetX : (element.shadowOffsetX || 0)}
                        onChange={(e) => onUpdate({ ...element, shadowOffsetX: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Offset Y</Label>
                      <Input
                        type="number"
                        value={element.type === "text" ? element.shadowOffsetY : (element.shadowOffsetY || 0)}
                        onChange={(e) => onUpdate({ ...element, shadowOffsetY: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Blur: {element.shadowBlur}px</Label>
                    <Slider
                      value={[element.shadowBlur]}
                      onValueChange={([value]) => preview({ ...element, shadowBlur: value })}
                      onValueCommit={([value]) => onUpdate({ ...element, shadowBlur: value })}
                      min={0}
                      max={50}
                      step={1}
                    />
                  </div>
                  <ColorPickerPopover
                    label="Shadow Color"
                    color={element.shadowColor}
                    onChange={(color) => onUpdate({ ...element, shadowColor: color })}
                  />
                </>
              )}
            </div>
          )}

          {/* Outline Glow Effect (Text Only) */}
          {element.type === "text" && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-primary">Outline Glow</Label>
                <Switch
                  checked={element.outlineGlow || false}
                  onCheckedChange={(checked) => onUpdate({ ...element, outlineGlow: checked })}
                />
              </div>
              {element.outlineGlow && (
                <>
                  <ColorPickerPopover
                    label="Glow Color"
                    color={element.outlineGlowColor || "#00BFFF"}
                    onChange={(color) => onUpdate({ ...element, outlineGlowColor: color })}
                  />
                  <div>
                    <Label className="text-xs">Glow Blur: {element.outlineGlowBlur || 10}px</Label>
                    <Slider
                      value={[element.outlineGlowBlur || 10]}
                      onValueChange={([value]) => preview({ ...element, outlineGlowBlur: value })}
                      onValueCommit={([value]) => onUpdate({ ...element, outlineGlowBlur: value })}
                      min={0}
                      max={50}
                      step={1}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Glow Spread: {element.outlineGlowSpread || 2}px</Label>
                    <Slider
                      value={[element.outlineGlowSpread || 2]}
                      onValueChange={([value]) => preview({ ...element, outlineGlowSpread: value })}
                      onValueCommit={([value]) => onUpdate({ ...element, outlineGlowSpread: value })}
                      min={0}
                      max={20}
                      step={1}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* 3D Text Effects (Text Only) */}
          {element.type === "text" && (
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs font-semibold text-primary">3D Text Effects</Label>
              <p className="text-[10px] text-muted-foreground mb-2">Apply professional 3D text presets instantly</p>
              <Select
                value="none"
                onValueChange={(value) => {
                  if (value === "none") return;
                  
                  const presets: Record<string, Partial<TextElement>> = {
                    "classic-3d": {
                      strokeWidth: 4,
                      strokeColor: "#000000",
                      shadow: true,
                      shadowColor: "rgba(0,0,0,0.8)",
                      shadowBlur: 8,
                      shadowOffsetX: 4,
                      shadowOffsetY: 4,
                    },
                    "deep-shadow": {
                      strokeWidth: 6,
                      strokeColor: "#ffffff",
                      shadow: true,
                      shadowColor: "rgba(0,0,0,0.9)",
                      shadowBlur: 12,
                      shadowOffsetX: 6,
                      shadowOffsetY: 6,
                    },
                    "embossed": {
                      strokeWidth: 3,
                      strokeColor: element.color,
                      shadow: true,
                      shadowColor: "rgba(255,255,255,0.5)",
                      shadowBlur: 10,
                      shadowOffsetX: -2,
                      shadowOffsetY: -2,
                    },
                    "neon-glow": {
                      strokeWidth: 2,
                      strokeColor: "#ffaa00",
                      shadow: true,
                      shadowColor: "rgba(255,170,0,0.8)",
                      shadowBlur: 20,
                      shadowOffsetX: 0,
                      shadowOffsetY: 0,
                    },
                    "bold-outline": {
                      strokeWidth: 8,
                      strokeColor: "#000000",
                      shadow: true,
                      shadowColor: "rgba(255,255,255,0.3)",
                      shadowBlur: 2,
                      shadowOffsetX: 2,
                      shadowOffsetY: 2,
                    },
                    "metallic": {
                      colorType: "gradient",
                      gradientColor: "linear-gradient(180deg, #ffffff 0%, #cccccc 100%)",
                      strokeWidth: 3,
                      strokeColor: "#333333",
                      shadow: true,
                      shadowColor: "rgba(0,0,0,0.6)",
                      shadowBlur: 5,
                      shadowOffsetX: 3,
                      shadowOffsetY: 3,
                    },
                    "gold": {
                      colorType: "gradient",
                      gradientColor: "linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)",
                      strokeWidth: 4,
                      strokeColor: "#8B4513",
                      shadow: true,
                      shadowColor: "rgba(255,215,0,0.7)",
                      shadowBlur: 15,
                      shadowOffsetX: 3,
                      shadowOffsetY: 3,
                    },
                    "chrome": {
                      colorType: "gradient",
                      gradientColor: "linear-gradient(180deg, #E8E8E8 0%, #999999 50%, #E8E8E8 100%)",
                      strokeWidth: 5,
                      strokeColor: "#000000",
                      shadow: true,
                      shadowColor: "rgba(0,0,0,0.8)",
                      shadowBlur: 10,
                      shadowOffsetX: 4,
                      shadowOffsetY: 4,
                    },
                    "neon-blue": {
                      color: "#00BFFF",
                      strokeWidth: 2,
                      strokeColor: "#0000FF",
                      shadow: true,
                      shadowColor: "rgba(0,191,255,0.9)",
                      shadowBlur: 25,
                      shadowOffsetX: 0,
                      shadowOffsetY: 0,
                    },
                    "neon-pink": {
                      color: "#FF1493",
                      strokeWidth: 2,
                      strokeColor: "#FF00FF",
                      shadow: true,
                      shadowColor: "rgba(255,20,147,0.9)",
                      shadowBlur: 25,
                      shadowOffsetX: 0,
                      shadowOffsetY: 0,
                    },
                    "neon-green": {
                      color: "#00FF00",
                      strokeWidth: 2,
                      strokeColor: "#008000",
                      shadow: true,
                      shadowColor: "rgba(0,255,0,0.9)",
                      shadowBlur: 25,
                      shadowOffsetX: 0,
                      shadowOffsetY: 0,
                    },
                    "retro-80s": {
                      colorType: "gradient",
                      gradientColor: "linear-gradient(180deg, #FF00FF 0%, #00FFFF 100%)",
                      strokeWidth: 4,
                      strokeColor: "#000000",
                      shadow: true,
                      shadowColor: "rgba(255,0,255,0.7)",
                      shadowBlur: 18,
                      shadowOffsetX: 5,
                      shadowOffsetY: 5,
                    },
                    "fire": {
                      colorType: "gradient",
                      gradientColor: "linear-gradient(180deg, #FFFF00 0%, #FF6600 50%, #FF0000 100%)",
                      strokeWidth: 3,
                      strokeColor: "#8B0000",
                      shadow: true,
                      shadowColor: "rgba(255,100,0,0.8)",
                      shadowBlur: 20,
                      shadowOffsetX: 0,
                      shadowOffsetY: 5,
                    },
                    "ice": {
                      colorType: "gradient",
                      gradientColor: "linear-gradient(180deg, #FFFFFF 0%, #87CEEB 50%, #4682B4 100%)",
                      strokeWidth: 3,
                      strokeColor: "#00008B",
                      shadow: true,
                      shadowColor: "rgba(135,206,235,0.7)",
                      shadowBlur: 15,
                      shadowOffsetX: 2,
                      shadowOffsetY: 2,
                    },
                    "poison": {
                      colorType: "gradient",
                      gradientColor: "linear-gradient(180deg, #00FF00 0%, #008000 100%)",
                      strokeWidth: 4,
                      strokeColor: "#003300",
                      shadow: true,
                      shadowColor: "rgba(0,255,0,0.6)",
                      shadowBlur: 22,
                      shadowOffsetX: 3,
                      shadowOffsetY: 3,
                    },
                    "sunset": {
                      colorType: "gradient",
                      gradientColor: "linear-gradient(180deg, #FF6B6B 0%, #FFA500 50%, #FFD700 100%)",
                      strokeWidth: 3,
                      strokeColor: "#8B4513",
                      shadow: true,
                      shadowColor: "rgba(255,107,107,0.7)",
                      shadowBlur: 12,
                      shadowOffsetX: 4,
                      shadowOffsetY: 4,
                    },
                    "ocean": {
                      colorType: "gradient",
                      gradientColor: "linear-gradient(180deg, #00CED1 0%, #1E90FF 50%, #000080 100%)",
                      strokeWidth: 4,
                      strokeColor: "#003366",
                      shadow: true,
                      shadowColor: "rgba(30,144,255,0.6)",
                      shadowBlur: 16,
                      shadowOffsetX: 3,
                      shadowOffsetY: 3,
                    },
                    "royal": {
                      colorType: "gradient",
                      gradientColor: "linear-gradient(180deg, #9370DB 0%, #4B0082 100%)",
                      strokeWidth: 5,
                      strokeColor: "#FFD700",
                      shadow: true,
                      shadowColor: "rgba(147,112,219,0.8)",
                      shadowBlur: 14,
                      shadowOffsetX: 4,
                      shadowOffsetY: 4,
                    },
                    "copper": {
                      colorType: "gradient",
                      gradientColor: "linear-gradient(180deg, #E77C56 0%, #C47451 50%, #A0522D 100%)",
                      strokeWidth: 4,
                      strokeColor: "#3B1F0F",
                      shadow: true,
                      shadowColor: "rgba(231,124,86,0.7)",
                      shadowBlur: 10,
                      shadowOffsetX: 3,
                      shadowOffsetY: 3,
                    },
                    "silver": {
                      colorType: "gradient",
                      gradientColor: "linear-gradient(180deg, #F0F0F0 0%, #C0C0C0 50%, #808080 100%)",
                      strokeWidth: 4,
                      strokeColor: "#404040",
                      shadow: true,
                      shadowColor: "rgba(192,192,192,0.6)",
                      shadowBlur: 12,
                      shadowOffsetX: 3,
                      shadowOffsetY: 3,
                    },
                    "bronze": {
                      colorType: "gradient",
                      gradientColor: "linear-gradient(180deg, #CD7F32 0%, #8B4513 100%)",
                      strokeWidth: 4,
                      strokeColor: "#3B1F0F",
                      shadow: true,
                      shadowColor: "rgba(205,127,50,0.7)",
                      shadowBlur: 11,
                      shadowOffsetX: 3,
                      shadowOffsetY: 3,
                    },
                    "candy": {
                      colorType: "gradient",
                      gradientColor: "linear-gradient(180deg, #FF69B4 0%, #FFB6C1 50%, #FFC0CB 100%)",
                      strokeWidth: 3,
                      strokeColor: "#C71585",
                      shadow: true,
                      shadowColor: "rgba(255,105,180,0.6)",
                      shadowBlur: 15,
                      shadowOffsetX: 2,
                      shadowOffsetY: 2,
                    },
                    "lava": {
                      colorType: "gradient",
                      gradientColor: "linear-gradient(180deg, #FF4500 0%, #DC143C 50%, #8B0000 100%)",
                      strokeWidth: 5,
                      strokeColor: "#000000",
                      shadow: true,
                      shadowColor: "rgba(255,69,0,0.9)",
                      shadowBlur: 25,
                      shadowOffsetX: 4,
                      shadowOffsetY: 4,
                    },
                    "toxic": {
                      colorType: "gradient",
                      gradientColor: "linear-gradient(180deg, #ADFF2F 0%, #7FFF00 50%, #32CD32 100%)",
                      strokeWidth: 3,
                      strokeColor: "#006400",
                      shadow: true,
                      shadowColor: "rgba(173,255,47,0.8)",
                      shadowBlur: 20,
                      shadowOffsetX: 0,
                      shadowOffsetY: 0,
                    },
                    "galaxy": {
                      colorType: "gradient",
                      gradientColor: "linear-gradient(180deg, #8A2BE2 0%, #4B0082 50%, #000080 100%)",
                      strokeWidth: 4,
                      strokeColor: "#FFD700",
                      shadow: true,
                      shadowColor: "rgba(138,43,226,0.8)",
                      shadowBlur: 18,
                      shadowOffsetX: 3,
                      shadowOffsetY: 3,
                    },
                    "mint": {
                      colorType: "gradient",
                      gradientColor: "linear-gradient(180deg, #98FF98 0%, #00FA9A 50%, #3CB371 100%)",
                      strokeWidth: 3,
                      strokeColor: "#2E8B57",
                      shadow: true,
                      shadowColor: "rgba(152,255,152,0.6)",
                      shadowBlur: 14,
                      shadowOffsetX: 2,
                      shadowOffsetY: 2,
                    },
                    "rose": {
                      colorType: "gradient",
                      gradientColor: "linear-gradient(180deg, #FFB6C1 0%, #FF69B4 50%, #FF1493 100%)",
                      strokeWidth: 4,
                      strokeColor: "#8B008B",
                      shadow: true,
                      shadowColor: "rgba(255,182,193,0.7)",
                      shadowBlur: 13,
                      shadowOffsetX: 3,
                      shadowOffsetY: 3,
                    },
                    "midnight": {
                      colorType: "gradient",
                      gradientColor: "linear-gradient(180deg, #191970 0%, #000080 50%, #000000 100%)",
                      strokeWidth: 5,
                      strokeColor: "#4169E1",
                      shadow: true,
                      shadowColor: "rgba(25,25,112,0.8)",
                      shadowBlur: 15,
                      shadowOffsetX: 4,
                      shadowOffsetY: 4,
                    },
                    "ember": {
                      colorType: "gradient",
                      gradientColor: "linear-gradient(180deg, #FFD700 0%, #FF8C00 50%, #FF4500 100%)",
                      strokeWidth: 4,
                      strokeColor: "#8B0000",
                      shadow: true,
                      shadowColor: "rgba(255,215,0,0.7)",
                      shadowBlur: 17,
                      shadowOffsetX: 3,
                      shadowOffsetY: 3,
                    },
                    "aqua": {
                      colorType: "gradient",
                      gradientColor: "linear-gradient(180deg, #00FFFF 0%, #00CED1 50%, #20B2AA 100%)",
                      strokeWidth: 3,
                      strokeColor: "#008B8B",
                      shadow: true,
                      shadowColor: "rgba(0,255,255,0.7)",
                      shadowBlur: 16,
                      shadowOffsetX: 2,
                      shadowOffsetY: 2,
                    },
                    "autumn": {
                      colorType: "gradient",
                      gradientColor: "linear-gradient(180deg, #FF6347 0%, #FF8C00 50%, #FFD700 100%)",
                      strokeWidth: 4,
                      strokeColor: "#8B4513",
                      shadow: true,
                      shadowColor: "rgba(255,99,71,0.6)",
                      shadowBlur: 12,
                      shadowOffsetX: 3,
                      shadowOffsetY: 3,
                    },
                  };

                  const preset = presets[value];
                  if (preset) {
                    onUpdate({ ...element, ...preset });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a 3D preset..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="classic-3d">Classic 3D</SelectItem>
                  <SelectItem value="deep-shadow">Deep Shadow</SelectItem>
                  <SelectItem value="embossed">Embossed</SelectItem>
                  <SelectItem value="neon-glow">Neon Glow (Orange)</SelectItem>
                  <SelectItem value="bold-outline">Bold Outline</SelectItem>
                  <SelectItem value="metallic">Metallic Silver</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="chrome">Chrome</SelectItem>
                  <SelectItem value="neon-blue">Neon Blue</SelectItem>
                  <SelectItem value="neon-pink">Neon Pink</SelectItem>
                  <SelectItem value="neon-green">Neon Green</SelectItem>
                  <SelectItem value="retro-80s">Retro 80s</SelectItem>
                  <SelectItem value="fire">Fire</SelectItem>
                  <SelectItem value="ice">Ice</SelectItem>
                  <SelectItem value="poison">Poison</SelectItem>
                  <SelectItem value="sunset">Sunset</SelectItem>
                  <SelectItem value="ocean">Ocean</SelectItem>
                  <SelectItem value="royal">Royal Purple</SelectItem>
                  <SelectItem value="copper">Copper</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="bronze">Bronze</SelectItem>
                  <SelectItem value="candy">Candy Pink</SelectItem>
                  <SelectItem value="lava">Lava</SelectItem>
                  <SelectItem value="toxic">Toxic</SelectItem>
                  <SelectItem value="galaxy">Galaxy</SelectItem>
                  <SelectItem value="mint">Mint</SelectItem>
                  <SelectItem value="rose">Rose</SelectItem>
                  <SelectItem value="midnight">Midnight</SelectItem>
                  <SelectItem value="ember">Ember</SelectItem>
                  <SelectItem value="aqua">Aqua</SelectItem>
                  <SelectItem value="autumn">Autumn</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Blend Mode (Images) */}
          {(element.type === "logo" || element.type === "watermark" || element.type === "image") && (
            <div>
              <Label className="text-xs">Blend Mode</Label>
              <Select
                value={element.blendMode}
                onValueChange={(value) => onUpdate({ ...element, blendMode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="multiply">Multiply</SelectItem>
                  <SelectItem value="screen">Screen</SelectItem>
                  <SelectItem value="overlay">Overlay</SelectItem>
                  <SelectItem value="darken">Darken</SelectItem>
                  <SelectItem value="lighten">Lighten</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Image Filters (Images) */}
          {(element.type === "logo" || element.type === "watermark" || element.type === "image") && (
            <div className="space-y-3 pt-3 border-t">
              <Label className="text-xs font-semibold text-primary">Image Filters</Label>
              <div>
                <Label className="text-xs">Filter Type</Label>
                <Select
                  value={element.filter?.type || "none"}
                  onValueChange={(value: any) =>
                    onUpdate({ 
                      ...element, 
                      filter: { 
                        type: value, 
                        value: element.filter?.value || 100 
                      } 
                    })
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

              {element.filter && ["brightness", "contrast", "saturation", "blur", "hue-rotate"].includes(element.filter.type) && (
                <div>
                  <Label className="text-xs">
                    {element.filter.type === "brightness" && "Brightness"}
                    {element.filter.type === "contrast" && "Contrast"}
                    {element.filter.type === "saturation" && "Saturation"}
                    {element.filter.type === "blur" && "Blur Radius"}
                    {element.filter.type === "hue-rotate" && "Hue Rotation"}
                    : {element.filter.value || 100}
                    {element.filter.type === "hue-rotate" ? "°" : element.filter.type === "blur" ? "px" : "%"}
                  </Label>
                  <Slider
                    value={[element.filter.value || 100]}
                    onValueChange={([value]) =>
                      preview({ 
                        ...element, 
                        filter: { 
                          ...element.filter!, 
                          value 
                        } 
                      })
                    }
                    onValueCommit={([value]) =>
                      onUpdate({ 
                        ...element, 
                        filter: { 
                          ...element.filter!, 
                          value 
                        } 
                      })
                    }
                    min={0}
                    max={element.filter.type === "hue-rotate" ? 360 : 200}
                    step={1}
                  />
                </div>
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Delete Button */}
      <div className="pt-3 border-t">
        <Button
          size="sm"
          variant="destructive"
          onClick={onDelete}
          className="w-full gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Delete Element
        </Button>
      </div>

      {/* Shape image → canvas background prompt */}
      <Dialog open={!!canvasPromptSrc} onOpenChange={(o) => !o && setCanvasPromptSrc(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Apply this image to the canvas background?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {isBlankCanvas
              ? "Apply the uploaded image as the canvas background while keeping your selected color/gradient underneath."
              : "Use this image as the slide's canvas background. The slide will be converted to a blank-canvas slide so the background is editable."}
          </p>
          {canvasPromptSrc && (
            <img src={canvasPromptSrc} alt="" className="w-full max-h-40 object-contain rounded border" />
          )}
          <div>
            <Label>Opacity: {canvasPromptOpacity}%</Label>
            <Slider value={[canvasPromptOpacity]} min={0} max={100} onValueChange={([v]) => setCanvasPromptOpacity(v)} />
          </div>
          {!isBlankCanvas && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={canvasPromptConvert}
                onChange={(e) => setCanvasPromptConvert(e.target.checked)}
              />
              Convert this slide into a blank-canvas slide
            </label>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCanvasPromptSrc(null)}>No, keep in shape only</Button>
            <Button
              onClick={() => {
                if (canvasPromptSrc && onApplyImageToCanvasBackground) {
                  onApplyImageToCanvasBackground(
                    canvasPromptSrc,
                    canvasPromptOpacity,
                    isBlankCanvas ? false : canvasPromptConvert,
                  );
                  if (element.type === "rectangle" || element.type === "circle") {
                    onUpdate({ ...element, syncWithCanvasBackground: true, canvasSyncOpacity: canvasPromptOpacity } as any);
                  }
                }
                setCanvasPromptSrc(null);
              }}
            >
              Apply to canvas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};