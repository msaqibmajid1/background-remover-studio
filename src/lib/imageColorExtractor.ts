// Image Color Extraction Utilities

export interface ExtractedColor {
  hex: string;
  rgb: { r: number; g: number; b: number };
  count: number;
  percentage: number;
}

export interface ImageThemePreset {
  name: string;
  slots: {
    color: string;
    backgroundColor?: string;
    bold: boolean;
    italic: boolean;
  }[];
}

// Convert RGB to Hex
export const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
};

// Convert Hex to RGB
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

// Calculate color distance (Euclidean in RGB space)
export const getColorDistance = (
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number }
): number => {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
};

// Calculate relative luminance for contrast calculation
const getLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

// Generate contrasting text color for a background
export const getContrastingColor = (bgColor: string): string => {
  const rgb = hexToRgb(bgColor);
  if (!rgb) return "#ffffff";
  
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  return luminance > 0.5 ? "#000000" : "#ffffff";
};

// K-means clustering for color quantization
const kMeansCluster = (
  pixels: { r: number; g: number; b: number }[],
  k: number,
  maxIterations: number = 10
): { r: number; g: number; b: number }[] => {
  if (pixels.length === 0) return [];
  
  // Initialize centroids randomly from pixels
  const centroids: { r: number; g: number; b: number }[] = [];
  const usedIndices = new Set<number>();
  
  while (centroids.length < k && centroids.length < pixels.length) {
    const idx = Math.floor(Math.random() * pixels.length);
    if (!usedIndices.has(idx)) {
      usedIndices.add(idx);
      centroids.push({ ...pixels[idx] });
    }
  }
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign pixels to nearest centroid
    const clusters: { r: number; g: number; b: number }[][] = Array.from({ length: k }, () => []);
    
    for (const pixel of pixels) {
      let minDist = Infinity;
      let closestIdx = 0;
      
      for (let i = 0; i < centroids.length; i++) {
        const dist = getColorDistance(pixel, centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = i;
        }
      }
      clusters[closestIdx].push(pixel);
    }
    
    // Update centroids
    for (let i = 0; i < k; i++) {
      if (clusters[i].length > 0) {
        centroids[i] = {
          r: clusters[i].reduce((sum, p) => sum + p.r, 0) / clusters[i].length,
          g: clusters[i].reduce((sum, p) => sum + p.g, 0) / clusters[i].length,
          b: clusters[i].reduce((sum, p) => sum + p.b, 0) / clusters[i].length
        };
      }
    }
  }
  
  return centroids;
};

// Extract dominant colors from an image
export const extractDominantColors = async (
  imageSrc: string,
  colorCount: number = 6,
  sampleSize: number = 100
): Promise<ExtractedColor[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      
      // Scale down for performance
      const scale = Math.min(1, sampleSize / Math.max(img.width, img.height));
      canvas.width = Math.max(1, Math.floor(img.width * scale));
      canvas.height = Math.max(1, Math.floor(img.height * scale));
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels: { r: number; g: number; b: number }[] = [];
      
      // Sample pixels, skip very dark and very light
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const a = imageData.data[i + 3];
        
        // Skip transparent or near-transparent pixels
        if (a < 128) continue;
        
        // Skip very dark and very light colors (optional - can be removed)
        const luminance = getLuminance(r, g, b);
        if (luminance > 0.02 && luminance < 0.98) {
          pixels.push({ r, g, b });
        }
      }
      
      if (pixels.length === 0) {
        resolve([]);
        return;
      }
      
      // Cluster colors
      const clusters = kMeansCluster(pixels, colorCount);
      
      // Count pixels in each cluster
      const clusterCounts: number[] = new Array(clusters.length).fill(0);
      
      for (const pixel of pixels) {
        let minDist = Infinity;
        let closestIdx = 0;
        
        for (let i = 0; i < clusters.length; i++) {
          const dist = getColorDistance(pixel, clusters[i]);
          if (dist < minDist) {
            minDist = dist;
            closestIdx = i;
          }
        }
        clusterCounts[closestIdx]++;
      }
      
      // Build result
      const totalPixels = pixels.length;
      const colors: ExtractedColor[] = clusters.map((cluster, i) => ({
        hex: rgbToHex(cluster.r, cluster.g, cluster.b),
        rgb: { r: Math.round(cluster.r), g: Math.round(cluster.g), b: Math.round(cluster.b) },
        count: clusterCounts[i],
        percentage: (clusterCounts[i] / totalPixels) * 100
      }));
      
      // Sort by frequency
      colors.sort((a, b) => b.count - a.count);
      
      resolve(colors);
    };
    
    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };
    
    img.src = imageSrc;
  });
};

// Adjust color saturation
const adjustSaturation = (hex: string, factor: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const l = (max + min) / 2 / 255;
  
  if (max === min) return hex; // Achromatic
  
  const d = (max - min) / 255;
  let s = l > 0.5 ? d / (2 - max / 255 - min / 255) : d / (max / 255 + min / 255);
  let h = 0;
  
  if (max === rgb.r) {
    h = ((rgb.g - rgb.b) / (max - min)) % 6;
  } else if (max === rgb.g) {
    h = (rgb.b - rgb.r) / (max - min) + 2;
  } else {
    h = (rgb.r - rgb.g) / (max - min) + 4;
  }
  h = h * 60;
  if (h < 0) h += 360;
  
  // Adjust saturation
  s = Math.min(1, Math.max(0, s * factor));
  
  // Convert back to RGB
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  
  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60) { r1 = c; g1 = x; }
  else if (h < 120) { r1 = x; g1 = c; }
  else if (h < 180) { g1 = c; b1 = x; }
  else if (h < 240) { g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; b1 = c; }
  else { r1 = c; b1 = x; }
  
  return rgbToHex(
    Math.round((r1 + m) * 255),
    Math.round((g1 + m) * 255),
    Math.round((b1 + m) * 255)
  );
};

// Lighten or darken a color
const adjustLightness = (hex: string, amount: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  return rgbToHex(
    Math.min(255, Math.max(0, rgb.r + amount)),
    Math.min(255, Math.max(0, rgb.g + amount)),
    Math.min(255, Math.max(0, rgb.b + amount))
  );
};

// Generate theme presets from extracted colors
export const generateThemePresets = (colors: ExtractedColor[]): ImageThemePreset[] => {
  if (colors.length === 0) return [];
  
  const presets: ImageThemePreset[] = [];
  
  // 1. Primary Colors - Use extracted colors directly for text
  presets.push({
    name: "Image Colors",
    slots: colors.slice(0, 4).map((c, i) => ({
      color: c.hex,
      bold: i === 0,
      italic: false
    }))
  });
  
  // 2. Background Boxes - Colors as backgrounds with contrasting text
  presets.push({
    name: "Color Boxes",
    slots: colors.slice(0, 4).map((c, i) => ({
      color: getContrastingColor(c.hex),
      backgroundColor: c.hex,
      bold: i === 0,
      italic: false
    }))
  });
  
  // 3. Vibrant - Boost saturation
  presets.push({
    name: "Vibrant",
    slots: colors.slice(0, 4).map((c, i) => ({
      color: adjustSaturation(c.hex, 1.5),
      bold: i === 0,
      italic: false
    }))
  });
  
  // 4. Muted - Reduce saturation
  presets.push({
    name: "Muted",
    slots: colors.slice(0, 4).map((c, i) => ({
      color: adjustSaturation(c.hex, 0.5),
      bold: i === 0,
      italic: false
    }))
  });
  
  // 5. Light Backgrounds - Lighter versions with dark text
  presets.push({
    name: "Light Boxes",
    slots: colors.slice(0, 4).map((c, i) => ({
      color: adjustLightness(c.hex, -100),
      backgroundColor: adjustLightness(c.hex, 80),
      bold: i === 0,
      italic: false
    }))
  });
  
  // 6. Dark Backgrounds - Darker versions with light text
  presets.push({
    name: "Dark Boxes",
    slots: colors.slice(0, 4).map((c, i) => ({
      color: adjustLightness(c.hex, 100),
      backgroundColor: adjustLightness(c.hex, -80),
      bold: i === 0,
      italic: false
    }))
  });
  
  // 7. Gradient Style - Alternating primary and secondary
  if (colors.length >= 2) {
    presets.push({
      name: "Duo Tone",
      slots: [
        { color: colors[0].hex, bold: true, italic: false },
        { color: colors[1].hex, bold: false, italic: false }
      ]
    });
  }
  
  // 8. Monochrome from dominant
  if (colors.length >= 1) {
    const dominant = colors[0].hex;
    presets.push({
      name: "Monochrome",
      slots: [
        { color: dominant, bold: true, italic: false },
        { color: adjustLightness(dominant, 40), bold: false, italic: false },
        { color: adjustLightness(dominant, 80), bold: false, italic: false }
      ]
    });
  }
  
  return presets;
};

// Cache for extracted colors to avoid re-processing
const colorCache = new Map<string, ExtractedColor[]>();

export const getColorsFromImageCached = async (
  imageSrc: string,
  colorCount: number = 6
): Promise<ExtractedColor[]> => {
  const cacheKey = `${imageSrc}_${colorCount}`;
  
  if (colorCache.has(cacheKey)) {
    return colorCache.get(cacheKey)!;
  }
  
  const colors = await extractDominantColors(imageSrc, colorCount);
  colorCache.set(cacheKey, colors);
  
  return colors;
};

export const clearColorCache = () => {
  colorCache.clear();
};
