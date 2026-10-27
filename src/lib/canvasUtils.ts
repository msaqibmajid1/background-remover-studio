import { CanvasElement, ImageFilter, Padding, EditorImage, WordStyle } from "@/types/editor";

export const applyFilter = (
  ctx: CanvasRenderingContext2D,
  filter: ImageFilter
) => {
  switch (filter.type) {
    case "grayscale":
      ctx.filter = "grayscale(100%)";
      break;
    case "sepia":
      ctx.filter = "sepia(100%)";
      break;
    case "invert":
      ctx.filter = "invert(100%)";
      break;
    case "brightness":
      ctx.filter = `brightness(${filter.value || 100}%)`;
      break;
    case "contrast":
      ctx.filter = `contrast(${filter.value || 100}%)`;
      break;
    case "saturation":
      ctx.filter = `saturate(${filter.value || 100}%)`;
      break;
    case "blur":
      ctx.filter = `blur(${filter.value || 0}px)`;
      break;
    case "hue-rotate":
      ctx.filter = `hue-rotate(${filter.value || 0}deg)`;
      break;
    default:
      ctx.filter = "none";
  }
};

export const calculatePaddedDimensions = (
  originalWidth: number,
  originalHeight: number,
  padding: Padding
): { width: number; height: number; offsetX: number; offsetY: number } => {
  if (padding.mode === "outer") {
    return {
      width: originalWidth + padding.left + padding.right,
      height: originalHeight + padding.top + padding.bottom,
      offsetX: padding.left,
      offsetY: padding.top,
    };
  } else {
    // inner padding
    return {
      width: originalWidth,
      height: originalHeight,
      offsetX: padding.left,
      offsetY: padding.top,
    };
  }
};

// Build a parallelogram-shaped path inside a w x h bounding box.
// Positive slant tilts the top edge to the right; negative tilts it to the left.
// Path stays within [0,w] horizontally so element bounds remain meaningful.
export const buildParallelogramPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  slantDeg: number,
) => {
  const raw = h * Math.tan((slantDeg * Math.PI) / 180);
  const dx = Math.max(-w / 2, Math.min(w / 2, raw));
  // For positive dx: top edge shifts right, bottom edge shifts left (keeps width).
  ctx.beginPath();
  ctx.moveTo(x + Math.max(0, dx), y);
  ctx.lineTo(x + w - Math.max(0, -dx), y);
  ctx.lineTo(x + w - Math.max(0, dx), y + h);
  ctx.lineTo(x + Math.max(0, -dx), y + h);
  ctx.closePath();
};

export const drawElement = (
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  backgroundImages?: Map<string, HTMLImageElement>
) => {
  ctx.save();
  ctx.globalAlpha = element.opacity;
  ctx.translate(element.x + element.width / 2, element.y + element.height / 2);
  ctx.rotate((element.rotation * Math.PI) / 180);
  
  // Apply flip transforms
  const scaleX = element.flipHorizontal ? -1 : 1;
  const scaleY = element.flipVertical ? -1 : 1;
  ctx.scale(scaleX, scaleY);
  
  // Apply skew transforms
  if (element.skewX || element.skewY) {
    const skewXRad = (element.skewX || 0) * Math.PI / 180;
    const skewYRad = (element.skewY || 0) * Math.PI / 180;
    ctx.transform(1, Math.tan(skewYRad), Math.tan(skewXRad), 1, 0, 0);
  }
  
  ctx.translate(-element.width / 2, -element.height / 2);

  if (element.type === "text") {
    drawTextElement(ctx, element);
  } else if (element.type === "rectangle" || element.type === "circle" || element.type === "star" || element.type === "polygon") {
    drawShapeElement(ctx, element, backgroundImages);
  } else if (element.type === "line" || element.type === "arrow") {
    drawLineElement(ctx, element);
  }
  // Image elements are handled separately in renderImageToCanvas

  ctx.restore();
};

const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
};

// Global word counter for word-styled text across lines
let globalWordIndex = 0;

// Draw a line of text with word-by-word styling
const drawWordStyledLine = (
  ctx: CanvasRenderingContext2D,
  element: Extract<CanvasElement, { type: "text" }>,
  line: string,
  startX: number,
  y: number,
  wordStyles: WordStyle[],
  fontSize: number,
  resetWordIndex: boolean = false
) => {
  if (resetWordIndex) {
    globalWordIndex = 0;
  }
  
  const originalTextAlign = ctx.textAlign;
  ctx.textAlign = "left";
  
  const letterSpacing = element.letterSpacing || 0;
  const wordSpacing = element.wordSpacing || 0;
  const baseFont = `${element.fontStyle} ${element.fontWeight} ${fontSize}px ${element.fontFamily}`;
  
  const words = line.split(/(\s+)/);
  
  // PASS 1: Pre-calculate all word positions and collect style info
  interface WordPosition {
    word: string;
    x: number;
    width: number;
    style: WordStyle | undefined;
    wordIndex: number;
    isSpace: boolean;
  }
  
  const wordPositions: WordPosition[] = [];
  let tempWordIndex = globalWordIndex;
  
  // First, calculate total line width for alignment
  let totalWidth = 0;
  const actualWords = words.filter(w => w.trim() !== "");
  let calcWordIndex = globalWordIndex;
  actualWords.forEach((word, i) => {
    const style = wordStyles.find(s => s.wordIndex === calcWordIndex);
    const isBold = style?.bold || element.fontWeight === "bold" || parseInt(element.fontWeight) >= 700;
    const isItalic = style?.italic || element.fontStyle === "italic";
    ctx.font = `${isItalic ? "italic" : "normal"} ${isBold ? "bold" : element.fontWeight} ${fontSize}px ${element.fontFamily}`;
    totalWidth += ctx.measureText(word).width + (word.length * letterSpacing);
    if (i < actualWords.length - 1) {
      totalWidth += ctx.measureText(" ").width + wordSpacing;
    }
    calcWordIndex++;
  });
  
  ctx.font = baseFont;
  
  // Determine starting X based on alignment
  let currentX: number;
  if (element.textAlign === "center") {
    currentX = startX - totalWidth / 2;
  } else if (element.textAlign === "right") {
    currentX = startX - totalWidth;
  } else {
    currentX = startX;
  }
  
  // Build word positions array
  words.forEach((word) => {
    if (word.trim() === "") {
      wordPositions.push({
        word,
        x: currentX,
        width: ctx.measureText(word).width + wordSpacing,
        style: undefined,
        wordIndex: -1,
        isSpace: true
      });
      currentX += ctx.measureText(word).width + wordSpacing;
      return;
    }
    
    const style = wordStyles.find(s => s.wordIndex === tempWordIndex);
    const isBold = style?.bold || element.fontWeight === "bold" || parseInt(element.fontWeight) >= 700;
    const isItalic = style?.italic || element.fontStyle === "italic";
    
    ctx.font = `${isItalic ? "italic" : "normal"} ${isBold ? "bold" : element.fontWeight} ${fontSize}px ${element.fontFamily}`;
    const wordWidth = ctx.measureText(word).width + (word.length * letterSpacing);
    
    wordPositions.push({
      word,
      x: currentX,
      width: wordWidth,
      style,
      wordIndex: tempWordIndex,
      isSpace: false
    });
    
    currentX += wordWidth;
    ctx.font = baseFont;
    tempWordIndex++;
  });
  
  // PASS 2: Group consecutive words with same background color
  interface BackgroundSpan {
    startX: number;
    endX: number;
    backgroundColor: string;
  }
  
  const backgroundSpans: BackgroundSpan[] = [];
  let currentSpan: BackgroundSpan | null = null;
  const bgPadding = element.wordStyleBgPadding !== undefined ? element.wordStyleBgPadding : fontSize * 0.1;
  const bgRadius = element.wordStyleBgRadius !== undefined ? element.wordStyleBgRadius : 0;
  
  wordPositions.forEach((wp, i) => {
    if (wp.isSpace) {
      // If we have an active span and the next word has the same bg, include space in span
      const nextNonSpace = wordPositions.slice(i + 1).find(p => !p.isSpace);
      if (currentSpan && nextNonSpace?.style?.backgroundColor === currentSpan.backgroundColor) {
        // Extend span to include space (it will be extended further by next word)
        currentSpan.endX = wp.x + wp.width;
      }
      return;
    }
    
    const bgColor = wp.style?.backgroundColor;
    
    if (bgColor) {
      if (currentSpan && currentSpan.backgroundColor === bgColor) {
        // Extend current span to include this word
        currentSpan.endX = wp.x + wp.width + bgPadding;
      } else {
        // Close previous span if exists
        if (currentSpan) {
          backgroundSpans.push(currentSpan);
        }
        // Start new span
        currentSpan = {
          startX: wp.x - bgPadding,
          endX: wp.x + wp.width + bgPadding,
          backgroundColor: bgColor
        };
      }
    } else {
      // No background - close any open span
      if (currentSpan) {
        backgroundSpans.push(currentSpan);
        currentSpan = null;
      }
    }
  });
  
  // Don't forget to close the last span
  if (currentSpan) {
    backgroundSpans.push(currentSpan);
  }
  
  // Draw all background spans first
  ctx.font = baseFont;
  // Measure with characters that have both ascenders and descenders for accurate height
  const metrics = ctx.measureText("Mgy");
  const ascent = metrics.actualBoundingBoxAscent;
  const descent = metrics.actualBoundingBoxDescent;
  const bgHeight = ascent + descent + bgPadding * 2;
  // Position background so text baseline is properly placed within the background
  const bgY = y - ascent - bgPadding;
  
  backgroundSpans.forEach(span => {
    ctx.save();
    ctx.fillStyle = span.backgroundColor;
    const spanWidth = span.endX - span.startX;
    if (bgRadius > 0) {
      ctx.beginPath();
      ctx.roundRect(span.startX, bgY, spanWidth, bgHeight, bgRadius);
      ctx.fill();
    } else {
      ctx.fillRect(span.startX, bgY, spanWidth, bgHeight);
    }
    ctx.restore();
  });
  
  // PASS 3: Draw text on top
  wordPositions.forEach((wp) => {
    if (wp.isSpace) return;
    
    const style = wp.style;
    const color = style?.color || element.color;
    const isBold = style?.bold || element.fontWeight === "bold" || parseInt(element.fontWeight) >= 700;
    const isItalic = style?.italic || element.fontStyle === "italic";
    
    ctx.font = `${isItalic ? "italic" : "normal"} ${isBold ? "bold" : element.fontWeight} ${fontSize}px ${element.fontFamily}`;

    let fillPaint: string | CanvasGradient = color;
    if (style?.colorType === "gradient") {
      // Canva's SVG uses one shared gradient image masked into the glyphs,
      // so keep the gradient fixed to the complete text box, not each word.
      const left = 0;
      const right = Math.max(element.width, 1);
      const top = 0;
      const bottom = Math.max(element.height, 1);
      const start = style.gradientStartColor || color;
      const end = style.gradientEndColor || start;
      const direction = style.gradientDirection || "horizontal";
      let gradient: CanvasGradient;

      if (direction === "radial") {
        gradient = ctx.createRadialGradient(
          (left + right) / 2,
          (top + bottom) / 2,
          0,
          (left + right) / 2,
          (top + bottom) / 2,
          Math.hypot(right - left, bottom - top) / 2,
        );
      } else {
        const points: Record<"horizontal" | "vertical" | "diagonal-down" | "diagonal-up", [number, number, number, number]> = {
          horizontal: [left, top, right, top],
          vertical: [left, top, left, bottom],
          "diagonal-down": [left, top, right, bottom],
          "diagonal-up": [left, bottom, right, top],
        };
        gradient = ctx.createLinearGradient(...points[direction]);
      }
      gradient.addColorStop(0, start);
      gradient.addColorStop(1, end);
      fillPaint = gradient;
    }
    
    if (letterSpacing !== 0) {
      let charX = wp.x;
      for (let i = 0; i < wp.word.length; i++) {
        const char = wp.word[i];
        if (element.strokeWidth > 0) {
          ctx.strokeStyle = element.strokeColor;
          ctx.lineWidth = element.strokeWidth;
          ctx.strokeText(char, charX, y);
        }
        ctx.fillStyle = fillPaint;
        ctx.fillText(char, charX, y);
        charX += ctx.measureText(char).width + letterSpacing;
      }
    } else {
      if (element.strokeWidth > 0) {
        ctx.strokeStyle = element.strokeColor;
        ctx.lineWidth = element.strokeWidth;
        ctx.strokeText(wp.word, wp.x, y);
      }
      ctx.fillStyle = fillPaint;
      ctx.fillText(wp.word, wp.x, y);
    }
    
    ctx.font = baseFont;
    globalWordIndex++;
  });
  
  ctx.textAlign = originalTextAlign;
};

const drawTextElement = (
  ctx: CanvasRenderingContext2D,
  element: Extract<CanvasElement, { type: "text" }>
) => {
  let displayText = element.content;
  
  // Apply text transform
  if (element.textTransform === "uppercase") {
    displayText = displayText.toUpperCase();
  } else if (element.textTransform === "lowercase") {
    displayText = displayText.toLowerCase();
  } else if (element.textTransform === "capitalize") {
    displayText = displayText.replace(/\b\w/g, (char) => char.toUpperCase());
  }
  
  // Use the fontSize from element (which is calculated by auto-fit if enabled)
  let fontSize = element.fontSize;
  
  // Set initial font to measure text
  ctx.font = `${element.fontStyle} ${element.fontWeight} ${fontSize}px ${element.fontFamily}`;
  
  // Calculate padding for background
  const bgPadding = element.backgroundPadding || 0;
  const bgRadius = element.backgroundRadius || 0;
  
  // Draw text box background if enabled
  if (element.backgroundOpacity > 0 && element.backgroundColor && element.backgroundColor !== "transparent") {
    ctx.save();
    ctx.globalAlpha = element.backgroundOpacity;
    
    // Draw rounded rectangle for background
    const bgX = -bgPadding;
    const bgY = -bgPadding;
    const bgW = element.width + bgPadding * 2;
    const bgH = element.height + bgPadding * 2;
    
    // Clamp radius to prevent distortion
    const maxBgRadius = Math.min(bgW, bgH) / 2;
    const clampedBgRadius = Math.min(bgRadius, maxBgRadius);
    
    // Set fill style (gradient or solid)
    if (element.textBoxFillType === "gradient" && element.textBoxGradientFill) {
      const gradientStr = element.textBoxGradientFill;
      const linearMatch = gradientStr.match(/linear-gradient\(([^,]+),\s*(.+)\)/);
      
      if (linearMatch) {
        const angle = linearMatch[1].trim();
        const stops = linearMatch[2];
        
        let angleNum = 90;
        if (angle.endsWith('deg')) {
          angleNum = parseInt(angle);
        }
        
        const angleRad = (angleNum - 90) * Math.PI / 180;
        const x0 = bgW / 2 - Math.cos(angleRad) * bgW / 2;
        const y0 = bgH / 2 - Math.sin(angleRad) * bgH / 2;
        const x1 = bgW / 2 + Math.cos(angleRad) * bgW / 2;
        const y1 = bgH / 2 + Math.sin(angleRad) * bgH / 2;
        
        const gradient = ctx.createLinearGradient(bgX + x0, bgY + y0, bgX + x1, bgY + y1);
        
        const stopRegex = /#[0-9a-f]{6}\s+\d+%/gi;
        const stopMatches = stops.match(stopRegex);
        
        if (stopMatches) {
          stopMatches.forEach(stop => {
            const parts = stop.trim().split(/\s+/);
            const color = parts[0];
            const position = parseInt(parts[1]) / 100;
            gradient.addColorStop(position, color);
          });
        }
        
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = element.backgroundColor;
      }
    } else {
      ctx.fillStyle = element.backgroundColor;
    }
    
    const tSlant = (element as any).parallelogramSlant as number | undefined;
    if (tSlant) {
      buildParallelogramPath(ctx, bgX, bgY, bgW, bgH, tSlant);
      ctx.fill();
    } else if (clampedBgRadius > 0) {
      ctx.beginPath();
      ctx.moveTo(bgX + clampedBgRadius, bgY);
      ctx.lineTo(bgX + bgW - clampedBgRadius, bgY);
      ctx.quadraticCurveTo(bgX + bgW, bgY, bgX + bgW, bgY + clampedBgRadius);
      ctx.lineTo(bgX + bgW, bgY + bgH - clampedBgRadius);
      ctx.quadraticCurveTo(bgX + bgW, bgY + bgH, bgX + bgW - clampedBgRadius, bgY + bgH);
      ctx.lineTo(bgX + clampedBgRadius, bgY + bgH);
      ctx.quadraticCurveTo(bgX, bgY + bgH, bgX, bgY + bgH - clampedBgRadius);
      ctx.lineTo(bgX, bgY + clampedBgRadius);
      ctx.quadraticCurveTo(bgX, bgY, bgX + clampedBgRadius, bgY);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(bgX, bgY, bgW, bgH);
    }
    ctx.restore();
  }
  
  // Draw text box border if enabled
  if (element.textBoxBorder && element.textBoxBorderWidth > 0) {
    ctx.save();
    ctx.strokeStyle = element.textBoxBorderColor;
    ctx.lineWidth = element.textBoxBorderWidth;
    
    const bgX = -bgPadding;
    const bgY = -bgPadding;
    const bgW = element.width + bgPadding * 2;
    const bgH = element.height + bgPadding * 2;
    
    // Use textBoxBorderRadius if set, otherwise fall back to bgRadius
    const borderRadius = element.textBoxBorderRadius ?? bgRadius;
    const maxBorderRadius = Math.min(bgW, bgH) / 2;
    const clampedBorderRadius = Math.min(borderRadius, maxBorderRadius);
    
    // Apply border shadow if enabled
    if (element.textBoxBorderShadow) {
      ctx.shadowColor = element.textBoxBorderShadowColor || 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = element.textBoxBorderShadowBlur || 4;
      ctx.shadowOffsetX = element.textBoxBorderShadowOffsetX || 0;
      ctx.shadowOffsetY = element.textBoxBorderShadowOffsetY || 0;
    }
    
    // Set line dash pattern based on style
    const borderStyle = element.textBoxBorderStyle || "solid";
    if (borderStyle === "dashed" || borderStyle === "dotted") {
      const pattern = element.textBoxBorderDashPattern || (borderStyle === "dotted" ? [2, 4] : [5, 5]);
      ctx.setLineDash(pattern);
    }
    
    // Check if we should draw individual sides
    const showTop = element.textBoxBorderTop !== false;
    const showRight = element.textBoxBorderRight !== false;
    const showBottom = element.textBoxBorderBottom !== false;
    const showLeft = element.textBoxBorderLeft !== false;
    
    const tSlantBorder = (element as any).parallelogramSlant as number | undefined;
    let borderDrawn = false;
    if (tSlantBorder && showTop && showRight && showBottom && showLeft) {
      buildParallelogramPath(ctx, bgX, bgY, bgW, bgH, tSlantBorder);
      ctx.stroke();
      borderDrawn = true;
    }
    if (!borderDrawn && showTop && showRight && showBottom && showLeft) {
      // Draw full border (with special styles)
      if (borderStyle === "double") {
        const offset = element.textBoxBorderWidth * 0.4;
        ctx.lineWidth = element.textBoxBorderWidth * 0.3;
        ctx.strokeRect(bgX - offset, bgY - offset, bgW + offset * 2, bgH + offset * 2);
        ctx.strokeRect(bgX + offset, bgY + offset, bgW - offset * 2, bgH - offset * 2);
      } else if (borderStyle === "groove" || borderStyle === "ridge") {
        const halfWidth = element.textBoxBorderWidth / 2;
        ctx.lineWidth = halfWidth;
        ctx.strokeStyle = borderStyle === "groove" 
          ? shadeColor(element.textBoxBorderColor, -30) 
          : shadeColor(element.textBoxBorderColor, 30);
        if (clampedBorderRadius > 0) {
          drawRoundedRect(ctx, bgX, bgY, bgW, bgH, clampedBorderRadius);
          ctx.stroke();
        } else {
          ctx.strokeRect(bgX, bgY, bgW, bgH);
        }
        ctx.strokeStyle = borderStyle === "groove"
          ? shadeColor(element.textBoxBorderColor, 30)
          : shadeColor(element.textBoxBorderColor, -30);
        ctx.lineWidth = halfWidth * 0.6;
        if (clampedBorderRadius > 0) {
          drawRoundedRect(ctx, bgX, bgY, bgW, bgH, clampedBorderRadius);
          ctx.stroke();
        } else {
          ctx.strokeRect(bgX, bgY, bgW, bgH);
        }
      } else if (clampedBorderRadius > 0) {
        drawRoundedRect(ctx, bgX, bgY, bgW, bgH, clampedBorderRadius);
        ctx.stroke();
      } else {
        ctx.strokeRect(bgX, bgY, bgW, bgH);
      }
    } else {
      // Draw individual sides
      ctx.beginPath();
      if (showTop) {
        ctx.moveTo(bgX, bgY);
        ctx.lineTo(bgX + bgW, bgY);
      }
      if (showRight) {
        ctx.moveTo(bgX + bgW, bgY);
        ctx.lineTo(bgX + bgW, bgY + bgH);
      }
      if (showBottom) {
        ctx.moveTo(bgX + bgW, bgY + bgH);
        ctx.lineTo(bgX, bgY + bgH);
      }
      if (showLeft) {
        ctx.moveTo(bgX, bgY + bgH);
        ctx.lineTo(bgX, bgY);
      }
      ctx.stroke();
    }
    
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Check if we should render text on path
  const textPath = element.textPath || "none";
  if (textPath !== "none") {
    drawTextOnPath(ctx, element, displayText, fontSize);
    return;
  }

  // Check if we should render curved text
  const curveAngle = element.curveAngle || 0;
  if (curveAngle !== 0) {
    drawCurvedText(ctx, element, displayText, fontSize);
    return;
  }
  
  // Use consistent padding matching autofit
  const textPadding = 5;
  
  // Split by explicit line breaks first
  const explicitLines = displayText.split("\n");
  let lines: string[] = [];
  
  // Wrap each line if needed
  for (const line of explicitLines) {
    const wrappedLines = wrapText(ctx, line, element.width - textPadding * 2);
    lines.push(...wrappedLines);
  }
  
  const fontStyle = `${element.fontStyle} ${element.fontWeight} ${fontSize}px ${element.fontFamily}`;
  ctx.font = fontStyle;
  ctx.textAlign = element.textAlign as CanvasTextAlign;
  ctx.textBaseline = "alphabetic"; // Use alphabetic for consistent baseline positioning
  
  // Apply letter and word spacing
  if (element.letterSpacing !== 0) {
    ctx.letterSpacing = `${element.letterSpacing}px`;
  }
  if (element.wordSpacing !== 0) {
    ctx.wordSpacing = `${element.wordSpacing}px`;
  }

  // Apply outline glow effect
  if (element.outlineGlow) {
    const glowColor = element.outlineGlowColor || "#00BFFF";
    const glowBlur = element.outlineGlowBlur || 10;
    const glowSpread = element.outlineGlowSpread || 2;
    
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowBlur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = glowSpread;
    
    // Draw glow multiple times for spread effect
    // Pre-calculate vertical alignment offset (same as main text rendering)
    const glowLineHeightPx = fontSize * element.lineHeight;
    const glowTotalTextHeight = lines.length > 0 
      ? (lines.length - 1) * glowLineHeightPx + fontSize 
      : 0;
    
    // Use same metrics and positioning as main text
    const glowMetrics = ctx.measureText("Mgy");
    const glowAscent = glowMetrics.actualBoundingBoxAscent;
    
    let glowYOffset = textPadding + glowAscent; // Top alignment
    if (element.verticalAlign === "middle") {
      glowYOffset = (element.height - glowTotalTextHeight) / 2 + glowAscent;
    } else if (element.verticalAlign === "bottom") {
      glowYOffset = element.height - glowTotalTextHeight - textPadding + glowAscent;
    }
    
    for (let i = 0; i < 3; i++) {
      lines.forEach((line, index) => {
        const y = glowYOffset + index * glowLineHeightPx;
        let lineX = textPadding;
        if (element.textAlign === "center") lineX = element.width / 2;
        else if (element.textAlign === "right") lineX = element.width - textPadding;
        ctx.strokeText(line, lineX, y);
      });
    }
    ctx.restore();
  }

  if (element.shadow) {
    ctx.shadowColor = element.shadowColor;
    ctx.shadowBlur = element.shadowBlur;
    ctx.shadowOffsetX = element.shadowOffsetX;
    ctx.shadowOffsetY = element.shadowOffsetY;
  }

  const lineHeightPx = fontSize * element.lineHeight;
  // Fix: Don't include line height after the last line
  const totalTextHeight = lines.length > 0 
    ? (lines.length - 1) * lineHeightPx + fontSize 
    : 0;

  // Calculate x position based on text alignment
  let x = textPadding;
  if (element.textAlign === "center") {
    x = element.width / 2;
  } else if (element.textAlign === "right") {
    x = element.width - textPadding;
  }

  // Calculate y offset based on vertical alignment with consistent padding
  // With alphabetic baseline, we need to add the ascent to position text correctly
  const metrics = ctx.measureText("Mgy");
  const ascent = metrics.actualBoundingBoxAscent;
  
  let yOffset = textPadding + ascent; // Top alignment: padding + ascent for first line baseline
  if (element.verticalAlign === "middle") {
    yOffset = (element.height - totalTextHeight) / 2 + ascent;
  } else if (element.verticalAlign === "bottom") {
    yOffset = element.height - totalTextHeight - textPadding + ascent;
  }

  // Check if word styles are enabled
  const useWordStyles = element.wordStylesEnabled && element.wordStyles?.length;

  lines.forEach((line, lineIndex) => {
    const y = yOffset + lineIndex * lineHeightPx;
    
    if (useWordStyles && element.wordStyles) {
      // Word-styled text: render each word with individual styling
      drawWordStyledLine(ctx, element, line, x, y, element.wordStyles, fontSize, lineIndex === 0);
    } else {
      // Standard rendering
      if (element.strokeWidth > 0) {
        ctx.strokeStyle = element.strokeColor;
        ctx.lineWidth = element.strokeWidth;
        ctx.strokeText(line, x, y);
      }
      
      // Handle gradient or solid color
      if (element.colorType === "gradient" && element.gradientColor) {
        // Parse gradient string and create gradient
        const gradientMatch = element.gradientColor.match(/linear-gradient\((\d+)deg,\s*(.+)\)/);
        if (gradientMatch) {
          const angle = parseInt(gradientMatch[1]);
          const colorStops = gradientMatch[2].split(/,\s*(?![^(]*\))/);
          
          // Convert angle to radians
          const angleRad = (angle - 90) * Math.PI / 180;
          const x1 = element.width / 2 + Math.cos(angleRad) * element.width / 2;
          const y1 = element.height / 2 + Math.sin(angleRad) * element.height / 2;
          const x2 = element.width / 2 - Math.cos(angleRad) * element.width / 2;
          const y2 = element.height / 2 - Math.sin(angleRad) * element.height / 2;
          
          const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
          
          colorStops.forEach((stop) => {
            const stopMatch = stop.trim().match(/(.+?)\s+(\d+)%/);
            if (stopMatch) {
              const color = stopMatch[1].trim();
              const position = parseInt(stopMatch[2]) / 100;
              gradient.addColorStop(position, color);
            }
          });
          
          ctx.fillStyle = gradient;
        } else {
          ctx.fillStyle = element.color; // Fallback to solid color
        }
      } else {
        ctx.fillStyle = element.color;
      }
      
      ctx.fillText(line, x, y);
      
      // Draw strikethrough if enabled
      if (element.textDecoration === "line-through") {
        const textWidth = ctx.measureText(line).width;
        let strikeX = x;
        if (element.textAlign === "center") {
          strikeX = x - textWidth / 2;
        } else if (element.textAlign === "right") {
          strikeX = x - textWidth;
        }
        
        ctx.save();
        ctx.strokeStyle = element.colorType === "gradient" ? element.color : ctx.fillStyle as string;
        ctx.lineWidth = Math.max(1, fontSize / 20);
        ctx.beginPath();
        ctx.moveTo(strikeX, y + fontSize / 2);
        ctx.lineTo(strikeX + textWidth, y + fontSize / 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  });
  
  // Reset spacing
  ctx.letterSpacing = "0px";
  ctx.wordSpacing = "0px";
};

const drawCurvedText = (
  ctx: CanvasRenderingContext2D,
  element: Extract<CanvasElement, { type: "text" }>,
  displayText: string,
  fontSize: number
) => {
  const curveAngle = element.curveAngle || 0;
  const angleRad = (curveAngle * Math.PI) / 180;
  
  // Calculate radius based on curve angle and element width
  const radius = Math.abs(angleRad) > 0.01 
    ? (element.width / 2) / Math.sin(Math.abs(angleRad) / 2)
    : element.width * 10; // Very large radius for nearly straight text
  
  const fontStyle = `${element.fontStyle} ${element.fontWeight} ${fontSize}px ${element.fontFamily}`;
  ctx.font = fontStyle;
  ctx.textBaseline = "middle";
  
  if (element.letterSpacing !== 0) {
    ctx.letterSpacing = `${element.letterSpacing}px`;
  }

  if (element.shadow) {
    ctx.shadowColor = element.shadowColor;
    ctx.shadowBlur = element.shadowBlur;
    ctx.shadowOffsetX = element.shadowOffsetX;
    ctx.shadowOffsetY = element.shadowOffsetY;
  }

  // Set fill style
  if (element.colorType === "gradient" && element.gradientColor) {
    const gradientMatch = element.gradientColor.match(/linear-gradient\((\d+)deg,\s*(.+)\)/);
    if (gradientMatch) {
      const angle = parseInt(gradientMatch[1]);
      const colorStops = gradientMatch[2].split(/,\s*(?![^(]*\))/);
      const gradAngleRad = (angle - 90) * Math.PI / 180;
      const x1 = element.width / 2 + Math.cos(gradAngleRad) * element.width / 2;
      const y1 = element.height / 2 + Math.sin(gradAngleRad) * element.height / 2;
      const x2 = element.width / 2 - Math.cos(gradAngleRad) * element.width / 2;
      const y2 = element.height / 2 - Math.sin(gradAngleRad) * element.height / 2;
      
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      colorStops.forEach((stop) => {
        const stopMatch = stop.trim().match(/(.+?)\s+(\d+)%/);
        if (stopMatch) {
          gradient.addColorStop(parseInt(stopMatch[2]) / 100, stopMatch[1].trim());
        }
      });
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = element.color;
    }
  } else {
    ctx.fillStyle = element.color;
  }

  // Calculate center position with vertical alignment support
  const centerX = element.width / 2;
  let baseCenterY = curveAngle > 0 
    ? element.height - (radius - element.height / 2)
    : radius + element.height / 2;
  
  // Apply vertical alignment offset
  const curveHeight = Math.abs(radius - Math.sqrt(radius * radius - (element.width / 2) * (element.width / 2))) + fontSize;
  const verticalPadding = 5;
  let verticalOffset = 0;
  if (element.verticalAlign === "middle") {
    verticalOffset = 0; // Already centered by default calculation
  } else if (element.verticalAlign === "bottom") {
    verticalOffset = (element.height - curveHeight) / 2 - verticalPadding;
  } else {
    // Top alignment
    verticalOffset = -(element.height - curveHeight) / 2 + verticalPadding;
  }
  const centerY = baseCenterY + verticalOffset;

  // Measure total text width
  const totalWidth = ctx.measureText(displayText).width;
  const totalAngle = totalWidth / radius;
  
  // Starting angle
  let startAngle = curveAngle > 0 
    ? -Math.PI / 2 - totalAngle / 2
    : Math.PI / 2 + totalAngle / 2;

  ctx.save();
  
  // Draw each character
  for (let i = 0; i < displayText.length; i++) {
    const char = displayText[i];
    const charWidth = ctx.measureText(char).width;
    const charAngle = charWidth / radius;
    
    ctx.save();
    
    if (curveAngle > 0) {
      const angle = startAngle + charAngle / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);
    } else {
      const angle = startAngle - charAngle / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      ctx.translate(x, y);
      ctx.rotate(angle - Math.PI / 2);
    }
    
    if (element.strokeWidth > 0) {
      ctx.strokeStyle = element.strokeColor;
      ctx.lineWidth = element.strokeWidth;
      ctx.strokeText(char, 0, 0);
    }
    
    ctx.fillText(char, 0, 0);
    ctx.restore();
    
    if (curveAngle > 0) {
      startAngle += charAngle;
    } else {
      startAngle -= charAngle;
    }
  }
  
  ctx.restore();
  ctx.letterSpacing = "0px";
};

// Generate SVG path data for various shapes - expanded with 100+ paths
const getPathForShape = (
  shape: string,
  width: number,
  height: number,
  customPath?: string
): string => {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2.5;
  
  switch (shape) {
    // Original shapes
    case "circle":
      return `M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 1 1 ${centerX + radius} ${centerY} A ${radius} ${radius} 0 1 1 ${centerX - radius} ${centerY}`;
    case "wave":
      return `M 0 ${centerY} Q ${width * 0.25} ${centerY - height * 0.3} ${width * 0.5} ${centerY} Q ${width * 0.75} ${centerY + height * 0.3} ${width} ${centerY}`;
    case "arc-up":
      return `M 0 ${height * 0.8} Q ${centerX} ${height * 0.1} ${width} ${height * 0.8}`;
    case "arc-down":
      return `M 0 ${height * 0.2} Q ${centerX} ${height * 0.9} ${width} ${height * 0.2}`;
    case "spiral": {
      let spiralPath = `M ${centerX} ${centerY}`;
      for (let i = 0; i < 720; i += 10) {
        const angle = (i * Math.PI) / 180;
        const r = (radius * i) / 720;
        spiralPath += ` L ${centerX + Math.cos(angle) * r} ${centerY + Math.sin(angle) * r}`;
      }
      return spiralPath;
    }
    case "heart":
      return `M ${centerX} ${height * 0.3} C ${width * 0.1} ${height * 0.1} ${width * 0.1} ${height * 0.5} ${centerX} ${height * 0.8} C ${width * 0.9} ${height * 0.5} ${width * 0.9} ${height * 0.1} ${centerX} ${height * 0.3}`;
    case "diamond":
      return `M ${centerX} 0 L ${width} ${centerY} L ${centerX} ${height} L 0 ${centerY} Z`;
    
    // Stars and geometric
    case "star-5": {
      let path = "";
      for (let i = 0; i < 10; i++) {
        const angle = (i * 36 - 90) * Math.PI / 180;
        const r = i % 2 === 0 ? radius : radius * 0.5;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
      }
      return path + " Z";
    }
    case "star-6": {
      let path = "";
      for (let i = 0; i < 12; i++) {
        const angle = (i * 30 - 90) * Math.PI / 180;
        const r = i % 2 === 0 ? radius : radius * 0.5;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
      }
      return path + " Z";
    }
    case "star-8": {
      let path = "";
      for (let i = 0; i < 16; i++) {
        const angle = (i * 22.5 - 90) * Math.PI / 180;
        const r = i % 2 === 0 ? radius : radius * 0.55;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
      }
      return path + " Z";
    }
    case "hexagon": {
      let path = "";
      for (let i = 0; i < 6; i++) {
        const angle = (i * 60 - 90) * Math.PI / 180;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
      }
      return path + " Z";
    }
    case "pentagon": {
      let path = "";
      for (let i = 0; i < 5; i++) {
        const angle = (i * 72 - 90) * Math.PI / 180;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
      }
      return path + " Z";
    }
    case "octagon": {
      let path = "";
      for (let i = 0; i < 8; i++) {
        const angle = (i * 45 - 90) * Math.PI / 180;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
      }
      return path + " Z";
    }
    case "triangle":
      return `M ${centerX} ${centerY - radius} L ${centerX + radius} ${centerY + radius * 0.7} L ${centerX - radius} ${centerY + radius * 0.7} Z`;
    case "square-path":
      return `M ${centerX - radius} ${centerY - radius} L ${centerX + radius} ${centerY - radius} L ${centerX + radius} ${centerY + radius} L ${centerX - radius} ${centerY + radius} Z`;
    
    // Waves and curves
    case "zigzag": {
      const segments = 8;
      const segWidth = width / segments;
      let path = `M 0 ${centerY}`;
      for (let i = 1; i <= segments; i++) {
        const y = i % 2 === 0 ? centerY : (i % 4 === 1 ? centerY - height * 0.3 : centerY + height * 0.3);
        path += ` L ${i * segWidth} ${y}`;
      }
      return path;
    }
    case "sine-wave": {
      let path = `M 0 ${centerY}`;
      for (let i = 0; i <= width; i += 5) {
        const y = centerY + Math.sin((i / width) * Math.PI * 4) * height * 0.3;
        path += ` L ${i} ${y}`;
      }
      return path;
    }
    case "double-wave":
      return `M 0 ${centerY} Q ${width * 0.125} ${centerY - height * 0.25} ${width * 0.25} ${centerY} Q ${width * 0.375} ${centerY + height * 0.25} ${width * 0.5} ${centerY} Q ${width * 0.625} ${centerY - height * 0.25} ${width * 0.75} ${centerY} Q ${width * 0.875} ${centerY + height * 0.25} ${width} ${centerY}`;
    case "triple-wave":
      return `M 0 ${centerY} Q ${width * 0.083} ${centerY - height * 0.2} ${width * 0.166} ${centerY} Q ${width * 0.25} ${centerY + height * 0.2} ${width * 0.333} ${centerY} Q ${width * 0.416} ${centerY - height * 0.2} ${width * 0.5} ${centerY} Q ${width * 0.583} ${centerY + height * 0.2} ${width * 0.666} ${centerY} Q ${width * 0.75} ${centerY - height * 0.2} ${width * 0.833} ${centerY} Q ${width * 0.916} ${centerY + height * 0.2} ${width} ${centerY}`;
    case "smooth-wave":
      return `M 0 ${centerY} C ${width * 0.2} ${centerY - height * 0.4} ${width * 0.3} ${centerY + height * 0.4} ${width * 0.5} ${centerY} C ${width * 0.7} ${centerY - height * 0.4} ${width * 0.8} ${centerY + height * 0.4} ${width} ${centerY}`;
    case "sharp-wave":
      return `M 0 ${centerY} L ${width * 0.125} ${centerY - height * 0.4} L ${width * 0.25} ${centerY} L ${width * 0.375} ${centerY + height * 0.4} L ${width * 0.5} ${centerY} L ${width * 0.625} ${centerY - height * 0.4} L ${width * 0.75} ${centerY} L ${width * 0.875} ${centerY + height * 0.4} L ${width} ${centerY}`;
    
    // Symbols
    case "infinity":
      return `M ${centerX} ${centerY} C ${width * 0.3} ${centerY - height * 0.4} ${width * 0.1} ${centerY - height * 0.4} ${width * 0.1} ${centerY} C ${width * 0.1} ${centerY + height * 0.4} ${width * 0.3} ${centerY + height * 0.4} ${centerX} ${centerY} C ${width * 0.7} ${centerY - height * 0.4} ${width * 0.9} ${centerY - height * 0.4} ${width * 0.9} ${centerY} C ${width * 0.9} ${centerY + height * 0.4} ${width * 0.7} ${centerY + height * 0.4} ${centerX} ${centerY}`;
    case "figure-8":
      return `M ${centerX} ${height * 0.1} C ${centerX - radius} ${height * 0.1} ${centerX - radius} ${centerY} ${centerX} ${centerY} C ${centerX + radius} ${centerY} ${centerX + radius} ${height * 0.9} ${centerX} ${height * 0.9} C ${centerX - radius} ${height * 0.9} ${centerX - radius} ${centerY} ${centerX} ${centerY}`;
    case "clover": {
      const r = radius * 0.6;
      return `M ${centerX} ${centerY} C ${centerX - r} ${centerY - r * 2} ${centerX + r} ${centerY - r * 2} ${centerX} ${centerY} C ${centerX + r * 2} ${centerY - r} ${centerX + r * 2} ${centerY + r} ${centerX} ${centerY} C ${centerX + r} ${centerY + r * 2} ${centerX - r} ${centerY + r * 2} ${centerX} ${centerY} C ${centerX - r * 2} ${centerY + r} ${centerX - r * 2} ${centerY - r} ${centerX} ${centerY}`;
    }
    case "cross":
      return `M ${centerX} ${height * 0.1} L ${centerX} ${height * 0.9} M ${width * 0.1} ${centerY} L ${width * 0.9} ${centerY}`;
    case "plus":
      return `M ${centerX} ${height * 0.2} L ${centerX} ${height * 0.8} M ${width * 0.2} ${centerY} L ${width * 0.8} ${centerY}`;
    case "moon":
      return `M ${width * 0.3} ${height * 0.2} A ${radius} ${radius * 1.2} 0 1 1 ${width * 0.3} ${height * 0.8} A ${radius * 0.6} ${radius * 0.9} 0 1 0 ${width * 0.3} ${height * 0.2}`;
    case "sun": {
      let path = "";
      for (let i = 0; i < 24; i++) {
        const angle = (i * 15) * Math.PI / 180;
        const r = i % 2 === 0 ? radius : radius * 0.7;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
      }
      return path + " Z";
    }
    case "cloud":
      return `M ${width * 0.2} ${centerY + height * 0.1} C ${width * 0.1} ${centerY + height * 0.1} ${width * 0.1} ${centerY - height * 0.1} ${width * 0.2} ${centerY - height * 0.1} C ${width * 0.2} ${centerY - height * 0.3} ${width * 0.4} ${centerY - height * 0.3} ${width * 0.4} ${centerY - height * 0.15} C ${width * 0.5} ${centerY - height * 0.35} ${width * 0.7} ${centerY - height * 0.25} ${width * 0.7} ${centerY - height * 0.1} C ${width * 0.85} ${centerY - height * 0.15} ${width * 0.9} ${centerY} ${width * 0.8} ${centerY + height * 0.15} C ${width * 0.85} ${centerY + height * 0.25} ${width * 0.75} ${centerY + height * 0.3} ${width * 0.65} ${centerY + height * 0.2}`;
    
    // Arrows and lines
    case "arrow-up":
      return `M ${centerX} ${height * 0.1} L ${centerX} ${height * 0.9} M ${width * 0.3} ${height * 0.35} L ${centerX} ${height * 0.1} L ${width * 0.7} ${height * 0.35}`;
    case "arrow-down":
      return `M ${centerX} ${height * 0.1} L ${centerX} ${height * 0.9} M ${width * 0.3} ${height * 0.65} L ${centerX} ${height * 0.9} L ${width * 0.7} ${height * 0.65}`;
    case "arrow-left":
      return `M ${width * 0.1} ${centerY} L ${width * 0.9} ${centerY} M ${width * 0.35} ${height * 0.3} L ${width * 0.1} ${centerY} L ${width * 0.35} ${height * 0.7}`;
    case "arrow-right":
      return `M ${width * 0.1} ${centerY} L ${width * 0.9} ${centerY} M ${width * 0.65} ${height * 0.3} L ${width * 0.9} ${centerY} L ${width * 0.65} ${height * 0.7}`;
    case "chevron":
      return `M ${width * 0.3} ${height * 0.2} L ${width * 0.7} ${centerY} L ${width * 0.3} ${height * 0.8}`;
    case "double-chevron":
      return `M ${width * 0.2} ${height * 0.2} L ${width * 0.5} ${centerY} L ${width * 0.2} ${height * 0.8} M ${width * 0.5} ${height * 0.2} L ${width * 0.8} ${centerY} L ${width * 0.5} ${height * 0.8}`;
    
    // Nature
    case "flower": {
      let path = "";
      for (let i = 0; i < 6; i++) {
        const angle = (i * 60) * Math.PI / 180;
        const px = centerX + Math.cos(angle) * radius * 0.7;
        const py = centerY + Math.sin(angle) * radius * 0.7;
        if (i === 0) {
          path += `M ${centerX} ${centerY} Q ${px - radius * 0.3} ${py} ${px} ${py} Q ${px + radius * 0.3} ${py} ${centerX} ${centerY}`;
        } else {
          path += ` Q ${px - radius * 0.3} ${py} ${px} ${py} Q ${px + radius * 0.3} ${py} ${centerX} ${centerY}`;
        }
      }
      return path;
    }
    case "leaf":
      return `M ${width * 0.2} ${height * 0.8} Q ${width * 0.1} ${centerY} ${centerX} ${height * 0.2} Q ${width * 0.9} ${centerY} ${width * 0.8} ${height * 0.8} Q ${centerX} ${height * 0.6} ${width * 0.2} ${height * 0.8}`;
    case "tree":
      return `M ${centerX} ${height * 0.9} L ${centerX} ${centerY} M ${centerX} ${centerY} L ${width * 0.2} ${height * 0.4} M ${centerX} ${centerY * 0.7} L ${width * 0.75} ${height * 0.35} M ${centerX} ${centerY * 0.5} L ${width * 0.3} ${height * 0.2} M ${centerX} ${height * 0.15} L ${centerX} ${centerY * 0.3}`;
    case "mountain":
      return `M 0 ${height * 0.9} L ${width * 0.3} ${height * 0.3} L ${width * 0.45} ${height * 0.5} L ${width * 0.6} ${height * 0.2} L ${width * 0.75} ${height * 0.45} L ${width} ${height * 0.15} L ${width} ${height * 0.9}`;
    case "drop":
      return `M ${centerX} ${height * 0.1} C ${width * 0.8} ${centerY} ${width * 0.8} ${height * 0.8} ${centerX} ${height * 0.9} C ${width * 0.2} ${height * 0.8} ${width * 0.2} ${centerY} ${centerX} ${height * 0.1}`;
    case "flame":
      return `M ${centerX} ${height * 0.9} C ${width * 0.3} ${height * 0.7} ${width * 0.25} ${height * 0.4} ${width * 0.35} ${height * 0.3} C ${width * 0.3} ${height * 0.5} ${width * 0.4} ${height * 0.4} ${centerX} ${height * 0.1} C ${width * 0.6} ${height * 0.4} ${width * 0.7} ${height * 0.5} ${width * 0.65} ${height * 0.3} C ${width * 0.75} ${height * 0.4} ${width * 0.7} ${height * 0.7} ${centerX} ${height * 0.9}`;
    
    // Abstract
    case "swirl": {
      let path = `M ${centerX} ${centerY}`;
      for (let i = 0; i <= 540; i += 10) {
        const angle = (i * Math.PI) / 180;
        const r = (radius * 0.1) + (radius * 0.9 * i / 540);
        path += ` L ${centerX + Math.cos(angle) * r} ${centerY + Math.sin(angle) * r}`;
      }
      return path;
    }
    case "tornado": {
      let path = `M ${centerX} ${height * 0.1}`;
      for (let i = 0; i <= 10; i++) {
        const y = height * 0.1 + (height * 0.8 * i / 10);
        const offset = (Math.sin(i * 0.8) * width * 0.3) * (1 - i / 15);
        path += ` L ${centerX + offset} ${y}`;
      }
      return path;
    }
    case "helix": {
      let path = "";
      for (let i = 0; i <= 360 * 3; i += 10) {
        const angle = (i * Math.PI) / 180;
        const x = width * 0.1 + (width * 0.8 * i / (360 * 3));
        const y = centerY + Math.sin(angle) * height * 0.3;
        path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
      }
      return path;
    }
    case "dna": {
      let path1 = "";
      let path2 = "";
      for (let i = 0; i <= 360 * 2; i += 10) {
        const angle = (i * Math.PI) / 180;
        const x = width * 0.1 + (width * 0.8 * i / (360 * 2));
        const y1 = centerY + Math.sin(angle) * height * 0.3;
        const y2 = centerY - Math.sin(angle) * height * 0.3;
        path1 += i === 0 ? `M ${x} ${y1}` : ` L ${x} ${y1}`;
        path2 += i === 0 ? `M ${x} ${y2}` : ` L ${x} ${y2}`;
      }
      return path1 + " " + path2;
    }
    case "ribbon":
      return `M 0 ${centerY} C ${width * 0.2} ${centerY - height * 0.3} ${width * 0.3} ${centerY + height * 0.3} ${width * 0.5} ${centerY} C ${width * 0.7} ${centerY - height * 0.3} ${width * 0.8} ${centerY + height * 0.3} ${width} ${centerY}`;
    case "banner":
      return `M ${width * 0.05} ${height * 0.3} L ${width * 0.15} ${centerY} L ${width * 0.05} ${height * 0.7} L ${width * 0.95} ${height * 0.7} L ${width * 0.85} ${centerY} L ${width * 0.95} ${height * 0.3} Z`;
    
    // Letter shapes
    case "s-curve":
      return `M ${width * 0.2} ${height * 0.2} C ${width * 0.8} ${height * 0.2} ${width * 0.2} ${height * 0.8} ${width * 0.8} ${height * 0.8}`;
    case "u-shape":
      return `M ${width * 0.2} ${height * 0.2} L ${width * 0.2} ${height * 0.7} Q ${width * 0.2} ${height * 0.9} ${centerX} ${height * 0.9} Q ${width * 0.8} ${height * 0.9} ${width * 0.8} ${height * 0.7} L ${width * 0.8} ${height * 0.2}`;
    case "v-shape":
      return `M ${width * 0.1} ${height * 0.2} L ${centerX} ${height * 0.85} L ${width * 0.9} ${height * 0.2}`;
    case "w-shape":
      return `M ${width * 0.05} ${height * 0.2} L ${width * 0.25} ${height * 0.8} L ${centerX} ${height * 0.4} L ${width * 0.75} ${height * 0.8} L ${width * 0.95} ${height * 0.2}`;
    case "m-shape":
      return `M ${width * 0.1} ${height * 0.8} L ${width * 0.1} ${height * 0.2} L ${centerX} ${height * 0.5} L ${width * 0.9} ${height * 0.2} L ${width * 0.9} ${height * 0.8}`;
    case "n-shape":
      return `M ${width * 0.2} ${height * 0.8} L ${width * 0.2} ${height * 0.2} L ${width * 0.8} ${height * 0.8} L ${width * 0.8} ${height * 0.2}`;
    
    // Decorative
    case "scallop": {
      let path = `M 0 ${height * 0.7}`;
      const scallops = 6;
      for (let i = 0; i < scallops; i++) {
        const x1 = (width / scallops) * i + (width / scallops / 2);
        const x2 = (width / scallops) * (i + 1);
        path += ` Q ${x1} ${height * 0.3} ${x2} ${height * 0.7}`;
      }
      return path;
    }
    case "bracket":
      return `M ${width * 0.3} ${height * 0.1} Q ${width * 0.1} ${height * 0.1} ${width * 0.1} ${centerY} Q ${width * 0.1} ${height * 0.9} ${width * 0.3} ${height * 0.9}`;
    case "parenthesis":
      return `M ${width * 0.4} ${height * 0.1} Q ${width * 0.15} ${centerY} ${width * 0.4} ${height * 0.9}`;
    case "brace":
      return `M ${width * 0.35} ${height * 0.1} Q ${width * 0.2} ${height * 0.1} ${width * 0.2} ${height * 0.35} Q ${width * 0.2} ${height * 0.45} ${width * 0.1} ${centerY} Q ${width * 0.2} ${height * 0.55} ${width * 0.2} ${height * 0.65} Q ${width * 0.2} ${height * 0.9} ${width * 0.35} ${height * 0.9}`;
    case "scroll":
      return `M ${width * 0.15} ${height * 0.3} C ${width * 0.05} ${height * 0.1} ${width * 0.25} ${height * 0.1} ${width * 0.2} ${height * 0.25} L ${width * 0.2} ${height * 0.75} C ${width * 0.2} ${height * 0.9} ${width * 0.8} ${height * 0.9} ${width * 0.8} ${height * 0.75} L ${width * 0.8} ${height * 0.25} C ${width * 0.75} ${height * 0.1} ${width * 0.95} ${height * 0.1} ${width * 0.85} ${height * 0.3}`;
    case "flourish":
      return `M ${width * 0.1} ${centerY} C ${width * 0.2} ${height * 0.2} ${width * 0.3} ${height * 0.8} ${centerX} ${centerY} C ${width * 0.7} ${height * 0.2} ${width * 0.8} ${height * 0.8} ${width * 0.9} ${centerY}`;
    
    // Complex shapes
    case "butterfly":
      return `M ${centerX} ${centerY} C ${width * 0.2} ${height * 0.1} ${width * 0.05} ${height * 0.3} ${width * 0.15} ${centerY} C ${width * 0.05} ${height * 0.7} ${width * 0.2} ${height * 0.9} ${centerX} ${centerY} C ${width * 0.8} ${height * 0.9} ${width * 0.95} ${height * 0.7} ${width * 0.85} ${centerY} C ${width * 0.95} ${height * 0.3} ${width * 0.8} ${height * 0.1} ${centerX} ${centerY}`;
    case "crown":
      return `M ${width * 0.1} ${height * 0.8} L ${width * 0.1} ${height * 0.5} L ${width * 0.25} ${height * 0.3} L ${width * 0.35} ${height * 0.5} L ${centerX} ${height * 0.2} L ${width * 0.65} ${height * 0.5} L ${width * 0.75} ${height * 0.3} L ${width * 0.9} ${height * 0.5} L ${width * 0.9} ${height * 0.8} Z`;
    case "shield":
      return `M ${width * 0.1} ${height * 0.2} L ${width * 0.1} ${height * 0.5} Q ${width * 0.1} ${height * 0.9} ${centerX} ${height * 0.95} Q ${width * 0.9} ${height * 0.9} ${width * 0.9} ${height * 0.5} L ${width * 0.9} ${height * 0.2} L ${centerX} ${height * 0.1} Z`;
    case "badge":
      return `M ${centerX} ${height * 0.05} L ${width * 0.75} ${height * 0.2} L ${width * 0.9} ${height * 0.45} L ${width * 0.75} ${height * 0.7} L ${centerX} ${height * 0.95} L ${width * 0.25} ${height * 0.7} L ${width * 0.1} ${height * 0.45} L ${width * 0.25} ${height * 0.2} Z`;
    case "medal":
      return `M ${centerX} ${height * 0.1} L ${width * 0.65} ${height * 0.3} L ${width * 0.8} ${centerY} L ${width * 0.65} ${height * 0.7} L ${centerX} ${height * 0.9} L ${width * 0.35} ${height * 0.7} L ${width * 0.2} ${centerY} L ${width * 0.35} ${height * 0.3} Z`;
    case "frame":
      return `M ${width * 0.1} ${height * 0.1} L ${width * 0.9} ${height * 0.1} L ${width * 0.9} ${height * 0.9} L ${width * 0.1} ${height * 0.9} Z M ${width * 0.2} ${height * 0.2} L ${width * 0.2} ${height * 0.8} L ${width * 0.8} ${height * 0.8} L ${width * 0.8} ${height * 0.2} Z`;
    
    // Geometric patterns
    case "circle-half":
      return `M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`;
    case "circle-quarter":
      return `M ${centerX} ${centerY} L ${centerX + radius} ${centerY} A ${radius} ${radius} 0 0 0 ${centerX} ${centerY - radius} Z`;
    case "ellipse":
      return `M ${centerX - radius * 1.3} ${centerY} A ${radius * 1.3} ${radius * 0.7} 0 1 1 ${centerX + radius * 1.3} ${centerY} A ${radius * 1.3} ${radius * 0.7} 0 1 1 ${centerX - radius * 1.3} ${centerY}`;
    case "oval":
      return `M ${centerX - radius} ${centerY} A ${radius} ${radius * 1.4} 0 1 1 ${centerX + radius} ${centerY} A ${radius} ${radius * 1.4} 0 1 1 ${centerX - radius} ${centerY}`;
    case "egg":
      return `M ${centerX} ${height * 0.1} C ${width * 0.75} ${height * 0.1} ${width * 0.85} ${height * 0.4} ${width * 0.85} ${height * 0.55} C ${width * 0.85} ${height * 0.85} ${width * 0.65} ${height * 0.95} ${centerX} ${height * 0.95} C ${width * 0.35} ${height * 0.95} ${width * 0.15} ${height * 0.85} ${width * 0.15} ${height * 0.55} C ${width * 0.15} ${height * 0.4} ${width * 0.25} ${height * 0.1} ${centerX} ${height * 0.1}`;
    case "teardrop":
      return `M ${centerX} ${height * 0.15} C ${width * 0.75} ${height * 0.35} ${width * 0.75} ${height * 0.7} ${centerX} ${height * 0.85} C ${width * 0.25} ${height * 0.7} ${width * 0.25} ${height * 0.35} ${centerX} ${height * 0.15}`;
    
    // Fun shapes
    case "lightning":
      return `M ${width * 0.55} ${height * 0.1} L ${width * 0.35} ${height * 0.45} L ${width * 0.5} ${height * 0.45} L ${width * 0.4} ${height * 0.9} L ${width * 0.65} ${height * 0.5} L ${width * 0.5} ${height * 0.5} L ${width * 0.55} ${height * 0.1}`;
    case "bolt":
      return `M ${width * 0.6} ${height * 0.05} L ${width * 0.3} ${height * 0.5} L ${width * 0.45} ${height * 0.5} L ${width * 0.35} ${height * 0.95} L ${width * 0.7} ${height * 0.45} L ${width * 0.55} ${height * 0.45} Z`;
    case "spark": {
      let path = "";
      for (let i = 0; i < 8; i++) {
        const angle = (i * 45) * Math.PI / 180;
        const r = i % 2 === 0 ? radius : radius * 0.4;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
      }
      return path + " Z";
    }
    case "explosion": {
      let path = "";
      for (let i = 0; i < 16; i++) {
        const angle = (i * 22.5) * Math.PI / 180;
        // Use deterministic pseudo-random based on index instead of Math.random()
        const variance = 0.5 + (Math.sin(i * 1.7) * 0.2);
        const r = i % 2 === 0 ? radius : radius * variance;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
      }
      return path + " Z";
    }
    case "burst": {
      let path = "";
      for (let i = 0; i < 20; i++) {
        const angle = (i * 18) * Math.PI / 180;
        const r = i % 2 === 0 ? radius : radius * 0.6;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
      }
      return path + " Z";
    }
    case "splash":
      return `M ${centerX} ${centerY} C ${width * 0.3} ${height * 0.2} ${width * 0.15} ${height * 0.3} ${width * 0.2} ${centerY} C ${width * 0.1} ${height * 0.6} ${width * 0.25} ${height * 0.75} ${width * 0.35} ${height * 0.7} C ${width * 0.4} ${height * 0.85} ${width * 0.55} ${height * 0.8} ${centerX} ${height * 0.75} C ${width * 0.6} ${height * 0.85} ${width * 0.75} ${height * 0.8} ${width * 0.7} ${height * 0.65} C ${width * 0.85} ${height * 0.7} ${width * 0.9} ${height * 0.55} ${width * 0.8} ${centerY} C ${width * 0.9} ${height * 0.35} ${width * 0.75} ${height * 0.25} ${width * 0.65} ${height * 0.35} C ${width * 0.6} ${height * 0.2} ${width * 0.45} ${height * 0.25} ${centerX} ${centerY}`;
    
    // Speech bubbles
    case "speech-bubble":
      return `M ${width * 0.1} ${height * 0.2} L ${width * 0.9} ${height * 0.2} Q ${width * 0.95} ${height * 0.2} ${width * 0.95} ${height * 0.3} L ${width * 0.95} ${height * 0.6} Q ${width * 0.95} ${height * 0.7} ${width * 0.9} ${height * 0.7} L ${width * 0.4} ${height * 0.7} L ${width * 0.25} ${height * 0.9} L ${width * 0.3} ${height * 0.7} L ${width * 0.1} ${height * 0.7} Q ${width * 0.05} ${height * 0.7} ${width * 0.05} ${height * 0.6} L ${width * 0.05} ${height * 0.3} Q ${width * 0.05} ${height * 0.2} ${width * 0.1} ${height * 0.2}`;
    case "thought-bubble":
      return `M ${centerX} ${height * 0.2} C ${width * 0.7} ${height * 0.15} ${width * 0.85} ${height * 0.3} ${width * 0.85} ${height * 0.45} C ${width * 0.9} ${height * 0.55} ${width * 0.8} ${height * 0.7} ${width * 0.65} ${height * 0.7} C ${width * 0.55} ${height * 0.8} ${width * 0.4} ${height * 0.75} ${width * 0.35} ${height * 0.7} C ${width * 0.2} ${height * 0.7} ${width * 0.1} ${height * 0.55} ${width * 0.15} ${height * 0.4} C ${width * 0.1} ${height * 0.25} ${width * 0.25} ${height * 0.15} ${centerX} ${height * 0.2} M ${width * 0.25} ${height * 0.8} A ${width * 0.04} ${width * 0.04} 0 1 1 ${width * 0.25} ${height * 0.81} M ${width * 0.18} ${height * 0.88} A ${width * 0.025} ${width * 0.025} 0 1 1 ${width * 0.18} ${height * 0.89}`;
    case "callout":
      return `M ${width * 0.1} ${height * 0.15} L ${width * 0.9} ${height * 0.15} L ${width * 0.9} ${height * 0.65} L ${width * 0.5} ${height * 0.65} L ${width * 0.35} ${height * 0.9} L ${width * 0.35} ${height * 0.65} L ${width * 0.1} ${height * 0.65} Z`;
    
    // Banners
    case "ribbon-banner":
      return `M ${width * 0.05} ${height * 0.35} L ${width * 0.15} ${height * 0.5} L ${width * 0.05} ${height * 0.65} L ${width * 0.2} ${height * 0.65} L ${width * 0.2} ${height * 0.8} L ${width * 0.25} ${height * 0.65} L ${width * 0.75} ${height * 0.65} L ${width * 0.8} ${height * 0.8} L ${width * 0.8} ${height * 0.65} L ${width * 0.95} ${height * 0.65} L ${width * 0.85} ${height * 0.5} L ${width * 0.95} ${height * 0.35} L ${width * 0.8} ${height * 0.35} L ${width * 0.8} ${height * 0.2} L ${width * 0.75} ${height * 0.35} L ${width * 0.25} ${height * 0.35} L ${width * 0.2} ${height * 0.2} L ${width * 0.2} ${height * 0.35} Z`;
    case "flag":
      return `M ${width * 0.15} ${height * 0.1} L ${width * 0.15} ${height * 0.9} M ${width * 0.15} ${height * 0.15} L ${width * 0.85} ${height * 0.15} L ${width * 0.75} ${height * 0.35} L ${width * 0.85} ${height * 0.55} L ${width * 0.15} ${height * 0.55}`;
    case "pennant":
      return `M ${width * 0.1} ${height * 0.2} L ${width * 0.9} ${height * 0.5} L ${width * 0.1} ${height * 0.8} Z`;
    case "streamer":
      return `M ${width * 0.05} ${centerY} Q ${width * 0.15} ${height * 0.3} ${width * 0.25} ${centerY} Q ${width * 0.35} ${height * 0.7} ${width * 0.45} ${centerY} Q ${width * 0.55} ${height * 0.3} ${width * 0.65} ${centerY} Q ${width * 0.75} ${height * 0.7} ${width * 0.85} ${centerY} L ${width * 0.95} ${height * 0.4}`;
    
    // Tech
    case "circuit": {
      let path = `M 0 ${centerY} L ${width * 0.2} ${centerY}`;
      path += ` L ${width * 0.2} ${height * 0.3} L ${width * 0.4} ${height * 0.3}`;
      path += ` M ${width * 0.2} ${centerY} L ${width * 0.4} ${centerY}`;
      path += ` M ${width * 0.2} ${centerY} L ${width * 0.2} ${height * 0.7} L ${width * 0.4} ${height * 0.7}`;
      path += ` M ${width * 0.6} ${height * 0.3} L ${width * 0.8} ${height * 0.3} L ${width * 0.8} ${centerY} L ${width} ${centerY}`;
      path += ` M ${width * 0.6} ${centerY} L ${width * 0.8} ${centerY}`;
      path += ` M ${width * 0.6} ${height * 0.7} L ${width * 0.8} ${height * 0.7} L ${width * 0.8} ${centerY}`;
      return path;
    }
    case "pulse": {
      let path = `M 0 ${centerY} L ${width * 0.2} ${centerY}`;
      path += ` L ${width * 0.25} ${height * 0.7} L ${width * 0.35} ${height * 0.2} L ${width * 0.45} ${height * 0.6} L ${width * 0.5} ${height * 0.35} L ${width * 0.55} ${centerY}`;
      path += ` L ${width} ${centerY}`;
      return path;
    }
    case "soundwave": {
      let path = "";
      for (let i = 0; i <= 10; i++) {
        const x = width * 0.1 + (width * 0.8 * i / 10);
        const amp = Math.abs(Math.sin(i * 0.8)) * height * 0.35;
        if (i === 0) {
          path = `M ${x} ${centerY - amp} L ${x} ${centerY + amp}`;
        } else {
          path += ` M ${x} ${centerY - amp} L ${x} ${centerY + amp}`;
        }
      }
      return path;
    }
    case "frequency": {
      let path = `M 0 ${centerY}`;
      for (let i = 0; i <= width; i += 3) {
        const freq = (i / width) * 20;
        const amp = Math.sin(freq) * height * 0.3 * Math.sin((i / width) * Math.PI);
        path += ` L ${i} ${centerY + amp}`;
      }
      return path;
    }
    
    // Organic
    case "blob": {
      const points = 8;
      let path = "";
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const variance = 0.7 + Math.sin(i * 2.5) * 0.3;
        const r = radius * variance;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (i === 0) {
          path = `M ${x} ${y}`;
        } else {
          const prevAngle = ((i - 1) / points) * Math.PI * 2;
          const cpAngle = (angle + prevAngle) / 2;
          const cpR = radius * (0.8 + Math.sin(i * 1.7) * 0.4);
          const cpX = centerX + Math.cos(cpAngle) * cpR * 1.2;
          const cpY = centerY + Math.sin(cpAngle) * cpR * 1.2;
          path += ` Q ${cpX} ${cpY} ${x} ${y}`;
        }
      }
      return path;
    }
    case "amoeba":
      return `M ${centerX} ${height * 0.2} Q ${width * 0.7} ${height * 0.15} ${width * 0.8} ${height * 0.35} Q ${width * 0.95} ${height * 0.45} ${width * 0.85} ${height * 0.6} Q ${width * 0.9} ${height * 0.8} ${width * 0.7} ${height * 0.75} Q ${width * 0.5} ${height * 0.9} ${width * 0.35} ${height * 0.8} Q ${width * 0.15} ${height * 0.85} ${width * 0.15} ${height * 0.6} Q ${width * 0.05} ${height * 0.4} ${width * 0.2} ${height * 0.3} Q ${width * 0.25} ${height * 0.1} ${centerX} ${height * 0.2}`;
    case "cell":
      return `M ${centerX} ${height * 0.15} C ${width * 0.75} ${height * 0.1} ${width * 0.9} ${height * 0.35} ${width * 0.85} ${centerY} C ${width * 0.9} ${height * 0.7} ${width * 0.7} ${height * 0.9} ${centerX} ${height * 0.85} C ${width * 0.3} ${height * 0.9} ${width * 0.1} ${height * 0.7} ${width * 0.15} ${centerY} C ${width * 0.1} ${height * 0.3} ${width * 0.3} ${height * 0.1} ${centerX} ${height * 0.15}`;
    case "organic-1":
      return `M ${width * 0.2} ${centerY} Q ${width * 0.15} ${height * 0.3} ${width * 0.35} ${height * 0.25} Q ${width * 0.5} ${height * 0.1} ${width * 0.65} ${height * 0.25} Q ${width * 0.85} ${height * 0.3} ${width * 0.8} ${centerY} Q ${width * 0.85} ${height * 0.7} ${width * 0.65} ${height * 0.75} Q ${width * 0.5} ${height * 0.9} ${width * 0.35} ${height * 0.75} Q ${width * 0.15} ${height * 0.7} ${width * 0.2} ${centerY}`;
    case "organic-2":
      return `M ${centerX} ${height * 0.1} C ${width * 0.8} ${height * 0.05} ${width * 0.95} ${height * 0.4} ${width * 0.85} ${height * 0.55} C ${width * 0.95} ${height * 0.75} ${width * 0.75} ${height * 0.95} ${centerX} ${height * 0.9} C ${width * 0.25} ${height * 0.95} ${width * 0.05} ${height * 0.75} ${width * 0.15} ${height * 0.55} C ${width * 0.05} ${height * 0.4} ${width * 0.2} ${height * 0.05} ${centerX} ${height * 0.1}`;
    
    case "custom":
      return customPath || `M 0 ${centerY} L ${width} ${centerY}`;
    default:
      return `M 0 ${centerY} L ${width} ${centerY}`;
  }
};

// Cache for SVG path elements to avoid recreating them
const pathCache = new Map<string, SVGPathElement>();
const svgContainer = typeof document !== 'undefined' ? (() => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.style.position = 'absolute';
  svg.style.visibility = 'hidden';
  svg.style.width = '0';
  svg.style.height = '0';
  return svg;
})() : null;

// Parse SVG path and get points along it - optimized with caching
const getPointsAlongPath = (
  pathData: string,
  numPoints: number
): { x: number; y: number; angle: number }[] => {
  const points: { x: number; y: number; angle: number }[] = [];
  
  // Create cache key
  const cacheKey = `${pathData}_${numPoints}`;
  
  // Check if we have a cached path element
  let path = pathCache.get(pathData);
  
  if (!path) {
    const svgNS = "http://www.w3.org/2000/svg";
    path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", pathData);
    pathCache.set(pathData, path);
    
    // Ensure container is in DOM
    if (svgContainer && !svgContainer.parentNode) {
      document.body.appendChild(svgContainer);
    }
    if (svgContainer) {
      svgContainer.appendChild(path);
    }
  }
  
  try {
    const pathLength = path.getTotalLength();
    
    for (let i = 0; i < numPoints; i++) {
      const distance = (i / Math.max(1, numPoints - 1)) * pathLength;
      const point = path.getPointAtLength(distance);
      
      // Calculate angle by getting a nearby point
      const nextDist = Math.min(distance + 1, pathLength);
      const nextPoint = path.getPointAtLength(nextDist);
      const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x);
      
      points.push({ x: point.x, y: point.y, angle });
    }
  } catch (e) {
    // Fallback to straight line if path parsing fails
    for (let i = 0; i < numPoints; i++) {
      points.push({ x: i * 10, y: 0, angle: 0 });
    }
  }
  
  return points;
};

const drawTextOnPath = (
  ctx: CanvasRenderingContext2D,
  element: Extract<CanvasElement, { type: "text" }>,
  displayText: string,
  fontSize: number
) => {
  const pathData = getPathForShape(
    element.textPath || "circle",
    element.width,
    element.height,
    element.customPath
  );
  
  const fontStyle = `${element.fontStyle} ${element.fontWeight} ${fontSize}px ${element.fontFamily}`;
  ctx.font = fontStyle;
  ctx.textBaseline = "middle";
  
  if (element.letterSpacing !== 0) {
    ctx.letterSpacing = `${element.letterSpacing}px`;
  }

  // Apply outline glow if enabled
  if (element.outlineGlow) {
    ctx.save();
    ctx.shadowColor = element.outlineGlowColor || "#00BFFF";
    ctx.shadowBlur = element.outlineGlowBlur || 10;
    ctx.strokeStyle = element.outlineGlowColor || "#00BFFF";
    ctx.lineWidth = element.outlineGlowSpread || 2;
    ctx.restore();
  }

  if (element.shadow) {
    ctx.shadowColor = element.shadowColor;
    ctx.shadowBlur = element.shadowBlur;
    ctx.shadowOffsetX = element.shadowOffsetX;
    ctx.shadowOffsetY = element.shadowOffsetY;
  }

  // Set fill style
  if (element.colorType === "gradient" && element.gradientColor) {
    const gradientMatch = element.gradientColor.match(/linear-gradient\((\d+)deg,\s*(.+)\)/);
    if (gradientMatch) {
      const angle = parseInt(gradientMatch[1]);
      const colorStops = gradientMatch[2].split(/,\s*(?![^(]*\))/);
      const gradAngleRad = (angle - 90) * Math.PI / 180;
      const x1 = element.width / 2 + Math.cos(gradAngleRad) * element.width / 2;
      const y1 = element.height / 2 + Math.sin(gradAngleRad) * element.height / 2;
      const x2 = element.width / 2 - Math.cos(gradAngleRad) * element.width / 2;
      const y2 = element.height / 2 - Math.sin(gradAngleRad) * element.height / 2;
      
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      colorStops.forEach((stop) => {
        const stopMatch = stop.trim().match(/(.+?)\s+(\d+)%/);
        if (stopMatch) {
          gradient.addColorStop(parseInt(stopMatch[2]) / 100, stopMatch[1].trim());
        }
      });
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = element.color;
    }
  } else {
    ctx.fillStyle = element.color;
  }

  // Get points along the path
  const points = getPointsAlongPath(pathData, displayText.length);
  
  // Apply path offset
  const offset = (element.pathOffset || 0) / 100;
  const offsetPoints = Math.floor(offset * points.length);

  ctx.save();
  
  // Draw each character
  for (let i = 0; i < displayText.length && i < points.length; i++) {
    const pointIndex = (i + offsetPoints) % points.length;
    const point = points[pointIndex];
    const char = displayText[i];
    
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(point.angle);
    
    if (element.strokeWidth > 0) {
      ctx.strokeStyle = element.strokeColor;
      ctx.lineWidth = element.strokeWidth;
      ctx.strokeText(char, 0, 0);
    }
    
    ctx.fillText(char, 0, 0);
    ctx.restore();
  }
  
  ctx.restore();
  ctx.letterSpacing = "0px";
};

const drawLineElement = (
  ctx: CanvasRenderingContext2D,
  element: Extract<CanvasElement, { type: "line" | "arrow" }>
) => {
  ctx.save();
  ctx.strokeStyle = element.strokeColor;
  ctx.lineWidth = element.strokeWidth;
  ctx.lineCap = element.lineCap || "butt";
  ctx.lineJoin = element.lineJoin || "miter";
  
  if (element.dashed) {
    ctx.setLineDash(element.dashArray || [5, 5]);
  } else {
    ctx.setLineDash([]);
  }

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(element.endX - element.x, element.endY - element.y);
  ctx.stroke();

  if (element.type === "arrow") {
    // Draw arrowhead
    const angle = Math.atan2(element.endY - element.y, element.endX - element.x);
    const headLength = Math.min(20, element.strokeWidth * 5);
    
    ctx.beginPath();
    ctx.moveTo(element.endX - element.x, element.endY - element.y);
    ctx.lineTo(
      element.endX - element.x - headLength * Math.cos(angle - Math.PI / 6),
      element.endY - element.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(element.endX - element.x, element.endY - element.y);
    ctx.lineTo(
      element.endX - element.x - headLength * Math.cos(angle + Math.PI / 6),
      element.endY - element.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  }

  ctx.restore();
};

const drawShapeElement = (
  ctx: CanvasRenderingContext2D,
  element: Extract<CanvasElement, { type: "rectangle" | "circle" | "star" | "polygon" }>,
  backgroundImages?: Map<string, HTMLImageElement>
) => {
  if (element.shadow) {
    ctx.shadowColor = element.shadowColor;
    ctx.shadowBlur = element.shadowBlur;
    ctx.shadowOffsetX = element.shadowOffsetX || 0;
    ctx.shadowOffsetY = element.shadowOffsetY || 0;
  }

  // Create path for shape (needed for both fill and clipping)
  const pSlant = (element as any).parallelogramSlant as number | undefined;
  if (element.type === "rectangle") {
    if (pSlant) {
      buildParallelogramPath(ctx, 0, 0, element.width, element.height, pSlant);
    } else if (element.cornerRadius) {
      drawRoundedRect(ctx, 0, 0, element.width, element.height, element.cornerRadius);
    } else {
      ctx.beginPath();
      ctx.rect(0, 0, element.width, element.height);
    }
  } else if (element.type === "circle") {
    const radius = Math.min(element.width, element.height) / 2;
    ctx.beginPath();
    ctx.arc(element.width / 2, element.height / 2, radius, 0, Math.PI * 2);
  } else if (element.type === "star") {
    const points = element.points || 5;
    drawStar(ctx, element.width / 2, element.height / 2, points, element.width / 2, element.width / 4);
  } else if (element.type === "polygon") {
    const sides = element.sides || 6;
    drawPolygon(ctx, element.width / 2, element.height / 2, sides, element.width / 2);
  }

  // Fill with gradient or solid color
  ctx.save();
  ctx.globalAlpha = element.fillOpacity;
  
  if (element.fillType === "gradient" && element.gradientFill) {
    // Parse gradient CSS and create gradient
    const gradientStr = element.gradientFill;
    // Extract gradient type and stops
    const linearMatch = gradientStr.match(/linear-gradient\(([^,]+),\s*(.+)\)/);
    
    if (linearMatch) {
      const angle = linearMatch[1].trim();
      const stops = linearMatch[2];
      
      // Convert angle to gradient direction
      let angleNum = 90;
      if (angle.endsWith('deg')) {
        angleNum = parseInt(angle);
      }
      
      // Calculate gradient endpoints based on angle
      const angleRad = (angleNum - 90) * Math.PI / 180;
      const x0 = element.width / 2 - Math.cos(angleRad) * element.width / 2;
      const y0 = element.height / 2 - Math.sin(angleRad) * element.height / 2;
      const x1 = element.width / 2 + Math.cos(angleRad) * element.width / 2;
      const y1 = element.height / 2 + Math.sin(angleRad) * element.height / 2;
      
      const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
      
      // Parse color stops
      const stopRegex = /#[0-9a-f]{6}\s+\d+%/gi;
      const stopMatches = stops.match(stopRegex);
      
      if (stopMatches) {
        stopMatches.forEach(stop => {
          const parts = stop.trim().split(/\s+/);
          const color = parts[0];
          const position = parseInt(parts[1]) / 100;
          gradient.addColorStop(position, color);
        });
      }
      
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = element.fillColor;
    }
  } else {
    ctx.fillStyle = element.fillColor;
  }
  
  ctx.fill();
  ctx.restore();

  // Draw background image on top of color if present
  if (element.backgroundImage && backgroundImages) {
    const bgImg = backgroundImages.get(element.id);
    if (bgImg && bgImg.complete) {
      ctx.save();
      ctx.globalAlpha = element.backgroundOpacity;
      
      // Create clipping path based on shape type
      ctx.beginPath();
      if (element.type === "rectangle") {
        if (pSlant) {
          buildParallelogramPath(ctx, 0, 0, element.width, element.height, pSlant);
        } else if (element.cornerRadius) {
          drawRoundedRect(ctx, 0, 0, element.width, element.height, element.cornerRadius);
        } else {
          ctx.rect(0, 0, element.width, element.height);
        }
      } else if (element.type === "circle") {
        const radius = Math.min(element.width, element.height) / 2;
        ctx.arc(element.width / 2, element.height / 2, radius, 0, Math.PI * 2);
      } else if (element.type === "star") {
        const points = element.points || 5;
        drawStar(ctx, element.width / 2, element.height / 2, points, element.width / 2, element.width / 4);
      } else if (element.type === "polygon") {
        const sides = element.sides || 6;
        drawPolygon(ctx, element.width / 2, element.height / 2, sides, element.width / 2);
      }
      ctx.clip();
      
      ctx.drawImage(bgImg, 0, 0, element.width, element.height);
      ctx.restore();
    }
  }

  // Reset shadow for border
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Draw border
  if (element.borderWidth > 0) {
    ctx.save();
    ctx.globalAlpha = element.borderOpacity;
    ctx.strokeStyle = element.borderColor;
    ctx.lineWidth = element.borderWidth;
    
    // Apply border shadow if enabled
    if (element.borderShadow) {
      ctx.shadowColor = element.borderShadowColor || 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = element.borderShadowBlur || 4;
      ctx.shadowOffsetX = element.borderShadowOffsetX || 0;
      ctx.shadowOffsetY = element.borderShadowOffsetY || 0;
    }
    
    // Set line dash pattern based on style
    if (element.borderStyle === "dashed" || element.borderStyle === "dotted") {
      const pattern = element.borderDashPattern || (element.borderStyle === "dotted" ? [2, 4] : [5, 5]);
      ctx.setLineDash(pattern);
    } else if (element.dashed) {
      ctx.setLineDash([5, 5]);
    }
    
    // For rectangles, support individual border sides
    if (element.type === "rectangle") {
      const showTop = element.borderTop !== false;
      const showRight = element.borderRight !== false;
      const showBottom = element.borderBottom !== false;
      const showLeft = element.borderLeft !== false;
      
      // If all sides are shown or for non-rectangle shapes, use regular stroke
      if (showTop && showRight && showBottom && showLeft) {
        // Handle special border styles
        if (element.borderStyle === "double") {
          // Draw double border
          const offset = element.borderWidth * 0.4;
          ctx.lineWidth = element.borderWidth * 0.3;
          if (element.cornerRadius) {
            drawRoundedRect(ctx, -offset, -offset, element.width + offset * 2, element.height + offset * 2, element.cornerRadius + offset);
            ctx.stroke();
            drawRoundedRect(ctx, offset, offset, element.width - offset * 2, element.height - offset * 2, Math.max(0, element.cornerRadius - offset));
            ctx.stroke();
          } else {
            ctx.strokeRect(-offset, -offset, element.width + offset * 2, element.height + offset * 2);
            ctx.strokeRect(offset, offset, element.width - offset * 2, element.height - offset * 2);
          }
        } else if (element.borderStyle === "groove") {
          // Draw groove border (3D inset effect)
          const halfWidth = element.borderWidth / 2;
          ctx.lineWidth = halfWidth;
          // Dark outer
          ctx.strokeStyle = shadeColor(element.borderColor, -30);
          ctx.stroke();
          // Light inner
          ctx.strokeStyle = shadeColor(element.borderColor, 30);
          ctx.lineWidth = halfWidth * 0.6;
          ctx.stroke();
        } else if (element.borderStyle === "ridge") {
          // Draw ridge border (3D raised effect)
          const halfWidth = element.borderWidth / 2;
          ctx.lineWidth = halfWidth;
          // Light outer
          ctx.strokeStyle = shadeColor(element.borderColor, 30);
          ctx.stroke();
          // Dark inner
          ctx.strokeStyle = shadeColor(element.borderColor, -30);
          ctx.lineWidth = halfWidth * 0.6;
          ctx.stroke();
        } else {
          ctx.stroke();
        }
      } else {
        // Draw individual sides
        ctx.beginPath();
        if (showTop) {
          ctx.moveTo(0, 0);
          ctx.lineTo(element.width, 0);
        }
        if (showRight) {
          ctx.moveTo(element.width, 0);
          ctx.lineTo(element.width, element.height);
        }
        if (showBottom) {
          ctx.moveTo(element.width, element.height);
          ctx.lineTo(0, element.height);
        }
        if (showLeft) {
          ctx.moveTo(0, element.height);
          ctx.lineTo(0, 0);
        }
        ctx.stroke();
      }
    } else {
      // For other shapes (circle, star, polygon), use regular stroke
      ctx.stroke();
    }
    
    ctx.setLineDash([]);
    ctx.restore();
  }
};

// Helper function to shade a color (make it lighter or darker)
const shadeColor = (color: string, percent: number): string => {
  // Handle rgba colors
  if (color.startsWith('rgba')) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = Math.min(255, Math.max(0, parseInt(match[1]) + percent));
      const g = Math.min(255, Math.max(0, parseInt(match[2]) + percent));
      const b = Math.min(255, Math.max(0, parseInt(match[3]) + percent));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  // Handle hex colors
  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const num = parseInt(hex, 16);
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00FF) + percent;
  let b = (num & 0x0000FF) + percent;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  // Clamp radius to prevent distortion - max radius is half the smaller dimension
  const maxRadius = Math.min(width, height) / 2;
  const r = Math.min(radius, maxRadius);
  
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const drawStar = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number
) => {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);

  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }

  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
};

const drawPolygon = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  sides: number,
  radius: number
) => {
  const angle = (2 * Math.PI) / sides;
  ctx.beginPath();
  
  for (let i = 0; i < sides; i++) {
    const x = cx + radius * Math.cos(i * angle - Math.PI / 2);
    const y = cy + radius * Math.sin(i * angle - Math.PI / 2);
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.closePath();
};

const drawImageElement = (
  ctx: CanvasRenderingContext2D,
  element: Extract<CanvasElement, { type: "logo" | "watermark" | "image" }>,
  img: HTMLImageElement
) => {
  ctx.save();
  
  // Apply flip
  const scaleX = element.flipHorizontal ? -1 : 1;
  const scaleY = element.flipVertical ? -1 : 1;
  
  if (scaleX === -1 || scaleY === -1) {
    ctx.translate(element.width / 2, element.height / 2);
    ctx.scale(scaleX, scaleY);
    ctx.translate(-element.width / 2, -element.height / 2);
  }
  
  // Apply skew
  if (element.skewX || element.skewY) {
    const skewXRad = (element.skewX || 0) * Math.PI / 180;
    const skewYRad = (element.skewY || 0) * Math.PI / 180;
    ctx.transform(1, Math.tan(skewYRad), Math.tan(skewXRad), 1, 0, 0);
  }

  // Apply filter if specified
  if (element.filter && element.filter.type !== "none") {
    applyFilter(ctx, element.filter);
  }
  
  if (element.blendMode !== "normal") {
    ctx.globalCompositeOperation = element.blendMode as GlobalCompositeOperation;
  }
  ctx.drawImage(img, 0, 0, element.width, element.height);
  if (element.blendMode !== "normal") {
    ctx.globalCompositeOperation = "source-over";
  }
  
  // Reset filter
  ctx.filter = "none";
  
  ctx.restore();
};

// Global cache for shape background images to prevent reloading during drags
const shapeBackgroundImageCache = new Map<string, HTMLImageElement>();
const loadingPromises = new Map<string, Promise<HTMLImageElement | null>>();

// Helper to get cached image synchronously (for fast rendering during drag)
const getCachedImage = (id: string, src: string): HTMLImageElement | null => {
  const cached = shapeBackgroundImageCache.get(id);
  if (cached && cached.complete && cached.src === src) {
    return cached;
  }
  return null;
};

// Helper to load and cache an image
const loadImageWithCache = (id: string, src: string): Promise<HTMLImageElement | null> => {
  // Check cache first
  const cached = shapeBackgroundImageCache.get(id);
  if (cached && cached.complete && cached.src === src) {
    return Promise.resolve(cached);
  }
  
  // Check if already loading
  const existingPromise = loadingPromises.get(id);
  if (existingPromise) {
    return existingPromise;
  }
  
  // Start new load
  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      shapeBackgroundImageCache.set(id, img);
      loadingPromises.delete(id);
      resolve(img);
    };
    img.onerror = () => {
      loadingPromises.delete(id);
      resolve(null);
    };
    img.src = src;
  });
  
  loadingPromises.set(id, promise);
  return promise;
};

// Fast synchronous render that only uses cached images - for drag operations
export const renderImageToCanvasSync = (
  image: EditorImage,
  ctx: CanvasRenderingContext2D,
  imageElement: HTMLImageElement,
  loadedImages: Map<string, HTMLImageElement> = new Map()
): void => {
  const { canvasSize, filter, padding, elements } = image;
  
  // Calculate dimensions
  const paddedDims = calculatePaddedDimensions(
    canvasSize.width,
    canvasSize.height,
    padding
  );
  
  // Set canvas size
  ctx.canvas.width = paddedDims.width;
  ctx.canvas.height = paddedDims.height;
  
  // Fill padding color (background)
  ctx.fillStyle = padding.color;
  ctx.fillRect(0, 0, paddedDims.width, paddedDims.height);
  
  // Apply filter and draw image
  applyFilter(ctx, filter);
  
  if (padding.mode === "inner") {
    const imageWidth = canvasSize.width - padding.left - padding.right;
    const imageHeight = canvasSize.height - padding.top - padding.bottom;
    ctx.drawImage(imageElement, paddedDims.offsetX, paddedDims.offsetY, imageWidth, imageHeight);
  } else {
    ctx.drawImage(imageElement, paddedDims.offsetX, paddedDims.offsetY, canvasSize.width, canvasSize.height);
  }
  
  ctx.filter = "none";
  
  // Draw elements sorted by zIndex
  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);
  
  // Build maps from cache synchronously
  const elementImages = new Map<string, HTMLImageElement>();
  const shapeBackgroundImages = new Map<string, HTMLImageElement>();
  
  for (const element of sortedElements) {
    if ((element.type === "rectangle" || element.type === "circle" || element.type === "star" || element.type === "polygon") && element.backgroundImage) {
      const cacheKey = `bg_${element.id}`;
      const cached = getCachedImage(cacheKey, element.backgroundImage);
      if (cached) {
        shapeBackgroundImages.set(element.id, cached);
      }
    }
    
    if (element.type === "logo" || element.type === "watermark" || element.type === "image") {
      const existingImg = loadedImages.get(element.id);
      if (existingImg && existingImg.complete && existingImg.src === element.src) {
        elementImages.set(element.id, existingImg);
      } else {
        const cached = getCachedImage(element.id, element.src);
        if (cached) {
          elementImages.set(element.id, cached);
        }
      }
    }
  }
  
  // Draw all elements in z-order
  for (const element of sortedElements) {
    if (element.visible === false) continue;
    
    if (element.type === "logo" || element.type === "watermark" || element.type === "image") {
      const img = elementImages.get(element.id) || loadedImages.get(element.id);
      if (img && img.complete) {
        ctx.save();
        ctx.globalAlpha = element.opacity;
        ctx.translate(element.x + element.width / 2, element.y + element.height / 2);
        ctx.rotate((element.rotation * Math.PI) / 180);
        ctx.translate(-element.width / 2, -element.height / 2);
        drawImageElement(ctx, element, img);
        ctx.restore();
      }
    } else {
      drawElement(ctx, element, shapeBackgroundImages);
    }
  }
};

export const renderImageToCanvas = async (
  image: EditorImage,
  ctx: CanvasRenderingContext2D,
  imageElement: HTMLImageElement,
  loadedImages: Map<string, HTMLImageElement> = new Map(),
  useSyncRender: boolean = false
): Promise<void> => {
  // Use sync render for drag operations (no async loading, uses cached images only)
  if (useSyncRender) {
    renderImageToCanvasSync(image, ctx, imageElement, loadedImages);
    return;
  }
  
  const { canvasSize, filter, padding, elements } = image;
  
  // Calculate dimensions
  const paddedDims = calculatePaddedDimensions(
    canvasSize.width,
    canvasSize.height,
    padding
  );
  
  // Set canvas size
  ctx.canvas.width = paddedDims.width;
  ctx.canvas.height = paddedDims.height;
  
  // Fill padding color (background)
  ctx.fillStyle = padding.color;
  ctx.fillRect(0, 0, paddedDims.width, paddedDims.height);
  
  // Apply filter and draw image
  applyFilter(ctx, filter);
  
  if (padding.mode === "inner") {
    // Draw image scaled down with padding
    const imageWidth = canvasSize.width - padding.left - padding.right;
    const imageHeight = canvasSize.height - padding.top - padding.bottom;
    ctx.drawImage(
      imageElement,
      paddedDims.offsetX,
      paddedDims.offsetY,
      imageWidth,
      imageHeight
    );
  } else {
    // Draw image at full size with outer padding
    ctx.drawImage(
      imageElement,
      paddedDims.offsetX,
      paddedDims.offsetY,
      canvasSize.width,
      canvasSize.height
    );
  }
  
  // Reset filter
  ctx.filter = "none";
  
  // Draw elements sorted by zIndex
  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);
  
  // Pre-load all required images in parallel using the global cache
  const imageLoadPromises: Promise<void>[] = [];
  const elementImages = new Map<string, HTMLImageElement>();
  
  for (const element of sortedElements) {
    // Load shape background images with caching
    if ((element.type === "rectangle" || element.type === "circle" || element.type === "star" || element.type === "polygon") && element.backgroundImage) {
      const cacheKey = `bg_${element.id}`;
      const cached = shapeBackgroundImageCache.get(cacheKey);
      
      if (cached && cached.complete && cached.src === element.backgroundImage) {
        // Already cached and valid, no need to load
        continue;
      }
      
      const promise = loadImageWithCache(cacheKey, element.backgroundImage).then(() => {});
      imageLoadPromises.push(promise);
    }
    
    // Load image/logo/watermark element images
    if (element.type === "logo" || element.type === "watermark" || element.type === "image") {
      const existingImg = loadedImages.get(element.id);
      if (existingImg && existingImg.complete && existingImg.src === element.src) {
        elementImages.set(element.id, existingImg);
      } else {
        // Check our global cache too
        const cached = shapeBackgroundImageCache.get(element.id);
        if (cached && cached.complete && cached.src === element.src) {
          elementImages.set(element.id, cached);
        } else {
          const promise = loadImageWithCache(element.id, element.src).then((img) => {
            if (img) elementImages.set(element.id, img);
          });
          imageLoadPromises.push(promise);
        }
      }
    }
  }
  
  // Wait for ALL images to load before drawing ANY elements
  await Promise.all(imageLoadPromises);
  
  // Build the shape backgrounds map from cache
  const shapeBackgroundImages = new Map<string, HTMLImageElement>();
  for (const element of sortedElements) {
    if ((element.type === "rectangle" || element.type === "circle" || element.type === "star" || element.type === "polygon") && element.backgroundImage) {
      const cacheKey = `bg_${element.id}`;
      const cached = shapeBackgroundImageCache.get(cacheKey);
      if (cached && cached.complete) {
        shapeBackgroundImages.set(element.id, cached);
      }
    }
  }
  
  // Now draw all elements in z-order
  for (const element of sortedElements) {
    // Skip invisible elements
    if (element.visible === false) continue;
    
    if (element.type === "logo" || element.type === "watermark" || element.type === "image") {
      const img = elementImages.get(element.id) || loadedImages.get(element.id);
      if (img && img.complete) {
        ctx.save();
        ctx.globalAlpha = element.opacity;
        ctx.translate(element.x + element.width / 2, element.y + element.height / 2);
        ctx.rotate((element.rotation * Math.PI) / 180);
        ctx.translate(-element.width / 2, -element.height / 2);
        drawImageElement(ctx, element, img);
        ctx.restore();
      }
    } else {
      drawElement(ctx, element, shapeBackgroundImages);
    }
  }
};

// Export function to clear the cache if needed
export const clearShapeBackgroundCache = () => {
  shapeBackgroundImageCache.clear();
  loadingPromises.clear();
};
