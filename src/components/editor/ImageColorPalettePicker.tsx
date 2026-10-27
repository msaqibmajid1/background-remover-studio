import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  extractDominantColors, 
  generateThemePresets, 
  ExtractedColor, 
  ImageThemePreset 
} from "@/lib/imageColorExtractor";
import { WordStyle } from "@/types/editor";
import { 
  Palette, 
  ImageIcon, 
  Loader2, 
  RefreshCw,
  Check,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

interface ImageColorPalettePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  words: string[];
  onApply: (wordStyles: WordStyle[], bgPadding: number, bgRadius: number) => void;
  bgPadding?: number;
  bgRadius?: number;
}

export function ImageColorPalettePicker({ 
  open, 
  onOpenChange, 
  imageSrc, 
  words,
  onApply,
  bgPadding = 4,
  bgRadius = 4
}: ImageColorPalettePickerProps) {
  const [colors, setColors] = useState<ExtractedColor[]>([]);
  const [presets, setPresets] = useState<ImageThemePreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const extractColors = async () => {
    if (!imageSrc) {
      setError("No background image available");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const extractedColors = await extractDominantColors(imageSrc, 6);
      setColors(extractedColors);
      
      const generatedPresets = generateThemePresets(extractedColors);
      setPresets(generatedPresets);
      
      if (extractedColors.length === 0) {
        setError("Could not extract colors from image");
      }
    } catch (err) {
      console.error("Color extraction error:", err);
      setError("Failed to extract colors from image");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && imageSrc) {
      extractColors();
    }
  }, [open, imageSrc]);

  const applyPreset = (preset: ImageThemePreset) => {
    setSelectedPreset(preset.name);
    
    // Create word styles by cycling through preset slots
    const wordStyles: WordStyle[] = words.map((_, index) => {
      const slotIndex = index % preset.slots.length;
      const slot = preset.slots[slotIndex];
      return {
        wordIndex: index,
        color: slot.color,
        backgroundColor: slot.backgroundColor,
        bold: slot.bold,
        italic: slot.italic
      };
    });
    
    onApply(wordStyles, bgPadding, bgRadius);
    onOpenChange(false);
    toast.success(`Applied "${preset.name}" theme`);
  };

  const applyColorDirectly = (color: ExtractedColor, asBackground: boolean = false) => {
    const wordStyles: WordStyle[] = words.map((_, index) => ({
      wordIndex: index,
      color: asBackground ? "#ffffff" : color.hex,
      backgroundColor: asBackground ? color.hex : undefined,
      bold: index === 0,
      italic: false
    }));
    
    onApply(wordStyles, bgPadding, bgRadius);
    onOpenChange(false);
    toast.success(`Applied color ${color.hex}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Colors from Image
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-5 py-4">
            {/* No Image State */}
            {!imageSrc && (
              <div className="text-center py-8">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  No background image found. Add an image element first.
                </p>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Extracting colors...</span>
                </div>
                <div className="flex gap-2">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-10 rounded-full" />
                  ))}
                </div>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="text-center py-6">
                <p className="text-sm text-destructive mb-3">{error}</p>
                <Button variant="outline" size="sm" onClick={extractColors}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}

            {/* Extracted Colors */}
            {!loading && !error && colors.length > 0 && (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Palette className="h-4 w-4 text-muted-foreground" />
                      Dominant Colors
                    </Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2 text-xs"
                      onClick={extractColors}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Refresh
                    </Button>
                  </div>
                  
                  {/* Color Swatches */}
                  <div className="flex flex-wrap gap-2">
                    {colors.map((color, index) => (
                      <div key={index} className="group relative">
                        <button
                          className="w-12 h-12 rounded-lg border-2 border-border hover:border-primary transition-all hover:scale-110 shadow-sm"
                          style={{ backgroundColor: color.hex }}
                          onClick={() => applyColorDirectly(color)}
                          title={`Apply ${color.hex} as text color`}
                        />
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {Math.round(color.percentage)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Click a color to apply it as text color to all words
                  </p>
                </div>

                {/* Theme Presets */}
                <div className="space-y-3 pt-3 border-t">
                  <Label className="text-sm font-medium">Quick Apply Themes</Label>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {presets.map((preset) => (
                      <Button
                        key={preset.name}
                        variant="outline"
                        className={`h-auto py-3 px-3 flex flex-col items-start gap-2 hover:border-primary transition-all ${
                          selectedPreset === preset.name ? "border-primary bg-primary/5" : ""
                        }`}
                        onClick={() => applyPreset(preset)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <div className="flex -space-x-1.5">
                            {preset.slots.slice(0, 4).map((slot, i) => (
                              <div
                                key={i}
                                className="w-5 h-5 rounded-full border-2 border-background shadow-sm"
                                style={{ 
                                  backgroundColor: slot.backgroundColor || slot.color,
                                  ...(slot.backgroundColor && { 
                                    boxShadow: `inset 0 0 0 2px ${slot.color}` 
                                  })
                                }}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-medium truncate flex-1 text-left">
                            {preset.name}
                          </span>
                          {selectedPreset === preset.name && (
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                          )}
                        </div>
                        
                        {/* Preview */}
                        <div className="flex flex-wrap gap-1 w-full">
                          {words.slice(0, 4).map((word, i) => {
                            const slot = preset.slots[i % preset.slots.length];
                            return (
                              <span
                                key={i}
                                className="text-[10px] px-1 py-0.5 rounded"
                                style={{
                                  color: slot.color,
                                  backgroundColor: slot.backgroundColor,
                                  fontWeight: slot.bold ? "bold" : "normal",
                                  fontStyle: slot.italic ? "italic" : "normal"
                                }}
                              >
                                {word.length > 6 ? word.slice(0, 6) + "…" : word}
                              </span>
                            );
                          })}
                          {words.length > 4 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{words.length - 4}
                            </span>
                          )}
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Apply as Background Option */}
                <div className="space-y-3 pt-3 border-t">
                  <Label className="text-sm font-medium">Apply Color as Background</Label>
                  <div className="flex flex-wrap gap-2">
                    {colors.slice(0, 4).map((color, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 gap-2"
                        onClick={() => applyColorDirectly(color, true)}
                      >
                        <div
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: color.hex }}
                        />
                        <span className="text-xs">Box</span>
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Creates colored boxes behind each word
                  </p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
