import type { TextElement } from "@/types/editor";
import { calculateOptimalFontSize } from "../textAutoFit";
import {
  canRegenerateWordStyles,
  generateWordStylesFromRules,
  getVisualOptionsForTextElement,
} from "../wordStyleUtils";
import { studioTextStyleSchema } from "./textStyleSchema";
import type { StudioDesign, StudioImage, StudioOverlay } from "./types";

export function studioTextElement(
  layer: StudioOverlay,
  design: Pick<StudioDesign, "width" | "height">,
): TextElement {
  return {
    fontFamily: layer.font,
    fontSize: layer.fontSize,
    fontWeight: layer.bold ? "bold" : "normal",
    fontStyle: "normal",
    textDecoration: "none",
    textTransform: "none",
    color: layer.color,
    colorType: "solid",
    gradientColor: "",
    strokeColor: "#000000",
    strokeWidth: 0,
    textAlign: layer.align,
    verticalAlign: "top",
    lineHeight: 1.15,
    letterSpacing: 0,
    wordSpacing: 0,
    autoFitText: true,
    shadow: false,
    shadowColor: "#000000",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    backgroundColor: "transparent",
    backgroundOpacity: 0,
    backgroundPadding: 0,
    backgroundRadius: 0,
    textBoxBorder: false,
    textBoxBorderColor: "#000000",
    textBoxBorderWidth: 0,
    ...(layer.textStyle as Partial<TextElement>),
    id: layer.id,
    type: "text",
    content: layer.text,
    name: layer.name,
    templateCode: layer.templateCode,
    x: layer.x * design.width,
    y: layer.y * design.height,
    width: layer.width * design.width,
    height: layer.height * design.height,
    rotation: layer.rotation,
    opacity: layer.opacity,
    zIndex: 1,
    locked: layer.locked,
    visible: layer.visible,
  };
}
export function resolvedStudioText(element: TextElement): TextElement {
  const next = { ...element };
  if (next.autoFitText)
    next.fontSize = Math.min(next.fontSize, calculateOptimalFontSize(next));
  const rules = next.wordStyleRules;
  // Random assignments are persisted on edit/apply, never randomized during repaint/export.
  const random =
    rules?.mode === "random" ||
    rules?.steps?.some((step) => step.mode === "random");
  if (next.wordStylesEnabled && canRegenerateWordStyles(rules) && !random)
    next.wordStyles = generateWordStylesFromRules(
      next.content,
      next.textTransform,
      rules!,
      getVisualOptionsForTextElement(next),
    );
  return next;
}
export function textOverlay(
  element: TextElement,
  old: StudioOverlay,
  design: Pick<StudioDesign, "width" | "height">,
  regenerate = false,
): StudioOverlay {
  const next = { ...element };
  if (
    regenerate &&
    next.wordStylesEnabled &&
    canRegenerateWordStyles(next.wordStyleRules)
  ) {
    const fitted = resolvedStudioText(next);
    next.wordStyles = generateWordStylesFromRules(
      next.content,
      next.textTransform,
      next.wordStyleRules!,
      getVisualOptionsForTextElement(fitted),
    );
  }
  const words = next.content.split(/\s+/).filter(Boolean).length;
  if (next.wordStyles)
    next.wordStyles = next.wordStyles.filter(
      (style) => style.wordIndex < words,
    );
  return {
    ...old,
    name: next.name?.slice(0, 100),
    templateCode: next.templateCode,
    text: next.content.slice(0, 10000),
    font: next.fontFamily,
    fontSize: Math.max(5, Math.min(1000, next.fontSize)),
    bold: ["bold", "600", "700", "800", "900"].includes(next.fontWeight),
    color: next.color,
    align:
      next.textAlign === "right"
        ? "right"
        : next.textAlign === "center"
          ? "center"
          : "left",
    x: next.x / design.width,
    y: next.y / design.height,
    width: Math.max(1 / design.width, Math.min(4, next.width / design.width)),
    height: Math.max(
      1 / design.height,
      Math.min(4, next.height / design.height),
    ),
    rotation: next.rotation,
    opacity: next.opacity,
    textStyle: studioTextStyleSchema.parse(next),
  };
}
export const ALL_TEXT_PROPERTIES = [
  "content",
  "x",
  "y",
  "width",
  "height",
  "rotation",
  "opacity",
  "fontFamily",
  "fontSize",
  "color",
  ...Object.keys(studioTextStyleSchema.shape),
];
function expanded(properties: string[]) {
  const names = new Set(properties);
  if (names.has("fontFamily")) names.add("verticalAlign");
  if (names.has("gradientColor"))
    [
      "gradientStartColor",
      "gradientEndColor",
      "gradientDirection",
      "outlineGlow",
      "outlineGlowColor",
      "outlineGlowBlur",
      "outlineGlowSpread",
      "curveAngle",
      "textPath",
      "customPath",
      "pathOffset",
    ].forEach((key) => names.add(key));
  if (names.has("borderWidth") || names.has("padding"))
    Object.keys(studioTextStyleSchema.shape)
      .filter(
        (key) =>
          key.startsWith("textBox") ||
          key.startsWith("background") ||
          key === "parallelogramSlant",
      )
      .forEach((key) => names.add(key));
  if (names.has("rotation"))
    ["skewX", "skewY", "flipHorizontal", "flipVertical"].forEach((key) =>
      names.add(key),
    );
  return names;
}
export function applyStudioText(
  target: StudioImage,
  source: StudioImage,
  sourceLayer: StudioOverlay,
  properties: string[],
): StudioImage {
  const sourceTexts = source.design.overlays.filter(
    (layer) => layer.type === "text",
  );
  const candidates = target.design.overlays.filter(
    (layer) => layer.type === "text",
  );
  let matching = sourceLayer.templateCode
    ? candidates.filter(
        (layer) => layer.templateCode === sourceLayer.templateCode,
      )
    : [];
  if (!matching.length && sourceLayer.name)
    matching = candidates.filter(
      (layer) =>
        layer.name === sourceLayer.name &&
        target.design.templateId === source.design.templateId,
    );
  if (
    !matching.length &&
    !sourceLayer.templateCode &&
    target.design.templateId &&
    target.design.templateId === source.design.templateId
  ) {
    const layer =
      candidates[sourceTexts.findIndex((item) => item.id === sourceLayer.id)];
    if (layer) matching = [layer];
  }
  if (matching.length > 1 || matching.some((layer) => layer.locked))
    return target;
  if (!matching.length && !properties.includes("content")) return target;
  if (!matching.length && target.design.overlays.length >= 200) return target;
  const old = matching[0] || { ...sourceLayer, id: crypto.randomUUID() };
  const from = studioTextElement(sourceLayer, source.design),
    to = studioTextElement(old, target.design);
  for (const key of expanded(properties)) {
    if (!(key in from) && !(key in studioTextStyleSchema.shape)) continue;
    const value = from[key as keyof TextElement];
    Object.assign(to, {
      [key]: value === undefined ? undefined : structuredClone(value),
    });
  }
  if (properties.includes("x")) to.x = sourceLayer.x * target.design.width;
  if (properties.includes("y")) to.y = sourceLayer.y * target.design.height;
  if (properties.includes("width"))
    to.width = sourceLayer.width * target.design.width;
  if (properties.includes("height"))
    to.height = sourceLayer.height * target.design.height;
  const next = textOverlay(to, old, target.design, true);
  return {
    ...target,
    design: {
      ...target.design,
      overlays: matching.length
        ? target.design.overlays.map((layer) =>
            layer.id === old.id ? next : layer,
          )
        : [...target.design.overlays, next],
    },
  };
}
