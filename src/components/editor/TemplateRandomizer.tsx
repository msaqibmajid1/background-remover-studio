import { useState, useEffect, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Shuffle,
  Save,
  Trash2,
  Download,
  Upload,
  Play,
  RefreshCw,
  ChevronDown,
  Star,
  AlertTriangle,
  Info,
  Layers,
  Undo2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import { EditorImage, CanvasElement, ExportSettings, CanvasSize, Padding, ImageFilter } from "@/types/editor";

export interface RandomizerTemplate {
  id: string;
  name: string;
  timestamp: number;
  thumbnail?: string;
  elementCount: number;
  weight: number; // 1-5
  data: {
    elements: CanvasElement[];
    canvasSize: CanvasSize;
    padding: Padding;
    filter: ImageFilter;
  };
}

interface TemplatesExportFile {
  version: string;
  exportType: "randomizer-templates";
  timestamp: number;
  templateCount: number;
  templates: RandomizerTemplate[];
}

type RandomMode = "random" | "shuffle" | "weighted";
type ScopeMode = "all" | "range";

interface RandomAssignment {
  imageIndex: number;
  templateId: string;
  templateName: string;
  overrideTemplateId?: string;
}

interface TemplateRandomizerProps {
  images: EditorImage[];
  currentImageIndex: number;
  exportSettings: ExportSettings;
  onApplyRandomTemplates: (
    updates: {
      imageIndex: number;
      elements: CanvasElement[];
      canvasSize?: CanvasSize;
      padding?: Padding;
      filter?: ImageFilter;
    }[]
  ) => EditorImage[] | void; // Returns pre-apply snapshot for undo
}

export const RANDOMIZER_STORAGE_KEY = "editorRandomizerTemplates";
const MAX_TEMPLATES = 20;

// Seeded random number generator
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// Helper to load templates from localStorage
export const loadRandomizerTemplates = (): RandomizerTemplate[] => {
  try {
    const saved = localStorage.getItem(RANDOMIZER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Failed to load randomizer templates:", e);
  }
  return [];
};

// Helper to save templates to localStorage
export const saveRandomizerTemplates = (templates: RandomizerTemplate[]) => {
  localStorage.setItem(RANDOMIZER_STORAGE_KEY, JSON.stringify(templates));
};

export const TemplateRandomizer = ({
  images,
  currentImageIndex,
  exportSettings,
  onApplyRandomTemplates,
}: TemplateRandomizerProps) => {
  const [templates, setTemplates] = useState<RandomizerTemplate[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<TemplatesExportFile | null>(null);
  const [importMode, setImportMode] = useState<"replace" | "merge">("merge");
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [exportFilenameDialogOpen, setExportFilenameDialogOpen] = useState(false);
  const [exportFilename, setExportFilename] = useState("randomizer-templates");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Undo state
  const [undoSnapshot, setUndoSnapshot] = useState<EditorImage[] | null>(null);

  // Rename state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");

  // Update confirmation state
  const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);
  const [updateConfirmId, setUpdateConfirmId] = useState<string | null>(null);
  const [updateConfirmEvent, setUpdateConfirmEvent] = useState<React.MouseEvent | null>(null);

  // Randomization options
  const [mode, setMode] = useState<RandomMode>("shuffle");
  const [scope, setScope] = useState<ScopeMode>("all");
  const [rangeFrom, setRangeFrom] = useState(1);
  const [rangeTo, setRangeTo] = useState(1);
  const [useSeed, setUseSeed] = useState(false);
  const [seed, setSeed] = useState(42);
  const [preserveElements, setPreserveElements] = useState(false);
  const [scaleToFit, setScaleToFit] = useState(true);
  const [assignments, setAssignments] = useState<RandomAssignment[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Load templates
  useEffect(() => {
    setTemplates(loadRandomizerTemplates());
  }, []);

  // Listen for external template updates (e.g. session load)
  useEffect(() => {
    const handler = () => setTemplates(loadRandomizerTemplates());
    window.addEventListener("randomizer-templates-updated", handler);
    return () => window.removeEventListener("randomizer-templates-updated", handler);
  }, []);

  const persistTemplates = (t: RandomizerTemplate[]) => {
    setTemplates(t);
    saveRandomizerTemplates(t);
  };

  // Generate thumbnail
  const generateThumbnail = (): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (images.length === 0) { resolve(undefined); return; }
      const img = images[currentImageIndex] || images[0];
      const el = new window.Image();
      el.onload = () => {
        const c = document.createElement("canvas");
        const s = Math.min(80 / el.width, 80 / el.height);
        c.width = el.width * s;
        c.height = el.height * s;
        const ctx = c.getContext("2d");
        if (ctx) { ctx.drawImage(el, 0, 0, c.width, c.height); resolve(c.toDataURL("image/jpeg", 0.5)); }
        else resolve(undefined);
      };
      el.onerror = () => resolve(undefined);
      el.src = img.src;
    });
  };

  // Save current image's layout as template
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) { toast.error("Enter a template name"); return; }
    const img = images[currentImageIndex];
    if (!img) { toast.error("No image selected"); return; }

    const thumbnail = await generateThumbnail();

    const strippedElements = img.elements.map((el) => {
      if (el.type === "image" || el.type === "logo" || el.type === "watermark") {
        return { ...el, src: (el as any).src ? (el as any).src : "" };
      }
      return { ...el };
    });

    const t: RandomizerTemplate = {
      id: `tmpl-${Date.now()}`,
      name: templateName.trim(),
      timestamp: Date.now(),
      thumbnail,
      elementCount: img.elements.length,
      weight: 3,
      data: {
        elements: strippedElements,
        canvasSize: { ...img.canvasSize },
        padding: { ...img.padding },
        filter: { ...img.filter },
      },
    };

    const updated = [t, ...templates].slice(0, MAX_TEMPLATES);
    persistTemplates(updated);
    setSaveDialogOpen(false);
    setTemplateName("");
    toast.success(`Template "${t.name}" saved`);
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    persistTemplates(templates.filter((t) => t.id !== id));
    toast.success("Template deleted");
  };

  const handleRenameTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const t = templates.find((t) => t.id === id);
    if (t) {
      setRenameId(id);
      setRenameName(t.name);
      setRenameDialogOpen(true);
    }
  };

  const confirmRenameTemplate = () => {
    if (!renameId || !renameName.trim()) return;
    persistTemplates(templates.map((t) => t.id === renameId ? { ...t, name: renameName.trim() } : t));
    setRenameDialogOpen(false);
    setRenameId(null);
    toast.success("Template renamed");
  };

  const promptUpdateTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUpdateConfirmId(id);
    setUpdateConfirmOpen(true);
  };

  const handleUpdateTemplate = async () => {
    const id = updateConfirmId;
    if (!id) return;
    setUpdateConfirmOpen(false);
    setUpdateConfirmId(null);
    const img = images[currentImageIndex];
    if (!img) { toast.error("No image selected"); return; }
    const existing = templates.find((t) => t.id === id);
    if (!existing) return;

    const thumbnail = await generateThumbnail();
    const strippedElements = img.elements.map((el) => {
      if (el.type === "image" || el.type === "logo" || el.type === "watermark") {
        return { ...el, src: (el as any).src ? (el as any).src : "" };
      }
      return { ...el };
    });

    const updated: RandomizerTemplate = {
      ...existing,
      timestamp: Date.now(),
      thumbnail,
      elementCount: img.elements.length,
      data: {
        elements: strippedElements,
        canvasSize: { ...img.canvasSize },
        padding: { ...img.padding },
        filter: { ...img.filter },
      },
    };

    persistTemplates(templates.map((t) => t.id === id ? updated : t));
    toast.success(`Template "${existing.name}" updated with current layout`);
  };

  const handleUpdateWeight = (id: string, weight: number) => {
    persistTemplates(templates.map((t) => (t.id === id ? { ...t, weight } : t)));
  };

  // Export - show filename dialog first
  const handleExportClick = () => {
    if (templates.length === 0) { toast.error("No templates to export"); return; }
    setExportFilename("randomizer-templates");
    setExportFilenameDialogOpen(true);
  };

  const handleExportConfirm = () => {
    const data: TemplatesExportFile = {
      version: "1.0",
      exportType: "randomizer-templates",
      timestamp: Date.now(),
      templateCount: templates.length,
      templates,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    saveAs(blob, `${exportFilename.trim() || "randomizer-templates"}.json`);
    toast.success(`Exported ${templates.length} template(s)`);
    setExportFilenameDialogOpen(false);
  };

  // Import
  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.exportType !== "randomizer-templates" || !Array.isArray(data.templates)) {
        throw new Error("Invalid format");
      }
      setImportData(data as TemplatesExportFile);
      setImportDialogOpen(true);
    } catch {
      toast.error("Invalid randomizer templates file");
    }
  };

  const confirmImport = () => {
    if (!importData) return;
    let next: RandomizerTemplate[];
    if (importMode === "replace") {
      next = importData.templates.map((t) => ({ ...t, id: `tmpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` }));
    } else {
      const existing = new Set(templates.map((t) => t.name.toLowerCase()));
      const fresh = importData.templates
        .filter((t) => !existing.has(t.name.toLowerCase()))
        .map((t) => ({ ...t, id: `tmpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` }));
      next = [...templates, ...fresh].slice(0, MAX_TEMPLATES);
    }
    persistTemplates(next);
    setImportDialogOpen(false);
    setImportData(null);
    toast.success("Templates imported");
  };

  // Generate random assignments
  const generateAssignments = () => {
    if (templates.length === 0) return [];

    const targetIndices: number[] = [];
    if (scope === "all") {
      for (let i = 0; i < images.length; i++) targetIndices.push(i);
    } else {
      for (let i = Math.max(0, rangeFrom - 1); i < Math.min(images.length, rangeTo); i++) targetIndices.push(i);
    }

    const rng = useSeed ? seededRandom(seed) : () => Math.random();
    const result: RandomAssignment[] = [];

    if (mode === "shuffle") {
      const pool: RandomizerTemplate[] = [];
      while (pool.length < targetIndices.length) {
        const shuffled = [...templates].sort(() => rng() - 0.5);
        pool.push(...shuffled);
      }
      targetIndices.forEach((imgIdx, i) => {
        result.push({ imageIndex: imgIdx, templateId: pool[i].id, templateName: pool[i].name });
      });
    } else if (mode === "weighted") {
      const totalWeight = templates.reduce((s, t) => s + t.weight, 0);
      targetIndices.forEach((imgIdx) => {
        let r = rng() * totalWeight;
        let picked = templates[0];
        for (const t of templates) {
          r -= t.weight;
          if (r <= 0) { picked = t; break; }
        }
        result.push({ imageIndex: imgIdx, templateId: picked.id, templateName: picked.name });
      });
    } else {
      targetIndices.forEach((imgIdx) => {
        const t = templates[Math.floor(rng() * templates.length)];
        result.push({ imageIndex: imgIdx, templateId: t.id, templateName: t.name });
      });
    }

    return result;
  };

  const handleOpenApply = () => {
    if (templates.length === 0) { toast.error("Save at least one template first"); return; }
    if (images.length === 0) { toast.error("No images loaded"); return; }
    setRangeTo(images.length);
    const a = generateAssignments();
    setAssignments(a);
    setApplyDialogOpen(true);
  };

  const handleReroll = () => setAssignments(generateAssignments());

  const handleOverride = (assignmentIdx: number, newTemplateId: string) => {
    const t = templates.find((t) => t.id === newTemplateId);
    if (!t) return;
    setAssignments((prev) =>
      prev.map((a, i) => (i === assignmentIdx ? { ...a, templateId: t.id, templateName: t.name, overrideTemplateId: t.id } : a))
    );
  };

  // Scale elements to fit different canvas sizes
  const scaleElements = (elements: CanvasElement[], fromSize: CanvasSize, toSize: CanvasSize): CanvasElement[] => {
    if (!scaleToFit || (fromSize.width === toSize.width && fromSize.height === toSize.height)) return elements;
    const sx = toSize.width / fromSize.width;
    const sy = toSize.height / fromSize.height;
    return elements.map((el) => ({
      ...el,
      x: el.x * sx,
      y: el.y * sy,
      width: el.width * sx,
      height: el.height * sy,
    }));
  };

  const handleApply = () => {
    const updates = assignments.map((a) => {
      const tmpl = templates.find((t) => t.id === a.templateId);
      if (!tmpl) return null;
      const targetImage = images[a.imageIndex];
      if (!targetImage) return null;

      let elements = scaleElements(tmpl.data.elements, tmpl.data.canvasSize, targetImage.canvasSize);

      if (preserveElements) {
        elements = [
          ...targetImage.elements,
          ...elements.map((el) => ({ ...el, id: `${el.id}-${Date.now()}` })),
        ];
      }

      return {
        imageIndex: a.imageIndex,
        elements,
        padding: tmpl.data.padding,
        filter: tmpl.data.filter,
      };
    }).filter(Boolean) as {
      imageIndex: number;
      elements: CanvasElement[];
      canvasSize?: CanvasSize;
      padding?: Padding;
      filter?: ImageFilter;
    }[];

    // Get pre-apply snapshot for undo
    const snapshot = onApplyRandomTemplates(updates);
    if (snapshot && Array.isArray(snapshot)) {
      setUndoSnapshot(snapshot);
    }

    setApplyDialogOpen(false);

    toast.success(`Applied templates to ${updates.length} image(s)`, {
      action: {
        label: "Undo",
        onClick: () => {
          if (undoSnapshot || (snapshot && Array.isArray(snapshot))) {
            const snapToRestore = snapshot && Array.isArray(snapshot) ? snapshot : undoSnapshot;
            if (snapToRestore) {
              onApplyRandomTemplates(
                snapToRestore.map((img, idx) => ({
                  imageIndex: idx,
                  elements: img.elements,
                  padding: img.padding,
                  filter: img.filter,
                }))
              );
              toast.success("Reverted random template changes");
              setUndoSnapshot(null);
            }
          }
        },
      },
      duration: 8000,
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Shuffle className="h-4 w-4" />
            Randomizer
            {templates.length > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-1.5 rounded-full">
                {templates.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-y-auto bg-popover border border-border z-50">
          <DropdownMenuLabel className="flex items-center justify-between">
            Templates
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => setSaveDialogOpen(true)} disabled={images.length === 0}>
                <Save className="h-3 w-3" /> Save
              </Button>
              <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={handleOpenApply} disabled={templates.length === 0 || images.length === 0}>
                <Play className="h-3 w-3" /> Apply
              </Button>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {templates.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No templates saved yet. Save an element layout to get started.
            </div>
          ) : (
            <ScrollArea className="max-h-[50vh]">
              {templates.map((t) => (
                <DropdownMenuItem key={t.id} className="flex items-center gap-3 p-2 cursor-default" onSelect={(e) => e.preventDefault()}>
                  {t.thumbnail ? (
                    <img src={t.thumbnail} alt={t.name} className="h-10 w-10 object-cover rounded border border-border flex-shrink-0" />
                  ) : (
                    <div className="h-10 w-10 bg-muted rounded border border-border flex items-center justify-center flex-shrink-0">
                      <Layers className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.elementCount} element{t.elementCount !== 1 ? "s" : ""} •{" "}
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`inline h-3 w-3 cursor-pointer ${i < t.weight ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`}
                          onClick={(e) => { e.stopPropagation(); handleUpdateWeight(t.id, i + 1); }}
                        />
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 hover:bg-accent" title="Update with current layout" onClick={(e) => promptUpdateTemplate(t.id, e)}>
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 hover:bg-accent" title="Rename" onClick={(e) => handleRenameTemplate(t.id, e)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 hover:bg-destructive hover:text-destructive-foreground" onClick={(e) => handleDeleteTemplate(t.id, e)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuItem>
              ))}
            </ScrollArea>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExportClick} disabled={templates.length === 0} className="gap-2">
            <Download className="h-4 w-4" /> Export Templates
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" /> Import Templates
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = ""; }} />

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Template</DialogTitle>
            <DialogDescription>Save the current image's element layout as a reusable template (background images are excluded).</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Input placeholder="Template name..." value={templateName} onChange={(e) => setTemplateName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSaveTemplate(); }} />
            <div className="text-sm text-muted-foreground">
              {images[currentImageIndex]?.elements.length || 0} element(s) will be saved
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Filename Dialog */}
      <Dialog open={exportFilenameDialogOpen} onOpenChange={setExportFilenameDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Export Templates</DialogTitle>
            <DialogDescription>Choose a filename for the exported templates.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="tmpl-export-filename">Filename</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                id="tmpl-export-filename"
                value={exportFilename}
                onChange={(e) => setExportFilename(e.target.value)}
                placeholder="randomizer-templates"
                onKeyDown={(e) => { if (e.key === "Enter") handleExportConfirm(); }}
              />
              <span className="text-sm text-muted-foreground">.json</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportFilenameDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleExportConfirm} disabled={!exportFilename.trim()}>
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Templates</DialogTitle>
            <DialogDescription>Import {importData?.templateCount || 0} template(s)</DialogDescription>
          </DialogHeader>
          {importData && (
            <div className="space-y-4">
              <ScrollArea className="h-32 border border-border rounded-lg p-3">
                {importData.templates.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm py-1">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{t.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{t.elementCount} elements</span>
                  </div>
                ))}
              </ScrollArea>
              <RadioGroup value={importMode} onValueChange={(v) => setImportMode(v as "replace" | "merge")}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="merge" id="im-merge" />
                  <Label htmlFor="im-merge">Merge (add new, skip duplicates)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="replace" id="im-replace" />
                  <Label htmlFor="im-replace">Replace all existing</Label>
                </div>
              </RadioGroup>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmImport}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Randomizer Dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent size="lg" className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shuffle className="h-5 w-5" /> Apply Random Templates
            </DialogTitle>
            <DialogDescription>Randomly assign saved templates to your canvas images.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Mode */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Randomization Mode</Label>
              <RadioGroup value={mode} onValueChange={(v) => { setMode(v as RandomMode); }} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="random" id="r-random" />
                  <Label htmlFor="r-random" className="text-sm">Random</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="shuffle" id="r-shuffle" />
                  <Label htmlFor="r-shuffle" className="text-sm">Shuffle (even)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="weighted" id="r-weighted" />
                  <Label htmlFor="r-weighted" className="text-sm">Weighted</Label>
                </div>
              </RadioGroup>
              {mode === "weighted" && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" /> Adjust star weights on each template in the dropdown
                </p>
              )}
            </div>

            {/* Scope */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Scope</Label>
              <RadioGroup value={scope} onValueChange={(v) => setScope(v as ScopeMode)} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="all" id="s-all" />
                  <Label htmlFor="s-all" className="text-sm">All images ({images.length})</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="range" id="s-range" />
                  <Label htmlFor="s-range" className="text-sm">Range</Label>
                </div>
              </RadioGroup>
              {scope === "range" && (
                <div className="flex items-center gap-2 ml-6">
                  <Input type="number" min={1} max={images.length} value={rangeFrom} onChange={(e) => setRangeFrom(Number(e.target.value))} className="w-20 h-8" />
                  <span className="text-sm text-muted-foreground">to</span>
                  <Input type="number" min={1} max={images.length} value={rangeTo} onChange={(e) => setRangeTo(Number(e.target.value))} className="w-20 h-8" />
                </div>
              )}
            </div>

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Reproducible seed</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={useSeed} onCheckedChange={setUseSeed} />
                  {useSeed && (
                    <Input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} className="w-20 h-8" />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Preserve existing elements (layer on top)</Label>
                <Switch checked={preserveElements} onCheckedChange={setPreserveElements} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Scale to fit canvas</Label>
                <Switch checked={scaleToFit} onCheckedChange={setScaleToFit} />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              {templates.length < assignments.length && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{templates.length} template(s) for {assignments.length} image(s) — some will repeat</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
                <Info className="h-4 w-4 flex-shrink-0" />
                <span>{assignments.length} image(s) will be affected</span>
              </div>
            </div>

            {/* Preview */}
            <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 w-full justify-between">
                  <span>Preview Mapping</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${previewOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border border-border rounded-lg mt-2 max-h-48 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Image #</th>
                        <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Template</th>
                        <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Override</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((a, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-3 py-1.5">{a.imageIndex + 1}</td>
                          <td className="px-3 py-1.5 truncate max-w-[150px]">{a.templateName}</td>
                          <td className="px-3 py-1.5 text-right">
                            <Select value={a.templateId} onValueChange={(v) => handleOverride(i, v)}>
                              <SelectTrigger className="h-7 w-32 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {templates.map((t) => (
                                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={handleReroll} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Re-roll
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setApplyDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleApply} className="gap-2">
              <Shuffle className="h-4 w-4" /> Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Template Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Rename Template</DialogTitle>
            <DialogDescription>Enter a new name for this template.</DialogDescription>
          </DialogHeader>
          <Input
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            placeholder="Template name"
            onKeyDown={(e) => e.key === "Enter" && confirmRenameTemplate()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmRenameTemplate} disabled={!renameName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Template Confirmation Dialog */}
      <Dialog open={updateConfirmOpen} onOpenChange={setUpdateConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Update Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to overwrite "{templates.find((t) => t.id === updateConfirmId)?.name}" with the current layout? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleUpdateTemplate}>Overwrite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
