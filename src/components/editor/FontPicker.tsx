import { useState, useEffect, useRef } from "react";
import { useGoogleFonts, GoogleFont, loadGoogleFont } from "@/hooks/useGoogleFonts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, ChevronDown, Check, Type, Upload, X, ChevronRight, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FontPickerProps {
  value: string;
  onChange: (font: string) => void;
  sampleText?: string;
  showPreview?: boolean;
}

const categoryColors: Record<string, string> = {
  "sans-serif": "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  "serif": "bg-purple-500/20 text-purple-700 dark:text-purple-300",
  "display": "bg-orange-500/20 text-orange-700 dark:text-orange-300",
  "handwriting": "bg-pink-500/20 text-pink-700 dark:text-pink-300",
  "monospace": "bg-green-500/20 text-green-700 dark:text-green-300",
  "custom": "bg-amber-500/20 text-amber-700 dark:text-amber-300",
};

const DEFAULT_SAMPLE_TEXT = "The quick brown fox jumps over the lazy dog";

export const FontPicker = ({ 
  value, 
  onChange, 
  sampleText = DEFAULT_SAMPLE_TEXT,
  showPreview = true 
}: FontPickerProps) => {
  const [open, setOpen] = useState(false);
  const [previewFont, setPreviewFont] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const {
    fonts,
    customFonts,
    loading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
    preloadFont,
    addCustomFont,
    removeCustomFont,
  } = useGoogleFonts();

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load the current font
  useEffect(() => {
    if (value) {
      loadGoogleFont(value);
    }
  }, [value]);

  // Focus search input when popover opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSelectFont = (font: GoogleFont) => {
    loadGoogleFont(font.family);
    onChange(font.family);
    setOpen(false);
    setSearchQuery("");
    setPreviewFont(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const validExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (!validExtensions.includes(ext)) {
        toast.error(`Invalid file type: ${file.name}. Use TTF, OTF, WOFF, or WOFF2.`);
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File too large: ${file.name}. Max 5MB.`);
        continue;
      }

      const result = await addCustomFont(file);
      if (result) {
        toast.success(`Added custom font: ${result.family}`);
      } else {
        toast.error(`Failed to add font or it already exists`);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveCustomFont = (fontFamily: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const result = removeCustomFont(fontFamily);
    if (result) {
      toast.success(`Removed font: ${fontFamily}`);
      if (value === fontFamily) {
        onChange('Georgia');
      }
    }
  };

  const displayFont = previewFont || value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-9 py-2"
        >
          <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
            <span 
              className="truncate text-left text-sm" 
              style={{ fontFamily: value }}
            >
              {value || "Select font..."}
            </span>
            {showPreview && value && (
              <span 
                className="text-xs text-muted-foreground truncate w-full text-left"
                style={{ fontFamily: value }}
              >
                {sampleText.substring(0, 30)}...
              </span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="start">
        {/* Preview Panel */}
        {showPreview && (
          <div className="p-3 border-b bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <Label className="text-xs text-muted-foreground">Preview</Label>
              {previewFont && (
                <Badge variant="secondary" className="text-[10px]">
                  Previewing: {previewFont}
                </Badge>
              )}
            </div>
            <div 
              className="p-3 bg-background rounded-md border text-lg leading-relaxed transition-all"
              style={{ fontFamily: displayFont }}
            >
              {sampleText}
            </div>
          </div>
        )}

        <div className="p-3 border-b space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search fonts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
          
          {/* Category filters */}
          <div className="flex flex-wrap gap-1">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                className="h-6 px-2 text-xs capitalize"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === "all" ? "All" : cat}
              </Button>
            ))}
          </div>

          {/* Custom Font Upload */}
          <Collapsible open={uploadOpen} onOpenChange={setUploadOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between h-8">
                <div className="flex items-center gap-2">
                  <Upload className="h-3.5 w-3.5" />
                  <span className="text-xs">Upload Custom Font</span>
                </div>
                <ChevronRight className={cn(
                  "h-4 w-4 transition-transform",
                  uploadOpen && "rotate-90"
                )} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-2">
                <div
                  className="border-2 border-dashed border-border rounded-md p-3 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Click to upload TTF, OTF, WOFF
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".ttf,.otf,.woff,.woff2"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
                
                {customFonts.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Your Fonts ({customFonts.length})</Label>
                    <div className="max-h-24 overflow-y-auto space-y-1">
                      {customFonts.map(font => (
                        <div 
                          key={font.family}
                          className="flex items-center justify-between px-2 py-1 bg-muted/50 rounded text-xs"
                        >
                          <span style={{ fontFamily: font.family }}>{font.family}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => handleRemoveCustomFont(font.family, e)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <ScrollArea className="h-[280px]">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading fonts...
            </div>
          ) : fonts.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No fonts found
            </div>
          ) : (
            <div className="p-1">
              {fonts.map((font) => (
                <button
                  key={font.family}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-md text-left transition-colors",
                    "hover:bg-muted/50",
                    value === font.family && "bg-primary/10",
                    previewFont === font.family && "bg-accent"
                  )}
                  onClick={() => handleSelectFont(font)}
                  onMouseEnter={() => {
                    preloadFont(font.family);
                    setPreviewFont(font.family);
                  }}
                  onMouseLeave={() => setPreviewFont(null)}
                >
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Type className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span 
                        className="truncate text-sm font-medium"
                        style={{ fontFamily: font.family }}
                      >
                        {font.family}
                      </span>
                    </div>
                    <span 
                      className="text-xs text-muted-foreground truncate pl-5"
                      style={{ fontFamily: font.family }}
                    >
                      {sampleText.substring(0, 35)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge 
                      variant="secondary" 
                      className={cn("text-[10px] px-1.5 py-0", categoryColors[font.category])}
                    >
                      {font.isCustom ? 'custom' : font.category}
                    </Badge>
                    {font.isCustom && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100"
                        onClick={(e) => handleRemoveCustomFont(font.family, e)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                    {value === font.family && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-2 border-t bg-muted/30">
          <p className="text-[10px] text-muted-foreground text-center">
            {fonts.length} fonts available • {customFonts.length} custom
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
