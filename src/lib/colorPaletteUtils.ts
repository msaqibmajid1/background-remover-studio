// Color palette generation utilities using color theory

export type PaletteType = 
  | "complementary" 
  | "triadic" 
  | "analogous" 
  | "split-complementary" 
  | "tetradic" 
  | "monochromatic"
  | "warm"
  | "cool"
  | "vibrant"
  | "pastel";

interface HSL {
  h: number;
  s: number;
  l: number;
}

// Convert hex to HSL
export const hexToHsl = (hex: string): HSL => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
};

// Convert HSL to hex
export const hslToHex = (h: number, s: number, l: number): string => {
  h = ((h % 360) + 360) % 360; // Normalize hue
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

// Generate palette based on type
export const generatePalette = (baseColor: string, type: PaletteType, count: number = 5): string[] => {
  const hsl = hexToHsl(baseColor);
  const colors: string[] = [];

  switch (type) {
    case "complementary":
      colors.push(baseColor);
      colors.push(hslToHex(hsl.h + 180, hsl.s, hsl.l));
      // Add variations
      colors.push(hslToHex(hsl.h, hsl.s * 0.7, hsl.l * 1.2));
      colors.push(hslToHex(hsl.h + 180, hsl.s * 0.7, hsl.l * 0.8));
      colors.push(hslToHex(hsl.h, hsl.s * 0.5, hsl.l * 1.3));
      break;

    case "triadic":
      colors.push(baseColor);
      colors.push(hslToHex(hsl.h + 120, hsl.s, hsl.l));
      colors.push(hslToHex(hsl.h + 240, hsl.s, hsl.l));
      colors.push(hslToHex(hsl.h + 120, hsl.s * 0.8, hsl.l * 1.1));
      colors.push(hslToHex(hsl.h + 240, hsl.s * 0.8, hsl.l * 0.9));
      break;

    case "analogous":
      colors.push(hslToHex(hsl.h - 30, hsl.s, hsl.l));
      colors.push(hslToHex(hsl.h - 15, hsl.s, hsl.l));
      colors.push(baseColor);
      colors.push(hslToHex(hsl.h + 15, hsl.s, hsl.l));
      colors.push(hslToHex(hsl.h + 30, hsl.s, hsl.l));
      break;

    case "split-complementary":
      colors.push(baseColor);
      colors.push(hslToHex(hsl.h + 150, hsl.s, hsl.l));
      colors.push(hslToHex(hsl.h + 210, hsl.s, hsl.l));
      colors.push(hslToHex(hsl.h, hsl.s * 0.6, hsl.l * 1.2));
      colors.push(hslToHex(hsl.h + 180, hsl.s * 0.5, hsl.l * 1.1));
      break;

    case "tetradic":
      colors.push(baseColor);
      colors.push(hslToHex(hsl.h + 90, hsl.s, hsl.l));
      colors.push(hslToHex(hsl.h + 180, hsl.s, hsl.l));
      colors.push(hslToHex(hsl.h + 270, hsl.s, hsl.l));
      colors.push(hslToHex(hsl.h, hsl.s * 0.7, hsl.l * 1.15));
      break;

    case "monochromatic":
      colors.push(hslToHex(hsl.h, hsl.s, Math.min(95, hsl.l * 1.5)));
      colors.push(hslToHex(hsl.h, hsl.s, Math.min(85, hsl.l * 1.25)));
      colors.push(baseColor);
      colors.push(hslToHex(hsl.h, hsl.s, Math.max(15, hsl.l * 0.75)));
      colors.push(hslToHex(hsl.h, hsl.s, Math.max(10, hsl.l * 0.5)));
      break;

    case "warm":
      colors.push(hslToHex(0, 80, 55)); // Red
      colors.push(hslToHex(25, 85, 55)); // Orange
      colors.push(hslToHex(45, 90, 55)); // Yellow-orange
      colors.push(hslToHex(15, 75, 50)); // Coral
      colors.push(hslToHex(35, 80, 60)); // Gold
      break;

    case "cool":
      colors.push(hslToHex(200, 80, 50)); // Blue
      colors.push(hslToHex(180, 70, 45)); // Cyan
      colors.push(hslToHex(260, 65, 55)); // Purple
      colors.push(hslToHex(220, 75, 50)); // Royal blue
      colors.push(hslToHex(170, 60, 45)); // Teal
      break;

    case "vibrant":
      colors.push(hslToHex(hsl.h, 100, 50));
      colors.push(hslToHex(hsl.h + 72, 100, 50));
      colors.push(hslToHex(hsl.h + 144, 100, 50));
      colors.push(hslToHex(hsl.h + 216, 100, 50));
      colors.push(hslToHex(hsl.h + 288, 100, 50));
      break;

    case "pastel":
      colors.push(hslToHex(hsl.h, 50, 85));
      colors.push(hslToHex(hsl.h + 60, 45, 82));
      colors.push(hslToHex(hsl.h + 120, 40, 80));
      colors.push(hslToHex(hsl.h + 180, 45, 83));
      colors.push(hslToHex(hsl.h + 240, 50, 85));
      break;
  }

  return colors.slice(0, count);
};

export const paletteTypes: { value: PaletteType; label: string; description: string }[] = [
  { value: "complementary", label: "Complementary", description: "Opposite colors for high contrast" },
  { value: "triadic", label: "Triadic", description: "Three evenly spaced colors" },
  { value: "analogous", label: "Analogous", description: "Adjacent colors for harmony" },
  { value: "split-complementary", label: "Split Comp.", description: "Base + two adjacent to complement" },
  { value: "tetradic", label: "Tetradic", description: "Four colors, two complementary pairs" },
  { value: "monochromatic", label: "Monochromatic", description: "Single hue with varying lightness" },
  { value: "warm", label: "Warm", description: "Reds, oranges, and yellows" },
  { value: "cool", label: "Cool", description: "Blues, greens, and purples" },
  { value: "vibrant", label: "Vibrant", description: "High saturation rainbow" },
  { value: "pastel", label: "Pastel", description: "Soft, muted tones" },
];
