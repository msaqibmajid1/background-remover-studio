import { TextElement } from "@/types/editor";

export const calculateOptimalFontSize = (textElement: TextElement): number => {
  // Create a temporary canvas to measure text
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return textElement.fontSize;

  const minSize = 8;
  const padding = 5; // Consistent padding matching canvasUtils
  
  // Account for stroke width - strokes extend outward from text edges
  const strokeExtra = (textElement.strokeWidth || 0) * 2;
  
  // Account for shadow blur and offset - shadows can extend beyond text boundaries
  const shadowExtra = textElement.shadow ? Math.max(
    (textElement.shadowBlur || 0) + Math.abs(textElement.shadowOffsetX || 0),
    (textElement.shadowBlur || 0) + Math.abs(textElement.shadowOffsetY || 0)
  ) : 0;
  
  // Total extra space needed for effects
  const effectsExtra = Math.max(strokeExtra, shadowExtra);
  
  const maxWidth = textElement.width - padding * 2 - effectsExtra * 2;
  const maxHeight = textElement.height - padding * 2 - effectsExtra * 2;
  
  // Ensure we have positive dimensions
  if (maxWidth <= 0 || maxHeight <= 0) return minSize;
  
  // Binary search for optimal font size
  let low = minSize;
  let high = 200;
  let optimalSize = minSize;
  
  // Get letter spacing - this adds extra width per character
  const letterSpacing = textElement.letterSpacing || 0;
  const wordSpacing = textElement.wordSpacing || 0;
  
  while (low <= high) {
    const fontSize = Math.floor((low + high) / 2);
    
    // Build font string the same way as canvasUtils (fontStyle fontWeight fontSize fontFamily)
    const fontStyle = textElement.fontStyle || 'normal';
    const fontWeight = textElement.fontWeight || 'normal';
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${textElement.fontFamily}`;
    
    // Apply text transform
    let displayText = textElement.content;
    if (textElement.textTransform === "uppercase") {
      displayText = displayText.toUpperCase();
    } else if (textElement.textTransform === "lowercase") {
      displayText = displayText.toLowerCase();
    } else if (textElement.textTransform === "capitalize") {
      displayText = displayText.replace(/\b\w/g, (char) => char.toUpperCase());
    }
    
    // Split by explicit line breaks first
    const explicitLines = displayText.split('\n');
    let allLines: string[] = [];
    
    // Helper to calculate line width including letter and word spacing
    const getLineWidth = (line: string): number => {
      const baseWidth = ctx.measureText(line).width;
      // Add letter spacing for each character (except last)
      const charCount = line.length;
      const letterSpacingWidth = charCount > 0 ? (charCount - 1) * letterSpacing : 0;
      // Add word spacing for each space
      const spaceCount = (line.match(/ /g) || []).length;
      const wordSpacingWidth = spaceCount * wordSpacing;
      return baseWidth + letterSpacingWidth + wordSpacingWidth;
    };
    
    // Wrap each line - matching canvasUtils wrapText logic
    for (const line of explicitLines) {
      const words = line.split(' ');
      let currentLine = words[0] || '';
      
      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine + ' ' + word;
        const testWidth = getLineWidth(testLine);
        
        if (testWidth < maxWidth) {
          currentLine = testLine;
        } else {
          allLines.push(currentLine);
          currentLine = word;
        }
      }
      allLines.push(currentLine);
    }
    
    // Calculate total height using the same formula as canvasUtils
    // With lineHeight, the total height is: (lines - 1) * lineHeightPx + fontSize
    const lineHeightPx = fontSize * (textElement.lineHeight || 1.2);
    const totalHeight = allLines.length > 0 
      ? (allLines.length - 1) * lineHeightPx + fontSize 
      : 0;
    
    // Check if all lines fit width (including letter/word spacing) and total height fits
    const allLinesFit = allLines.every(line => getLineWidth(line) <= maxWidth);
    const heightFits = totalHeight <= maxHeight;
    
    if (heightFits && allLinesFit) {
      optimalSize = fontSize;
      low = fontSize + 1; // Try larger
    } else {
      high = fontSize - 1; // Try smaller
    }
  }
  
  return Math.max(minSize, optimalSize);
};
