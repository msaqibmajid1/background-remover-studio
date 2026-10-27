import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Save, Pencil, Download, Upload } from "lucide-react";
import { BlankCanvasPreset } from "@/types/editor";
import { toast } from "sonner";
import {
  DEFAULT_BLANK_CANVAS_PRESET,
  SOLID_PRESETS,
  GRADIENT_PRESETS,
  loadSavedPresets,
  savePreset,
  deletePreset,
  renamePreset,
  exportPresetsJSON,
  importPresetsJSON,
  presetSwatchCSS,
  renderBlankCanvasToDataURL,
  BlankPresetSummary,
} from "@/lib/blankCanvasUtils";

const ASPECT_PRESETS = [
  { label: "1:1 (800×800)", w: 800, h: 800 },
  { label: "4:5 (800×1000)", w: 800, h: 1000 },
  { label: "9:16 (800×1422)", w: 800, h: 1422 },
  { label: "16:9 (1422×800)", w: 1422, h: 800 },
  { label: "3:4 (800×1066)", w: 800, h: 1066 },
  { label: "4:3 (1066×800)", w: 1066, h: 800 },
  { label: "2:3 (800×1200)", w: 800, h: 1200 },
  { label: "3:2 (1200×800)", w: 1200, h: 800 },
];

interface BlankCanvasDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode?: "insert" | "edit";
  initialPreset?: BlankCanvasPreset;
  initialWidth?: number;
  initialHeight?: number;
  onInsert: (params: {
    preset: BlankCanvasPreset;
    width: number;
    height: number;
    slideCount: number;
    applyToAll: boolean;
  }) => void;
}

export const BlankCanvasDialog = ({
  open,
  onOpenChange,
  mode = "insert",
  initialPreset,
  initialWidth,
  initialHeight,
  onInsert,
}: BlankCanvasDialogProps) => {
  const [preset, setPreset] = useState<BlankCanvasPreset>(initialPreset ?? DEFAULT_BLANK_CANVAS_PRESET);
  const [width, setWidth] = useState(initialWidth ?? 800);
  const [height, setHeight] = useState(initialHeight ?? 800);
  const [slideCount, setSlideCount] = useState(mode === "edit" ? 0 : 1);
  const [applyToAll, setApplyToAll] = useState(false);
  const [savedPresets, setSavedPresets] = useState<BlankPresetSummary[]>([]);
  const [presetName, setPresetName] = useState("");
  const [customRatioW, setCustomRatioW] = useState(1);
  const [customRatioH, setCustomRatioH] = useState(1);
  const [customBase, setCustomBase] = useState(800);
  const [livePreview, setLivePreview] = useState<string>("");
  const watermarkInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSavedPresets(loadSavedPresets());
      if (initialPreset) setPreset(initialPreset);
      if (initialWidth) setWidth(initialWidth);
      if (initialHeight) setHeight(initialHeight);
      setSlideCount(mode === "edit" ? 0 : 1);
      setApplyToAll(false);
    }
  }, [open, initialPreset, initialWidth, initialHeight, mode]);

  const update = (patch: Partial<BlankCanvasPreset>) => setPreset((p) => ({ ...p, ...patch }));
  const updateBorder = (patch: Partial<BlankCanvasPreset["border"]>) =>
    setPreset((p) => ({ ...p, border: { ...p.border, ...patch } }));

  const setBorderStyle = (style: BlankCanvasPreset["border"]["style"]) => {
    const linesNeeded = style === "triple" ? 3 : style === "double" ? 2 : 1;
    const current = preset.border.lines;
    const next = Array.from({ length: linesNeeded }, (_, i) =>
      current[i] ?? { color: i === 1 ? "#888888" : i === 2 ? "#cccccc" : "#111111", width: 4 },
    );
    updateBorder({ style, lines: next });
  };

  const updateLine = (idx: number, patch: Partial<{ color: string; width: number }>) => {
    const lines = preset.border.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l));
    updateBorder({ lines });
  };

  const handleSavePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    savePreset(name, preset);
    setSavedPresets(loadSavedPresets());
    setPresetName("");
  };

  const handleRenamePreset = (oldName: string) => {
    const next = window.prompt("Rename palette", oldName);
    if (!next || !next.trim() || next.trim() === oldName) return;
    renamePreset(oldName, next.trim());
    setSavedPresets(loadSavedPresets());
  };

  const handleExportPresets = () => {
    const json = exportPresetsJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "blank-canvas-palettes.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportPresets = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const n = importPresetsJSON(String(reader.result));
        setSavedPresets(loadSavedPresets());
        toast.success(`Imported ${n} palette${n === 1 ? "" : "s"}`);
      } catch {
        toast.error("Invalid palette JSON");
      }
    };
    reader.readAsText(file);
  };

  const applyCustomRatio = () => {
    const rw = Math.max(1, customRatioW);
    const rh = Math.max(1, customRatioH);
    const base = Math.max(100, customBase);
    if (rw >= rh) {
      setWidth(Math.round(base * (rw / rh)));
      setHeight(base);
    } else {
      setWidth(base);
      setHeight(Math.round(base * (rh / rw)));
    }
  };

  const handleInsert = () => {
    onInsert({ preset, width, height, slideCount: Math.max(1, slideCount), applyToAll });
    onOpenChange(false);
  };

  // Live preview render — debounced
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        // Use a capped preview size to keep it snappy
        const maxDim = 400;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        const dataUrl = await renderBlankCanvasToDataURL(
          preset,
          Math.max(50, Math.round(width * scale)),
          Math.max(50, Math.round(height * scale)),
        );
        if (!cancelled) setLivePreview(dataUrl);
      } catch (e) {
        if (!cancelled) setLivePreview("");
      }
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [preset, width, height, open]);

  const renderPreviewStyle = () => {
    let background = preset.color;
    if (preset.fillType === "linear") {
      const dirMap = {
        horizontal: "to right",
        vertical: "to bottom",
        "diagonal-down": "135deg",
        "diagonal-up": "45deg",
      } as const;
      background = `linear-gradient(${dirMap[preset.gradientDirection]}, ${preset.gradientStart}, ${preset.gradientEnd})`;
    } else if (preset.fillType === "radial") {
      background = `radial-gradient(circle, ${preset.gradientStart}, ${preset.gradientEnd})`;
    }
    return { background, borderRadius: preset.border.radius };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Canvas Background" : "Insert Blank Canvas"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          <div className="space-y-4">
            {/* Quick presets — solids */}
            <section>
              <Label className="text-xs uppercase text-muted-foreground">Solid Colors</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {SOLID_PRESETS.map((qp) => (
                  <button
                    key={qp.name}
                    type="button"
                    onClick={() => setPreset({ ...qp.preset })}
                    className="flex items-center gap-2 border rounded-md px-2 py-1 text-xs hover:bg-accent"
                    title={qp.name}
                  >
                    <span
                      className="inline-block w-4 h-4 rounded-full border"
                      style={{ background: presetSwatchCSS(qp.preset) }}
                    />
                    {qp.name}
                  </button>
                ))}
              </div>
            </section>
            <section>
              <Label className="text-xs uppercase text-muted-foreground">Gradients</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {GRADIENT_PRESETS.map((qp) => (
                  <button
                    key={qp.name}
                    type="button"
                    onClick={() => setPreset({ ...qp.preset })}
                    className="flex items-center gap-2 border rounded-md px-2 py-1 text-xs hover:bg-accent"
                    title={qp.name}
                  >
                    <span
                      className="inline-block w-4 h-4 rounded-full border"
                      style={{ background: presetSwatchCSS(qp.preset) }}
                    />
                    {qp.name}
                  </button>
                ))}
              </div>
            </section>
            <section>
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase text-muted-foreground">Saved Palettes</Label>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={handleExportPresets} title="Export palettes">
                    <Download className="h-3 w-3 mr-1" /> Export
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => importInputRef.current?.click()}
                    title="Import palettes"
                  >
                    <Upload className="h-3 w-3 mr-1" /> Import
                  </Button>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImportPresets(f);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
              {savedPresets.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {savedPresets.map((sp) => (
                    <div key={sp.name} className="flex items-center gap-1 border rounded-md pr-1">
                      <button
                        type="button"
                        onClick={() => setPreset({ ...sp.preset })}
                        className="flex items-center gap-2 px-2 py-1 text-xs"
                      >
                        <span
                          className="inline-block w-4 h-4 rounded-full border"
                          style={{ background: presetSwatchCSS(sp.preset) }}
                        />
                        {sp.name}
                      </button>
                      <button
                        onClick={() => handleRenamePreset(sp.name)}
                        className="p-1 hover:text-primary"
                        title="Rename"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => {
                          deletePreset(sp.name);
                          setSavedPresets(loadSavedPresets());
                        }}
                        className="p-1 hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">
                  No saved palettes yet. Save the current style below to reuse it.
                </p>
              )}
            </section>

            <Tabs defaultValue="size">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="size">Size</TabsTrigger>
                <TabsTrigger value="fill">Fill</TabsTrigger>
                <TabsTrigger value="border">Border</TabsTrigger>
                <TabsTrigger value="watermark">Watermark</TabsTrigger>
                <TabsTrigger value="effects">Effects</TabsTrigger>
              </TabsList>

              <TabsContent value="size" className="space-y-3 pt-3">
                <div>
                  <Label>Aspect ratio preset</Label>
                  <Select
                    onValueChange={(v) => {
                      const p = ASPECT_PRESETS.find((a) => a.label === v);
                      if (p) {
                        setWidth(p.w);
                        setHeight(p.h);
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose preset" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASPECT_PRESETS.map((a) => (
                        <SelectItem key={a.label} value={a.label}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Width</Label>
                    <Input
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Height</Label>
                    <Input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="border-t pt-3 space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground">Custom aspect ratio</Label>
                  <div className="grid grid-cols-[1fr_auto_1fr_1fr_auto] gap-2 items-end">
                    <div>
                      <Label className="text-xs">W</Label>
                      <Input
                        type="number"
                        min={1}
                        value={customRatioW}
                        onChange={(e) => setCustomRatioW(parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <span className="pb-2 text-muted-foreground">:</span>
                    <div>
                      <Label className="text-xs">H</Label>
                      <Input
                        type="number"
                        min={1}
                        value={customRatioH}
                        onChange={(e) => setCustomRatioH(parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Base px</Label>
                      <Input
                        type="number"
                        min={100}
                        value={customBase}
                        onChange={(e) => setCustomBase(parseInt(e.target.value) || 100)}
                      />
                    </div>
                    <Button size="sm" variant="outline" onClick={applyCustomRatio}>
                      Apply
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="fill" className="space-y-3 pt-3">
                <div>
                  <Label>Fill type</Label>
                  <Select value={preset.fillType} onValueChange={(v: any) => update({ fillType: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Solid color</SelectItem>
                      <SelectItem value="linear">Linear gradient</SelectItem>
                      <SelectItem value="radial">Radial gradient</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {preset.fillType === "solid" ? (
                  <div>
                    <Label>Color</Label>
                    <Input type="color" value={preset.color} onChange={(e) => update({ color: e.target.value })} className="h-10" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Start</Label>
                        <Input type="color" value={preset.gradientStart} onChange={(e) => update({ gradientStart: e.target.value })} className="h-10" />
                      </div>
                      <div>
                        <Label>End</Label>
                        <Input type="color" value={preset.gradientEnd} onChange={(e) => update({ gradientEnd: e.target.value })} className="h-10" />
                      </div>
                    </div>
                    {preset.fillType === "linear" && (
                      <div>
                        <Label>Direction</Label>
                        <Select value={preset.gradientDirection} onValueChange={(v: any) => update({ gradientDirection: v })}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="horizontal">Horizontal</SelectItem>
                            <SelectItem value="vertical">Vertical</SelectItem>
                            <SelectItem value="diagonal-down">Diagonal ↘</SelectItem>
                            <SelectItem value="diagonal-up">Diagonal ↗</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="border" className="space-y-3 pt-3">
                <div className="flex items-center justify-between">
                  <Label>Enable border</Label>
                  <Switch checked={preset.border.enabled} onCheckedChange={(c) => updateBorder({ enabled: c })} />
                </div>
                {preset.border.enabled && (
                  <>
                    <div>
                      <Label>Style</Label>
                      <Select value={preset.border.style} onValueChange={(v: any) => setBorderStyle(v)}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solid">Solid</SelectItem>
                          <SelectItem value="dashed">Dashed</SelectItem>
                          <SelectItem value="dotted">Dotted</SelectItem>
                          <SelectItem value="double">Double (2 lines)</SelectItem>
                          <SelectItem value="triple">Triple (3 lines)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      {preset.border.lines.map((line, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_1fr] gap-2 items-end border p-2 rounded">
                          <div>
                            <Label className="text-xs">Line {idx + 1} color</Label>
                            <Input type="color" value={line.color} onChange={(e) => updateLine(idx, { color: e.target.value })} className="h-9" />
                          </div>
                          <div>
                            <Label className="text-xs">Width: {line.width}px</Label>
                            <Slider value={[line.width]} min={1} max={30} onValueChange={([v]) => updateLine(idx, { width: v })} />
                          </div>
                        </div>
                      ))}
                    </div>
                    {(preset.border.style === "double" || preset.border.style === "triple") && (
                      <div>
                        <Label>Gap between lines: {preset.border.gap}px</Label>
                        <Slider value={[preset.border.gap]} min={0} max={30} onValueChange={([v]) => updateBorder({ gap: v })} />
                      </div>
                    )}
                    <div>
                      <Label>Corner radius: {preset.border.radius}px</Label>
                      <Slider value={[preset.border.radius]} min={0} max={120} onValueChange={([v]) => updateBorder({ radius: v })} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Border shadow</Label>
                      <Switch checked={preset.border.shadow} onCheckedChange={(c) => updateBorder({ shadow: c })} />
                    </div>
                    {preset.border.shadow && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Color</Label>
                          <Input type="color" value={preset.border.shadowColor} onChange={(e) => updateBorder({ shadowColor: e.target.value })} className="h-9" />
                        </div>
                        <div>
                          <Label className="text-xs">Blur: {preset.border.shadowBlur}</Label>
                          <Slider value={[preset.border.shadowBlur]} min={0} max={60} onValueChange={([v]) => updateBorder({ shadowBlur: v })} />
                        </div>
                        <div>
                          <Label className="text-xs">Offset X: {preset.border.shadowOffsetX}</Label>
                          <Slider value={[preset.border.shadowOffsetX]} min={-30} max={30} onValueChange={([v]) => updateBorder({ shadowOffsetX: v })} />
                        </div>
                        <div>
                          <Label className="text-xs">Offset Y: {preset.border.shadowOffsetY}</Label>
                          <Slider value={[preset.border.shadowOffsetY]} min={-30} max={30} onValueChange={([v]) => updateBorder({ shadowOffsetY: v })} />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="watermark" className="space-y-3 pt-3">
                <p className="text-xs text-muted-foreground">
                  Upload a watermark image to be added on each inserted slide as a watermark element.
                </p>
                <input
                  ref={watermarkInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      update({
                        backgroundImage: {
                          src: String(reader.result),
                          opacity: preset.backgroundImage?.opacity ?? 100,
                          fit: preset.backgroundImage?.fit ?? "cover",
                          blendMode: preset.backgroundImage?.blendMode ?? "source-over",
                          preserveFill: preset.backgroundImage?.preserveFill ?? true,
                        },
                      });
                    };
                    reader.readAsDataURL(f);
                  }}
                />
                <Button variant="outline" size="sm" onClick={() => watermarkInputRef.current?.click()}>
                  {preset.backgroundImage?.src ? "Change background image" : "Upload background image"}
                </Button>
                {preset.backgroundImage?.src && (
                  <div className="space-y-2">
                    <div>
                      <Label>Opacity: {preset.backgroundImage.opacity}%</Label>
                      <Slider
                        value={[preset.backgroundImage.opacity]}
                        min={0}
                        max={100}
                        onValueChange={([v]) => update({ backgroundImage: { ...preset.backgroundImage!, opacity: v } })}
                      />
                    </div>
                    <div>
                      <Label>Fit</Label>
                      <Select
                        value={preset.backgroundImage.fit}
                        onValueChange={(v: any) => update({ backgroundImage: { ...preset.backgroundImage!, fit: v } })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cover">Cover</SelectItem>
                          <SelectItem value="contain">Contain</SelectItem>
                          <SelectItem value="stretch">Stretch</SelectItem>
                          <SelectItem value="tile">Tile</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Preserve fill underneath</Label>
                      <Switch
                        checked={preset.backgroundImage.preserveFill}
                        onCheckedChange={(c) => update({ backgroundImage: { ...preset.backgroundImage!, preserveFill: c } })}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => update({ backgroundImage: undefined })}
                    >
                      Remove background image
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="effects" className="space-y-3 pt-3">
                <div className="flex items-center justify-between">
                  <Label>Vignette</Label>
                  <Switch checked={preset.vignette} onCheckedChange={(c) => update({ vignette: c })} />
                </div>
                {preset.vignette && (
                  <div>
                    <Label>Strength: {preset.vignetteStrength}%</Label>
                    <Slider value={[preset.vignetteStrength]} min={0} max={100} onValueChange={([v]) => update({ vignetteStrength: v })} />
                  </div>
                )}
                <div>
                  <Label>Noise / grain: {preset.noise}</Label>
                  <Slider value={[preset.noise]} min={0} max={100} onValueChange={([v]) => update({ noise: v })} />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-center gap-2 pt-2">
              <Switch id="apply-all" checked={applyToAll} onCheckedChange={setApplyToAll} />
              <Label htmlFor="apply-all" className="text-sm">
                Apply this canvas style to all existing slides
              </Label>
            </div>

            <div className="flex gap-2 items-end border-t pt-3">
              <div className="flex-1">
                <Label className="text-xs">Save as preset</Label>
                <Input placeholder="Preset name" value={presetName} onChange={(e) => setPresetName(e.target.value)} />
              </div>
              <Button variant="outline" size="sm" onClick={handleSavePreset} disabled={!presetName.trim()}>
                <Save className="h-4 w-4 mr-1" /> Save
              </Button>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-3">
            <Label className="text-xs uppercase text-muted-foreground">Live Preview</Label>
            <div
              className="w-full border bg-[conic-gradient(at_top_left,_#f4f4f5_25%,_#e4e4e7_25%_50%,_#f4f4f5_50%_75%,_#e4e4e7_75%)] bg-[length:16px_16px] rounded-md overflow-hidden flex items-center justify-center"
              style={{ aspectRatio: `${Math.max(1, width)} / ${Math.max(1, height)}` }}
            >
              {livePreview ? (
                <img
                  src={livePreview}
                  alt="Canvas preview"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-xs text-muted-foreground">Rendering...</div>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {width} × {height}px
              {mode === "edit"
                ? slideCount > 0
                  ? ` · +${slideCount} new slide${slideCount > 1 ? "s" : ""}`
                  : " · update only"
                : ` · ${slideCount} slide${slideCount > 1 ? "s" : ""}`}
            </div>
            <div className="border-t pt-3 space-y-2">
              <Label className="text-xs">
                {mode === "edit" ? "Add more slides (optional)" : "Number of slides to insert"}
              </Label>
              <Input
                type="number"
                min={mode === "edit" ? 0 : 1}
                max={50}
                value={slideCount}
                onChange={(e) => setSlideCount(parseInt(e.target.value) || (mode === "edit" ? 0 : 1))}
              />
            </div>
            <Button className="w-full" onClick={handleInsert}>
              {mode === "edit"
                ? slideCount > 0
                  ? `Update & Add ${slideCount} Slide${slideCount > 1 ? "s" : ""}`
                  : "Update Canvas"
                : `Insert ${slideCount > 1 ? `${slideCount} Slides` : "Slide"}`}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
