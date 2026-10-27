import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  Brush,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardPaste,
  Download,
  Eraser,
  FolderOpen,
  Hand,
  ImagePlus,
  Images,
  Info,
  LayoutTemplate,
  Loader2,
  Maximize2,
  MousePointer2,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Square,
  Trash2,
  Undo2,
  Upload,
  Wand2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog";
import { ToolBackButton } from "../ToolBackButton";
import { ThemeToggle } from "../ThemeToggle";
import {
  createBackgroundMask,
  stopBackgroundRemoval,
  type RemovalMode,
} from "@/lib/backgroundRemoval";
import {
  applyDesign,
  fitSubject,
  fitOriginalSubject,
  studioImageReady,
  maskBounds,
  outputName,
} from "@/lib/backgroundStudio/math";
import {
  clearStudioRasters,
  renderStudio,
  type StudioView,
} from "@/lib/backgroundStudio/render";
import {
  canvasBlob,
  importStudioProject,
  loadStudioProject,
  maskBlob,
  portableStudioParts,
  putStudioAsset,
  readStudioUpload,
  saveStudioProject,
  studioAsset,
} from "@/lib/backgroundStudio/storage";
import {
  STUDIO_TEMPLATES,
  templateForImage,
  textLayer,
} from "@/lib/backgroundStudio/templates";
import {
  newDesign,
  newProject,
  STUDIO_STEPS,
  type StudioStep,
  type StudioDesign,
  type StudioImage,
  type StudioOverlay,
  type StudioProject,
  type StudioTemplate,
} from "@/lib/backgroundStudio/types";
import { AssetImage } from "./AssetImage";
import { StudioCanvas, type StudioTool } from "./StudioCanvas";
import { TemplatePreview } from "./TemplatePreview";
import { StudioSetup } from "./StudioSetup";
import { StudioTextControls } from "./StudioTextControls";
import {
  applyStudioText,
  studioTextElement,
  textOverlay,
} from "@/lib/backgroundStudio/text";
import { BatchUpdateTextDialog } from "../editor/BatchUpdateTextDialog";
import type { EditorImage } from "@/types/editor";
import {
  collectStudioFonts,
  restoreStudioFonts,
} from "@/lib/backgroundStudio/fonts";
import {
  CINEMA_TEMPLATES,
  findBundledTemplateArtwork,
  importSvgTemplate,
  importTemplateFiles,
} from "@/lib/backgroundStudio/svgTemplates";
import { bundledTemplateForName } from "@/lib/backgroundStudio/templateBlueprints";
import {
  DesignControls,
  LayerControls,
  NumberField,
  RangeField,
  selectClass,
} from "./StudioControls";
import "./studio.css";
import {
  cacheStudioDownload,
  removeStudioDownload,
  studioDownloadBlob,
  studioDownloads,
  type StudioDownload,
} from "@/lib/backgroundStudio/downloads";
import { supabase } from "@/integrations/supabase/client";

type EditState = Pick<StudioImage, "id" | "design" | "strokes" | "useOriginal">;
type HistoryStep = { before: EditState[]; after: EditState[] };
type ApplyField = Parameters<typeof applyDesign>[2][number];
const snapshot = (image: StudioImage): EditState => ({
  id: image.id,
  design: image.design,
  strokes: image.strokes,
  useOriginal: image.useOriginal,
});
const errorText = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
function starterImage(
  image: StudioImage,
  template?: StudioTemplate,
): StudioImage {
  if (
    studioImageReady(image) ||
    image.design.subject.manual ||
    image.strokes.length
  )
    return image;
  const design = template
    ? templateForImage(template, image.design, true)
    : { ...newDesign(image.width, image.height), refine: image.design.refine };
  if (design.photoArea) design.subject = fitSubject(image, design);
  return { ...image, design };
}

export function BackgroundStudio() {
  const [canManageTemplates, setCanManageTemplates] = useState(false);
  const [project, setProject] = useState<StudioProject>(newProject);
  const latest = useRef(project),
    ready = useRef(false),
    dirty = useRef(false),
    saveChain = useRef(Promise.resolve());
  const [restored, setRestored] = useState(false),
    [saving, setSaving] = useState(false),
    [saveError, setSaveError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(""),
    [processing, setProcessing] = useState(false),
    [exporting, setExporting] = useState(false);
  const processingRef = useRef(false),
    taskRef = useRef(false),
    exportRef = useRef(false),
    repairTemplateArtworkRef = useRef<(() => Promise<void>) | undefined>(),
    stop = useRef(false),
    stopExport = useRef(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, stage: "" }),
    [exportProgress, setExportProgress] = useState({ done: 0, total: 0 });
  const [device, setDevice] = useState("");
  const {
    mode,
    device: processingDevice,
    brushSize,
    hardness,
  } = project.settings;
  const [panel, setPanel] = useState<"library" | "settings" | null>(null),
    [leftTab, setLeftTab] = useState("library"),
    [rightTab, setRightTab] = useState("remove");
  const [tool, setTool] = useState<StudioTool>("move"),
    [view, setView] = useState<StudioView>("design"),
    [compare, setCompare] = useState(50),
    [zoom, setZoom] = useState(1),
    [layer, setLayer] = useState("subject");
  const [selected, setSelected] = useState<string[]>([]),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [libraryPage, setLibraryPage] = useState(0),
    [serial, setSerial] = useState("");
  const [category, setCategory] = useState("All"),
    [templateName, setTemplateName] = useState(""),
    [applyPlacement, setApplyPlacement] = useState(false);
  const [applyScope, setApplyScope] = useState("selected"),
    [applyFields, setApplyFields] = useState<ApplyField[]>(["background"]);
  const [historyVersion, setHistoryVersion] = useState(0),
    history = useRef<{ past: HistoryStep[]; future: HistoryStep[] }>({
      past: [],
      future: [],
    });
  const [exportOpen, setExportOpen] = useState(false),
    [exportKind, setExportKind] = useState("design"),
    [exportScope, setExportScope] = useState("current"),
    [format, setFormat] = useState("png"),
    [quality, setQuality] = useState(96),
    [exportScale, setExportScale] = useState(1),
    [pattern, setPattern] = useState("{name}-{n}"),
    [partCount, setPartCount] = useState(100),
    [partMB, setPartMB] = useState(100),
    [exportFailures, setExportFailures] = useState<
      { id: string; name: string; error: string }[]
    >([]);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [batchTextOpen, setBatchTextOpen] = useState(false);
  const [downloads, setDownloads] = useState<StudioDownload[]>([]),
    [downloadsOpen, setDownloadsOpen] = useState(false),
    [removeDownload, setRemoveDownload] = useState<StudioDownload>(),
    [downloading, setDownloading] = useState("");
  const temporaryDownload = useRef<{ part: StudioDownload; blob: Blob }>();
  const writeEpoch = useRef(0),
    [detailsOpen, setDetailsOpen] = useState(false);
  const [downloadsPage, setDownloadsPage] = useState(0);
  const downloadPage = Math.min(
    downloadsPage,
    Math.max(0, Math.ceil(downloads.length / 20) - 1),
  );
  const uploadInput = useRef<HTMLInputElement>(null),
    templateInput = useRef<HTMLInputElement>(null),
    projectInput = useRef<HTMLInputElement>(null),
    auxiliaryInput = useRef<HTMLInputElement>(null),
    auxiliary = useRef<{
      type: "background" | "logo";
      id: string;
      layerId?: string;
    }>();
  const current = project.images.find((image) => image.id === project.activeId);
  const currentTemplate = project.templates.find(
    (item) => item.id === current?.design.templateId,
  );
  const currentArtwork = current?.design.overlays.find(
    (item) =>
      item.name === "Template artwork" ||
      item.name === "Original template artwork",
  );
  const repairSource =
    CINEMA_TEMPLATES.find((source) => source.id === current?.design.templateId) ||
    CINEMA_TEMPLATES.find((source) =>
      current?.design.overlays.some((item) =>
        item.templateCode?.startsWith(`${source.id}:`),
      ),
    );
  const needsTemplateArtworkRepair = !!(
    currentArtwork &&
    repairSource &&
    ((currentTemplate?.revision || 0) < repairSource.revision ||
      currentArtwork.name === "Original template artwork" ||
      currentTemplate?.design.overlays.find(
        (item) =>
          item.name === "Template artwork" ||
          item.name === "Original template artwork",
      )?.assetKey !== currentArtwork.assetKey)
  );
  const workflow =
    project.workflow || (project.images.length ? "edit" : "template");
  const activeIndex = project.images.findIndex(
    (image) => image.id === project.activeId,
  );
  const batchTextImages = useMemo<EditorImage[]>(
    () =>
      batchTextOpen
        ? project.images.map((image) => ({
            id: image.id,
            file: new File([], image.name, { type: image.type }),
            src: "",
            originalWidth: image.width,
            originalHeight: image.height,
            canvasSize: {
              width: image.design.width,
              height: image.design.height,
              aspectRatio: `${image.design.width}:${image.design.height}`,
            },
            elements: image.design.overlays
              .filter((item) => item.type === "text" && !item.locked)
              .map((item) => studioTextElement(item, image.design)),
            filter: { type: "none" },
            padding: {
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              color: "transparent",
              mode: "outer",
            },
          }))
        : [],
    [batchTextOpen, project.images],
  );
  const filtered = project.images.filter(
    (image) =>
      (filter === "all" ||
        (filter === "ready" && studioImageReady(image)) ||
        (filter === "pending" &&
          !studioImageReady(image) &&
          image.status !== "error") ||
        (filter === "error" && !!image.error)) &&
      image.name.toLowerCase().includes(search.toLowerCase()),
  );
  const pageIndex = Math.min(
      libraryPage,
      Math.max(0, Math.ceil(filtered.length / 30) - 1),
    ),
    visible = filtered.slice(pageIndex * 30, pageIndex * 30 + 30);
  const readyCount = project.images.filter(studioImageReady).length,
    errors = project.images.filter((image) => image.error).length;
  const targets =
    exportScope === "current"
      ? current
        ? [current]
        : []
      : project.images.filter(
          (image) =>
            (exportScope === "all" || selected.includes(image.id)) &&
            studioImageReady(image),
        );
  const templates = [...STUDIO_TEMPLATES, ...project.templates].filter(
    (template) => {
      const bundled = bundledTemplateForName(template.name);
      return (
        (!bundled || bundled.id === template.id) &&
        (category === "All" || template.category === category)
      );
    },
  );
  const update = useCallback(
    (change: (value: StudioProject) => StudioProject) => {
      const next = change(latest.current);
      latest.current = next;
      dirty.current = true;
      setProject(next);
    },
    [],
  );
  const selectImage = useCallback(
    (id: string) => update((project) => ({ ...project, activeId: id })),
    [update],
  );
  const navigateToImage = useCallback(
    (index: number) => {
      const images = latest.current.images;
      if (!images.length) return;
      const nextIndex = Math.max(0, Math.min(images.length - 1, index));
      selectImage(images[nextIndex].id);
    },
    [selectImage],
  );
  const persist = useCallback(async (value: StudioProject, replace = false) => {
    const epoch = writeEpoch.current;
    const job = saveChain.current
      .catch(() => {})
      .then(async () => {
        if (
          !replace &&
          (epoch !== writeEpoch.current || latest.current !== value)
        )
          return;
        await saveStudioProject(value);
        if (replace) writeEpoch.current++;
        if (latest.current === value) dirty.current = false;
      });
    saveChain.current = job;
    await job;
  }, []);
  useEffect(() => {
    let active = true;
    const checkRole = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (!active || userError || !user) return;
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (active) setCanManageTemplates(!error && data === true);
    };
    void checkRole();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    void studioDownloads()
      .then(setDownloads)
      .catch((error) =>
        setStatus(`Download cache unavailable: ${errorText(error)}`),
      );
  }, []);
  async function keepDownload(
    blob: Blob,
    name: string,
    count: number,
    kind: StudioDownload["kind"],
    automatic: boolean,
  ) {
    const part: StudioDownload = {
      id: crypto.randomUUID(),
      name,
      count,
      size: blob.size,
      kind,
      createdAt: Date.now(),
    };
    try {
      await cacheStudioDownload(part, blob);
      setDownloads((previous) => [part, ...previous]);
    } catch (error) {
      part.temporary = true;
      temporaryDownload.current = { part, blob };
      setDownloads((previous) => [part, ...previous]);
      setExportOpen(false);
      setDownloadsOpen(true);
      throw new Error(
        `The ZIP is available as a temporary download: ${errorText(error)}. Download it before closing this tab.`,
      );
    }
    if (automatic) saveAs(blob, name);
  }
  async function downloadPart(part: StudioDownload) {
    setDownloading(part.id);
    try {
      saveAs(
        temporaryDownload.current?.part.id === part.id
          ? temporaryDownload.current.blob
          : await studioDownloadBlob(part.id),
        part.name,
      );
    } catch (error) {
      setStatus(errorText(error));
    } finally {
      setDownloading("");
    }
  }
  const pushHistory = useCallback((step: HistoryStep) => {
    history.current.past.push(step);
    if (history.current.past.length > 40) history.current.past.shift();
    history.current.future = [];
    setHistoryVersion((value) => value + 1);
  }, []);
  const setMode = (mode: RemovalMode) =>
    update((project) => ({
      ...project,
      settings: { ...project.settings, mode },
    }));
  const setProcessingDevice = (device: "auto" | "cpu") =>
    update((project) => ({
      ...project,
      settings: { ...project.settings, device },
    }));
  const setBrushSize = (brushSize: number) =>
    update((project) => ({
      ...project,
      settings: { ...project.settings, brushSize },
    }));
  const setHardness = (hardness: number) =>
    update((project) => ({
      ...project,
      settings: { ...project.settings, hardness },
    }));
  const editImage = useCallback(
    (value: StudioImage, before?: StudioImage) => {
      if (!latest.current.images.some((image) => image.id === value.id)) return;
      if (before)
        pushHistory({ before: [snapshot(before)], after: [snapshot(value)] });
      update((project) => ({
        ...project,
        images: project.images.map((image) =>
          image.id === value.id
            ? {
                ...image,
                design: value.design,
                strokes: value.strokes,
                useOriginal: value.useOriginal,
              }
            : image,
        ),
      }));
    },
    [update, pushHistory],
  );
  const changeDesign = useCallback(
    (patch: Partial<StudioDesign>) => {
      const image = latest.current.images.find(
        (image) => image.id === latest.current.activeId,
      );
      if (!image) return;
      const design = { ...image.design, ...patch };
      if (design.width * design.height > 40000000) {
        setStatus("Canvas exceeds the 40-megapixel browser limit.");
        return;
      }
      editImage({ ...image, design }, image);
    },
    [editImage],
  );
  const undo = useCallback(
    (redo = false) => {
      const source = redo ? history.current.future : history.current.past,
        step = source.pop();
      if (!step) return;
      (redo ? history.current.past : history.current.future).push(step);
      const values = redo ? step.after : step.before;
      update((project) => ({
        ...project,
        images: project.images.map((image) => {
          const value = values.find((value) => value.id === image.id);
          return value
            ? {
                ...image,
                design: value.design,
                strokes: value.strokes,
                useOriginal: value.useOriginal,
              }
            : image;
        }),
      }));
      setHistoryVersion((value) => value + 1);
    },
    [update],
  );
  useEffect(() => {
    let cancelled = false;
    void loadStudioProject()
      .then(async (value) => {
        if (value) await restoreStudioFonts(value);
        if (!cancelled) {
          if (value) {
            latest.current = value;
            setProject(value);
          }
          ready.current = true;
        }
      })
      .catch((error) => {
        if (!cancelled)
          setSaveError(
            `Recovery failed: ${errorText(error)}. Autosave is paused to preserve the saved project; load a backup.`,
          );
      })
      .finally(() => {
        if (!cancelled) setRestored(true);
      });
    return () => {
      cancelled = true;
      stop.current = true;
      stopExport.current = true;
      stopBackgroundRemoval();
      clearStudioRasters();
    };
  }, []);
  useEffect(() => {
    if (!restored || !ready.current || !dirty.current) return;
    const timer = window.setTimeout(() => {
      setSaving(true);
      void persist(latest.current)
        .then(() => setSaveError(""))
        .catch((error) =>
          setSaveError(
            `Autosave failed: ${errorText(error)}. Download a project backup before closing.`,
          ),
        )
        .finally(() => setSaving(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [project, restored, persist]);
  useEffect(() => {
    if (!restored || !needsTemplateArtworkRepair || taskRef.current) return;
    void repairTemplateArtworkRef.current?.();
  }, [restored, needsTemplateArtworkRepair]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (
        dirty.current ||
        processingRef.current ||
        taskRef.current ||
        exportRef.current ||
        temporaryDownload.current
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  useEffect(() => {
    setLayer("subject");
    setZoom(1);
    setTool("move");
    setView((value) => (value === "mask" ? "cutout" : value));
  }, [project.activeId]);
  useEffect(() => setLibraryPage(0), [filter, search]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName))
      )
        return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo(event.shiftKey);
        return;
      }
      const images = latest.current.images,
        activeIndex = images.findIndex(
          (image) => image.id === latest.current.activeId,
        ),
        directional =
          (event.ctrlKey || event.metaKey) &&
          (event.key === "ArrowLeft" || event.key === "ArrowRight");
      if (
        activeIndex >= 0 &&
        (directional ||
          event.key === "PageUp" ||
          event.key === "PageDown" ||
          event.key === "Home" ||
          event.key === "End")
      ) {
        event.preventDefault();
        navigateToImage(
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? images.length - 1
              : event.key === "PageUp" || event.key === "ArrowLeft"
                ? activeIndex - 1
                : activeIndex + 1,
        );
        return;
      }
      const image = latest.current.images.find(
        (image) => image.id === latest.current.activeId,
      );
      if (!image) return;
      if (
        event.key === "Delete" &&
        layer !== "subject" &&
        !image.design.overlays.find((item) => item.id === layer)?.locked
      ) {
        changeDesign({
          overlays: image.design.overlays.filter((item) => item.id !== layer),
        });
        setLayer("subject");
      }
      if (!event.key.startsWith("Arrow") || view !== "design") return;
      event.preventDefault();
      const amount = event.shiftKey ? 10 : 1,
        dx =
          event.key === "ArrowLeft"
            ? -amount
            : event.key === "ArrowRight"
              ? amount
              : 0,
        dy =
          event.key === "ArrowUp"
            ? -amount
            : event.key === "ArrowDown"
              ? amount
              : 0;
      const target = image.design.overlays.find((item) => item.id === layer);
      if (target?.locked) return;
      if (target)
        changeDesign({
          overlays: image.design.overlays.map((item) =>
            item.id === layer
              ? {
                  ...item,
                  x: item.x + dx / image.design.width,
                  y: item.y + dy / image.design.height,
                }
              : item,
          ),
        });
      else
        changeDesign({
          subject: {
            ...image.design.subject,
            x: image.design.subject.x + dx / image.design.width,
            y: image.design.subject.y + dy / image.design.height,
            manual: true,
          },
        });
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [undo, layer, view, changeDesign, navigateToImage]);
  async function upload(files: File[]) {
    if (taskRef.current || !restored) return;
    if (!ready.current) {
      setStatus(
        "Load a project backup or explicitly start a New Project before adding images. The previous recovery data is protected.",
      );
      return;
    }
    taskRef.current = true;
    setBusy("upload");
    const failed: string[] = [];
    try {
      for (let index = 0; index < files.length; index++) {
        try {
          let image = await readStudioUpload(files[index]);
          const template = latest.current.starterTemplate;
          if (template) image = starterImage(image, template);
          update((project) => ({
            ...project,
            images: [...project.images, image],
            activeId: project.activeId || image.id,
          }));
        } catch (error) {
          failed.push(errorText(error));
        }
        setStatus(
          `Uploaded ${index + 1} / ${files.length}${failed.length ? ` | ${failed.length} failed` : ""}`,
        );
      }
      await persist(latest.current);
      ready.current = true;
      setStatus(
        failed.length ? failed.join("\n") : `${files.length} images added.`,
      );
    } catch (error) {
      setStatus(errorText(error));
    } finally {
      taskRef.current = false;
      setBusy("");
      if (uploadInput.current) uploadInput.current.value = "";
    }
  }
  async function process(ids: string[]) {
    if (processingRef.current || !ids.length) return;
    processingRef.current = true;
    stop.current = false;
    setProcessing(true);
    setProgress({ done: 0, total: ids.length, stage: "Starting" });
    update((project) => ({ ...project, queue: [...ids] }));
    let done = 0;
    try {
      for (const id of ids) {
        if (stop.current) break;
        const image = latest.current.images.find((item) => item.id === id);
        if (!image) continue;
        update((project) => ({
          ...project,
          images: project.images.map((item) =>
            item.id === id
              ? { ...item, status: "processing", error: undefined }
              : item,
          ),
        }));
        try {
          const result = await createBackgroundMask(
            await studioAsset(image.originalKey),
            mode,
            (value) => {
              setProgress({
                done,
                total: ids.length,
                stage: `${image.name}: ${value.stage}${value.progress === undefined ? "" : ` ${Math.round(value.progress)}%`}`,
              });
              if (value.device) setDevice(value.device);
            },
            processingDevice,
          );
          const maskKey = await putStudioAsset(
            await maskBlob(result.data, result.width, result.height),
          );
          update((project) => ({
            ...project,
            images: project.images.map((item) =>
              item.id === id
                ? {
                    ...item,
                    maskKey,
                    useOriginal: false,
                    maskBounds: maskBounds(
                      result.data,
                      result.width,
                      result.height,
                    ),
                    status: "ready",
                    error: undefined,
                  }
                : item,
            ),
          }));
          update((project) => ({
            ...project,
            images: project.images.map((item) =>
              item.id === id &&
              item.design.photoArea &&
              !item.design.subject.manual
                ? {
                    ...item,
                    design: {
                      ...item.design,
                      subject: fitSubject(item, item.design),
                    },
                  }
                : item,
            ),
          }));
          const processed = latest.current.images.find(
            (item) => item.id === id,
          );
          if (processed) {
            const thumb = await renderStudio(processed, {
              view: "cutout",
              maxEdge: 180,
            });
            try {
              const thumbnailKey = await putStudioAsset(
                await canvasBlob(thumb, "image/webp", 0.8),
              );
              update((project) => ({
                ...project,
                images: project.images.map((item) =>
                  item.id === id ? { ...item, thumbnailKey } : item,
                ),
              }));
            } finally {
              thumb.width = thumb.height = 1;
            }
          }
          await persist(latest.current);
        } catch (error) {
          const cancelled =
            error instanceof DOMException && error.name === "AbortError";
          update((project) => ({
            ...project,
            images: project.images.map((item) =>
              item.id === id
                ? {
                    ...item,
                    status: item.maskKey
                      ? "ready"
                      : cancelled
                        ? "pending"
                        : "error",
                    error: cancelled
                      ? undefined
                      : `Removal: ${errorText(error)}`,
                  }
                : item,
            ),
          }));
          if (cancelled) break;
        }
        done++;
        update((project) => ({
          ...project,
          queue: project.queue.filter((value) => value !== id),
        }));
        setProgress((previous) => ({ ...previous, done }));
      }
      setStatus(
        stop.current
          ? "Processing stopped. Continue Queue resumes the remaining images."
          : "Processing complete. Review any failed images before export.",
      );
    } finally {
      processingRef.current = false;
      setProcessing(false);
    }
  }
  async function saveProject() {
    if (taskRef.current || exportRef.current) return;
    if (temporaryDownload.current) {
      setDownloadsOpen(true);
      setStatus(
        "Download and remove the temporary ZIP before starting another backup.",
      );
      return;
    }
    taskRef.current = true;
    setBusy("save");
    try {
      const withFonts = await collectStudioFonts(latest.current);
      if (withFonts.fonts)
        update((value) => ({ ...value, fonts: withFonts.fonts }));
      const value = latest.current;
      await persist(value);
      for await (const part of portableStudioParts(value)) {
        await keepDownload(
          part.blob,
          `background-studio-${Date.now()}-part-${part.index}-of-${part.total}.zip`,
          value.images.length,
          "project",
          part.index === 1,
        );
        setStatus(
          `Project backup part ${part.index} / ${part.total} is ready in Downloads.`,
        );
      }
      setDownloadsOpen(true);
    } catch (error) {
      setStatus(`Project backup failed: ${errorText(error)}`);
    } finally {
      taskRef.current = false;
      setBusy("");
    }
  }
  async function loadProject(files: File[]) {
    if (!files.length || taskRef.current || processingRef.current || exporting)
      return;
    taskRef.current = true;
    setBusy("load");
    try {
      const value = await importStudioProject(files);
      await restoreStudioFonts(value);
      await persist(value, true);
      latest.current = value;
      setProject(value);
      ready.current = true;
      dirty.current = false;
      history.current = { past: [], future: [] };
      setHistoryVersion((v) => v + 1);
      setSelected([]);
      clearStudioRasters();
      setStatus(
        `Project loaded: ${value.images.length} images. Saved masks, brush edits and placements restored.`,
      );
    } catch (error) {
      setStatus(`Project was not replaced: ${errorText(error)}`);
    } finally {
      taskRef.current = false;
      setBusy("");
      if (projectInput.current) projectInput.current.value = "";
    }
  }
  function applyTemplate(template: StudioTemplate) {
    if (!current) return;
    const design = templateForImage(template, current.design, applyPlacement);
    if (design.photoArea && (applyPlacement || !current.design.subject.manual))
      design.subject = current.useOriginal
        ? fitOriginalSubject(current, design)
        : fitSubject(current, design);
    editImage({ ...current, design }, current);
    setView("design");
    setTool("move");
    setLayer("subject");
    setPanel(null);
  }
  function nextStep(step: StudioStep) {
    if (processingRef.current || taskRef.current) return;
    if ((step === "remove" || step === "edit") && !latest.current.images.length)
      return;
    update((value) => ({ ...value, workflow: step }));
  }
  async function chooseStarter(
    template?: StudioTemplate,
    source?: (typeof CINEMA_TEMPLATES)[number],
  ) {
    if (taskRef.current || !ready.current) return;
    taskRef.current = true;
    setBusy("template");
    try {
      if (source && template && (template.revision || 0) < source.revision)
        template = undefined;
      if (!template && source) {
        if (latest.current.templates.length >= 200)
          throw new Error(
            "The project has 200 saved templates. Remove one before importing another.",
          );
        const response = await fetch(
          `/background-studio/cinema/${source.file}.svg`,
        );
        if (!response.ok)
          throw new Error(
            `Template download failed (${response.status}). Retry when connected.`,
          );
        template = await importSvgTemplate(await response.text(), source.name);
        template.id = source.id;
        template.revision = source.revision;
        template.design.templateId = source.id;
        update((value) => ({
          ...value,
          templates: [
            ...value.templates.filter(
              (item) => bundledTemplateForName(item.name)?.id !== source.id,
            ),
            template!,
          ],
        }));
      }
      const selected = template;
      update((value) => ({
        ...value,
        starterTemplate: selected,
        images: value.images.map((image) => starterImage(image, selected)),
      }));
      setStatus(
        selected
          ? `Template selected: ${selected.name}`
          : "Blank canvas selected.",
      );
    } catch (error) {
      setStatus(`Template was not changed: ${errorText(error)}`);
    } finally {
      taskRef.current = false;
      setBusy("");
    }
  }
  async function importTemplates(files: File[]) {
    if (!canManageTemplates) {
      setStatus("Admin access is required to import templates.");
      return;
    }
    if (!files.length || taskRef.current || !ready.current) return;
    taskRef.current = true;
    setBusy("import templates");
    let added = 0;
    try {
      const capacity = 200 - latest.current.templates.length;
      if (capacity <= 0)
        throw new Error(
          "The project has reached its 200-template storage limit.",
        );
      await importTemplateFiles(files, (template) => {
        if (added >= capacity)
          throw new Error(
            "The project has reached its 200-template storage limit. Earlier imported templates have been kept.",
          );
        added++;
        update((value) => ({
          ...value,
          templates: [...value.templates, template],
          starterTemplate:
            added === 1 && workflow !== "edit"
              ? template
              : value.starterTemplate,
          images:
            added === 1 && workflow !== "edit"
              ? value.images.map((image) => starterImage(image, template))
              : value.images,
        }));
        setStatus(`Imported ${added} template(s).`);
      });
      setCategory("Imported");
    } catch (error) {
      setStatus(
        `${added ? `${added} template(s) kept. ` : ""}Import: ${errorText(error)}`,
      );
    } finally {
      taskRef.current = false;
      setBusy("");
      if (templateInput.current) templateInput.current.value = "";
    }
  }
  function deleteTemplate(template: StudioTemplate) {
    if (!canManageTemplates) {
      setStatus("Admin access is required to delete templates.");
      return;
    }
    update((project) => ({
      ...project,
      templates: project.templates.filter((item) => item.id !== template.id),
      starterTemplate:
        project.starterTemplate?.id === template.id
          ? undefined
          : project.starterTemplate,
    }));
    setStatus(
      `Template deleted: ${template.name}. Existing image designs were preserved.`,
    );
  }
  function startSetupRemoval() {
    if (taskRef.current || processingRef.current) return;
    const ids = latest.current.images
      .filter((image) => !image.maskKey)
      .map((image) => image.id);
    update((value) => ({
      ...value,
      workflow: "edit",
      images: value.images.map((image) =>
        image.maskKey ? { ...image, useOriginal: false } : image,
      ),
    }));
    setRightTab("design");
    setView("design");
    if (ids.length) void process(ids);
  }
  function keepOriginals() {
    if (taskRef.current || processingRef.current) return;
    const before = latest.current.images.map(snapshot);
    update((value) => ({
      ...value,
      workflow: "edit",
      queue: [],
      images: value.images.map((image) => ({
        ...image,
        useOriginal: true,
        status: image.maskKey ? "ready" : "pending",
        error: undefined,
        design: image.design.subject.manual
          ? image.design
          : {
              ...image.design,
              subject: fitOriginalSubject(image, image.design),
            },
      })),
    }));
    pushHistory({ before, after: latest.current.images.map(snapshot) });
    setRightTab("design");
    setView("design");
    setStatus("Original images retained. No AI background removal was run.");
  }
  function changePhotoMode(useOriginal: boolean) {
    if (!current || (!useOriginal && !current.maskKey)) return;
    const design = current.design.subject.manual
      ? current.design
      : {
          ...current.design,
          subject: useOriginal
            ? fitOriginalSubject(current, current.design)
            : fitSubject(current, current.design),
        };
    editImage({ ...current, useOriginal, design }, current);
  }
  async function addTemplateImage() {
    const template = latest.current.starterTemplate,
      sample = template?.sampleImage;
    if (!template || !sample || taskRef.current) return;
    taskRef.current = true;
    setBusy("template image");
    try {
      const image = await readStudioUpload(
        new File([await studioAsset(sample.assetKey)], sample.name, {
          type: sample.type,
        }),
      );
      image.design = templateForImage(template, image.design, true);
      image.design.subject.manual = true;
      update((value) => ({
        ...value,
        images: [...value.images, image],
        activeId: value.activeId || image.id,
      }));
      setStatus(
        "Template image added. Choose original or remove its background.",
      );
    } catch (error) {
      setStatus(errorText(error));
    } finally {
      taskRef.current = false;
      setBusy("");
    }
  }
  function applyTextToAll(id: string, properties: string[]) {
    const value = latest.current,
      source = value.images.find((image) => image.id === value.activeId),
      text = source?.design.overlays.find(
        (layer) => layer.id === id && layer.type === "text",
      );
    if (!source || !text) return;
    const before: EditState[] = [],
      after: EditState[] = [];
    update((project) => ({
      ...project,
      images: project.images.map((image) => {
        if (image.id === source.id) return image;
        const next = applyStudioText(image, source, text, properties);
        if (next !== image) {
          before.push(snapshot(image));
          after.push(snapshot(next));
        }
        return next;
      }),
    }));
    if (before.length) pushHistory({ before, after });
    setStatus(
      `Updated text on ${before.length} image(s). Nonmatching or locked text and other layers were preserved.`,
    );
  }
  function applyElementToAll(id: string) {
    const value = latest.current;
    const source = value.images.find((image) => image.id === value.activeId);
    const sourceLayer = source?.design.overlays.find((layer) => layer.id === id);
    if (!source || !sourceLayer || sourceLayer.locked) return;

    const before: EditState[] = [],
      after: EditState[] = [];
    update((project) => ({
      ...project,
      images: project.images.map((image) => {
        if (image.id === source.id) return image;
        const candidates = image.design.overlays.filter(
          (layer) => layer.type === sourceLayer.type,
        );
        const sourceIndex = source.design.overlays
          .filter((layer) => layer.type === sourceLayer.type)
          .findIndex((layer) => layer.id === sourceLayer.id);
        let target = sourceLayer.templateCode
          ? candidates.find(
              (layer) => layer.templateCode === sourceLayer.templateCode,
            )
          : undefined;
        if (!target && sourceLayer.name) {
          target = candidates.find((layer) => layer.name === sourceLayer.name);
        }
        target ||= candidates[sourceIndex];
        if (!target || target.locked) return image;

        const shared = {
          x: sourceLayer.x,
          y: sourceLayer.y,
          width: sourceLayer.width,
          height: sourceLayer.height,
          rotation: sourceLayer.rotation,
          opacity: sourceLayer.opacity,
          visible: sourceLayer.visible,
        };
        const nextLayer: StudioOverlay =
          sourceLayer.type === "text"
            ? {
                ...target,
                ...shared,
                font: sourceLayer.font,
                fontSize: sourceLayer.fontSize,
                bold: sourceLayer.bold,
                align: sourceLayer.align,
                color: sourceLayer.color,
                textStyle: sourceLayer.textStyle,
              }
            : sourceLayer.type === "logo"
              ? { ...target, ...shared }
              : { ...target, ...shared, color: sourceLayer.color };
        const next = {
          ...image,
          design: {
            ...image.design,
            overlays: image.design.overlays.map((layer) =>
              layer.id === target!.id ? nextLayer : layer,
            ),
          },
        };
        before.push(snapshot(image));
        after.push(snapshot(next));
        return next;
      }),
    }));
    if (before.length) pushHistory({ before, after });
    setStatus(
      `Applied ${sourceLayer.type} settings to ${before.length} matching image(s). Different types, missing elements, locked layers, and logo assets were preserved.`,
    );
  }
  function batchUpdateTexts(
    changes: { imageIndex: number; elementId: string; newContent: string }[],
  ) {
    const requested = new Map<number, Map<string, string>>();
    for (const change of changes) {
      const imageChanges = requested.get(change.imageIndex) || new Map();
      imageChanges.set(change.elementId, change.newContent.slice(0, 10000));
      requested.set(change.imageIndex, imageChanges);
    }
    const before: EditState[] = [],
      after: EditState[] = [];
    update((project) => ({
      ...project,
      images: project.images.map((image, imageIndex) => {
        const imageChanges = requested.get(imageIndex);
        if (!imageChanges) return image;
        let changed = false;
        const overlays = image.design.overlays.map((overlay) => {
          const content = imageChanges.get(overlay.id);
          if (
            content === undefined ||
            overlay.type !== "text" ||
            overlay.locked ||
            overlay.text === content
          )
            return overlay;
          const element = studioTextElement(overlay, image.design);
          element.content = content;
          changed = true;
          return textOverlay(element, overlay, image.design, true);
        });
        if (!changed) return image;
        const next = {
          ...image,
          design: { ...image.design, overlays },
        };
        before.push(snapshot(image));
        after.push(snapshot(next));
        return next;
      }),
    }));
    if (before.length) pushHistory({ before, after });
    setStatus(
      before.length
        ? `Batch text updated on ${before.length} image(s). Existing styles, placement and other layers were preserved.`
        : "No matching unlocked text needed an update.",
    );
  }
  async function repairTemplateArtwork() {
    const image = latest.current.images.find(
        (item) => item.id === latest.current.activeId,
      ),
      artwork = image?.design.overlays.find(
        (item) =>
          item.name === "Template artwork" ||
          item.name === "Original template artwork",
      );
    if (!image || !artwork?.assetKey || taskRef.current) return;
    taskRef.current = true;
    setBusy("template artwork");
    try {
      const saved = latest.current.templates.find(
        (item) => item.id === image.design.templateId,
      );
      const { source, text } = await findBundledTemplateArtwork(
        await (await studioAsset(artwork.assetKey)).text(),
        saved?.name,
      );
      if (!repairSource || source.id !== repairSource.id)
        throw new Error("This artwork does not match the selected template.");
      const corrected = await importSvgTemplate(text, source.name),
        assetKey = corrected.design.overlays.find(
          (item) => item.name === "Template artwork",
        )?.assetKey,
        backgroundKey =
          corrected.design.background.type === "image"
            ? corrected.design.background.assetKey
            : undefined,
        oldBackgroundKey =
          saved?.design.background.type === "image"
            ? saved.design.background.assetKey
            : latest.current.starterTemplate?.id === image.design.templateId &&
                latest.current.starterTemplate.design.background.type ===
                  "image"
              ? latest.current.starterTemplate.design.background.assetKey
              : undefined,
        oldPhotoArea =
          saved?.design.photoArea ||
          (latest.current.starterTemplate?.id === image.design.templateId
            ? latest.current.starterTemplate.design.photoArea
            : undefined),
        newPhotoArea = corrected.design.photoArea;
      if (!assetKey)
        throw new Error(
          "The corrected template artwork could not be prepared.",
        );
      const samePhotoArea = (
        left: StudioDesign["photoArea"],
        right: StudioDesign["photoArea"],
      ) =>
        !!left &&
        !!right &&
        Math.abs(left.x - right.x) < 0.000001 &&
        Math.abs(left.y - right.y) < 0.000001 &&
        Math.abs(left.width - right.width) < 0.000001 &&
        Math.abs(left.height - right.height) < 0.000001;
      const templateText = new Map(
        corrected.design.overlays
          .filter((item) => item.type === "text" && item.templateCode)
          .map((item) => [item.templateCode!, item]),
      );
      const syncTemplateText = (item: StudioOverlay) => {
        if (item.type !== "text") return item;
        const sourceText = item.templateCode
          ? templateText.get(item.templateCode)
          : corrected.design.overlays.find(
              (candidate) =>
                candidate.type === "text" &&
                candidate.name === item.name &&
                source.texts.some((text) => text.name === item.name),
            );
        if (!sourceText) return item;
        return {
          ...item,
          name: sourceText.name,
          templateCode: sourceText.templateCode,
          x: sourceText.x,
          y: sourceText.y,
          width: sourceText.width,
          height: sourceText.height,
          font: sourceText.font,
          fontSize: sourceText.fontSize,
          bold: sourceText.bold,
          color: sourceText.color,
          align: sourceText.align,
          textStyle: sourceText.textStyle
            ? structuredClone(sourceText.textStyle)
            : undefined,
        };
      };
      const shouldReplacePhotoArea = (
        design: StudioDesign,
        cachedTemplate = false,
      ) =>
        !!newPhotoArea &&
        (cachedTemplate ||
          !oldPhotoArea ||
          samePhotoArea(design.photoArea, oldPhotoArea));
      const patch = (design: StudioDesign, cachedTemplate = false) => {
        const replaceBackground =
            design.background.type === "image" &&
            (cachedTemplate ||
              (!!oldBackgroundKey &&
                design.background.assetKey === oldBackgroundKey)),
          replacePhotoArea = shouldReplacePhotoArea(design, cachedTemplate);
        return {
          ...design,
          background: replaceBackground
            ? structuredClone(corrected.design.background)
            : design.background,
          photoArea: replacePhotoArea
            ? structuredClone(newPhotoArea)
            : design.photoArea,
          subject:
            cachedTemplate && replacePhotoArea
              ? structuredClone(corrected.design.subject)
              : design.subject,
          overlays: design.overlays.map((item) => {
            if (
              (item.name === "Template artwork" ||
                item.name === "Original template artwork") &&
              (cachedTemplate || item.assetKey === artwork.assetKey)
            )
              return { ...item, name: "Template artwork", assetKey };
            return syncTemplateText(item);
          }),
        };
      };
      const before: EditState[] = [],
        after: EditState[] = [];
      update((project) => ({
        ...project,
        images: project.images.map((target) => {
          const sameTemplate = image.design.templateId
            ? target.design.templateId === image.design.templateId
            : target.design.overlays.some((item) =>
                item.templateCode?.startsWith(`${source.id}:`),
              );
          if (
            !sameTemplate ||
            !target.design.overlays.some(
              (item) =>
                item.name === "Template artwork" ||
                item.name === "Original template artwork",
            )
          )
            return target;
          const replacePhotoArea = shouldReplacePhotoArea(target.design),
            repaired = patch(target.design),
            expectedSubject = target.useOriginal
              ? fitOriginalSubject(target, repaired)
              : fitSubject(target, repaired),
            previousSubject = target.design.subject,
            photoArea = repaired.photoArea || {
              x: 0,
              y: 0,
              width: 1,
              height: 1,
            },
            placementDrifted =
              Math.abs(previousSubject.x - expectedSubject.x) >
                Math.max(0.035, photoArea.width * 0.14) ||
              Math.abs(previousSubject.y - expectedSubject.y) >
                Math.max(0.035, photoArea.height * 0.14) ||
              Math.abs(previousSubject.width - expectedSubject.width) >
                Math.max(0.04, expectedSubject.width * 0.25) ||
              previousSubject.clipToPhotoArea !==
                expectedSubject.clipToPhotoArea,
            design =
              replacePhotoArea && placementDrifted
                ? { ...repaired, subject: expectedSubject }
                : repaired,
            next = { ...target, design };
          before.push(snapshot(target));
          after.push(snapshot(next));
          return next;
        }),
        templates: project.templates.map((template) =>
          template.id === image.design.templateId
            ? {
                ...template,
                revision: source.revision,
                design: patch(template.design, true),
              }
            : template,
        ),
        starterTemplate:
          project.starterTemplate?.id === image.design.templateId
            ? {
                ...project.starterTemplate,
                revision: source.revision,
                design: patch(project.starterTemplate.design, true),
              }
            : project.starterTemplate,
      }));
      if (before.length) pushHistory({ before, after });
      setStatus(
        `${source.name} duplicate lettering removed, text layout and font styles refreshed, and misplaced photos corrected on ${before.length} image(s). Custom backgrounds, text content and correctly positioned photos were preserved.`,
      );
    } catch (error) {
      setStatus(errorText(error));
    } finally {
      taskRef.current = false;
      setBusy("");
    }
  }
  repairTemplateArtworkRef.current = repairTemplateArtwork;
  async function upgradeTemplateText() {
    const id = latest.current.activeId;
    const image = latest.current.images.find((item) => item.id === id);
    const originalArtwork = image?.design.overlays.find(
      (item) => item.name === "Original template artwork",
    );
    if (
      !image ||
      !originalArtwork?.assetKey ||
      taskRef.current ||
      processingRef.current
    )
      return;
    taskRef.current = true;
    setBusy("editable text");
    try {
      const savedTemplate = latest.current.templates.find(
        (item) => item.id === image.design.templateId,
      );
      const { source, text } = await findBundledTemplateArtwork(
        await (await studioAsset(originalArtwork.assetKey)).text(),
        savedTemplate?.name,
      );
      const template = await importSvgTemplate(text, source.name);
      template.id = image.design.templateId || source.id;
      template.design.templateId = template.id;
      const current = latest.current.images.find((item) => item.id === id);
      if (!current) return;
      const art = template.design.overlays.find(
        (layer) => layer.name === "Template artwork",
      );
      const oldArt = current.design.overlays.find(
        (layer) => layer.name === "Original template artwork",
      );
      if (!oldArt || !art)
        throw new Error(
          "This template has already been converted or its original artwork was changed.",
        );
      const before: EditState[] = [],
        after: EditState[] = [];
      let selectedText = "subject";
      update((value) => ({
        ...value,
        images: value.images.map((target) => {
          const artwork = target.design.overlays.find(
            (layer) =>
              layer.name === "Original template artwork" &&
              layer.assetKey === originalArtwork.assetKey,
          );
          if (target.design.templateId !== image.design.templateId || !artwork)
            return target;
          const texts = template.design.overlays
            .filter((layer) => layer.type === "text")
            .map((layer) => ({
              ...layer,
              id: crypto.randomUUID(),
              x: artwork.x + layer.x * artwork.width,
              y: artwork.y + layer.y * artwork.height,
              width: layer.width * artwork.width,
              height: layer.height * artwork.height,
            }));
          if (texts.length + target.design.overlays.length > 200)
            throw new Error(
              "Remove some layers before converting this template's text.",
            );
          const next = {
            ...target,
            design: {
              ...target.design,
              overlays: [
                ...target.design.overlays.map((layer) =>
                  layer.id === artwork.id
                    ? { ...layer, assetKey: art.assetKey, name: art.name }
                    : layer,
                ),
                ...texts,
              ],
            },
          };
          before.push(snapshot(target));
          after.push(snapshot(next));
          if (target.id === id) selectedText = texts[0]?.id || "subject";
          return next;
        }),
        templates: [
          ...value.templates.filter((item) => item.id !== template.id),
          template,
        ],
        starterTemplate:
          value.starterTemplate?.id === template.id
            ? template
            : value.starterTemplate,
      }));
      if (before.length) pushHistory({ before, after });
      if (latest.current.activeId === id) setLayer(selectedText);
      setStatus(
        `Template lettering converted on ${before.length} image(s). Photographs, placement and other layers were preserved.`,
      );
    } catch (error) {
      setStatus(errorText(error));
    } finally {
      taskRef.current = false;
      setBusy("");
    }
  }
  function applyToBatch() {
    if (!current || !applyFields.length) return;
    const ids =
      applyScope === "all" ? project.images.map((image) => image.id) : selected;
    const before: EditState[] = [],
      after: EditState[] = [];
    update((project) => ({
      ...project,
      images: project.images.map((image) => {
        if (!ids.includes(image.id) || image.id === current.id) return image;
        const next = applyDesign(image, current.design, applyFields);
        before.push(snapshot(image));
        after.push(snapshot(next));
        return next;
      }),
    }));
    if (before.length) pushHistory({ before, after });
    setStatus(
      `Applied settings to ${before.length} image(s). Individual cutouts and brush corrections were preserved.`,
    );
  }
  function chooseAsset(type: "background" | "logo") {
    if (current) {
      auxiliary.current = { type, id: current.id };
      auxiliaryInput.current?.click();
    }
  }
  async function addAsset(file?: File) {
    const request = auxiliary.current;
    if (!request || !file) return;
    try {
      const decoded = await readStudioUpload(file),
        key = decoded.originalKey;
      const image = latest.current.images.find(
        (item) => item.id === request.id,
      );
      if (!image) return;
      if (
        request.type === "logo" &&
        !request.layerId &&
        image.design.overlays.length >= 200
      )
        throw new Error(
          "This design has reached the 200-layer limit. Remove a layer before adding another logo.",
        );
      const design = structuredClone(image.design);
      if (request.type === "background")
        design.background = {
          ...design.background,
          type: "image",
          assetKey: key,
        };
      else if (request.layerId) {
        const target = design.overlays.find(
          (layer) => layer.id === request.layerId,
        );
        if (!target || target.locked)
          throw new Error("This image layer is unavailable or locked.");
        target.assetKey = key;
      } else {
        const layer = {
          ...textLayer("", 0.06, 0.06, 0.18),
          type: "logo" as const,
          assetKey: key,
          height: Math.min(
            1,
            (((0.18 * design.width) / design.height) * decoded.height) /
              decoded.width,
          ),
        };
        design.overlays.push(layer);
        setLayer(layer.id);
        setRightTab("layers");
      }
      editImage({ ...image, design }, image);
    } catch (error) {
      setStatus(errorText(error));
    } finally {
      if (auxiliaryInput.current) auxiliaryInput.current.value = "";
    }
  }
  function removeImage(id: string) {
    update((project) => {
      const images = project.images.filter((image) => image.id !== id);
      return {
        ...project,
        images,
        queue: project.queue.filter((value) => value !== id),
        activeId:
          project.activeId === id ? images[0]?.id || null : project.activeId,
      };
    });
    setSelected((ids) => ids.filter((value) => value !== id));
  }
  async function exportImages() {
    if (exporting || taskRef.current || !targets.length) return;
    if (temporaryDownload.current) {
      setDownloadsOpen(true);
      setStatus(
        "Download and remove the temporary ZIP before starting another export.",
      );
      return;
    }
    if (
      exportKind === "cutout" &&
      targets.some((image) => !image.maskKey || image.useOriginal)
    ) {
      setStatus("Remove the background before exporting transparent cutouts.");
      return;
    }
    const images = targets.map((image) => ({ ...image }));
    exportRef.current = true;
    setExporting(true);
    stopExport.current = false;
    setExportFailures([]);
    setExportProgress({ done: 0, total: images.length });
    let archive = new JSZip(),
      count = 0,
      bytes = 0,
      part = 1;
    const failures: { id: string; name: string; error: string }[] = [],
      usedNames = new Set<string>();
    const flush = async () => {
      if (!count) return;
      const index = part++;
      await keepDownload(
        await archive.generateAsync({ type: "blob", compression: "STORE" }),
        `background-studio-${Date.now()}-part-${String(index).padStart(3, "0")}.zip`,
        count,
        "images",
        index === 1,
      );
      archive = new JSZip();
      count = 0;
      bytes = 0;
    };
    try {
      for (
        let index = 0;
        index < images.length && !stopExport.current;
        index++
      ) {
        const image = images[index];
        try {
          const extension = exportKind === "cutout" ? "png" : format;
          const canvas = await renderStudio(image, {
            view: exportKind === "cutout" ? "cutout" : "design",
            maxEdge: 0,
            whiteBackground: extension === "jpg",
            outputScale: exportScale,
          });
          try {
            const blob = await canvasBlob(
              canvas,
              extension === "jpg" ? "image/jpeg" : `image/${extension}`,
              quality / 100,
            );
            let name = outputName(
              pattern || "{name}-{n}",
              image,
              index,
              extension,
            );
            const base = name.slice(0, -extension.length - 1);
            let duplicate = 1;
            while (usedNames.has(name.toLowerCase()))
              name = `${base}-${duplicate++}.${extension}`;
            usedNames.add(name.toLowerCase());
            if (images.length === 1) saveAs(blob, name);
            else {
              if (
                count &&
                (count >= partCount || bytes + blob.size > partMB * 1024 * 1024)
              )
                await flush();
              archive.file(name, await blob.arrayBuffer());
              count++;
              bytes += blob.size;
            }
            update((project) => ({
              ...project,
              images: project.images.map((item) =>
                item.id === image.id && item.error?.startsWith("Export:")
                  ? { ...item, error: undefined }
                  : item,
              ),
            }));
          } finally {
            canvas.width = canvas.height = 1;
          }
        } catch (error) {
          const message = errorText(error);
          failures.push({ id: image.id, name: image.name, error: message });
          setExportFailures([...failures]);
          update((project) => ({
            ...project,
            images: project.images.map((item) =>
              item.id === image.id
                ? { ...item, error: `Export: ${message}` }
                : item,
            ),
          }));
        }
        setExportProgress({ done: index + 1, total: images.length });
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }
      await flush();
      if (part > 1) {
        setExportOpen(false);
        setDownloadsOpen(true);
      }
      setStatus(
        `${stopExport.current ? "Export stopped; completed files are ready" : "Export completed"}${part > 1 ? " | ZIP parts are available in Downloads" : ""}${failures.length ? ` | ${failures.length} image(s) need review` : ""}.`,
      );
    } catch (error) {
      setStatus(
        `Export failed: ${errorText(error)}. Previously downloaded parts are preserved.`,
      );
    } finally {
      exportRef.current = false;
      setExporting(false);
      clearStudioRasters();
    }
  }
  const chooseTool = (next: StudioTool) => {
    setTool(next);
    if (next === "erase" || next === "restore") {
      setView("mask");
      setRightTab("remove");
    } else if (next === "move") setView("design");
  };
  const go = () => {
    const index = Number(serial) - 1;
    if (Number.isInteger(index) && project.images[index]) {
      selectImage(project.images[index].id);
      setLibraryPage(Math.floor(index / 30));
      setFilter("all");
      setSearch("");
    } else setStatus("Enter a valid image number.");
  };
  void historyVersion;
  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2">
        <ToolBackButton />
        <Wand2 size={19} className="text-primary" />
        <h1 className="mr-auto text-base font-semibold">Background Studio</h1>
        <span
          className={`text-xs ${saveError ? "text-destructive" : "text-muted-foreground"}`}
        >
          {saving
            ? "Saving..."
            : dirty.current
              ? "Unsaved changes"
              : restored
                ? "Saved locally"
                : "Recovering..."}
        </span>
        <ThemeToggle />
        <Button
          size="sm"
          variant="outline"
          disabled={!restored || !!busy || processing || exporting}
          onClick={() => setClearConfirm(true)}
        >
          New Project
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!restored || !!busy || processing || exporting}
          onClick={() => projectInput.current?.click()}
        >
          <FolderOpen size={14} />
          Load
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={
            exporting ||
            !restored ||
            !!busy ||
            (!project.images.length &&
              !project.templates.length &&
              !project.starterTemplate)
          }
          onClick={() => void saveProject()}
        >
          <Save size={14} />
          Save
        </Button>
        <Button
          size="sm"
          disabled={!current || workflow !== "edit"}
          onClick={() => setExportOpen(true)}
        >
          <Download size={14} />
          Export
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!downloads.length}
          onClick={() => setDownloadsOpen(true)}
        >
          <FolderOpen size={14} />
          Downloads ({downloads.length})
        </Button>
      </header>
      <input
        hidden
        ref={uploadInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif"
        multiple
        onChange={(event) => void upload(Array.from(event.target.files || []))}
      />
      <input
        hidden
        ref={projectInput}
        type="file"
        accept=".zip,.json"
        multiple
        onChange={(event) =>
          void loadProject(Array.from(event.target.files || []))
        }
      />
      {canManageTemplates && (
        <input
          hidden
          ref={templateInput}
          type="file"
          accept=".svg,.zip"
          multiple
          onChange={(event) =>
            void importTemplates(Array.from(event.target.files || []))
          }
        />
      )}
      <input
        hidden
        ref={auxiliaryInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => void addAsset(event.target.files?.[0])}
      />
      {saveError && (
        <div
          role="alert"
          className="shrink-0 border-b bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          {saveError}
        </div>
      )}
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2 text-xs">
        <Button
          className="lg:hidden"
          size="icon"
          variant="outline"
          aria-label="Open image library"
          title="Image library"
          onClick={() => setPanel(panel === "library" ? null : "library")}
        >
          <Images size={16} />
        </Button>
        <span
          role="status"
          aria-live="polite"
          className="mr-auto min-w-0 truncate"
          title={status || current?.name}
        >
          {busy
            ? `${busy}... ${status}`
            : status || current?.name || "No images"}
        </span>
        {status.length > 80 && (
          <button
            className="shrink-0 p-1"
            title="View status details"
            aria-label="View status details"
            onClick={() => setDetailsOpen(true)}
          >
            <Info size={15} />
          </button>
        )}
        <span className="shrink-0 text-muted-foreground">
          {readyCount}/{project.images.length} ready
          {errors ? ` | ${errors} issues` : ""}
          {device ? ` | ${device === "webgpu" ? "GPU" : "CPU"}` : ""}
        </span>
        <Button
          className="lg:hidden"
          size="icon"
          variant="outline"
          aria-label="Open settings"
          title="Settings"
          onClick={() => setPanel(panel === "settings" ? null : "settings")}
        >
          <Settings2 size={16} />
        </Button>
      </div>
      {processing && (
        <div className="flex shrink-0 items-center gap-3 border-b px-3 py-2 text-xs">
          <span className="min-w-0 flex-1 truncate" title={progress.stage}>
            {progress.stage}
          </span>
          <span>
            {progress.done}/{progress.total}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              stop.current = true;
              stopBackgroundRemoval();
            }}
          >
            <Square size={12} />
            Stop Processing
          </Button>
        </div>
      )}
      <nav
        aria-label="Project workflow"
        className="flex shrink-0 gap-1 overflow-x-auto border-b px-2 py-2"
      >
        {STUDIO_STEPS.map(({ id, name }, index) => (
          <button
            key={id}
            aria-label={`${name} step`}
            aria-current={workflow === id ? "step" : undefined}
            disabled={
              !restored ||
              !!busy ||
              processing ||
              ((id === "edit" || id === "remove") && !project.images.length)
            }
            className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs ${workflow === id ? "bg-accent font-semibold" : "text-muted-foreground"}`}
            onClick={() => nextStep(id)}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full border text-[11px]">
              {index + 1}
            </span>
            {name}
          </button>
        ))}
      </nav>
      {workflow !== "edit" ? (
        <StudioSetup
          project={project}
          step={workflow}
          busy={!!busy}
          restored={restored}
          choose={(template, source) => void chooseStarter(template, source)}
          next={nextStep}
          upload={(files) =>
            files ? void upload(files) : uploadInput.current?.click()
          }
          importTemplates={() => templateInput.current?.click()}
          removeTemplate={deleteTemplate}
          canManageTemplates={canManageTemplates}
          remove={startSetupRemoval}
          keepOriginals={keepOriginals}
          useTemplateImage={() => void addTemplateImage()}
          mode={setMode}
          device={setProcessingDevice}
        />
      ) : (
        <div className="relative flex min-h-0 flex-1">
          <aside
            className={`${panel === "library" ? "absolute inset-y-0 left-0 z-30 flex shadow-xl" : "hidden"} w-[240px] shrink-0 flex-col border-r bg-background lg:static lg:z-auto lg:flex lg:shadow-none`}
          >
            <div className="flex gap-1 border-b p-2">
              <Button
                className="flex-1"
                size="sm"
                variant={leftTab === "library" ? "secondary" : "ghost"}
                onClick={() => setLeftTab("library")}
              >
                <Images size={14} />
                Images
              </Button>
              <Button
                className="flex-1"
                size="sm"
                variant={leftTab === "templates" ? "secondary" : "ghost"}
                onClick={() => setLeftTab("templates")}
              >
                <LayoutTemplate size={14} />
                Templates
              </Button>
              <button
                className="lg:hidden"
                aria-label="Close library"
                onClick={() => setPanel(null)}
              >
                <X size={16} />
              </button>
            </div>
            {leftTab === "library" ? (
              <>
                <div className="space-y-2 border-b p-3">
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled={!restored || !!busy}
                    onClick={() => uploadInput.current?.click()}
                  >
                    <Upload size={15} />
                    Add Images
                  </Button>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-8"
                      aria-label="Find images"
                      placeholder="Find images"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                  <select
                    aria-label="Image filter"
                    className={selectClass}
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                  >
                    <option value="all">
                      All images ({project.images.length})
                    </option>
                    <option value="ready">Ready ({readyCount})</option>
                    <option value="pending">
                      Pending (
                      {
                        project.images.filter(
                          (image) =>
                            !studioImageReady(image) &&
                            image.status !== "error",
                        ).length
                      }
                      )
                    </option>
                    <option value="error">Issues ({errors})</option>
                  </select>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() =>
                        setSelected(filtered.map((image) => image.id))
                      }
                    >
                      Select Filtered
                    </button>
                    <button
                      className="text-muted-foreground"
                      onClick={() => setSelected([])}
                    >
                      Clear ({selected.length})
                    </button>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-2">
                  <div className="grid grid-cols-3 gap-2">
                    {visible.map((image) => (
                      <div
                        className={`group relative aspect-square overflow-hidden rounded-md border-2 ${project.activeId === image.id ? "border-primary" : "border-transparent"}`}
                        key={image.id}
                      >
                        <button
                          className="studio-checker h-full w-full"
                          title={`${image.name}${image.error ? `\n${image.error}` : ""}`}
                          onClick={() => {
                            selectImage(image.id);
                            setPanel(null);
                          }}
                        >
                          <AssetImage
                            assetKey={image.thumbnailKey}
                            alt={image.name}
                            className="h-full w-full object-contain"
                          />
                        </button>
                        <input
                          type="checkbox"
                          className="absolute left-1 top-1 h-3.5 w-3.5"
                          aria-label={`Select ${image.name}`}
                          checked={selected.includes(image.id)}
                          onChange={(event) =>
                            setSelected((ids) =>
                              event.target.checked
                                ? [...ids, image.id]
                                : ids.filter((id) => id !== image.id),
                            )
                          }
                        />
                        <span className="absolute bottom-0 left-0 bg-black/65 px-1 text-[10px] text-white">
                          {project.images.indexOf(image) + 1}
                        </span>
                        {image.status === "processing" ? (
                          <Loader2 className="absolute right-1 top-1 h-3 w-3 animate-spin text-primary" />
                        ) : image.error ? (
                          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
                        ) : studioImageReady(image) ? (
                          <Check className="absolute right-1 top-1 h-3 w-3 text-emerald-600" />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t p-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Previous image library page"
                    disabled={pageIndex === 0}
                    onClick={() => setLibraryPage(pageIndex - 1)}
                  >
                    <ChevronLeft size={15} />
                  </Button>
                  <span className="text-xs">
                    {pageIndex + 1}/
                    {Math.max(1, Math.ceil(filtered.length / 30))}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Next image library page"
                    disabled={(pageIndex + 1) * 30 >= filtered.length}
                    onClick={() => setLibraryPage(pageIndex + 1)}
                  >
                    <ChevronRight size={15} />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="border-b p-3">
                  <select
                    aria-label="Template category"
                    className={selectClass}
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    {[
                      "All",
                      "Product",
                      "Portrait",
                      "Social",
                      "Thumbnail",
                      "Minimal",
                      "Saved",
                      "Imported",
                    ].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                  {canManageTemplates && (
                    <Button
                      className="mt-2 w-full"
                      size="sm"
                      variant="outline"
                      disabled={!!busy}
                      onClick={() => templateInput.current?.click()}
                    >
                      <Upload size={14} />
                      Import SVG / ZIP
                    </Button>
                  )}
                  <label className="mt-2 flex items-start gap-2 text-xs">
                    <input
                      aria-label="Apply template placement"
                      type="checkbox"
                      checked={applyPlacement}
                      onChange={(event) =>
                        setApplyPlacement(event.target.checked)
                      }
                    />
                    Apply template placement
                  </label>
                </div>
                <div className="min-h-0 flex-1 overflow-auto p-2">
                  {current ? (
                    <div className="grid grid-cols-2 gap-2">
                      {templates.map((template) => (
                        <div
                          key={template.id}
                          className="overflow-hidden rounded-md border"
                        >
                          <button
                            className="block w-full text-left"
                            aria-label={template.name}
                            onClick={() => applyTemplate(template)}
                          >
                            <TemplatePreview
                              image={current}
                              template={template}
                            />
                            <span
                              className="block truncate p-2 text-xs"
                              title={template.name}
                            >
                              {template.name}
                            </span>
                          </button>
                          {canManageTemplates &&
                            (template.category === "Saved" ||
                              (!STUDIO_TEMPLATES.some(
                                (item) => item.id === template.id,
                              ) &&
                                !CINEMA_TEMPLATES.some(
                                  (item) => item.id === template.id,
                                ))) && (
                              <button
                                className="p-1 text-xs text-destructive"
                                onClick={() => deleteTemplate(template)}
                              >
                                Delete
                              </button>
                            )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="p-3 text-xs text-muted-foreground">
                      Add an image to preview templates.
                    </p>
                  )}
                </div>
                <div className="space-y-2 border-t p-3">
                  <Input
                    aria-label="Template name"
                    maxLength={100}
                    placeholder="Template name"
                    value={templateName}
                    onChange={(event) => setTemplateName(event.target.value)}
                  />
                  <Button
                    className="w-full"
                    variant="outline"
                    size="sm"
                    disabled={
                      !current ||
                      !templateName.trim() ||
                      project.templates.length >= 200
                    }
                    onClick={() => {
                      const template: StudioTemplate = {
                        id: crypto.randomUUID(),
                        name: templateName.trim(),
                        category: "Saved",
                        design: structuredClone(current!.design),
                      };
                      update((project) => ({
                        ...project,
                        templates: [...project.templates, template],
                      }));
                      setTemplateName("");
                      setCategory("Saved");
                    }}
                  >
                    <Save size={14} />
                    Save Template
                  </Button>
                </div>
              </>
            )}
          </aside>
          <main
            className="flex min-h-0 min-w-0 flex-1 flex-col"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void upload(Array.from(event.dataTransfer.files));
            }}
          >
            <div className="flex shrink-0 flex-wrap items-center gap-1 border-b p-2">
              <Button
                size="icon"
                variant="ghost"
                title="Undo"
                aria-label="Undo"
                disabled={!history.current.past.length}
                onClick={() => undo()}
              >
                <Undo2 size={16} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title="Redo"
                aria-label="Redo"
                disabled={!history.current.future.length}
                onClick={() => undo(true)}
              >
                <Redo2 size={16} />
              </Button>
              <span className="mx-1 h-6 border-r" />
              {(
                [
                  { key: "move", Icon: MousePointer2, label: "Move" },
                  { key: "erase", Icon: Eraser, label: "Erase" },
                  { key: "restore", Icon: Brush, label: "Restore" },
                  { key: "pan", Icon: Hand, label: "Pan" },
                ] as const
              ).map(({ key, Icon, label }) => (
                <Button
                  key={key}
                  size="icon"
                  variant={tool === key ? "secondary" : "ghost"}
                  title={label}
                  aria-label={label}
                  disabled={
                    !current ||
                    ((key === "erase" || key === "restore") &&
                      (!current.maskKey || current.useOriginal))
                  }
                  onClick={() => chooseTool(key)}
                >
                  <Icon size={16} />
                </Button>
              ))}
              {!!project.images.length && (
                <div
                  className="ml-auto flex items-center gap-0.5 rounded-md border bg-background p-0.5 shadow-sm"
                  aria-label="Image navigation"
                >
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label="First image"
                    title="First image (Home)"
                    disabled={activeIndex <= 0}
                    onClick={() => navigateToImage(0)}
                  >
                    <ChevronsLeft size={16} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label="Previous image"
                    title="Previous image (Page Up or Ctrl + Left)"
                    disabled={activeIndex <= 0}
                    onClick={() => navigateToImage(activeIndex - 1)}
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <span
                    className="min-w-[6.5rem] truncate px-1 text-center text-xs font-medium tabular-nums"
                    aria-live="polite"
                    title={current?.name}
                  >
                    Image {activeIndex + 1} of {project.images.length}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label="Next image"
                    title="Next image (Page Down or Ctrl + Right)"
                    disabled={
                      activeIndex < 0 ||
                      activeIndex >= project.images.length - 1
                    }
                    onClick={() => navigateToImage(activeIndex + 1)}
                  >
                    <ChevronRight size={16} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label="Last image"
                    title="Last image (End)"
                    disabled={
                      activeIndex < 0 ||
                      activeIndex >= project.images.length - 1
                    }
                    onClick={() => navigateToImage(project.images.length - 1)}
                  >
                    <ChevronsRight size={16} />
                  </Button>
                </div>
              )}
              <div
                className={`${project.images.length ? "" : "ml-auto"} flex rounded-md bg-muted p-0.5`}
              >
                {(["design", "cutout", "original", "compare"] as const).map(
                  (value) => (
                    <button
                      key={value}
                      className={`px-2 py-1.5 text-xs capitalize ${view === value ? "rounded bg-background shadow-sm" : "text-muted-foreground"}`}
                      onClick={() => {
                        setView(value);
                        setTool(value === "design" ? "move" : "pan");
                      }}
                      disabled={!current}
                    >
                      {value}
                    </button>
                  ),
                )}
              </div>
            </div>
            {current ? (
              <StudioCanvas
                image={current}
                view={view}
                compare={compare}
                tool={tool}
                zoom={zoom}
                brushSize={brushSize}
                hardness={hardness}
                selectedLayer={layer}
                onSelectLayer={(id) => {
                  setLayer(id);
                  if (id !== "subject") setRightTab("layers");
                }}
                onChange={editImage}
                onError={setStatus}
              />
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center bg-muted/30">
                <button
                  className="flex flex-col items-center gap-3 rounded-md border border-dashed px-12 py-10 text-muted-foreground"
                  disabled={!restored}
                  onClick={() => uploadInput.current?.click()}
                >
                  <ImagePlus size={40} />
                  <span className="text-sm font-medium">Add Images</span>
                </button>
              </div>
            )}
            {view === "compare" && current && (
              <div className="shrink-0 border-t px-4 py-2">
                <input
                  aria-label="Before and after comparison"
                  type="range"
                  min={0}
                  max={100}
                  value={compare}
                  onChange={(event) => setCompare(Number(event.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            )}
            {current?.error && (
              <div
                role="alert"
                className="shrink-0 border-t bg-red-50 p-2 text-xs text-red-800 dark:bg-red-950 dark:text-red-100"
              >
                {current.error}
              </div>
            )}
            <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t px-2 py-1">
              <span className="text-xs text-muted-foreground">
                Jump to image
              </span>
              <Input
                className="h-7 w-16"
                aria-label="Image number"
                placeholder="#"
                value={serial}
                onChange={(event) => setSerial(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") go();
                }}
              />
              <button className="text-xs" onClick={go}>
                Go
              </button>
              <span className="ml-auto hidden text-xs text-muted-foreground sm:block">
                {current
                  ? `${current.design.width} x ${current.design.height}`
                  : ""}
              </span>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Zoom out"
                title="Zoom out"
                onClick={() => setZoom((v) => Math.max(0.25, v - 0.25))}
              >
                <ZoomOut size={15} />
              </Button>
              <span className="w-10 text-center text-xs">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Zoom in"
                title="Zoom in"
                onClick={() => setZoom((v) => Math.min(4, v + 0.25))}
              >
                <ZoomIn size={15} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Fit view"
                title="Fit view"
                onClick={() => setZoom(1)}
              >
                <Maximize2 size={15} />
              </Button>
            </footer>
          </main>
          <aside
            className={`${panel === "settings" ? "absolute inset-y-0 right-0 z-30 flex shadow-xl" : "hidden"} w-[350px] max-w-[95vw] shrink-0 flex-col border-l bg-background lg:static lg:z-auto lg:flex lg:shadow-none`}
          >
            <div className="flex shrink-0 border-b p-2">
              {["remove", "design", "layers", "batch"].map((value) => (
                <button
                  className={`flex-1 rounded px-1 py-2 text-xs capitalize ${rightTab === value ? "bg-accent font-semibold" : "text-muted-foreground"}`}
                  key={value}
                  onClick={() => setRightTab(value)}
                >
                  {value}
                </button>
              ))}
              <button
                className="lg:hidden"
                aria-label="Close settings"
                onClick={() => setPanel(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {needsTemplateArtworkRepair && (
                <Button
                  variant="outline"
                  className="h-auto w-full whitespace-normal"
                  disabled={!!busy}
                  onClick={() => void repairTemplateArtwork()}
                >
                  <Wand2 size={15} />
                  Repair Template Artwork
                </Button>
              )}
              {rightTab === "remove" && (
                <>
                  {current && (
                    <div
                      className="grid grid-cols-2 gap-2"
                      aria-label="Image treatment"
                    >
                      <Button
                        size="sm"
                        variant={current.useOriginal ? "default" : "outline"}
                        onClick={() => changePhotoMode(true)}
                      >
                        Original Image
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          !current.useOriginal && current.maskKey
                            ? "default"
                            : "outline"
                        }
                        disabled={!current.maskKey}
                        onClick={() => changePhotoMode(false)}
                      >
                        Removed Background
                      </Button>
                    </div>
                  )}
                  <label className="block space-y-1 text-xs">
                    AI mode
                    <select
                      aria-label="AI mode"
                      className={selectClass}
                      value={mode}
                      disabled={processing}
                      onChange={(event) =>
                        setMode(event.target.value as RemovalMode)
                      }
                    >
                      <option value="general">General / Products</option>
                      <option value="portrait">Portrait / Hair</option>
                    </select>
                  </label>
                  <label className="block space-y-1 text-xs">
                    Processing device
                    <select
                      aria-label="Processing device"
                      className={selectClass}
                      value={processingDevice}
                      disabled={processing}
                      onChange={(event) =>
                        setProcessingDevice(
                          event.target.value as "auto" | "cpu",
                        )
                      }
                    >
                      <option value="auto">Automatic / GPU if available</option>
                      <option value="cpu">CPU compatibility</option>
                    </select>
                  </label>
                  <Button
                    className="w-full"
                    disabled={!current || processing}
                    onClick={() => current && void process([current.id])}
                  >
                    <Wand2 size={15} />
                    {current?.maskKey ? "Reprocess Image" : "Remove Background"}
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        processing ||
                        (!project.queue.length &&
                          !project.images.some(
                            (image) =>
                              !studioImageReady(image) &&
                              image.status !== "error",
                          ))
                      }
                      onClick={() =>
                        void process(
                          project.queue.length
                            ? project.queue
                            : project.images
                                .filter(
                                  (image) =>
                                    !studioImageReady(image) &&
                                    image.status !== "error",
                                )
                                .map((image) => image.id),
                        )
                      }
                    >
                      {project.queue.length
                        ? `Continue Queue (${project.queue.length})`
                        : "Continue Pending"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        processing ||
                        !project.images.some(
                          (image) =>
                            image.status === "error" ||
                            image.error?.startsWith("Removal:"),
                        )
                      }
                      onClick={() =>
                        void process(
                          project.images
                            .filter(
                              (image) =>
                                image.status === "error" ||
                                image.error?.startsWith("Removal:"),
                            )
                            .map((image) => image.id),
                        )
                      }
                    >
                      Retry Failed
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={processing || !selected.length}
                    onClick={() => void process(selected)}
                  >
                    Process Selected ({selected.length})
                  </Button>
                  {processing && (
                    <div className="space-y-2">
                      <p className="break-words text-xs text-muted-foreground">
                        {progress.stage}
                      </p>
                      <progress
                        aria-label="Background removal progress"
                        className="h-2 w-full accent-primary"
                        value={progress.done}
                        max={Math.max(1, progress.total)}
                      />
                      <div className="flex justify-between text-xs">
                        <span>
                          {progress.done}/{progress.total}
                        </span>
                        <button
                          className="flex gap-1 text-destructive"
                          onClick={() => {
                            stop.current = true;
                            stopBackgroundRemoval();
                          }}
                        >
                          <Square size={12} />
                          Stop
                        </button>
                      </div>
                    </div>
                  )}
                  <section className="space-y-4 border-t pt-4">
                    <h3 className="text-sm font-semibold">Brush</h3>
                    <RangeField
                      label="Brush size"
                      value={brushSize}
                      min={4}
                      max={300}
                      onChange={setBrushSize}
                    />
                    <RangeField
                      label="Brush hardness (%)"
                      value={hardness}
                      onChange={setHardness}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant={tool === "erase" ? "secondary" : "outline"}
                        disabled={!current?.maskKey || current.useOriginal}
                        onClick={() => chooseTool("erase")}
                      >
                        <Eraser size={14} />
                        Erase
                      </Button>
                      <Button
                        size="sm"
                        variant={tool === "restore" ? "secondary" : "outline"}
                        disabled={!current?.maskKey || current.useOriginal}
                        onClick={() => chooseTool("restore")}
                      >
                        <Brush size={14} />
                        Restore
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={!current?.strokes.length}
                      onClick={() =>
                        current &&
                        editImage({ ...current, strokes: [] }, current)
                      }
                    >
                      <RotateCcw size={14} />
                      Reset Brush Edits
                    </Button>
                  </section>
                  {current && (
                    <section className="space-y-4 border-t pt-4">
                      <h3 className="text-sm font-semibold">Refine Edges</h3>
                      <RangeField
                        label="Feather"
                        value={current.design.refine.feather}
                        max={20}
                        step={0.5}
                        onChange={(feather) =>
                          changeDesign({
                            refine: { ...current.design.refine, feather },
                          })
                        }
                      />
                      <RangeField
                        label="Edge expand / shrink"
                        value={current.design.refine.edge}
                        min={-15}
                        max={15}
                        onChange={(edge) =>
                          changeDesign({
                            refine: { ...current.design.refine, edge },
                          })
                        }
                      />
                      <RangeField
                        label="Edge contrast"
                        value={current.design.refine.contrast}
                        max={80}
                        onChange={(contrast) =>
                          changeDesign({
                            refine: { ...current.design.refine, contrast },
                          })
                        }
                      />
                    </section>
                  )}
                </>
              )}
              {rightTab === "design" && current && (
                <DesignControls
                  image={current}
                  change={changeDesign}
                  upload={chooseAsset}
                />
              )}
              {rightTab === "layers" && current && (
                <>
                  {current.design.overlays.some(
                    (item) => item.name === "Original template artwork",
                  ) && (
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled={!!busy || processing}
                      onClick={() => void upgradeTemplateText()}
                    >
                      Make Template Text Editable
                    </Button>
                  )}
                  <LayerControls
                    image={current}
                    selected={layer}
                    applyElementToAll={applyElementToAll}
                    select={(id) => {
                      setLayer(id);
                      setView("design");
                      setTool("move");
                    }}
                    change={changeDesign}
                    textControls={
                      current.design.overlays.find(
                        (item) => item.id === layer && item.type === "text",
                      ) ? (
                        <StudioTextControls
                          key={`${current.id}:${layer}`}
                          image={current}
                          layer={
                            current.design.overlays.find(
                              (item) => item.id === layer,
                            )!
                          }
                          totalImages={project.images.length}
                          change={editImage}
                          apply={applyTextToAll}
                          batchUpdate={() => setBatchTextOpen(true)}
                          select={setLayer}
                        />
                      ) : undefined
                    }
                    upload={() => chooseAsset("logo")}
                    replace={(layerId) => {
                      auxiliary.current = {
                        type: "logo",
                        id: current.id,
                        layerId,
                      };
                      auxiliaryInput.current?.click();
                    }}
                  />
                </>
              )}
              {rightTab === "batch" && (
                <>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={
                      project.images.length < 2 ||
                      !current?.design.overlays.some(
                        (item) => item.type === "text" && !item.locked,
                      )
                    }
                    onClick={() => setBatchTextOpen(true)}
                  >
                    <ClipboardPaste size={15} />
                    Batch Update Text Elements
                  </Button>
                  <h3 className="text-sm font-semibold">
                    Apply Current Settings
                  </h3>
                  <select
                    aria-label="Apply settings scope"
                    className={selectClass}
                    value={applyScope}
                    onChange={(event) => setApplyScope(event.target.value)}
                  >
                    <option value="selected">
                      Selected images ({selected.length})
                    </option>
                    <option value="all">
                      All images ({project.images.length})
                    </option>
                  </select>
                  {(
                    [
                      { field: "background", label: "Background" },
                      { field: "shadow", label: "Shadow" },
                      { field: "outline", label: "Outline" },
                      { field: "canvas", label: "Canvas dimensions" },
                      {
                        field: "template",
                        label: "Template and text/logo layers",
                      },
                      {
                        field: "placement",
                        label: "Subject placement (replace)",
                      },
                    ] as { field: ApplyField; label: string }[]
                  ).map(({ field, label }) => (
                    <label
                      key={field}
                      className="flex items-start gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={applyFields.includes(field)}
                        onChange={(event) =>
                          setApplyFields((fields) =>
                            event.target.checked
                              ? [...fields, field]
                              : fields.filter((value) => value !== field),
                          )
                        }
                      />
                      {label}
                    </label>
                  ))}
                  <Button
                    className="w-full"
                    disabled={
                      !current ||
                      !applyFields.length ||
                      (applyScope === "selected" && !selected.length)
                    }
                    onClick={applyToBatch}
                  >
                    Apply Settings
                  </Button>
                  <div className="border-t pt-4">
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={!current}
                      onClick={() => current && removeImage(current.id)}
                    >
                      <Trash2 size={14} />
                      Remove Current Image
                    </Button>
                    <Button
                      className="mt-2 w-full"
                      variant="outline"
                      onClick={() => {
                        clearStudioRasters();
                        setStatus(
                          "Preview cache cleared. Originals and masks are preserved.",
                        );
                      }}
                    >
                      Clear Preview Cache
                    </Button>
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      )}
      <BatchUpdateTextDialog
        open={batchTextOpen}
        onOpenChange={setBatchTextOpen}
        images={batchTextImages}
        currentImageIndex={Math.max(0, activeIndex)}
        onUpdateTexts={batchUpdateTexts}
      />
      <Dialog open={clearConfirm} onOpenChange={setClearConfirm}>
        <DialogContent>
          <DialogTitle>Start a New Project?</DialogTitle>
          <DialogDescription>
            Current images and edits will be removed from this workspace.
            Download a project backup first to keep a portable copy. Saved
            templates will stay available.
          </DialogDescription>
          <Button
            variant="destructive"
            onClick={() => {
              ready.current = true;
              setSaveError("");
              update((previous) => ({
                ...newProject(),
                templates: previous.templates,
                fonts: previous.fonts,
              }));
              history.current = { past: [], future: [] };
              setSelected([]);
              setClearConfirm(false);
              setStatus("New project created.");
            }}
          >
            Start New Project
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={downloadsOpen} onOpenChange={setDownloadsOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
          <DialogTitle>Prepared Downloads</DialogTitle>
          <DialogDescription>
            Download each ZIP part here. Cached files remain available after
            refresh. Removing a cached ZIP does not change your editable
            project.
          </DialogDescription>
          <div className="max-h-[55dvh] space-y-2 overflow-auto">
            {downloads
              .slice(downloadPage * 20, downloadPage * 20 + 20)
              .map((part) => (
                <div
                  key={part.id}
                  className="flex items-center gap-2 border-b py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-all text-xs font-medium">{part.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {part.kind === "project"
                        ? "Project backup"
                        : `${part.count} images`}{" "}
                      | {(part.size / 1048576).toFixed(1)} MB
                      {part.temporary
                        ? " | Temporary: download before closing"
                        : ""}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    title={`Download ${part.name}`}
                    aria-label={`Download ${part.name}`}
                    disabled={!!downloading}
                    onClick={() => void downloadPart(part)}
                  >
                    <Download size={15} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Remove cached file"
                    aria-label={`Remove ${part.name}`}
                    onClick={() => setRemoveDownload(part)}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              ))}
          </div>
          <div className="flex items-center justify-between">
            <Button
              size="icon"
              variant="outline"
              aria-label="Previous downloads page"
              disabled={downloadPage === 0}
              onClick={() => setDownloadsPage(downloadPage - 1)}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="text-xs">
              {downloadPage + 1}/{Math.max(1, Math.ceil(downloads.length / 20))}
            </span>
            <Button
              size="icon"
              variant="outline"
              aria-label="Next downloads page"
              disabled={(downloadPage + 1) * 20 >= downloads.length}
              onClick={() => setDownloadsPage(downloadPage + 1)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogTitle>Status Details</DialogTitle>
          <DialogDescription className="max-h-[65dvh] overflow-auto whitespace-pre-wrap break-words">
            {status}
          </DialogDescription>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!removeDownload}
        onOpenChange={(open) => {
          if (!open) setRemoveDownload(undefined);
        }}
      >
        <DialogContent>
          <DialogTitle>Remove Cached Download?</DialogTitle>
          <DialogDescription>
            {removeDownload?.name} will be removed from this browser's download
            cache. Your images, masks, and project edits will not be changed.
          </DialogDescription>
          <Button
            variant="destructive"
            onClick={async () => {
              if (!removeDownload) return;
              const id = removeDownload.id;
              try {
                if (temporaryDownload.current?.part.id === id)
                  temporaryDownload.current = undefined;
                else await removeStudioDownload(id);
                setDownloads((previous) =>
                  previous.filter((part) => part.id !== id),
                );
                setRemoveDownload(undefined);
              } catch (error) {
                setStatus(errorText(error));
              }
            }}
          >
            Remove Cached File
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogTitle>Export Images</DialogTitle>
          <DialogDescription>
            {exporting ? exportProgress.total : targets.length} image(s){" "}
            {exporting ? "exporting" : "selected for export"}
          </DialogDescription>
          <fieldset disabled={exporting} className="space-y-4">
            <label className="block space-y-1 text-sm">
              Output
              <select
                aria-label="Export output"
                className={selectClass}
                disabled={exporting}
                value={exportKind}
                onChange={(event) => setExportKind(event.target.value)}
              >
                <option value="design">Complete design</option>
                <option value="cutout">Transparent cutout PNG</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-sm">
                Images
                <select
                  aria-label="Export scope"
                  className={selectClass}
                  disabled={exporting}
                  value={exportScope}
                  onChange={(event) => setExportScope(event.target.value)}
                >
                  <option value="current">Current image</option>
                  <option value="selected">Selected ready images</option>
                  <option value="all">All ready images ({readyCount})</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                Format
                <select
                  aria-label="Export format"
                  className={selectClass}
                  disabled={exporting || exportKind === "cutout"}
                  value={exportKind === "cutout" ? "png" : format}
                  onChange={(event) => setFormat(event.target.value)}
                >
                  <option value="png">PNG</option>
                  <option value="jpg">JPG</option>
                  <option value="webp">WebP</option>
                </select>
              </label>
            </div>
            {exportKind !== "cutout" && format !== "png" && (
              <RangeField
                label="Export quality (%)"
                value={quality}
                min={50}
                max={100}
                onChange={setQuality}
              />
            )}
            <label className="space-y-1 text-sm">
              Export scale
              <select
                aria-label="Export scale"
                className={selectClass}
                disabled={exporting}
                value={exportScale}
                onChange={(event) => setExportScale(Number(event.target.value))}
              >
                <option value={0.25}>25%</option>
                <option value={0.5}>50%</option>
                <option value={1}>100% / full resolution</option>
                <option value={2}>200%</option>
              </select>
            </label>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {current &&
                `Current output: ${Math.max(1, Math.round((exportKind === "cutout" ? current.width : current.design.width) * exportScale))} × ${Math.max(1, Math.round((exportKind === "cutout" ? current.height : current.design.height) * exportScale))} px`}
            </p>
            <label
              className="block space-y-1 text-sm"
              title="{name}: original filename; {n}: export sequence"
            >
              File naming
              <Input
                aria-label="File naming pattern"
                value={pattern}
                disabled={exporting}
                onChange={(event) => setPattern(event.target.value)}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Images per ZIP part"
                value={partCount}
                min={1}
                max={1000}
                onChange={(value) => setPartCount(Math.round(value))}
              />
              <NumberField
                label="ZIP target size (MB)"
                value={partMB}
                min={10}
                max={500}
                onChange={(value) => setPartMB(Math.round(value))}
              />
            </div>
          </fieldset>
          {exporting && (
            <>
              <progress
                aria-label="Export progress"
                className="h-2 w-full accent-primary"
                value={exportProgress.done}
                max={exportProgress.total}
              />
              <p className="text-xs">
                {exportProgress.done}/{exportProgress.total}
              </p>
            </>
          )}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              disabled={exporting || !!busy || !targets.length}
              onClick={() => void exportImages()}
            >
              <Download size={15} />
              Download
            </Button>
            {exporting && (
              <Button
                variant="outline"
                onClick={() => {
                  stopExport.current = true;
                }}
              >
                <Square size={14} />
                Stop Export
              </Button>
            )}
          </div>
          {exportFailures.length > 0 && (
            <div className="max-h-36 overflow-auto border-t pt-3">
              {exportFailures.map((item) => (
                <button
                  key={item.id}
                  className="block w-full py-2 text-left text-xs text-destructive"
                  onClick={() => {
                    selectImage(item.id);
                    setExportOpen(false);
                  }}
                >
                  {item.name}: {item.error}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
