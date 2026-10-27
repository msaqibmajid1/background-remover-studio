import React, { useState, useEffect, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Pipette, Clock, Copy } from "lucide-react";
import { toast } from "sonner";

// Extend Window interface for EyeDropper API
declare global {
  interface Window {
    EyeDropper?: new () => {
      open: () => Promise<{ sRGBHex: string }>;
    };
  }
}

interface ColorPickerPopoverProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
  showOpacity?: boolean;
  hideLabel?: boolean;
  size?: "default" | "sm";
}

const RECENT_COLORS_KEY = 'colorPickerRecentColors';
const MAX_RECENT_COLORS = 10;

const presetColors = [
  // Row 1 - Bright colors
  "#FF0000", "#FF8000", "#FFFF00", "#80FF00", "#00FF00", "#00FF80", "#00FFFF", "#0080FF",
  // Row 2 - Blues and purples
  "#0000FF", "#8000FF", "#FF00FF", "#FF0080", "#FFFFFF", "#C0C0C0", "#808080", "#000000",
  // Row 3 - Pastels
  "#FFB3B3", "#FFD9B3", "#FFFFB3", "#D9FFB3", "#B3FFB3", "#B3FFD9", "#B3FFFF", "#B3D9FF",
  // Row 4 - Dark colors
  "#B3B3FF", "#D9B3FF", "#FFB3FF", "#FFB3D9", "#800000", "#804000", "#808000", "#008000",
];

// Helper to get recent colors from localStorage
const getRecentColors = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_COLORS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Helper to save recent colors to localStorage
const saveRecentColor = (color: string) => {
  try {
    // Normalize color to uppercase hex if possible
    const normalizedColor = color.startsWith('#') ? color.toUpperCase() : color;
    const recent = getRecentColors();
    // Remove if already exists
    const filtered = recent.filter(c => c.toUpperCase() !== normalizedColor.toUpperCase());
    // Add to front
    const updated = [normalizedColor, ...filtered].slice(0, MAX_RECENT_COLORS);
    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
};

const hexToHsva = (hex: string): { h: number; s: number; v: number; a: number } => {
  let r = 0, g = 0, b = 0, a = 1;
  
  if (hex.startsWith('rgba')) {
    const match = hex.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
      r = parseInt(match[1]) / 255;
      g = parseInt(match[2]) / 255;
      b = parseInt(match[3]) / 255;
      a = match[4] ? parseFloat(match[4]) : 1;
    }
  } else if (hex.startsWith('#')) {
    const cleaned = hex.slice(1);
    if (cleaned.length === 6 || cleaned.length === 8) {
      r = parseInt(cleaned.slice(0, 2), 16) / 255;
      g = parseInt(cleaned.slice(2, 4), 16) / 255;
      b = parseInt(cleaned.slice(4, 6), 16) / 255;
      if (cleaned.length === 8) {
        a = parseInt(cleaned.slice(6, 8), 16) / 255;
      }
    }
  }

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, v: v * 100, a };
};

const hsvaToRgba = (h: number, s: number, v: number, a: number = 1): string => {
  s /= 100;
  v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const rVal = Math.round((r + m) * 255);
  const gVal = Math.round((g + m) * 255);
  const bVal = Math.round((b + m) * 255);

  if (a < 1) {
    return `rgba(${rVal},${gVal},${bVal},${a.toFixed(2)})`;
  }
  
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(rVal)}${toHex(gVal)}${toHex(bVal)}`.toUpperCase();
};

// Helper to get RGB values from HSVA
const hsvaToRgb = (h: number, s: number, v: number): { r: number; g: number; b: number } => {
  s /= 100;
  v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
};

// Helper to convert RGB to HSVA
const rgbToHsva = (r: number, g: number, b: number, a: number = 1): { h: number; s: number; v: number; a: number } => {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, v: v * 100, a };
};

// Helper to convert HSVA to HSL for display
const hsvaToHsl = (h: number, s: number, v: number): { h: number; s: number; l: number } => {
  s /= 100;
  v /= 100;
  const l = v * (1 - s / 2);
  const sl = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
  return { h: Math.round(h), s: Math.round(sl * 100), l: Math.round(l * 100) };
};

// Helper to convert HSL to HSVA
const hslToHsva = (h: number, s: number, l: number): { h: number; s: number; v: number } => {
  s /= 100;
  l /= 100;
  const v = l + s * Math.min(l, 1 - l);
  const sv = v === 0 ? 0 : 2 * (1 - l / v);
  return { h, s: sv * 100, v: v * 100 };
};

// Helper to convert RGB to CMYK
const rgbToCmyk = (r: number, g: number, b: number): { c: number; m: number; y: number; k: number } => {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  
  const k = 1 - Math.max(rNorm, gNorm, bNorm);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  
  const c = (1 - rNorm - k) / (1 - k);
  const m = (1 - gNorm - k) / (1 - k);
  const y = (1 - bNorm - k) / (1 - k);
  
  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100)
  };
};

// Helper to convert CMYK to RGB
const cmykToRgb = (c: number, m: number, y: number, k: number): { r: number; g: number; b: number } => {
  c /= 100;
  m /= 100;
  y /= 100;
  k /= 100;
  
  return {
    r: Math.round(255 * (1 - c) * (1 - k)),
    g: Math.round(255 * (1 - m) * (1 - k)),
    b: Math.round(255 * (1 - y) * (1 - k))
  };
};

// Generate color harmonies based on hue
const generateColorHarmonies = (h: number, s: number, v: number) => {
  const normalizeHue = (hue: number) => ((hue % 360) + 360) % 360;
  
  return {
    complementary: [
      { h: normalizeHue(h + 180), s, v, name: 'Complementary' }
    ],
    analogous: [
      { h: normalizeHue(h - 30), s, v, name: 'Analogous -30°' },
      { h: normalizeHue(h + 30), s, v, name: 'Analogous +30°' }
    ],
    triadic: [
      { h: normalizeHue(h + 120), s, v, name: 'Triadic +120°' },
      { h: normalizeHue(h + 240), s, v, name: 'Triadic +240°' }
    ],
    splitComplementary: [
      { h: normalizeHue(h + 150), s, v, name: 'Split -30°' },
      { h: normalizeHue(h + 210), s, v, name: 'Split +30°' }
    ],
    tetradic: [
      { h: normalizeHue(h + 90), s, v, name: 'Tetradic +90°' },
      { h: normalizeHue(h + 180), s, v, name: 'Tetradic +180°' },
      { h: normalizeHue(h + 270), s, v, name: 'Tetradic +270°' }
    ]
  };
};

export const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({ 
  color, 
  onChange, 
  label,
  showOpacity = true,
  hideLabel = false,
  size = "default"
}) => {
  const [hsva, setHsva] = useState(() => hexToHsva(color));
  const [hexInput, setHexInput] = useState(color.startsWith('#') ? color : '#000000');
  const [rgbInput, setRgbInput] = useState(() => hsvaToRgb(hexToHsva(color).h, hexToHsva(color).s, hexToHsva(color).v));
  const [hslInput, setHslInput] = useState(() => hsvaToHsl(hexToHsva(color).h, hexToHsva(color).s, hexToHsva(color).v));
  const [cmykInput, setCmykInput] = useState(() => {
    const rgb = hsvaToRgb(hexToHsva(color).h, hexToHsva(color).s, hexToHsva(color).v);
    return rgbToCmyk(rgb.r, rgb.g, rgb.b);
  });
  const [isOpen, setIsOpen] = useState(false);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [showHarmonies, setShowHarmonies] = useState(false);

  // Load recent colors on mount and when popover opens
  useEffect(() => {
    if (isOpen) {
      setRecentColors(getRecentColors());
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const parsed = hexToHsva(color);
      setHsva(parsed);
      setHexInput(color.startsWith('#') ? color : (color.startsWith('rgba') ? '#000000' : '#000000'));
      const rgb = hsvaToRgb(parsed.h, parsed.s, parsed.v);
      setRgbInput(rgb);
      setHslInput(hsvaToHsl(parsed.h, parsed.s, parsed.v));
      setCmykInput(rgbToCmyk(rgb.r, rgb.g, rgb.b));
    }
  }, [color, isOpen]);

  const updateColor = (newHsva: typeof hsva, saveToRecent = false) => {
    setHsva(newHsva);
    const newColor = hsvaToRgba(newHsva.h, newHsva.s, newHsva.v, newHsva.a);
    onChange(newColor);
    if (newColor.startsWith('#')) setHexInput(newColor);
    const rgb = hsvaToRgb(newHsva.h, newHsva.s, newHsva.v);
    setRgbInput(rgb);
    setHslInput(hsvaToHsl(newHsva.h, newHsva.s, newHsva.v));
    setCmykInput(rgbToCmyk(rgb.r, rgb.g, rgb.b));
    
    if (saveToRecent && newColor.startsWith('#')) {
      saveRecentColor(newColor);
      setRecentColors(getRecentColors());
    }
  };

  const handleCopyColor = useCallback(async () => {
    const colorValue = hexInput.startsWith('#') ? hexInput : displayColor;
    try {
      await navigator.clipboard.writeText(colorValue);
      toast.success(`Copied: ${colorValue}`);
    } catch {
      toast.error("Failed to copy color");
    }
  }, [hexInput]);

  // Eyedropper / Color Picker functionality
  const handleEyeDropper = useCallback(async () => {
    if (!window.EyeDropper) {
      toast.error("EyeDropper API not supported in this browser");
      return;
    }

    try {
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      const pickedColor = result.sRGBHex.toUpperCase();
      
      const parsed = hexToHsva(pickedColor);
      parsed.a = hsva.a; // Keep current opacity
      setHsva(parsed);
      setHexInput(pickedColor);
      const rgb = hsvaToRgb(parsed.h, parsed.s, parsed.v);
      setRgbInput(rgb);
      setHslInput(hsvaToHsl(parsed.h, parsed.s, parsed.v));
      setCmykInput(rgbToCmyk(rgb.r, rgb.g, rgb.b));
      onChange(hsvaToRgba(parsed.h, parsed.s, parsed.v, parsed.a));
      saveRecentColor(pickedColor);
      setRecentColors(getRecentColors());
      toast.success(`Color picked: ${pickedColor}`);
    } catch (e) {
      // User cancelled the eyedropper
      console.log("EyeDropper cancelled");
    }
  }, [hsva.a, onChange]);

  const handleColorAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    
    updateColor({ ...hsva, s: x * 100, v: (1 - y) * 100 }, true);
  };

  const handleHueChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    
    updateColor({ ...hsva, h: y * 360 }, true);
  };

  const handleOpacityChange = (value: number[]) => {
    updateColor({ ...hsva, a: value[0] / 100 });
  };

  const handlePresetClick = (presetColor: string) => {
    const parsed = hexToHsva(presetColor);
    parsed.a = hsva.a; // Keep current opacity
    setHsva(parsed);
    setHexInput(presetColor);
    const rgb = hsvaToRgb(parsed.h, parsed.s, parsed.v);
    setRgbInput(rgb);
    setHslInput(hsvaToHsl(parsed.h, parsed.s, parsed.v));
    setCmykInput(rgbToCmyk(rgb.r, rgb.g, rgb.b));
    onChange(hsvaToRgba(parsed.h, parsed.s, parsed.v, parsed.a));
    saveRecentColor(presetColor);
    setRecentColors(getRecentColors());
  };

  const handleRecentClick = (recentColor: string) => {
    const parsed = hexToHsva(recentColor);
    parsed.a = hsva.a; // Keep current opacity
    setHsva(parsed);
    setHexInput(recentColor.startsWith('#') ? recentColor : '#000000');
    const rgb = hsvaToRgb(parsed.h, parsed.s, parsed.v);
    setRgbInput(rgb);
    setHslInput(hsvaToHsl(parsed.h, parsed.s, parsed.v));
    setCmykInput(rgbToCmyk(rgb.r, rgb.g, rgb.b));
    onChange(hsvaToRgba(parsed.h, parsed.s, parsed.v, parsed.a));
  };

  const handleHexInputChange = (value: string) => {
    setHexInput(value);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      const parsed = hexToHsva(value);
      parsed.a = hsva.a; // Keep current opacity
      setHsva(parsed);
      const rgb = hsvaToRgb(parsed.h, parsed.s, parsed.v);
      setRgbInput(rgb);
      setHslInput(hsvaToHsl(parsed.h, parsed.s, parsed.v));
      setCmykInput(rgbToCmyk(rgb.r, rgb.g, rgb.b));
      onChange(hsvaToRgba(parsed.h, parsed.s, parsed.v, parsed.a));
      saveRecentColor(value.toUpperCase());
      setRecentColors(getRecentColors());
    }
  };

  const handleRgbInputChange = (channel: 'r' | 'g' | 'b', value: string) => {
    const numValue = Math.max(0, Math.min(255, parseInt(value) || 0));
    const newRgb = { ...rgbInput, [channel]: numValue };
    setRgbInput(newRgb);
    
    const newHsva = rgbToHsva(newRgb.r, newRgb.g, newRgb.b, hsva.a);
    setHsva(newHsva);
    setHslInput(hsvaToHsl(newHsva.h, newHsva.s, newHsva.v));
    setCmykInput(rgbToCmyk(newRgb.r, newRgb.g, newRgb.b));
    const newColor = hsvaToRgba(newHsva.h, newHsva.s, newHsva.v, newHsva.a);
    if (newColor.startsWith('#')) setHexInput(newColor);
    onChange(newColor);
  };

  const handleHslInputChange = (channel: 'h' | 's' | 'l', value: string) => {
    const maxVal = channel === 'h' ? 360 : 100;
    const numValue = Math.max(0, Math.min(maxVal, parseInt(value) || 0));
    const newHsl = { ...hslInput, [channel]: numValue };
    setHslInput(newHsl);
    
    const newHsv = hslToHsva(newHsl.h, newHsl.s, newHsl.l);
    const newHsva = { ...newHsv, a: hsva.a };
    setHsva(newHsva);
    const rgb = hsvaToRgb(newHsva.h, newHsva.s, newHsva.v);
    setRgbInput(rgb);
    setCmykInput(rgbToCmyk(rgb.r, rgb.g, rgb.b));
    const newColor = hsvaToRgba(newHsva.h, newHsva.s, newHsva.v, newHsva.a);
    if (newColor.startsWith('#')) setHexInput(newColor);
    onChange(newColor);
  };

  const handleCmykInputChange = (channel: 'c' | 'm' | 'y' | 'k', value: string) => {
    const numValue = Math.max(0, Math.min(100, parseInt(value) || 0));
    const newCmyk = { ...cmykInput, [channel]: numValue };
    setCmykInput(newCmyk);
    
    const rgb = cmykToRgb(newCmyk.c, newCmyk.m, newCmyk.y, newCmyk.k);
    setRgbInput(rgb);
    const newHsva = rgbToHsva(rgb.r, rgb.g, rgb.b, hsva.a);
    setHsva(newHsva);
    setHslInput(hsvaToHsl(newHsva.h, newHsva.s, newHsva.v));
    const newColor = hsvaToRgba(newHsva.h, newHsva.s, newHsva.v, newHsva.a);
    if (newColor.startsWith('#')) setHexInput(newColor);
    onChange(newColor);
  };

  const handleHarmonyClick = (harmonyColor: { h: number; s: number; v: number }) => {
    const newHsva = { ...harmonyColor, a: hsva.a };
    updateColor(newHsva, true);
  };

  const harmonies = generateColorHarmonies(hsva.h, hsva.s, hsva.v);

  const handleColorInputBlur = () => {
    const newColor = hsvaToRgba(hsva.h, hsva.s, hsva.v, hsva.a);
    if (newColor.startsWith('#')) {
      saveRecentColor(newColor);
      setRecentColors(getRecentColors());
    }
  };

  const currentHueColor = hsvaToRgba(hsva.h, 100, 100, 1);
  const displayColor = hsvaToRgba(hsva.h, hsva.s, hsva.v, hsva.a);

  return (
    <div className="space-y-1">
      {label && <Label className="text-xs">{label}</Label>}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className={size === "sm" ? "h-8 w-8 p-0" : "w-full h-9 justify-start gap-2 px-3"}
          >
            <div 
              className={`rounded border border-border relative overflow-hidden ${size === "sm" ? "w-6 h-6" : "w-5 h-5"}`}
              style={{ backgroundColor: displayColor }}
            >
              {/* Checkerboard for transparency */}
              <div 
                className="absolute inset-0 -z-10"
                style={{
                  backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                  backgroundSize: '6px 6px',
                  backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px'
                }}
              />
            </div>
            {!hideLabel && <span className="text-xs font-mono truncate">{color}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          {/* Recent Colors Section */}
          {recentColors.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-1 mb-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <Label className="text-xs font-medium text-muted-foreground">Recent</Label>
              </div>
              <div className="flex flex-wrap gap-1">
                {recentColors.map((recentColor, index) => (
                  <button
                    key={index}
                    className="w-5 h-5 rounded-sm border border-border hover:scale-110 transition-transform cursor-pointer relative overflow-hidden"
                    onClick={() => handleRecentClick(recentColor)}
                    title={recentColor}
                  >
                    <div 
                      className="absolute inset-0 -z-10"
                      style={{
                        backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                        backgroundSize: '4px 4px',
                        backgroundPosition: '0 0, 0 2px, 2px -2px, -2px 0px'
                      }}
                    />
                    <div className="absolute inset-0" style={{ backgroundColor: recentColor }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Presets Header */}
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs font-medium">Presets</Label>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 gap-1"
                onClick={handleCopyColor}
                title="Copy color value"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 gap-1"
                onClick={handleEyeDropper}
                title={window.EyeDropper ? "Pick color from screen" : "EyeDropper not supported"}
              >
                <Pipette className="h-3 w-3" />
                <span className="text-xs">Pick</span>
              </Button>
            </div>
          </div>

          {/* Preset Colors Grid */}
          <div className="grid grid-cols-8 gap-1 mb-3">
            {presetColors.map((presetColor, index) => (
              <button
                key={index}
                className="w-5 h-5 rounded-sm border border-border hover:scale-110 transition-transform cursor-pointer"
                style={{ backgroundColor: presetColor }}
                onClick={() => handlePresetClick(presetColor)}
              />
            ))}
          </div>

          {/* Color Picker Label */}
          <Label className="text-xs font-medium mb-2 block">Color Picker</Label>

          {/* Color Area with Hue Slider */}
          <div className="flex gap-2 mb-3">
          {/* Saturation/Value Area */}
            <div
              className="flex-1 h-32 rounded cursor-crosshair relative"
              style={{
                background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${currentHueColor})`
              }}
              onClick={handleColorAreaClick}
              onMouseDown={(e) => {
                e.preventDefault();
                const target = e.currentTarget;
                const rect = target.getBoundingClientRect();
                const handleMove = (moveEvent: MouseEvent) => {
                  const x = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
                  const y = Math.max(0, Math.min(1, (moveEvent.clientY - rect.top) / rect.height));
                  updateColor({ ...hsva, s: x * 100, v: (1 - y) * 100 });
                };
                const handleUp = () => {
                  // Save to recent on mouse up
                  const finalColor = hsvaToRgba(hsva.h, hsva.s, hsva.v, hsva.a);
                  if (finalColor.startsWith('#')) {
                    saveRecentColor(finalColor);
                    setRecentColors(getRecentColors());
                  }
                  document.removeEventListener('mousemove', handleMove);
                  document.removeEventListener('mouseup', handleUp);
                };
                document.addEventListener('mousemove', handleMove);
                document.addEventListener('mouseup', handleUp);
              }}
            >
              {/* Picker indicator */}
              <div
                className="absolute w-3 h-3 border-2 border-white rounded-full shadow-md pointer-events-none"
                style={{
                  left: `${hsva.s}%`,
                  top: `${100 - hsva.v}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              />
            </div>

            {/* Hue Slider */}
            <div
              className="w-4 h-32 rounded cursor-pointer relative"
              style={{
                background: 'linear-gradient(to bottom, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
              }}
              onClick={handleHueChange}
              onMouseDown={(e) => {
                e.preventDefault();
                const target = e.currentTarget;
                const rect = target.getBoundingClientRect();
                const handleMove = (moveEvent: MouseEvent) => {
                  const y = Math.max(0, Math.min(1, (moveEvent.clientY - rect.top) / rect.height));
                  updateColor({ ...hsva, h: y * 360 });
                };
                const handleUp = () => {
                  const finalColor = hsvaToRgba(hsva.h, hsva.s, hsva.v, hsva.a);
                  if (finalColor.startsWith('#')) {
                    saveRecentColor(finalColor);
                    setRecentColors(getRecentColors());
                  }
                  document.removeEventListener('mousemove', handleMove);
                  document.removeEventListener('mouseup', handleUp);
                };
                document.addEventListener('mousemove', handleMove);
                document.addEventListener('mouseup', handleUp);
              }}
            >
              {/* Hue indicator */}
              <div
                className="absolute w-full h-2 border-2 border-white rounded-sm shadow-md pointer-events-none"
                style={{
                  top: `${(hsva.h / 360) * 100}%`,
                  transform: 'translateY(-50%)'
                }}
              />
            </div>
          </div>

          {/* Opacity Slider */}
          {showOpacity && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Opacity</Label>
                <span className="text-xs text-muted-foreground">{Math.round(hsva.a * 100)}%</span>
              </div>
              <div 
                className="h-4 rounded relative"
                style={{
                  backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                  backgroundSize: '8px 8px',
                  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
                }}
              >
                <div 
                  className="absolute inset-0 rounded"
                  style={{
                    background: `linear-gradient(to right, transparent, ${hsvaToRgba(hsva.h, hsva.s, hsva.v, 1)})`
                  }}
                />
              </div>
              <Slider
                value={[hsva.a * 100]}
                onValueChange={handleOpacityChange}
                min={0}
                max={100}
                step={1}
                className="mt-1"
              />
            </div>
          )}

          {/* Color Input Fields */}
          <div className="space-y-2">
            {/* Hex Input */}
            <div className="flex items-center gap-2">
              <Label className="text-xs w-8">Hex</Label>
              <Input
                type="text"
                value={hexInput}
                onChange={(e) => handleHexInputChange(e.target.value)}
                className="h-7 text-xs font-mono flex-1"
                placeholder="#000000"
              />
            </div>
            
            {/* RGB Inputs */}
            <div className="flex items-center gap-2">
              <Label className="text-xs w-8">RGB</Label>
              <div className="flex gap-1 flex-1">
              <div className="flex-1">
                  <Input
                    type="number"
                    value={rgbInput.r}
                    onChange={(e) => handleRgbInputChange('r', e.target.value)}
                    onBlur={handleColorInputBlur}
                    className="h-7 text-xs font-mono text-center"
                    min={0}
                    max={255}
                    placeholder="R"
                    title="Red (0-255)"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="number"
                    value={rgbInput.g}
                    onChange={(e) => handleRgbInputChange('g', e.target.value)}
                    onBlur={handleColorInputBlur}
                    className="h-7 text-xs font-mono text-center"
                    min={0}
                    max={255}
                    placeholder="G"
                    title="Green (0-255)"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="number"
                    value={rgbInput.b}
                    onChange={(e) => handleRgbInputChange('b', e.target.value)}
                    onBlur={handleColorInputBlur}
                    className="h-7 text-xs font-mono text-center"
                    min={0}
                    max={255}
                    placeholder="B"
                    title="Blue (0-255)"
                  />
                </div>
              </div>
            </div>
            
            {/* HSL Inputs */}
            <div className="flex items-center gap-2">
              <Label className="text-xs w-8">HSL</Label>
              <div className="flex gap-1 flex-1">
                <div className="flex-1">
                  <Input
                    type="number"
                    value={hslInput.h}
                    onChange={(e) => handleHslInputChange('h', e.target.value)}
                    onBlur={handleColorInputBlur}
                    className="h-7 text-xs font-mono text-center"
                    min={0}
                    max={360}
                    placeholder="H"
                    title="Hue (0-360)"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="number"
                    value={hslInput.s}
                    onChange={(e) => handleHslInputChange('s', e.target.value)}
                    onBlur={handleColorInputBlur}
                    className="h-7 text-xs font-mono text-center"
                    min={0}
                    max={100}
                    placeholder="S"
                    title="Saturation (0-100)"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="number"
                    value={hslInput.l}
                    onChange={(e) => handleHslInputChange('l', e.target.value)}
                    onBlur={handleColorInputBlur}
                    className="h-7 text-xs font-mono text-center"
                    min={0}
                    max={100}
                    placeholder="L"
                    title="Lightness (0-100)"
                  />
                </div>
              </div>
            </div>
            
            {/* CMYK Inputs */}
            <div className="flex items-center gap-2">
              <Label className="text-xs w-8">CMYK</Label>
              <div className="flex gap-1 flex-1">
                <div className="flex-1">
                  <Input
                    type="number"
                    value={cmykInput.c}
                    onChange={(e) => handleCmykInputChange('c', e.target.value)}
                    onBlur={handleColorInputBlur}
                    className="h-7 text-xs font-mono text-center"
                    min={0}
                    max={100}
                    placeholder="C"
                    title="Cyan (0-100)"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="number"
                    value={cmykInput.m}
                    onChange={(e) => handleCmykInputChange('m', e.target.value)}
                    onBlur={handleColorInputBlur}
                    className="h-7 text-xs font-mono text-center"
                    min={0}
                    max={100}
                    placeholder="M"
                    title="Magenta (0-100)"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="number"
                    value={cmykInput.y}
                    onChange={(e) => handleCmykInputChange('y', e.target.value)}
                    onBlur={handleColorInputBlur}
                    className="h-7 text-xs font-mono text-center"
                    min={0}
                    max={100}
                    placeholder="Y"
                    title="Yellow (0-100)"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="number"
                    value={cmykInput.k}
                    onChange={(e) => handleCmykInputChange('k', e.target.value)}
                    onBlur={handleColorInputBlur}
                    className="h-7 text-xs font-mono text-center"
                    min={0}
                    max={100}
                    placeholder="K"
                    title="Key/Black (0-100)"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Color Harmonies Section */}
          <div className="mt-3 pt-3 border-t border-border">
            <button
              className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowHarmonies(!showHarmonies)}
            >
              <span>Color Harmonies</span>
              <span className="text-[10px]">{showHarmonies ? '▲' : '▼'}</span>
            </button>
            
            {showHarmonies && (
              <div className="mt-2 space-y-2">
                {/* Complementary */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Complementary</Label>
                  <div className="flex gap-1">
                    {harmonies.complementary.map((c, i) => (
                      <button
                        key={i}
                        className="w-6 h-6 rounded-sm border border-border hover:scale-110 transition-transform"
                        style={{ backgroundColor: hsvaToRgba(c.h, c.s, c.v, 1) }}
                        onClick={() => handleHarmonyClick(c)}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Analogous */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Analogous</Label>
                  <div className="flex gap-1">
                    {harmonies.analogous.map((c, i) => (
                      <button
                        key={i}
                        className="w-6 h-6 rounded-sm border border-border hover:scale-110 transition-transform"
                        style={{ backgroundColor: hsvaToRgba(c.h, c.s, c.v, 1) }}
                        onClick={() => handleHarmonyClick(c)}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Triadic */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Triadic</Label>
                  <div className="flex gap-1">
                    {harmonies.triadic.map((c, i) => (
                      <button
                        key={i}
                        className="w-6 h-6 rounded-sm border border-border hover:scale-110 transition-transform"
                        style={{ backgroundColor: hsvaToRgba(c.h, c.s, c.v, 1) }}
                        onClick={() => handleHarmonyClick(c)}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Split Complementary */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Split Complementary</Label>
                  <div className="flex gap-1">
                    {harmonies.splitComplementary.map((c, i) => (
                      <button
                        key={i}
                        className="w-6 h-6 rounded-sm border border-border hover:scale-110 transition-transform"
                        style={{ backgroundColor: hsvaToRgba(c.h, c.s, c.v, 1) }}
                        onClick={() => handleHarmonyClick(c)}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Tetradic */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Tetradic</Label>
                  <div className="flex gap-1">
                    {harmonies.tetradic.map((c, i) => (
                      <button
                        key={i}
                        className="w-6 h-6 rounded-sm border border-border hover:scale-110 transition-transform"
                        style={{ backgroundColor: hsvaToRgba(c.h, c.s, c.v, 1) }}
                        onClick={() => handleHarmonyClick(c)}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
