import {
  GlobalStyles,
  LayoutSettings,
  LayoutType,
  ASPECT_RATIOS,
  ImageFilter,
} from '@/types/quotesEditor';

interface RenderOptions {
  quote: string;
  author: string;
  image: HTMLImageElement | null;
  styles: GlobalStyles;
  layout: LayoutSettings;
}

/**
 * Get canvas dimensions from aspect ratio
 */
export function getCanvasDimensions(aspectRatio: string): { width: number; height: number } {
  const config = ASPECT_RATIOS.find(ar => ar.value === aspectRatio);
  return config ? { width: config.width, height: config.height } : { width: 1080, height: 1080 };
}

/**
 * Apply image filter to canvas context
 */
function applyImageFilter(ctx: CanvasRenderingContext2D, filter: ImageFilter): void {
  switch (filter) {
    case 'grayscale':
      ctx.filter = 'grayscale(100%)';
      break;
    case 'sepia':
      ctx.filter = 'sepia(80%)';
      break;
    case 'brightness':
      ctx.filter = 'brightness(120%)';
      break;
    case 'contrast':
      ctx.filter = 'contrast(120%)';
      break;
    case 'blur':
      ctx.filter = 'blur(2px)';
      break;
    default:
      ctx.filter = 'none';
  }
}

/**
 * Draw image with cover/contain/fill fitting
 */
function drawImageWithFit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  fit: 'cover' | 'contain' | 'fill',
  posX: number = 50,
  posY: number = 50
): void {
  if (fit === 'fill') {
    ctx.drawImage(img, x, y, width, height);
    return;
  }

  const imgRatio = img.width / img.height;
  const boxRatio = width / height;

  let drawWidth: number, drawHeight: number;

  if (fit === 'cover') {
    if (imgRatio > boxRatio) {
      drawHeight = height;
      drawWidth = height * imgRatio;
    } else {
      drawWidth = width;
      drawHeight = width / imgRatio;
    }
  } else {
    // contain
    if (imgRatio > boxRatio) {
      drawWidth = width;
      drawHeight = width / imgRatio;
    } else {
      drawHeight = height;
      drawWidth = height * imgRatio;
    }
  }

  // Calculate offset based on position percentage
  const offsetX = x + ((width - drawWidth) * posX) / 100;
  const offsetY = y + ((height - drawHeight) * posY) / 100;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  ctx.restore();
}

/**
 * Wrap text to fit within maxWidth
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Calculate optimal font size to fit text within available space
 */
function calculateAutoFitFontSize(
  ctx: CanvasRenderingContext2D,
  quote: string,
  author: string,
  availableWidth: number,
  availableHeight: number,
  styles: GlobalStyles
): number {
  let minSize = 12;
  let maxSize = 200;
  let optimalSize = minSize;

  const fontStyle = styles.fontStyle === 'italic' ? 'italic' : '';
  const fontWeight = styles.fontWeight === 'bold' ? 'bold' : '';
  const displayQuote = styles.addQuotationMarks ? `"${quote}"` : quote;

  while (minSize <= maxSize) {
    const midSize = Math.floor((minSize + maxSize) / 2);
    
    // Set font and measure
    ctx.font = `${fontStyle} ${fontWeight} ${midSize}px ${styles.fontFamily}`.trim();
    
    // Calculate total height needed
    const lines = wrapText(ctx, displayQuote, availableWidth);
    const lineHeight = midSize * 1.4;
    const authorHeight = author ? midSize * 0.7 + 20 : 0;
    const totalHeight = lines.length * lineHeight + authorHeight;

    if (totalHeight <= availableHeight) {
      optimalSize = midSize;
      minSize = midSize + 1;
    } else {
      maxSize = midSize - 1;
    }
  }

  return optimalSize;
}

/**
 * Draw text with proper alignment and wrapping
 */
function drawQuoteText(
  ctx: CanvasRenderingContext2D,
  quote: string,
  author: string,
  x: number,
  y: number,
  width: number,
  height: number,
  styles: GlobalStyles
): void {
  const padding = styles.padding;
  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;

  // Calculate font size (auto-fit or manual)
  const fontSize = styles.autoFitText
    ? calculateAutoFitFontSize(ctx, quote, author, availableWidth, availableHeight, styles)
    : styles.fontSize;

  // Set font for quote
  const fontStyle = styles.fontStyle === 'italic' ? 'italic' : '';
  const fontWeight = styles.fontWeight === 'bold' ? 'bold' : '';
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${styles.fontFamily}`.trim();
  ctx.textAlign = styles.textAlign;
  ctx.textBaseline = 'top';

  // Prepare quote text
  let displayQuote = quote;
  if (styles.addQuotationMarks) {
    displayQuote = `"${quote}"`;
  }

  // Wrap text
  const lines = wrapText(ctx, displayQuote, availableWidth);
  const lineHeight = fontSize * 1.4;
  
  // Calculate author dimensions using author styles
  const authorFontSize = styles.authorFontSize || fontSize * 0.6;
  const authorSpacing = styles.authorSpacing || 20;
  const authorHeight = author ? authorFontSize * 1.2 + authorSpacing : 0;
  const totalTextHeight = lines.length * lineHeight + authorHeight;

  // Center text vertically
  let startY = y + padding + (availableHeight - totalTextHeight) / 2;

  // Determine x position based on alignment
  let textX: number;
  if (styles.textAlign === 'left') {
    textX = x + padding;
  } else if (styles.textAlign === 'right') {
    textX = x + width - padding;
  } else {
    textX = x + width / 2;
  }

  // Draw quote lines
  ctx.fillStyle = styles.textColor;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], textX, startY + i * lineHeight);
  }

  // Draw author with separate styling
  if (author) {
    const authorFontStyle = styles.authorFontStyle === 'italic' ? 'italic' : '';
    const authorFontWeight = styles.authorFontWeight === 'bold' ? 'bold' : '';
    const authorFontFamily = styles.authorFontFamily || styles.fontFamily;
    
    ctx.font = `${authorFontStyle} ${authorFontWeight} ${authorFontSize}px ${authorFontFamily}`.trim();
    ctx.fillStyle = styles.authorColor;
    
    // Apply text transform
    let authorText = styles.addAuthorDash ? `— ${author}` : author;
    switch (styles.authorTextTransform) {
      case 'uppercase':
        authorText = authorText.toUpperCase();
        break;
      case 'lowercase':
        authorText = authorText.toLowerCase();
        break;
      case 'capitalize':
        authorText = authorText.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        break;
    }
    
    // Determine author x position based on author alignment
    let authorX: number;
    ctx.textAlign = styles.authorTextAlign || styles.textAlign;
    if (ctx.textAlign === 'left') {
      authorX = x + padding;
    } else if (ctx.textAlign === 'right') {
      authorX = x + width - padding;
    } else {
      authorX = x + width / 2;
    }
    
    const authorLineHeight = authorFontSize * 1.3;
    const authorY = startY + lines.length * lineHeight + authorSpacing;
    
    // Wrap author text if enabled
    if (styles.authorWrapText) {
      const authorLines = wrapText(ctx, authorText, availableWidth);
      
      for (let i = 0; i < authorLines.length; i++) {
        const lineY = authorY + i * authorLineHeight;
        
        // Apply letter spacing if needed
        if (styles.authorLetterSpacing && styles.authorLetterSpacing > 0) {
          const chars = authorLines[i].split('');
          let currentX = authorX;
          
          // Adjust starting position based on alignment
          if (ctx.textAlign === 'center') {
            const totalWidth = chars.reduce((sum, char) => sum + ctx.measureText(char).width + styles.authorLetterSpacing, 0) - styles.authorLetterSpacing;
            currentX = authorX - totalWidth / 2;
          } else if (ctx.textAlign === 'right') {
            const totalWidth = chars.reduce((sum, char) => sum + ctx.measureText(char).width + styles.authorLetterSpacing, 0) - styles.authorLetterSpacing;
            currentX = authorX - totalWidth;
          }
          
          const savedAlign = ctx.textAlign;
          ctx.textAlign = 'left';
          for (const char of chars) {
            ctx.fillText(char, currentX, lineY);
            currentX += ctx.measureText(char).width + styles.authorLetterSpacing;
          }
          ctx.textAlign = savedAlign;
        } else {
          ctx.fillText(authorLines[i], authorX, lineY);
        }
      }
    } else {
      // Single line author (original behavior)
      if (styles.authorLetterSpacing && styles.authorLetterSpacing > 0) {
        const chars = authorText.split('');
        let currentX = authorX;
        
        // Adjust starting position based on alignment
        if (ctx.textAlign === 'center') {
          const totalWidth = chars.reduce((sum, char) => sum + ctx.measureText(char).width + styles.authorLetterSpacing, 0) - styles.authorLetterSpacing;
          currentX = authorX - totalWidth / 2;
        } else if (ctx.textAlign === 'right') {
          const totalWidth = chars.reduce((sum, char) => sum + ctx.measureText(char).width + styles.authorLetterSpacing, 0) - styles.authorLetterSpacing;
          currentX = authorX - totalWidth;
        }
        
        ctx.textAlign = 'left';
        for (const char of chars) {
          ctx.fillText(char, currentX, authorY);
          currentX += ctx.measureText(char).width + styles.authorLetterSpacing;
        }
      } else {
        ctx.fillText(authorText, authorX, authorY);
      }
    }
  }
}

/**
 * Get layout regions for image and text based on layout type
 */
function getLayoutRegions(
  canvasWidth: number,
  canvasHeight: number,
  layout: LayoutSettings
): { imageRegion: { x: number; y: number; w: number; h: number } | null; textRegion: { x: number; y: number; w: number; h: number } } {
  const ratio = layout.imageTextRatio / 100;
  const isReversed = layout.direction === 'rtl';

  switch (layout.layoutType) {
    case 'horizontal-split':
    case 'horizontal-split-reverse': {
      const imageWidth = canvasWidth * ratio;
      const textWidth = canvasWidth - imageWidth;
      const isImageFirst = layout.layoutType === 'horizontal-split' ? !isReversed : isReversed;

      if (isImageFirst) {
        return {
          imageRegion: { x: 0, y: 0, w: imageWidth, h: canvasHeight },
          textRegion: { x: imageWidth, y: 0, w: textWidth, h: canvasHeight },
        };
      } else {
        return {
          imageRegion: { x: textWidth, y: 0, w: imageWidth, h: canvasHeight },
          textRegion: { x: 0, y: 0, w: textWidth, h: canvasHeight },
        };
      }
    }

    case 'vertical-stack':
    case 'vertical-stack-reverse': {
      const imageHeight = canvasHeight * ratio;
      const textHeight = canvasHeight - imageHeight;
      const isImageFirst = layout.layoutType === 'vertical-stack' ? !isReversed : isReversed;

      if (isImageFirst) {
        return {
          imageRegion: { x: 0, y: 0, w: canvasWidth, h: imageHeight },
          textRegion: { x: 0, y: imageHeight, w: canvasWidth, h: textHeight },
        };
      } else {
        return {
          imageRegion: { x: 0, y: textHeight, w: canvasWidth, h: imageHeight },
          textRegion: { x: 0, y: 0, w: canvasWidth, h: textHeight },
        };
      }
    }

    case 'image-background':
      return {
        imageRegion: { x: 0, y: 0, w: canvasWidth, h: canvasHeight },
        textRegion: { x: 0, y: 0, w: canvasWidth, h: canvasHeight },
      };

    case 'corner-overlay': {
      const cornerSize = Math.min(canvasWidth, canvasHeight) * 0.4;
      return {
        imageRegion: isReversed
          ? { x: 0, y: 0, w: cornerSize, h: cornerSize }
          : { x: canvasWidth - cornerSize, y: 0, w: cornerSize, h: cornerSize },
        textRegion: { x: 0, y: 0, w: canvasWidth, h: canvasHeight },
      };
    }

    case 'text-only':
    default:
      return {
        imageRegion: null,
        textRegion: { x: 0, y: 0, w: canvasWidth, h: canvasHeight },
      };
  }
}

/**
 * Render a quote image to canvas
 */
export async function renderQuoteImage(options: RenderOptions): Promise<string> {
  const { quote, author, image, styles, layout } = options;
  const { width, height } = getCanvasDimensions(layout.aspectRatio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Draw canvas background
  ctx.fillStyle = styles.canvasBackground;
  ctx.fillRect(0, 0, width, height);

  // Get layout regions
  const { imageRegion, textRegion } = getLayoutRegions(width, height, layout);

  // Draw image if present and region exists
  if (image && imageRegion) {
    ctx.save();
    applyImageFilter(ctx, styles.imageFilter);
    drawImageWithFit(
      ctx,
      image,
      imageRegion.x,
      imageRegion.y,
      imageRegion.w,
      imageRegion.h,
      layout.imageFit,
      layout.imagePositionX,
      layout.imagePositionY
    );
    ctx.restore();

    // Add overlay for image-background layout
    if (layout.layoutType === 'image-background') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, width, height);
    }
  }

  // Draw text background (only for non-image-background layouts)
  if (layout.layoutType !== 'image-background' && layout.layoutType !== 'corner-overlay') {
    // Check if background image exists
    if (styles.quoteBackgroundImage) {
      try {
        const bgImg = await loadImage(styles.quoteBackgroundImage);
        drawImageWithFit(
          ctx,
          bgImg,
          textRegion.x,
          textRegion.y,
          textRegion.w,
          textRegion.h,
          'cover',
          50,
          50
        );
      } catch (error) {
        // Fallback to solid color if image fails to load
        ctx.fillStyle = styles.quoteBackground;
        ctx.fillRect(textRegion.x, textRegion.y, textRegion.w, textRegion.h);
      }
    } else {
      ctx.fillStyle = styles.quoteBackground;
      ctx.fillRect(textRegion.x, textRegion.y, textRegion.w, textRegion.h);
    }
  }

  // Draw quote text
  drawQuoteText(ctx, quote, author, textRegion.x, textRegion.y, textRegion.w, textRegion.h, styles);

  return canvas.toDataURL('image/png');
}

/**
 * Export canvas as JPEG
 */
export async function exportAsJpeg(dataUrl: string, quality: number = 0.92): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

/**
 * Download image with specified format
 */
export function downloadImage(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

/**
 * Load image from URL
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
