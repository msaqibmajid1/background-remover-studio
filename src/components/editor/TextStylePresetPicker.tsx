import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Sparkles } from "lucide-react";
import { textStylePresets, getPresetCategories, searchPresets, TextStylePreset } from "@/data/textStylePresets";

interface TextStylePresetPickerProps {
  onApply: (preset: TextStylePreset) => void;
}

export const TextStylePresetPicker: React.FC<TextStylePresetPickerProps> = ({ onApply }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = useMemo(() => getPresetCategories(), []);

  const filteredPresets = useMemo(() => {
    let presets = textStylePresets;
    
    if (searchQuery) {
      presets = searchPresets(searchQuery);
    } else if (selectedCategory !== "all") {
      presets = presets.filter(p => p.category === selectedCategory);
    }
    
    return presets;
  }, [searchQuery, selectedCategory]);

  const handleApply = (preset: TextStylePreset) => {
    onApply(preset);
    setIsOpen(false);
  };

  const getPreviewStyle = (preset: TextStylePreset): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      fontFamily: preset.fontFamily,
      fontWeight: preset.fontWeight,
      fontSize: '14px',
      letterSpacing: `${preset.letterSpacing * 0.5}px`,
      textTransform: preset.textTransform as any,
      color: preset.colorType === 'gradient' ? 'transparent' : preset.color,
      WebkitBackgroundClip: preset.colorType === 'gradient' ? 'text' : undefined,
      backgroundClip: preset.colorType === 'gradient' ? 'text' : undefined,
      background: preset.colorType === 'gradient' ? preset.gradientColor : undefined,
    };

    if (preset.strokeWidth > 0) {
      baseStyle.WebkitTextStroke = `${Math.min(preset.strokeWidth * 0.3, 2)}px ${preset.strokeColor}`;
    }

    if (preset.shadow) {
      baseStyle.textShadow = `${preset.shadowOffsetX * 0.3}px ${preset.shadowOffsetY * 0.3}px ${preset.shadowBlur * 0.3}px ${preset.shadowColor}`;
    }

    return baseStyle;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-2">
          <Sparkles className="h-4 w-4" />
          Text Style Presets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Text Style Presets</DialogTitle>
        </DialogHeader>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search presets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setSearchQuery(""); }}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="text-xs">
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Presets Grid */}
        <ScrollArea className="h-[400px] pr-4">
          <div className="grid grid-cols-2 gap-3">
            {filteredPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleApply(preset)}
                className="p-3 rounded-lg border border-border hover:border-primary hover:bg-accent/50 transition-all text-left"
              >
                <div 
                  className="h-8 flex items-center justify-center mb-2 overflow-hidden"
                  style={getPreviewStyle(preset)}
                >
                  {preset.name.split(' ')[0]}
                </div>
                <div className="text-xs text-center">
                  <span className="font-medium">{preset.name}</span>
                  <span className="text-muted-foreground ml-1">• {preset.category}</span>
                </div>
              </button>
            ))}
          </div>
          
          {filteredPresets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="h-8 w-8 mb-2" />
              <p>No presets found</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
