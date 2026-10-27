export interface CollageImage {
  id: string;
  src: string;
  name: string;
}

export interface CellTransform {
  zoom: number;
  panX: number;
  panY: number;
  rotation: number;
}

export interface CellFilter {
  name: string;
  filter: string;
}

export interface CellTextOverlay {
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string;
  position: "top" | "center" | "bottom";
  opacity: number;
}

export interface GridLayout {
  name: string;
  rows: number;
  cols: number;
  cells: { row: number; col: number; rowSpan?: number; colSpan?: number }[];
  featured?: boolean;
}

export interface SavedCollage {
  id: string;
  thumbnail: string;
  cellImages: Record<number, string>;
  cellTransforms: Record<number, CellTransform>;
  cellFilters: Record<number, string>;
  cellTexts: Record<number, CellTextOverlay>;
  layout: string;
  spacing: number;
  borderRadius: number;
  backgroundColor: string;
  canvasSize: string;
}

export interface ExportOptions {
  format: "png" | "jpg" | "jpeg";
  quality: number;
  mode: "single" | "batch";
  naming: "sequential" | "timestamp" | "custom";
  customPrefix?: string;
}

export const PRESET_FILTERS: CellFilter[] = [
  { name: "None", filter: "none" },
  { name: "Grayscale", filter: "grayscale(100%)" },
  { name: "Sepia", filter: "sepia(100%)" },
  { name: "Vintage", filter: "sepia(50%) contrast(90%) brightness(90%)" },
  { name: "Warm", filter: "sepia(30%) saturate(120%)" },
  { name: "Cool", filter: "hue-rotate(180deg) saturate(80%)" },
  { name: "High Contrast", filter: "contrast(150%)" },
  { name: "Fade", filter: "opacity(80%) brightness(110%)" },
  { name: "Dramatic", filter: "contrast(120%) brightness(90%) saturate(130%)" },
];

export const COLOR_PALETTES = {
  neutral: ["#ffffff", "#f8f9fa", "#e9ecef", "#dee2e6", "#ced4da", "#adb5bd", "#6c757d", "#495057", "#343a40", "#212529"],
  warm: ["#fff5f5", "#ffe3e3", "#ffc9c9", "#ffa8a8", "#ff8787", "#ff6b6b", "#fa5252", "#f03e3e", "#e03131", "#c92a2a"],
  cool: ["#e7f5ff", "#d0ebff", "#a5d8ff", "#74c0fc", "#4dabf7", "#339af0", "#228be6", "#1c7ed6", "#1971c2", "#1864ab"],
  nature: ["#ebfbee", "#d3f9d8", "#b2f2bb", "#8ce99a", "#69db7c", "#51cf66", "#40c057", "#37b24d", "#2f9e44", "#2b8a3e"],
  pastel: ["#fff0f6", "#ffdeeb", "#fcc2d7", "#faa2c1", "#f783ac", "#f06595", "#e64980", "#d6336c", "#c2255c", "#a61e4d"],
};

export const STANDARD_LAYOUTS: GridLayout[] = [
  { name: "2x1", rows: 1, cols: 2, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
  { name: "1x2", rows: 2, cols: 1, cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }] },
  { name: "2x2", rows: 2, cols: 2, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }] },
  { name: "3x1", rows: 1, cols: 3, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }] },
  { name: "1x3", rows: 3, cols: 1, cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }] },
  { name: "3x2", rows: 2, cols: 3, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }] },
  { name: "2x3", rows: 3, cols: 2, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 0 }, { row: 2, col: 1 }] },
  { name: "3x3", rows: 3, cols: 3, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }] },
  { name: "4x4", rows: 4, cols: 4, cells: Array.from({ length: 16 }, (_, i) => ({ row: Math.floor(i / 4), col: i % 4 })) },
];

export const FEATURED_LAYOUTS: GridLayout[] = [
  { 
    name: "Hero Left", 
    rows: 2, 
    cols: 3, 
    featured: true,
    cells: [
      { row: 0, col: 0, rowSpan: 2, colSpan: 2 },
      { row: 0, col: 2 },
      { row: 1, col: 2 }
    ]
  },
  { 
    name: "Hero Right", 
    rows: 2, 
    cols: 3, 
    featured: true,
    cells: [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 0, col: 1, rowSpan: 2, colSpan: 2 }
    ]
  },
  { 
    name: "Hero Top", 
    rows: 3, 
    cols: 2, 
    featured: true,
    cells: [
      { row: 0, col: 0, colSpan: 2 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 2, col: 0 },
      { row: 2, col: 1 }
    ]
  },
  { 
    name: "Hero Center", 
    rows: 3, 
    cols: 3, 
    featured: true,
    cells: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 2, col: 0 },
      { row: 2, col: 1 },
      { row: 2, col: 2 }
    ]
  },
  { 
    name: "L-Shape", 
    rows: 2, 
    cols: 2, 
    featured: true,
    cells: [
      { row: 0, col: 0, rowSpan: 2 },
      { row: 0, col: 1 },
      { row: 1, col: 1 }
    ]
  },
  { 
    name: "T-Shape", 
    rows: 2, 
    cols: 3, 
    featured: true,
    cells: [
      { row: 0, col: 0, colSpan: 3 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 }
    ]
  },
  { 
    name: "Focus", 
    rows: 3, 
    cols: 3, 
    featured: true,
    cells: [
      { row: 0, col: 0 },
      { row: 0, col: 1, colSpan: 2 },
      { row: 1, col: 0, rowSpan: 2, colSpan: 2 },
      { row: 1, col: 2 },
      { row: 2, col: 2 }
    ]
  },
  { 
    name: "Gallery", 
    rows: 2, 
    cols: 4, 
    featured: true,
    cells: [
      { row: 0, col: 0, rowSpan: 2, colSpan: 2 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
      { row: 1, col: 2 },
      { row: 1, col: 3 }
    ]
  },
];

export const CANVAS_SIZES = [
  { name: "Square (1080x1080)", width: 1080, height: 1080 },
  { name: "Instagram Post", width: 1080, height: 1350 },
  { name: "Instagram Story", width: 1080, height: 1920 },
  { name: "Facebook Post", width: 1200, height: 630 },
  { name: "Twitter Post", width: 1200, height: 675 },
  { name: "Pinterest", width: 1000, height: 1500 },
  { name: "HD (1920x1080)", width: 1920, height: 1080 },
  { name: "4K (3840x2160)", width: 3840, height: 2160 },
  { name: "Custom", width: 1080, height: 1080 },
];