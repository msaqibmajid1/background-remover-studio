export type ElementType = "text" | "logo" | "watermark" | "rectangle" | "circle" | "image" | "line" | "arrow" | "star" | "polygon" | "group";

// Word-by-word styling
export interface WordStyle {
  wordIndex: number;
  color: string;
  colorType?: "solid" | "gradient";
  gradientStartColor?: string;
  gradientEndColor?: string;
  gradientDirection?: "horizontal" | "vertical" | "diagonal-down" | "diagonal-up" | "radial";
  backgroundColor?: string;
  bold?: boolean;
  italic?: boolean;
}

// Word styling slot for regenerating styles on different text
export interface WordStyleSlot {
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

// Word styling rules for applying to different texts
// A single selection step for composite multi-select mode
export interface WordStyleRuleStep {
  mode: "first" | "last" | "random" | "numbers" | "cycle" | "line";
  slotId: number;
  /** When set, distribute the matched words across these slots cyclically. */
  slotIds?: number[];
  firstN?: number;
  lastN?: number;
  randomPercent?: number;
  lineN?: number;
  lineCount?: number;
  lineFrom?: "first" | "last" | "specific";
  lineColorMode?: "solid" | "cycle";
}

export interface WordStyleRules {
  slots: WordStyleSlot[];
  // Selection rules
  mode: "manual" | "first" | "last" | "random" | "numbers" | "cycle" | "preset" | "composite" | "line";
  firstN?: number;
  lastN?: number;
  randomPercent?: number;
  lineN?: number;
  lineCount?: number;
  lineFrom?: "first" | "last" | "specific";
  slotIds?: number[];
  lineColorMode?: "solid" | "cycle";
  // For preset mode
  presetName?: string;
  // For composite multi-select mode (multiple steps applied in sequence)
  steps?: WordStyleRuleStep[];
}

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  locked?: boolean;
  visible?: boolean;
  groupId?: string;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  skewX?: number;
  skewY?: number;
  // Element naming for batch operations (user-friendly label)
  name?: string;
  // Template code - stable unique identifier for batch matching across images
  // Generated when element is created, preserved when applied to other images
  // Regenerated when element is duplicated on the same image
  templateCode?: string;
  // DEPRECATED: Use templateCode instead. Kept for backward compatibility
  sourceElementId?: string;
}

export interface TextElement extends BaseElement {
  type: "text";
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  textDecoration: string;
  textTransform: string;
  color: string;
  colorType: "solid" | "gradient";
  gradientColor: string;
  gradientStartColor?: string;
  gradientEndColor?: string;
  gradientDirection?: "horizontal" | "vertical" | "diagonal-down" | "diagonal-up" | "radial";
  strokeColor: string;
  strokeWidth: number;
  textAlign: string;
  verticalAlign: "top" | "middle" | "bottom";
  lineHeight: number;
  letterSpacing: number;
  wordSpacing: number;
  autoFitText: boolean;
  dimensionsLocked?: boolean;
  shadow: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  backgroundColor: string;
  backgroundOpacity: number;
  backgroundPadding: number;
  backgroundRadius: number;
  textBoxBorder: boolean;
  textBoxBorderColor: string;
  textBoxBorderWidth: number;
  textBoxBorderRadius?: number;
  textBoxBorderStyle?: "solid" | "dashed" | "dotted" | "double" | "groove" | "ridge";
  textBoxBorderDashPattern?: number[];
  // Individual text box border sides (Excel-like)
  textBoxBorderTop?: boolean;
  textBoxBorderRight?: boolean;
  textBoxBorderBottom?: boolean;
  textBoxBorderLeft?: boolean;
  // Text box border shadow
  textBoxBorderShadow?: boolean;
  textBoxBorderShadowColor?: string;
  textBoxBorderShadowBlur?: number;
  textBoxBorderShadowOffsetX?: number;
  textBoxBorderShadowOffsetY?: number;
  // Text box fill type
  textBoxFillType?: "solid" | "gradient";
  textBoxGradientFill?: string;
  textBoxGradientStartColor?: string;
  textBoxGradientEndColor?: string;
  textBoxGradientDirection?: "horizontal" | "vertical" | "diagonal-down" | "diagonal-up" | "radial";
  curveAngle?: number;
  // Text path following - expanded with 100+ shapes
  textPath?: "none" | "circle" | "wave" | "arc-up" | "arc-down" | "spiral" | "heart" | "diamond" | "custom" |
    // Stars and geometric
    "star-5" | "star-6" | "star-8" | "hexagon" | "pentagon" | "octagon" | "triangle" | "square-path" |
    // Waves and curves
    "zigzag" | "sine-wave" | "double-wave" | "triple-wave" | "smooth-wave" | "sharp-wave" |
    // Symbols
    "infinity" | "figure-8" | "clover" | "cross" | "plus" | "moon" | "sun" | "cloud" |
    // Arrows and lines
    "arrow-up" | "arrow-down" | "arrow-left" | "arrow-right" | "chevron" | "double-chevron" |
    // Nature
    "flower" | "leaf" | "tree" | "mountain" | "drop" | "flame" |
    // Abstract
    "swirl" | "tornado" | "helix" | "dna" | "ribbon" | "banner" |
    // Letters
    "s-curve" | "u-shape" | "v-shape" | "w-shape" | "m-shape" | "n-shape" |
    // Decorative
    "scallop" | "bracket" | "parenthesis" | "brace" | "scroll" | "flourish" |
    // Complex
    "butterfly" | "crown" | "shield" | "badge" | "medal" | "frame" |
    // Geometric patterns
    "circle-half" | "circle-quarter" | "ellipse" | "oval" | "egg" | "teardrop" |
    // Fun shapes
    "lightning" | "bolt" | "spark" | "explosion" | "burst" | "splash" |
    // Speech bubbles
    "speech-bubble" | "thought-bubble" | "callout" |
    // Banners
    "ribbon-banner" | "flag" | "pennant" | "streamer" |
    // Tech
    "circuit" | "pulse" | "soundwave" | "frequency" |
    // Organic
    "blob" | "amoeba" | "cell" | "organic-1" | "organic-2";
  customPath?: string; // SVG path data for custom paths
  pathOffset?: number; // Offset along the path (0-100)
  // Word-by-word styling support
  wordStyles?: WordStyle[];
  wordStylesEnabled?: boolean;
  wordStyleRules?: WordStyleRules; // Rules for regenerating word styles on different text
  wordStyleBgPadding?: number; // Padding for word background boxes (0-20)
  wordStyleBgRadius?: number;  // Border radius for word background boxes (0-20)
  // Outline glow effect
  outlineGlow?: boolean;
  outlineGlowColor?: string;
  outlineGlowBlur?: number;
  outlineGlowSpread?: number;
  // Render the text background box as a parallelogram with this slant in degrees, while keeping glyphs straight.
  parallelogramSlant?: number;
}

export interface ImageElement extends BaseElement {
  type: "logo" | "watermark" | "image";
  src: string;
  maintainAspectRatio: boolean;
  blendMode: string;
  filter?: ImageFilter;
  // Path resolution tracking
  originalFilename?: string;
  thumbnail?: string;
  needsResolution?: boolean;
}

export interface ShapeElement extends BaseElement {
  type: "rectangle" | "circle" | "star" | "polygon";
  fillColor: string;
  fillType?: "solid" | "gradient";
  gradientFill?: string;
  fillOpacity: number;
  backgroundImage?: string;
  backgroundOpacity: number;
  borderColor: string;
  borderWidth: number;
  borderOpacity: number;
  cornerRadius?: number;
  dashed: boolean;
  borderStyle: "solid" | "dashed" | "dotted" | "double" | "groove" | "ridge";
  borderDashPattern?: number[];
  // Individual border sides (Excel-like) - all true by default
  borderTop?: boolean;
  borderRight?: boolean;
  borderBottom?: boolean;
  borderLeft?: boolean;
  // Border shadow
  borderShadow?: boolean;
  borderShadowColor?: string;
  borderShadowBlur?: number;
  borderShadowOffsetX?: number;
  borderShadowOffsetY?: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  shadow: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  sides?: number; // For polygon
  points?: number; // For star
  backgroundImageFit?: "cover" | "contain";
  // Mirror this shape's background image to the blank canvas background
  syncWithCanvasBackground?: boolean;
  canvasSyncOpacity?: number; // 0-100
  // Render the rectangle as a parallelogram with this slant in degrees, while keeping content un-skewed.
  parallelogramSlant?: number;
}

export interface LineElement extends BaseElement {
  type: "line" | "arrow";
  strokeColor: string;
  strokeWidth: number;
  dashed: boolean;
  dashArray?: number[];
  lineCap?: "butt" | "round" | "square";
  lineJoin?: "miter" | "round" | "bevel";
  endX: number;
  endY: number;
}

export interface GroupElement extends BaseElement {
  type: "group";
  elements: string[]; // Array of element IDs
}

export type CanvasElement = TextElement | ImageElement | ShapeElement | LineElement | GroupElement;

export interface ImageFilter {
  type: "none" | "grayscale" | "sepia" | "invert" | "brightness" | "contrast" | "saturation" | "blur" | "hue-rotate";
  value?: number;
}

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
  color: string;
  mode: "outer" | "inner";
}

export interface CanvasSize {
  width: number;
  height: number;
  aspectRatio: string;
}

export interface BlankCanvasBorderLine {
  color: string;
  width: number;
}

export interface BlankCanvasPreset {
  fillType: "solid" | "linear" | "radial";
  color: string;
  gradientStart: string;
  gradientEnd: string;
  gradientDirection: "horizontal" | "vertical" | "diagonal-down" | "diagonal-up";
  border: {
    enabled: boolean;
    style: "solid" | "dashed" | "dotted" | "double" | "triple";
    lines: BlankCanvasBorderLine[]; // length 1 for solid/dashed/dotted; 2 for double; 3 for triple
    gap: number;
    radius: number;
    shadow: boolean;
    shadowColor: string;
    shadowBlur: number;
    shadowOffsetX: number;
    shadowOffsetY: number;
  };
  vignette: boolean;
  vignetteStrength: number;
  noise: number; // 0-100
  backgroundImage?: {
    src: string;
    opacity: number;
    fit: "cover" | "contain" | "stretch" | "tile";
    blendMode: string;
    preserveFill: boolean;
  };
}

export interface EditorImage {
  id: string;
  file: File;
  src: string;
  originalWidth: number;
  originalHeight: number;
  canvasSize: CanvasSize;
  elements: CanvasElement[];
  filter: ImageFilter;
  padding: Padding;
  // Path resolution tracking
  originalFilename?: string;
  thumbnail?: string;
  needsResolution?: boolean;
  // Blank canvas (no source photo) tracking
  isBlankCanvas?: boolean;
  blankCanvasPreset?: BlankCanvasPreset;
}

export interface ExportSettings {
  quality: "original" | "high" | "medium" | "low";
  format: "png" | "jpg";
  naming: "numbers" | "original" | "custom";
  customPrefix?: string;
}

