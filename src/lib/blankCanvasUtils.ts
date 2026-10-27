import { BlankCanvasPreset } from "@/types/editor";

export const DEFAULT_BLANK_CANVAS_PRESET: BlankCanvasPreset = {
  fillType: "solid",
  color: "#ffffff",
  gradientStart: "#fda085",
  gradientEnd: "#f6d365",
  gradientDirection: "diagonal-down",
  border: {
    enabled: false,
    style: "solid",
    lines: [{ color: "#111111", width: 4 }],
    gap: 4,
    radius: 0,
    shadow: false,
    shadowColor: "#000000",
    shadowBlur: 12,
    shadowOffsetX: 0,
    shadowOffsetY: 4,
  },
  vignette: false,
  vignetteStrength: 40,
  noise: 0,
  backgroundImage: undefined,
};

export interface BlankPresetSummary {
  name: string;
  preset: BlankCanvasPreset;
}

const solid = (color: string): BlankCanvasPreset => ({ ...DEFAULT_BLANK_CANVAS_PRESET, fillType: "solid", color });
const linear = (
  a: string,
  b: string,
  dir: BlankCanvasPreset["gradientDirection"] = "diagonal-down",
): BlankCanvasPreset => ({
  ...DEFAULT_BLANK_CANVAS_PRESET,
  fillType: "linear",
  gradientStart: a,
  gradientEnd: b,
  gradientDirection: dir,
});

export const SOLID_PRESETS: BlankPresetSummary[] = [
  { name: "White", preset: solid("#ffffff") },
  { name: "Off-white", preset: solid("#f5f3ee") },
  { name: "Cream", preset: solid("#fdf6e3") },
  { name: "Soft Sand", preset: solid("#e8dcc4") },
  { name: "Slate", preset: solid("#475569") },
  { name: "Charcoal", preset: solid("#1f2937") },
  { name: "Black", preset: solid("#0a0a0a") },
  { name: "Navy", preset: solid("#0f1b3d") },
  { name: "Brand Blue", preset: solid("#3b82f6") },
  { name: "Brand Red", preset: solid("#dc2626") },
  { name: "Emerald", preset: solid("#059669") },
  { name: "Rose", preset: solid("#e11d48") },
];

export const GRADIENT_PRESETS: BlankPresetSummary[] = [
  { name: "Sunset", preset: linear("#ff6b6b", "#feca57") },
  { name: "Ocean", preset: linear("#2e8bc0", "#145374") },
  { name: "Mint", preset: linear("#d4fc79", "#96e6a1", "vertical") },
  { name: "Lavender", preset: linear("#a18cd1", "#fbc2eb") },
  { name: "Peach", preset: linear("#fda085", "#f6d365") },
  { name: "Aurora", preset: linear("#4ade80", "#a78bfa", "diagonal-up") },
  { name: "Midnight", preset: linear("#0f0c29", "#302b63") },
  { name: "Forest", preset: linear("#134e5e", "#71b280", "vertical") },
  { name: "Rose Gold", preset: linear("#f6d5d5", "#c9a48a") },
  { name: "Iridescent", preset: linear("#c4b5fd", "#67e8f9", "horizontal") },
  { name: "Cherry", preset: linear("#fef0f5", "#e88aab", "vertical") },
  { name: "Autumn", preset: linear("#9b4423", "#e8b84a") },
];

export const QUICK_PRESETS: BlankPresetSummary[] = [...SOLID_PRESETS, ...GRADIENT_PRESETS];

export const presetSwatchCSS = (p: BlankCanvasPreset): string => {
  if (p.fillType === "solid") return p.color;
  const dirMap = {
    horizontal: "to right",
    vertical: "to bottom",
    "diagonal-down": "135deg",
    "diagonal-up": "45deg",
  } as const;
  if (p.fillType === "linear")
    return `linear-gradient(${dirMap[p.gradientDirection]}, ${p.gradientStart}, ${p.gradientEnd})`;
  return `radial-gradient(circle, ${p.gradientStart}, ${p.gradientEnd})`;
};

const gradientCoords = (
  dir: BlankCanvasPreset["gradientDirection"],
  w: number,
  h: number,
): [number, number, number, number] => {
  switch (dir) {
    case "horizontal":
      return [0, h / 2, w, h / 2];
    case "vertical":
      return [w / 2, 0, w / 2, h];
    case "diagonal-up":
      return [0, h, w, 0];
    case "diagonal-down":
    default:
      return [0, 0, w, h];
  }
};

const loadImg = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const drawBackgroundImage = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  fit: "cover" | "contain" | "stretch" | "tile",
) => {
  if (fit === "stretch") {
    ctx.drawImage(img, 0, 0, w, h);
    return;
  }
  if (fit === "tile") {
    const pat = ctx.createPattern(img, "repeat");
    if (pat) {
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, w, h);
    }
    return;
  }
  const ir = img.width / img.height;
  const cr = w / h;
  let dw: number, dh: number;
  if (fit === "cover" ? ir > cr : ir < cr) {
    dh = h;
    dw = h * ir;
  } else {
    dw = w;
    dh = w / ir;
  }
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
};

const applyNoise = (ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) => {
  if (amount <= 0) return;
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const intensity = amount * 1.5;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * intensity;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(imageData, 0, 0);
};

export async function renderBlankCanvasToDataURL(
  preset: BlankCanvasPreset,
  width: number,
  height: number,
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // 1) Base fill
  if (preset.fillType === "solid") {
    ctx.fillStyle = preset.color;
    ctx.fillRect(0, 0, width, height);
  } else if (preset.fillType === "linear") {
    const [x0, y0, x1, y1] = gradientCoords(preset.gradientDirection, width, height);
    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, preset.gradientStart);
    grad.addColorStop(1, preset.gradientEnd);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else {
    const grad = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.1,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.7,
    );
    grad.addColorStop(0, preset.gradientStart);
    grad.addColorStop(1, preset.gradientEnd);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // 2) Background image overlay
  if (preset.backgroundImage?.src) {
    try {
      const img = await loadImg(preset.backgroundImage.src);
      ctx.save();
      ctx.globalAlpha = preset.backgroundImage.opacity / 100;
      ctx.globalCompositeOperation = (preset.backgroundImage.blendMode as GlobalCompositeOperation) || "source-over";
      if (!preset.backgroundImage.preserveFill) {
        // If not preserving, clear the fill underneath first
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        ctx.clearRect(0, 0, width, height);
        ctx.globalAlpha = preset.backgroundImage.opacity / 100;
      }
      drawBackgroundImage(ctx, img, width, height, preset.backgroundImage.fit);
      ctx.restore();
    } catch (e) {
      console.warn("Blank canvas bg image failed to load", e);
    }
  }

  // 3) Vignette
  if (preset.vignette) {
    const v = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.4,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.75,
    );
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, `rgba(0,0,0,${preset.vignetteStrength / 100})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, width, height);
  }

  // 4) Noise
  if (preset.noise > 0) {
    try {
      applyNoise(ctx, width, height, preset.noise);
    } catch (e) {
      // crossorigin or perf issue — silently skip
    }
  }

  // 5) Border (multi-line for double/triple)
  if (preset.border.enabled && preset.border.lines.length > 0) {
    if (preset.border.shadow) {
      ctx.shadowColor = preset.border.shadowColor;
      ctx.shadowBlur = preset.border.shadowBlur;
      ctx.shadowOffsetX = preset.border.shadowOffsetX;
      ctx.shadowOffsetY = preset.border.shadowOffsetY;
    }
    let inset = 0;
    preset.border.lines.forEach((line) => {
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.width;
      if (preset.border.style === "dashed") ctx.setLineDash([line.width * 3, line.width * 2]);
      else if (preset.border.style === "dotted") ctx.setLineDash([line.width, line.width * 2]);
      else ctx.setLineDash([]);
      const off = inset + line.width / 2;
      const r = Math.max(0, preset.border.radius - inset);
      const x = off,
        y = off,
        w = width - off * 2,
        h = height - off * 2;
      ctx.beginPath();
      if (r > 0 && (ctx as any).roundRect) {
        (ctx as any).roundRect(x, y, w, h, r);
      } else {
        ctx.rect(x, y, w, h);
      }
      ctx.stroke();
      inset += line.width + preset.border.gap;
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    });
    ctx.setLineDash([]);
  }

  return canvas.toDataURL("image/png");
}

// ---- Saved presets persistence ----
const STORAGE_KEY = "blank-canvas-saved-presets";

export function loadSavedPresets(): BlankPresetSummary[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function savePreset(name: string, preset: BlankCanvasPreset) {
  const all = loadSavedPresets().filter((p) => p.name !== name);
  all.push({ name, preset });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function deletePreset(name: string) {
  const all = loadSavedPresets().filter((p) => p.name !== name);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function renamePreset(oldName: string, newName: string) {
  const trimmed = newName.trim();
  if (!trimmed) return;
  const all = loadSavedPresets().map((p) =>
    p.name === oldName ? { ...p, name: trimmed } : p,
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function exportPresetsJSON(): string {
  return JSON.stringify({ version: 1, presets: loadSavedPresets() }, null, 2);
}

/** Returns count of presets added/replaced. Throws on invalid JSON. */
export function importPresetsJSON(raw: string): number {
  const parsed = JSON.parse(raw);
  const list: BlankPresetSummary[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.presets)
      ? parsed.presets
      : [];
  if (!list.length) return 0;
  const current = loadSavedPresets();
  const byName = new Map(current.map((p) => [p.name, p] as const));
  for (const p of list) {
    if (p && typeof p.name === "string" && p.preset) byName.set(p.name, p);
  }
  const merged = Array.from(byName.values());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return list.length;
}
