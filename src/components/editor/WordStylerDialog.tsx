import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColorPickerPopover } from "./ColorPickerPopover";
import { WordStyle, WordStyleRules, WordStyleRuleStep, WordStyleSlot, TextElement } from "@/types/editor";
import { WORD_STYLE_PRESETS, PRESET_CATEGORIES, WordStylePreset } from "@/data/wordStylerPresets";
import { getLineWordRanges } from "@/lib/wordStyleUtils";
import { 
  WandSparkles, 
  Plus, 
  RotateCcw, 
  Trash2, 
  Bold, 
  Italic, 
  CaseSensitive,
  Shuffle,
  Hash,
  MousePointer,
  Palette,
  ChevronDown,
  ChevronUp,
  Layers,
  X,
  AlignLeft
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StyleSlot {
  id: number;
  color: string;
  colorType?: "solid" | "gradient";
  gradientStartColor?: string;
  gradientEndColor?: string;
  gradientDirection?: "horizontal" | "vertical" | "diagonal-down" | "diagonal-up" | "radial";
  backgroundColor?: string;
  bold: boolean;
  italic: boolean;
}

interface WordStylerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  element: TextElement;
  onApply: (wordStyles: WordStyle[], enabled: boolean, bgPadding: number, bgRadius: number, rules?: WordStyleRules) => void;
}

export function WordStylerDialog({ open, onOpenChange, element, onApply }: WordStylerDialogProps) {
  // Initialize from existing styles
  const words = useMemo(() => {
    let text = element.content;
    if (element.textTransform === "uppercase") text = text.toUpperCase();
    else if (element.textTransform === "lowercase") text = text.toLowerCase();
    else if (element.textTransform === "capitalize") text = text.replace(/\b\w/g, c => c.toUpperCase());
    return text.split(/\s+/).filter(w => w.length > 0);
  }, [element.content, element.textTransform]);

  const [styleSlots, setStyleSlots] = useState<StyleSlot[]>(() => {
    // Extract unique styles from existing wordStyles
    const uniqueStyles: StyleSlot[] = [];
    if (element.wordStyles?.length) {
      element.wordStyles.forEach(ws => {
        const existing = uniqueStyles.find(s => 
          s.color === ws.color && 
          s.colorType === ws.colorType &&
          s.gradientStartColor === ws.gradientStartColor &&
          s.gradientEndColor === ws.gradientEndColor &&
          s.gradientDirection === ws.gradientDirection &&
          s.backgroundColor === ws.backgroundColor &&
          s.bold === (ws.bold || false) &&
          s.italic === (ws.italic || false)
        );
        if (!existing) {
          uniqueStyles.push({
            id: uniqueStyles.length + 1,
            color: ws.color,
            colorType: ws.colorType,
            gradientStartColor: ws.gradientStartColor,
            gradientEndColor: ws.gradientEndColor,
            gradientDirection: ws.gradientDirection,
            backgroundColor: ws.backgroundColor,
            bold: ws.bold || false,
            italic: ws.italic || false
          });
        }
      });
    }
    return uniqueStyles.length ? uniqueStyles : [
      { id: 1, color: "#ff0000", bold: true, italic: false },
      { id: 2, color: "#ffff00", bold: false, italic: false }
    ];
  });

  const [selectedSlotId, setSelectedSlotId] = useState(1);
  const [wordAssignments, setWordAssignments] = useState<Map<number, number>>(() => {
    // Initialize from existing wordStyles
    const map = new Map<number, number>();
    if (element.wordStyles?.length) {
      element.wordStyles.forEach(ws => {
        const slotIndex = styleSlots.findIndex(s => 
          s.color === ws.color && 
          s.colorType === ws.colorType &&
          s.gradientStartColor === ws.gradientStartColor &&
          s.gradientEndColor === ws.gradientEndColor &&
          s.gradientDirection === ws.gradientDirection &&
          s.backgroundColor === ws.backgroundColor
        );
        if (slotIndex >= 0) {
          map.set(ws.wordIndex, styleSlots[slotIndex].id);
        }
      });
    }
    return map;
  });

  const [multiSelect, setMultiSelect] = useState(false);
  const [firstN, setFirstN] = useState(() => element.wordStyleRules?.firstN ?? 2);
  const [lastN, setLastN] = useState(() => element.wordStyleRules?.lastN ?? 2);
  const [randomPercent, setRandomPercent] = useState(() => element.wordStyleRules?.randomPercent ?? 30);
  const [lineN, setLineN] = useState(() => element.wordStyleRules?.lineN ?? 1);
  const [lineCount, setLineCount] = useState(() => element.wordStyleRules?.lineCount ?? 1);
  const [cycleLineColors, setCycleLineColors] = useState(() => {
    const firstLineStep = element.wordStyleRules?.steps?.find(step => step.mode === "line");
    return (firstLineStep?.lineColorMode ?? element.wordStyleRules?.lineColorMode ?? "solid") === "cycle";
  });
  const [clickMode, setClickMode] = useState(false);
  const [previewBg, setPreviewBg] = useState<"dark" | "light" | "checker">("dark");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showAllPresets, setShowAllPresets] = useState(false);
  const [bgPadding, setBgPadding] = useState(element.wordStyleBgPadding ?? 4);
  const [bgRadius, setBgRadius] = useState(element.wordStyleBgRadius ?? 4);
  // Track the last used selection mode for Apply to All
  const [lastSelectionMode, setLastSelectionMode] = useState<WordStyleRules["mode"]>(() => 
    element.wordStyleRules?.mode ?? "manual"
  );
  const [lastPresetName, setLastPresetName] = useState<string | undefined>(() => 
    element.wordStyleRules?.presetName
  );
  // Track composite steps for multi-select mode
  const [selectionSteps, setSelectionSteps] = useState<WordStyleRuleStep[]>(() =>
    element.wordStyleRules?.steps ?? []
  );
  // Line ranges for line-based selection (using visual line breaks)
  const lineRanges = useMemo(() => getLineWordRanges(element.content, element.textTransform, {
    fontFamily: element.fontFamily,
    fontSize: element.fontSize,
    fontWeight: element.fontWeight,
    letterSpacing: element.letterSpacing,
    wordSpacing: element.wordSpacing,
    elementWidth: element.width,
    strokeWidth: element.strokeWidth,
    backgroundPadding: element.backgroundPadding,
    textBoxBorderWidth: element.textBoxBorder ? element.textBoxBorderWidth : 0,
  }), [element.content, element.textTransform, element.fontFamily, element.fontSize, element.fontWeight, element.letterSpacing, element.wordSpacing, element.width, element.strokeWidth, element.backgroundPadding, element.textBoxBorder, element.textBoxBorderWidth]);
  const totalLines = lineRanges.length;
  const selectedSlot = styleSlots.find(s => s.id === selectedSlotId) || styleSlots[0];

  const addSlot = () => {
    const newId = Math.max(...styleSlots.map(s => s.id), 0) + 1;
    setStyleSlots([...styleSlots, { 
      id: newId, 
      color: "#00ff00", 
      bold: false, 
      italic: false 
    }]);
  };

  const removeSlot = (id: number) => {
    if (styleSlots.length <= 1) return;
    setStyleSlots(styleSlots.filter(s => s.id !== id));
    // Remove assignments for this slot
    const newAssignments = new Map(wordAssignments);
    wordAssignments.forEach((slotId, wordIndex) => {
      if (slotId === id) newAssignments.delete(wordIndex);
    });
    setWordAssignments(newAssignments);
    if (selectedSlotId === id) {
      setSelectedSlotId(styleSlots.find(s => s.id !== id)?.id || 1);
    }
  };

  const updateSlot = (id: number, updates: Partial<StyleSlot>) => {
    setStyleSlots(styleSlots.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const setSlotColorMode = (slot: StyleSlot, colorType: "solid" | "gradient") => {
    updateSlot(slot.id, {
      colorType,
      ...(colorType === "gradient" ? {
        gradientStartColor: slot.gradientStartColor || "#5de0e6",
        gradientEndColor: slot.gradientEndColor || "#004aad",
        gradientDirection: slot.gradientDirection || "horizontal",
      } : {}),
    });
  };

  const clearAllAssignments = () => {
    setWordAssignments(new Map());
  };

  const toggleWordAssignment = (wordIndex: number) => {
    const newAssignments = new Map(wordAssignments);
    const currentSlot = newAssignments.get(wordIndex);
    
    if (currentSlot === selectedSlotId) {
      newAssignments.delete(wordIndex);
    } else {
      newAssignments.set(wordIndex, selectedSlotId);
    }
    setWordAssignments(newAssignments);
    // Manual click changes mode to manual
    setLastSelectionMode("manual");
    setLastPresetName(undefined);
    setSelectionSteps([]);
  };

  /**
   * In Multi mode, auto-advance through slots so each step uses the next
   * color (step 1 → slot 1, step 2 → slot 2, ...). Falls back to the
   * currently-selected slot in single mode.
   */
  const getStepSlotId = (): number => {
    if (!multiSelect || styleSlots.length === 0) return selectedSlotId;
    const slotIndex = selectionSteps.length % styleSlots.length;
    return styleSlots[slotIndex].id;
  };

  const applyQuickSelect = (type: "first" | "1st" | "last" | "random" | "numbers") => {
    const newAssignments = multiSelect ? new Map(wordAssignments) : new Map<number, number>();
    const allSlotIds = styleSlots.map(s => s.id);
    const stepSlotId = getStepSlotId();
    // Distribute selected words across ALL available slots cyclically.
    const pick = (i: number) => allSlotIds[i % Math.max(1, allSlotIds.length)] ?? stepSlotId;

    let stepMode: WordStyleRuleStep["mode"] | null = null;

    if (type === "1st" && words.length > 0) {
      newAssignments.set(0, pick(0));
      stepMode = "first";
      setLastSelectionMode("first");
    } else if (type === "first") {
      const n = Math.min(firstN, words.length);
      for (let i = 0; i < n; i++) {
        newAssignments.set(i, pick(i));
      }
      stepMode = "first";
      setLastSelectionMode("first");
    } else if (type === "last") {
      const startIdx = Math.max(0, words.length - lastN);
      let cursor = 0;
      for (let i = startIdx; i < words.length; i++) {
        newAssignments.set(i, pick(cursor++));
      }
      stepMode = "last";
      setLastSelectionMode("last");
    } else if (type === "random") {
      const count = Math.ceil((randomPercent / 100) * words.length);
      const indices = Array.from({ length: words.length }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      indices.slice(0, count).forEach((wordIndex, i) => {
        newAssignments.set(wordIndex, pick(i));
      });
      stepMode = "random";
      setLastSelectionMode("random");
    } else if (type === "numbers") {
      let cursor = 0;
      words.forEach((word, i) => {
        if (/\d/.test(word)) {
          newAssignments.set(i, pick(cursor++));
        }
      });
      stepMode = "numbers";
      setLastSelectionMode("numbers");
    }
    setLastPresetName(undefined);
    setWordAssignments(newAssignments);

    if (stepMode) {
      const newStep: WordStyleRuleStep = {
        mode: stepMode,
        slotId: stepSlotId,
        slotIds: allSlotIds,
        firstN: type === "1st" ? 1 : firstN,
        lastN,
        randomPercent
      };
      if (multiSelect) {
        setSelectionSteps(prev => [...prev, newStep]);
        const nextIdx = (selectionSteps.length + 1) % styleSlots.length;
        setSelectedSlotId(styleSlots[nextIdx].id);
      } else {
        setSelectionSteps([newStep]);
      }
    }
  };

  const applyLineSelect = (type: "firstLines" | "lastLines" | "specificLine") => {
    const newAssignments = multiSelect ? new Map(wordAssignments) : new Map<number, number>();
    const stepSlotId = getStepSlotId();
    const allSlotIds = styleSlots.map(s => s.id);
    const pick = (i: number) => {
      if (!cycleLineColors) return stepSlotId;
      return allSlotIds[i % Math.max(1, allSlotIds.length)] ?? stepSlotId;
    };

    let selectedLineIndices: number[] = [];
    let stepLineFrom: "first" | "last" | "specific" = "first";

    if (type === "firstLines") {
      for (let i = 0; i < Math.min(lineCount, totalLines); i++) {
        selectedLineIndices.push(i);
      }
      stepLineFrom = "first";
    } else if (type === "lastLines") {
      for (let i = Math.max(0, totalLines - lineCount); i < totalLines; i++) {
        selectedLineIndices.push(i);
      }
      stepLineFrom = "last";
    } else if (type === "specificLine") {
      const idx = lineN - 1;
      if (idx >= 0 && idx < totalLines) {
        selectedLineIndices.push(idx);
      }
      stepLineFrom = "specific";
    }

    for (const lineIdx of selectedLineIndices) {
      const [start, end] = lineRanges[lineIdx];
      let cursor = 0;
      for (let i = start; i <= end; i++) {
        newAssignments.set(i, pick(cursor++));
      }
    }

    setWordAssignments(newAssignments);
    setLastSelectionMode("line");
    setLastPresetName(undefined);

    const newStep: WordStyleRuleStep = {
      mode: "line",
      slotId: stepSlotId,
      slotIds: cycleLineColors ? allSlotIds : undefined,
      lineN,
      lineCount,
      lineFrom: stepLineFrom,
      lineColorMode: cycleLineColors ? "cycle" : "solid"
    };
    if (multiSelect) {
      setSelectionSteps(prev => [...prev, newStep]);
      const nextIdx = (selectionSteps.length + 1) % styleSlots.length;
      setSelectedSlotId(styleSlots[nextIdx].id);
    } else {
      setSelectionSteps([newStep]);
    }
  };

  const applyAllColorsCycle = () => {
    const newAssignments = new Map<number, number>();
    words.forEach((_, index) => {
      const slotIndex = index % styleSlots.length;
      newAssignments.set(index, styleSlots[slotIndex].id);
    });
    setWordAssignments(newAssignments);
    setLastSelectionMode("cycle");
    setLastPresetName(undefined);
    setSelectionSteps([{ mode: "cycle", slotId: selectedSlotId }]);
  };

  const applyPreset = (preset: WordStylePreset) => {
    const newSlots: StyleSlot[] = preset.slots.map((slot, i) => ({
      ...slot,
      id: i + 1
    }));
    setStyleSlots(newSlots);
    setSelectedSlotId(1);
    // Apply cycling with the new slots
    const newAssignments = new Map<number, number>();
    words.forEach((_, index) => {
      const slotIndex = index % newSlots.length;
      newAssignments.set(index, newSlots[slotIndex].id);
    });
    setWordAssignments(newAssignments);
    setLastSelectionMode("preset");
    setLastPresetName(preset.name);
    setSelectionSteps([]);
  };

  const filteredPresets = useMemo(() => {
    if (selectedCategory === "All") return WORD_STYLE_PRESETS;
    return WORD_STYLE_PRESETS.filter(p => p.category === selectedCategory);
  }, [selectedCategory]);

  const displayedPresets = showAllPresets ? filteredPresets : filteredPresets.slice(0, 12);

  const handleApply = () => {
    const wordStyles: WordStyle[] = [];
    wordAssignments.forEach((slotId, wordIndex) => {
      const slot = styleSlots.find(s => s.id === slotId);
      if (slot) {
        wordStyles.push({
          wordIndex,
          color: slot.color,
          colorType: slot.colorType,
          gradientStartColor: slot.gradientStartColor,
          gradientEndColor: slot.gradientEndColor,
          gradientDirection: slot.gradientDirection,
          backgroundColor: slot.backgroundColor,
          bold: slot.bold,
          italic: slot.italic
        });
      }
    });
    
    // Build rules for Apply to All functionality
    // Use composite mode when multiple steps were applied in sequence
    const useComposite = selectionSteps.length > 1;
    const rules: WordStyleRules = {
      slots: styleSlots.map(s => ({
        id: s.id,
        color: s.color,
        colorType: s.colorType,
        gradientStartColor: s.gradientStartColor,
        gradientEndColor: s.gradientEndColor,
        gradientDirection: s.gradientDirection,
        backgroundColor: s.backgroundColor,
        bold: s.bold,
        italic: s.italic
      })),
      mode: useComposite ? "composite" : lastSelectionMode,
      firstN: firstN,
      lastN: lastN,
      randomPercent: randomPercent,
      lineN: lineN,
      lineCount: lineCount,
      lineFrom: lastSelectionMode === "line" ? (selectionSteps.length === 1 ? selectionSteps[0].lineFrom : "first") : undefined,
      slotIds: lastSelectionMode === "line" && cycleLineColors ? styleSlots.map(s => s.id) : undefined,
      lineColorMode: lastSelectionMode === "line" ? (cycleLineColors ? "cycle" : "solid") : undefined,
      presetName: lastPresetName,
      steps: useComposite ? selectionSteps : undefined
    };
    
    onApply(wordStyles, wordStyles.length > 0, bgPadding, bgRadius, rules);
    onOpenChange(false);
  };

  const getPreviewBgStyle = () => {
    if (previewBg === "dark") return "bg-zinc-900";
    if (previewBg === "light") return "bg-white";
    return "bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2216%22%20height%3D%2216%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%228%22%20height%3D%228%22%20fill%3D%22%23ccc%22%2F%3E%3Crect%20x%3D%228%22%20y%3D%228%22%20width%3D%228%22%20height%3D%228%22%20fill%3D%22%23ccc%22%2F%3E%3Crect%20x%3D%228%22%20width%3D%228%22%20height%3D%228%22%20fill%3D%22%23fff%22%2F%3E%3Crect%20y%3D%228%22%20width%3D%228%22%20height%3D%228%22%20fill%3D%22%23fff%22%2F%3E%3C%2Fsvg%3E')]";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WandSparkles className="h-5 w-5 text-primary" />
            Word Styler
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Quick Presets ({WORD_STYLE_PRESETS.length})</Label>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-28 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {displayedPresets.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1.5"
                  onClick={() => applyPreset(preset)}
                  title={`${preset.name} (${preset.category})`}
                >
                  <div className="flex -space-x-1">
                    {preset.slots.slice(0, 4).map((slot, i) => (
                      <div
                        key={i}
                        className="w-3 h-3 rounded-full border border-background"
                        style={{ background: slot.colorType === "gradient" ? `linear-gradient(90deg, ${slot.gradientStartColor || slot.color}, ${slot.gradientEndColor || slot.color})` : slot.color }}
                      />
                    ))}
                  </div>
                  <span className="max-w-16 truncate">{preset.name}</span>
                </Button>
              ))}
            </div>
            {filteredPresets.length > 12 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-6 text-xs text-muted-foreground"
                onClick={() => setShowAllPresets(!showAllPresets)}
              >
                {showAllPresets ? (
                  <>Show Less <ChevronUp className="h-3 w-3 ml-1" /></>
                ) : (
                  <>Show All {filteredPresets.length} Presets <ChevronDown className="h-3 w-3 ml-1" /></>
                )}
              </Button>
            )}
          </div>

          {/* Style Slots */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Style Slots</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllAssignments}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Clear
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addSlot}
                  className="h-7 px-2 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {styleSlots.map((slot) => (
                <div
                  key={slot.id}
                  onClick={() => setSelectedSlotId(slot.id)}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedSlotId === slot.id 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <span className="text-xs font-bold text-muted-foreground">
                    {slot.id}
                  </span>

                  <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button type="button" size="sm" variant={!slot.colorType || slot.colorType === "solid" ? "default" : "outline"} className="h-6 px-2 text-[10px]" onClick={() => setSlotColorMode(slot, "solid")}>Solid</Button>
                      <Button type="button" size="sm" variant={slot.colorType === "gradient" ? "default" : "outline"} className="h-6 px-2 text-[10px]" onClick={() => setSlotColorMode(slot, "gradient")}>Gradient</Button>
                    </div>
                    {slot.colorType === "gradient" ? (
                      <div className="flex items-center gap-1">
                        <ColorPickerPopover label="Start color" color={slot.gradientStartColor || slot.color} onChange={(gradientStartColor) => updateSlot(slot.id, { gradientStartColor })} hideLabel size="sm" />
                        <ColorPickerPopover label="End color" color={slot.gradientEndColor || "#004aad"} onChange={(gradientEndColor) => updateSlot(slot.id, { gradientEndColor })} hideLabel size="sm" />
                        <Select value={slot.gradientDirection || "horizontal"} onValueChange={(gradientDirection) => updateSlot(slot.id, { gradientDirection: gradientDirection as NonNullable<StyleSlot["gradientDirection"]> })}>
                          <SelectTrigger className="h-8 w-[112px] px-2 text-[10px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="horizontal">Horizontal</SelectItem>
                            <SelectItem value="vertical">Vertical</SelectItem>
                            <SelectItem value="diagonal-down">Diagonal down</SelectItem>
                            <SelectItem value="diagonal-up">Diagonal up</SelectItem>
                            <SelectItem value="radial">Radial</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <ColorPickerPopover label="Text color" color={slot.color} onChange={(color) => updateSlot(slot.id, { color })} hideLabel size="sm" />
                    )}
                  </div>

                  {/* BG with dotted pattern for "no bg" */}
                  <div onClick={(e) => e.stopPropagation()} className="relative">
                    {slot.backgroundColor ? (
                      <ColorPickerPopover
                        label=""
                        color={slot.backgroundColor}
                        onChange={(color) => updateSlot(slot.id, { backgroundColor: color })}
                        hideLabel
                        size="sm"
                      />
                    ) : (
                      <button
                        className="w-8 h-8 rounded-md border border-input flex items-center justify-center"
                        style={{
                          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='8' height='8' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23999'/%3E%3C/svg%3E\")",
                          backgroundSize: "4px 4px"
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateSlot(slot.id, { backgroundColor: "#ffffff" });
                        }}
                        title="Add background color"
                      />
                    )}
                    {slot.backgroundColor && (
                      <button
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateSlot(slot.id, { backgroundColor: undefined });
                        }}
                        title="Remove background"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Formatting buttons */}
                  <Button
                    size="sm"
                    variant={slot.bold ? "default" : "ghost"}
                    onClick={(e) => { e.stopPropagation(); updateSlot(slot.id, { bold: !slot.bold }); }}
                    className="h-7 w-7 p-0"
                    title="Bold"
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant={slot.italic ? "default" : "ghost"}
                    onClick={(e) => { e.stopPropagation(); updateSlot(slot.id, { italic: !slot.italic }); }}
                    className="h-7 w-7 p-0"
                    title="Italic"
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); updateSlot(slot.id, { bold: false, italic: false }); }}
                    className="h-7 w-7 p-0"
                    title="Normal"
                  >
                    <CaseSensitive className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); removeSlot(slot.id); }}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    disabled={styleSlots.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Background Padding & Radius Controls */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Background Style</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Padding</Label>
                  <span className="text-xs text-muted-foreground">{bgPadding}px</span>
                </div>
                <Slider
                  value={[bgPadding]}
                  onValueChange={([value]) => setBgPadding(value)}
                  min={0}
                  max={20}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Corner Radius</Label>
                  <span className="text-xs text-muted-foreground">{bgRadius}px</span>
                </div>
                <Slider
                  value={[bgRadius]}
                  onValueChange={([value]) => setBgRadius(value)}
                  min={0}
                  max={20}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Quick Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Quick Selection</Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="multi-select"
                  checked={multiSelect}
                  onCheckedChange={setMultiSelect}
                />
                <Label htmlFor="multi-select" className="text-xs text-muted-foreground cursor-pointer">
                  Multi
                </Label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => applyQuickSelect("1st")}>
                1st
              </Button>
              
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => applyQuickSelect("first")}>
                  First
                </Button>
                <Input
                  type="number"
                  value={firstN}
                  onChange={(e) => setFirstN(parseInt(e.target.value) || 1)}
                  className="w-10 h-8 text-center px-1"
                  min={1}
                  max={20}
                />
              </div>

              <span className="text-muted-foreground">|</span>

              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => applyQuickSelect("last")}>
                  Last
                </Button>
                <Input
                  type="number"
                  value={lastN}
                  onChange={(e) => setLastN(parseInt(e.target.value) || 1)}
                  className="w-10 h-8 text-center px-1"
                  min={1}
                  max={20}
                />
              </div>

              <span className="text-muted-foreground">|</span>

              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => applyQuickSelect("random")}>
                  <Shuffle className="h-3 w-3 mr-1" />
                  Rnd
                </Button>
                <Input
                  type="number"
                  value={randomPercent}
                  onChange={(e) => setRandomPercent(parseInt(e.target.value) || 1)}
                  className="w-10 h-8 text-center px-1"
                  min={1}
                  max={100}
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>

              <span className="text-muted-foreground">|</span>

              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-3 text-xs" 
                onClick={() => applyQuickSelect("numbers")}
                title="Select words containing numbers"
              >
                <Hash className="h-3 w-3 mr-1" />
                123
              </Button>

              <span className="text-muted-foreground">|</span>

              {/* Line-based selection */}
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => applyLineSelect("specificLine")} title={`Select line ${lineN}`}>
                  <AlignLeft className="h-3 w-3 mr-1" />
                  Line
                </Button>
                <Input
                  type="number"
                  value={lineN}
                  onChange={(e) => setLineN(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-10 h-8 text-center px-1"
                  min={1}
                  max={totalLines || 1}
                />
              </div>

              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => applyLineSelect("firstLines")} title={`Select first ${lineCount} line(s)`}>
                  1st
                </Button>
                <Input
                  type="number"
                  value={lineCount}
                  onChange={(e) => setLineCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-10 h-8 text-center px-1"
                  min={1}
                  max={totalLines || 1}
                />
                <span className="text-xs text-muted-foreground">lines</span>
              </div>

              <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => applyLineSelect("lastLines")} title={`Select last ${lineCount} line(s)`}>
                Last {lineCount > 1 ? `${lineCount} ` : ""}line{lineCount > 1 ? "s" : ""}
              </Button>

              <label className="flex h-8 items-center gap-2 rounded-md border px-2 text-xs">
                <Switch
                  checked={cycleLineColors}
                  onCheckedChange={setCycleLineColors}
                  className="scale-75"
                />
                Cycle line colors
              </label>

              <span className="text-muted-foreground">|</span>

              <Button 
                variant={clickMode ? "default" : "outline"}
                size="sm" 
                className="h-8 px-3 text-xs" 
                onClick={() => setClickMode(!clickMode)}
              >
                <MousePointer className="h-3 w-3 mr-1" />
                Click
              </Button>
            </div>

            {/* Accumulated Steps Indicator */}
            {multiSelect && selectionSteps.length > 0 && (
              <div className="mt-2 p-2 rounded-md border border-primary/20 bg-primary/5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">
                      {selectionSteps.length} step{selectionSteps.length > 1 ? "s" : ""} recorded
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setSelectionSteps([]);
                      setWordAssignments(new Map());
                    }}
                    title="Clear all steps"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectionSteps.map((step, i) => {
                    const slot = styleSlots.find(s => s.id === step.slotId);
                    const label = step.mode === "first" 
                      ? `First ${step.firstN ?? firstN}` 
                      : step.mode === "last" 
                      ? `Last ${step.lastN ?? lastN}` 
                      : step.mode === "random" 
                      ? `Random ${step.randomPercent ?? randomPercent}%` 
                      : step.mode === "numbers" 
                      ? "Numbers" 
                      : step.mode === "cycle" 
                      ? "Cycle" 
                      : step.mode === "line"
                      ? step.lineFrom === "specific" ? `Line ${step.lineN ?? 1}` 
                        : step.lineFrom === "last" ? `Last ${step.lineCount ?? 1} line(s)` 
                        : `First ${step.lineCount ?? 1} line(s)`
                      : step.mode;
                    return (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-[10px] gap-1 pr-1"
                      >
                        {slot && (
                          <span
                            className="inline-block w-2 h-2 rounded-full border border-background"
                            style={{ background: slot.colorType === "gradient" ? `linear-gradient(90deg, ${slot.gradientStartColor || slot.color}, ${slot.gradientEndColor || slot.color})` : slot.color }}
                          />
                        )}
                        {label}
                        <button
                          className="ml-0.5 hover:text-destructive"
                          onClick={() => {
                            const newSteps = selectionSteps.filter((_, j) => j !== i);
                            setSelectionSteps(newSteps);
                            // Replay remaining steps to rebuild assignments
                            const rebuilt = new Map<number, number>();
                            newSteps.forEach(s => {
                              if (s.mode === "first") {
                                const n = s.firstN ?? firstN;
                                for (let k = 0; k < Math.min(n, words.length); k++) {
                                  rebuilt.set(k, s.slotId);
                                }
                              } else if (s.mode === "last") {
                                const n = s.lastN ?? lastN;
                                for (let k = Math.max(0, words.length - n); k < words.length; k++) {
                                  rebuilt.set(k, s.slotId);
                                }
                              } else if (s.mode === "numbers") {
                                words.forEach((w, k) => { if (/\d/.test(w)) rebuilt.set(k, s.slotId); });
                              } else if (s.mode === "cycle") {
                                words.forEach((_, k) => { rebuilt.set(k, styleSlots[k % styleSlots.length].id); });
                              } else if (s.mode === "line") {
                                const sLineFrom = s.lineFrom ?? "first";
                                const sCount = s.lineCount ?? 1;
                                const sSlotIds = s.lineColorMode === "cycle" && s.slotIds?.length ? s.slotIds : [s.slotId];
                                let lines: number[] = [];
                                if (sLineFrom === "first") {
                                  for (let l = 0; l < Math.min(sCount, lineRanges.length); l++) lines.push(l);
                                } else if (sLineFrom === "last") {
                                  for (let l = Math.max(0, lineRanges.length - sCount); l < lineRanges.length; l++) lines.push(l);
                                } else if (sLineFrom === "specific") {
                                  const idx = (s.lineN ?? 1) - 1;
                                  if (idx >= 0 && idx < lineRanges.length) lines.push(idx);
                                }
                                for (const li of lines) {
                                  const [start, end] = lineRanges[li];
                                  let cursor = 0;
                                  for (let k = start; k <= end; k++) {
                                    rebuilt.set(k, sSlotIds[cursor % sSlotIds.length]);
                                    cursor++;
                                  }
                                }
                              }
                            });
                            setWordAssignments(rebuilt);
                          }}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Cycle All Colors Button */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={applyAllColorsCycle}
            >
              <Shuffle className="h-3 w-3 mr-1" />
              Apply All Colors (Cycle)
            </Button>
            <span className="text-xs text-muted-foreground">
              Cycles through all {styleSlots.length} color slots
            </span>
          </div>

          {/* Words */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Words</Label>
            <div className="p-4 bg-muted/50 rounded-lg border min-h-[80px]">
              <div className="flex flex-wrap gap-2">
                {words.map((word, index) => {
                  const assignedSlotId = wordAssignments.get(index);
                  const assignedSlot = assignedSlotId ? styleSlots.find(s => s.id === assignedSlotId) : null;
                  const isSelected = assignedSlotId === selectedSlotId;

                  return (
                    <button
                      key={index}
                      onClick={() => toggleWordAssignment(index)}
                      className={`px-3 py-1.5 rounded-md text-sm transition-all border-2 ${
                        assignedSlot 
                          ? `border-current shadow-sm ${isSelected ? "ring-2 ring-primary/50" : ""}`
                          : "border-transparent bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                      }`}
                      style={assignedSlot ? {
                        color: assignedSlot.color,
                        backgroundColor: assignedSlot.backgroundColor || "transparent",
                        fontWeight: assignedSlot.bold ? "bold" : "normal",
                        fontStyle: assignedSlot.italic ? "italic" : "normal",
                        borderColor: assignedSlot.color
                      } : undefined}
                    >
                      {word}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Preview</Label>
              <div className="flex items-center gap-1 p-0.5 bg-muted rounded-md">
                <Button
                  size="sm"
                  variant={previewBg === "dark" ? "secondary" : "ghost"}
                  onClick={() => setPreviewBg("dark")}
                  className="h-6 px-2 text-xs"
                >
                  Dark
                </Button>
                <Button
                  size="sm"
                  variant={previewBg === "light" ? "secondary" : "ghost"}
                  onClick={() => setPreviewBg("light")}
                  className="h-6 px-2 text-xs"
                >
                  Light
                </Button>
                <Button
                  size="sm"
                  variant={previewBg === "checker" ? "secondary" : "ghost"}
                  onClick={() => setPreviewBg("checker")}
                  className="h-6 px-2 text-xs"
                >
                  ▦
                </Button>
              </div>
            </div>

            <div className={`p-6 rounded-lg border min-h-[80px] flex items-center justify-center ${getPreviewBgStyle()}`}>
              <p 
                className="text-center max-w-full break-words text-lg"
                style={{ fontFamily: element.fontFamily }}
              >
                {words.map((word, index) => {
                  const assignedSlotId = wordAssignments.get(index);
                  const assignedSlot = assignedSlotId ? styleSlots.find(s => s.id === assignedSlotId) : null;
                  const defaultColor = previewBg === "dark" ? "#ffffff" : previewBg === "light" ? "#000000" : "#333333";

                  return (
                    <span key={index}>
                      <span style={{
                        color: assignedSlot?.color || defaultColor,
                        backgroundColor: assignedSlot?.backgroundColor || "transparent",
                        fontWeight: assignedSlot?.bold ? "bold" : "normal",
                        fontStyle: assignedSlot?.italic ? "italic" : "normal",
                        padding: assignedSlot?.backgroundColor ? `${bgPadding}px` : undefined,
                        borderRadius: assignedSlot?.backgroundColor ? `${bgRadius}px` : undefined,
                      }}>
                        {word}
                      </span>
                      {index < words.length - 1 && <span> </span>}
                    </span>
                  );
                })}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply}>
              Apply Styling
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
