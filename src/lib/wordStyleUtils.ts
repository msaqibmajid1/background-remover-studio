import { WordStyle, WordStyleRules, WordStyleRuleStep, WordStyleSlot, TextElement } from "@/types/editor";

export interface VisualLineOptions {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  letterSpacing?: number;
  wordSpacing?: number;
  elementWidth?: number;
  strokeWidth?: number;
  backgroundPadding?: number;
  textBoxBorderWidth?: number;
}

const TEXT_RENDER_PADDING = 5;

/**
 * Compute visual line breaks using Canvas measureText.
 * Falls back to newline-based splitting when element width is unavailable.
 */
export function getLineWordRanges(
  content: string,
  textTransform?: string,
  options?: VisualLineOptions
): [number, number][] {
  let text = content;
  if (textTransform === "uppercase") text = text.toUpperCase();
  else if (textTransform === "lowercase") text = text.toLowerCase();
  else if (textTransform === "capitalize") text = text.replace(/\b\w/g, c => c.toUpperCase());

  // If we have element width and font info, compute visual line breaks
  if (options?.elementWidth && options.elementWidth > 0 && options?.fontFamily && options?.fontSize) {
    return getVisualLineWordRanges(text, options);
  }

  // Fallback: split by actual newlines
  return getNewlineWordRanges(text);
}

/** Split by actual \n characters */
function getNewlineWordRanges(text: string): [number, number][] {
  const lines = text.split(/\n/);
  const ranges: [number, number][] = [];
  let wordIndex = 0;

  for (const line of lines) {
    const lineWords = line.split(/\s+/).filter(w => w.length > 0);
    if (lineWords.length === 0) {
      ranges.push([wordIndex, wordIndex]);
    } else {
      ranges.push([wordIndex, wordIndex + lineWords.length - 1]);
      wordIndex += lineWords.length;
    }
  }

  return ranges;
}

/** Compute visual line breaks using canvas text measurement */
function getVisualLineWordRanges(text: string, options: VisualLineOptions): [number, number][] {
  const {
    fontFamily = "Arial",
    fontSize = 16,
    fontWeight = "400",
    letterSpacing = 0,
    wordSpacing = 0,
    elementWidth = 300,
    strokeWidth = 0,
    backgroundPadding = 0,
    textBoxBorderWidth = 0,
  } = options;

  // Calculate available text width (accounting for padding/borders)
  // Keep this aligned with canvasUtils text rendering, which wraps text using
  // a fixed 5px inner padding. Word background padding is drawn around styled
  // words and must not change where the actual text wraps.
  const availableWidth = elementWidth - (TEXT_RENDER_PADDING * 2) - (textBoxBorderWidth * 2) - (strokeWidth * 2);
  if (availableWidth <= 0) return getNewlineWordRanges(text);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return getNewlineWordRanges(text);

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

  const measureWord = (word: string): number => {
    let width = ctx.measureText(word).width;
    // Add letter spacing for each character except last
    if (letterSpacing && word.length > 1) {
      width += letterSpacing * (word.length - 1);
    }
    return width;
  };

  const spaceWidth = ctx.measureText(" ").width + (wordSpacing || 0) + (letterSpacing || 0);

  // First split by actual newlines (hard breaks), then compute visual wraps within each
  const hardLines = text.split(/\n/);
  const ranges: [number, number][] = [];
  let globalWordIndex = 0;

  for (const hardLine of hardLines) {
    const lineWords = hardLine.split(/\s+/).filter(w => w.length > 0);
    if (lineWords.length === 0) {
      ranges.push([globalWordIndex, globalWordIndex]);
      continue;
    }

    let currentLineWidth = 0;
    let lineStartWordIndex = globalWordIndex;

    for (let i = 0; i < lineWords.length; i++) {
      const wordWidth = measureWord(lineWords[i]);
      const needed = i === 0 ? wordWidth : spaceWidth + wordWidth;

      if (i > 0 && currentLineWidth + needed > availableWidth) {
        // Wrap: close current visual line
        ranges.push([lineStartWordIndex, globalWordIndex - 1]);
        lineStartWordIndex = globalWordIndex;
        currentLineWidth = wordWidth;
      } else {
        currentLineWidth += needed;
      }
      globalWordIndex++;
    }

    // Close the last visual line for this hard line
    if (lineStartWordIndex < globalWordIndex) {
      ranges.push([lineStartWordIndex, globalWordIndex - 1]);
    }
  }

  return ranges;
}

/**
 * Apply line-based selection to word assignments
 */
function applyLineStepToAssignments(
  assignments: Map<number, number>,
  content: string,
  textTransform: string | undefined,
  step: WordStyleRuleStep,
  slotId: number,
  visualOptions?: VisualLineOptions,
  slotIds?: number[]
): void {
  const ranges = getLineWordRanges(content, textTransform, visualOptions);
  if (ranges.length === 0) return;

  const lineFrom = step.lineFrom ?? "first";
  const count = step.lineCount ?? 1;

  let selectedLines: number[] = [];

  if (lineFrom === "first") {
    for (let i = 0; i < Math.min(count, ranges.length); i++) {
      selectedLines.push(i);
    }
  } else if (lineFrom === "last") {
    for (let i = Math.max(0, ranges.length - count); i < ranges.length; i++) {
      selectedLines.push(i);
    }
  } else if (lineFrom === "specific") {
    const lineIdx = (step.lineN ?? 1) - 1; // 1-based to 0-based
    if (lineIdx >= 0 && lineIdx < ranges.length) {
      selectedLines.push(lineIdx);
    }
  }

  const shouldCycleLineColors = step.lineColorMode === "cycle";
  const slots = shouldCycleLineColors && slotIds && slotIds.length > 0 ? slotIds : [slotId];
  let cursor = 0;

  // Default line rules paint the selected line with one selected slot. The
  // optional cycle mode preserves the older alternating-color behavior.
  for (const lineIdx of selectedLines) {
    const [start, end] = ranges[lineIdx];
    for (let i = start; i <= end; i++) {
      assignments.set(i, slots[cursor % slots.length]);
      cursor++;
    }
  }
}

/**
 * Apply a single selection step to word assignments
 */
function applyStepToAssignments(
  assignments: Map<number, number>,
  words: string[],
  slots: WordStyleSlot[],
  step: WordStyleRuleStep,
  content?: string,
  textTransform?: string,
  visualOptions?: VisualLineOptions
): void {
  const slot = slots.find(s => s.id === step.slotId);
  if (!slot) return;

  // Resolve the cycling slot list: explicit slotIds → those, otherwise the single slot
  const slotIdList: number[] =
    step.slotIds && step.slotIds.length > 0
      ? step.slotIds.filter(id => slots.some(s => s.id === id))
      : [slot.id];
  const pick = (i: number) => slotIdList[i % slotIdList.length];

  if (step.mode === "line") {
    applyLineStepToAssignments(
      assignments,
      content || words.join(" "),
      textTransform,
      step,
      slot.id,
      visualOptions,
      slotIdList
    );
    return;
  }

  switch (step.mode) {
    case "first": {
      const n = step.firstN ?? 2;
      let cursor = 0;
      for (let i = 0; i < Math.min(n, words.length); i++) {
        assignments.set(i, pick(cursor++));
      }
      break;
    }
    case "last": {
      const n = step.lastN ?? 2;
      let cursor = 0;
      for (let i = Math.max(0, words.length - n); i < words.length; i++) {
        assignments.set(i, pick(cursor++));
      }
      break;
    }
    case "random": {
      const percent = step.randomPercent ?? 30;
      const count = Math.ceil((percent / 100) * words.length);
      const indices = Array.from({ length: words.length }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      indices.slice(0, count).forEach((idx, k) => {
        assignments.set(idx, pick(k));
      });
      break;
    }
    case "numbers": {
      let cursor = 0;
      words.forEach((word, i) => {
        if (/\d/.test(word)) {
          assignments.set(i, pick(cursor++));
        }
      });
      break;
    }
    case "cycle": {
      words.forEach((_, index) => {
        const slotIndex = index % slots.length;
        assignments.set(index, slots[slotIndex].id);
      });
      break;
    }
  }
}

/**
 * Generate word styles based on rules for a given text content.
 * Pass `visualOptions` so line-based selection wraps the same way as the
 * target element on the canvas (font, width, padding, etc.).
 */
export function generateWordStylesFromRules(
  content: string,
  textTransform: string | undefined,
  rules: WordStyleRules,
  visualOptions?: VisualLineOptions
): WordStyle[] {
  // Apply text transform to get the actual words
  let text = content;
  if (textTransform === "uppercase") text = text.toUpperCase();
  else if (textTransform === "lowercase") text = text.toLowerCase();
  else if (textTransform === "capitalize") text = text.replace(/\b\w/g, c => c.toUpperCase());
  
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const slots = rules.slots;
  
  if (words.length === 0 || slots.length === 0) {
    return [];
  }

  const wordAssignments = new Map<number, number>();

  switch (rules.mode) {
    case "first": {
      const n = rules.firstN ?? 2;
      for (let i = 0; i < Math.min(n, words.length); i++) {
        wordAssignments.set(i, slots[0].id);
      }
      break;
    }
    
    case "last": {
      const n = rules.lastN ?? 2;
      for (let i = Math.max(0, words.length - n); i < words.length; i++) {
        wordAssignments.set(i, slots[0].id);
      }
      break;
    }
    
    case "random": {
      const percent = rules.randomPercent ?? 30;
      const count = Math.ceil((percent / 100) * words.length);
      const indices = Array.from({ length: words.length }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      const selectedIndices = indices.slice(0, count);
      selectedIndices.forEach((wordIndex, i) => {
        const slotIndex = i % slots.length;
        wordAssignments.set(wordIndex, slots[slotIndex].id);
      });
      break;
    }
    
    case "numbers": {
      words.forEach((word, i) => {
        if (/\d/.test(word)) {
          wordAssignments.set(i, slots[0].id);
        }
      });
      break;
    }
    
    case "line": {
      applyLineStepToAssignments(
        wordAssignments,
        content,
        textTransform,
        {
          mode: "line",
          slotId: slots[0].id,
          slotIds: rules.slotIds,
          lineN: rules.lineN,
          lineCount: rules.lineCount,
          lineFrom: rules.lineFrom,
          lineColorMode: rules.lineColorMode
        },
        slots[0].id,
        visualOptions,
        rules.slotIds
      );
      break;
    }
    
    case "cycle":
    case "preset": {
      words.forEach((_, index) => {
        const slotIndex = index % slots.length;
        wordAssignments.set(index, slots[slotIndex].id);
      });
      break;
    }
    
    case "composite": {
      if (rules.steps) {
        for (const step of rules.steps) {
          applyStepToAssignments(wordAssignments, words, slots, step, content, textTransform, visualOptions);
        }
      }
      break;
    }
    
    case "manual":
    default:
      return [];
  }

  // Convert assignments to WordStyle array
  const wordStyles: WordStyle[] = [];
  wordAssignments.forEach((slotId, wordIndex) => {
    const slot = slots.find(s => s.id === slotId);
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

  return wordStyles;
}

/**
 * Check if word styles can be regenerated for different text
 */
export function canRegenerateWordStyles(rules: WordStyleRules | undefined): boolean {
  if (!rules) return false;
  return rules.mode !== "manual";
}

function styleKey(style: Pick<WordStyle, "color" | "colorType" | "gradientStartColor" | "gradientEndColor" | "gradientDirection" | "backgroundColor" | "bold" | "italic">): string {
  return [
    style.color || "",
    style.colorType || "solid",
    style.gradientStartColor || "",
    style.gradientEndColor || "",
    style.gradientDirection || "horizontal",
    style.backgroundColor || "",
    style.bold ? "1" : "0",
    style.italic ? "1" : "0",
  ].join("|");
}

function getUniformLineStyle(
  stylesByWord: Map<number, WordStyle>,
  range: [number, number]
): WordStyle | undefined {
  const [start, end] = range;
  let firstStyle: WordStyle | undefined;

  for (let i = start; i <= end; i++) {
    const style = stylesByWord.get(i);
    if (!style) return undefined;
    if (!firstStyle) {
      firstStyle = style;
    } else if (styleKey(style) !== styleKey(firstStyle)) {
      return undefined;
    }
  }

  return firstStyle;
}

function slotIdForStyle(slots: WordStyleSlot[], style: WordStyle): number {
  const key = styleKey(style);
  const existing = slots.find(slot => styleKey(slot) === key);
  if (existing) return existing.id;

  const nextId = Math.max(0, ...slots.map(slot => slot.id)) + 1;
  slots.push({
    id: nextId,
    color: style.color,
    colorType: style.colorType,
    gradientStartColor: style.gradientStartColor,
    gradientEndColor: style.gradientEndColor,
    gradientDirection: style.gradientDirection,
    backgroundColor: style.backgroundColor,
    bold: style.bold || false,
    italic: style.italic || false,
  });
  return nextId;
}

export function getVisualOptionsForTextElement(element: TextElement): VisualLineOptions {
  return {
    fontFamily: element.fontFamily,
    fontSize: element.fontSize,
    fontWeight: element.fontWeight,
    letterSpacing: element.letterSpacing,
    wordSpacing: element.wordSpacing,
    elementWidth: element.width,
    strokeWidth: element.strokeWidth,
    backgroundPadding: element.backgroundPadding,
    textBoxBorderWidth: element.textBoxBorder ? element.textBoxBorderWidth : 0,
  };
}

/**
 * Older projects may contain manual word index styles that were created from
 * first/last visual lines. Infer a reusable line rule when the saved indexes
 * cleanly cover the first and/or last rendered line.
 */
export function inferLineWordStyleRulesFromElement(element: TextElement): WordStyleRules | undefined {
  if (!element.wordStylesEnabled || !element.wordStyles?.length) return undefined;

  const ranges = getLineWordRanges(
    element.content,
    element.textTransform,
    getVisualOptionsForTextElement(element)
  );
  if (ranges.length === 0) return undefined;

  const stylesByWord = new Map<number, WordStyle>();
  element.wordStyles.forEach(style => stylesByWord.set(style.wordIndex, style));

  const firstStyle = getUniformLineStyle(stylesByWord, ranges[0]);
  const lastRange = ranges[ranges.length - 1];
  const lastStyle = ranges.length > 1 ? getUniformLineStyle(stylesByWord, lastRange) : undefined;

  if (!firstStyle && !lastStyle) return undefined;

  const slots = [...(element.wordStyleRules?.slots ?? [])];
  const steps: WordStyleRuleStep[] = [];

  if (firstStyle) {
    const slotId = slotIdForStyle(slots, firstStyle);
    steps.push({
      mode: "line",
      slotId,
      lineN: 1,
      lineCount: 1,
      lineFrom: "first",
    });
  }

  if (lastStyle) {
    const slotId = slotIdForStyle(slots, lastStyle);
    steps.push({
      mode: "line",
      slotId,
      lineN: 1,
      lineCount: 1,
      lineFrom: "last",
    });
  }

  if (steps.length === 0 || slots.length === 0) return undefined;

  return {
    slots,
    mode: steps.length > 1 ? "composite" : "line",
    lineN: 1,
    lineCount: 1,
    lineFrom: steps[0].lineFrom,
    steps: steps.length > 1 ? steps : undefined,
  };
}
