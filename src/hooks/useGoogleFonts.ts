import { useState, useEffect, useCallback } from "react";

export interface GoogleFont {
  family: string;
  category: string;
  variants: string[];
  isCustom?: boolean;
}

// Fonts bundled with the application are available in every tool and do not
// depend on an external Google Fonts request or the user's installed fonts.
export const BUNDLED_FONTS: GoogleFont[] = [
  { family: "Etna", category: "display", variants: ["regular"] },
  { family: "Norwester", category: "display", variants: ["regular"] },
  { family: "Fredoka", category: "display", variants: ["regular"] },
  { family: "Georgia Pro", category: "serif", variants: ["regular"] },
];

const BUNDLED_FONT_FILES: Record<string, string> = {
  Etna: "/fonts/background-studio/Etna-Free.otf",
  Norwester: "/fonts/background-studio/Norwester.ttf",
  Fredoka: "/fonts/background-studio/Fredoka.ttf",
  "Georgia Pro": "/fonts/background-studio/Georgia-Pro.ttf",
};

// Popular fonts to show first
const POPULAR_FONTS = [
  "League Spartan", "Fjalla One",
  "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Inter",
  "Oswald", "Raleway", "Playfair Display", "Merriweather", "Nunito",
  "Ubuntu", "PT Sans", "Bebas Neue", "Dancing Script", "Pacifico"
];

// System fonts that are always available
const SYSTEM_FONTS: GoogleFont[] = [
  { family: "Arial", category: "sans-serif", variants: ["regular", "700"] },
  { family: "Helvetica", category: "sans-serif", variants: ["regular", "700"] },
  { family: "Times New Roman", category: "serif", variants: ["regular", "700"] },
  { family: "Georgia", category: "serif", variants: ["regular", "700"] },
  { family: "Courier New", category: "monospace", variants: ["regular", "700"] },
  { family: "Verdana", category: "sans-serif", variants: ["regular", "700"] },
  { family: "Impact", category: "display", variants: ["regular"] },
];

// Curated list of beautiful Google Fonts (no API key needed - using direct embed)
const GOOGLE_FONTS: GoogleFont[] = [
  { family: "Roboto", category: "sans-serif", variants: ["100", "300", "regular", "500", "700", "900"] },
  { family: "Open Sans", category: "sans-serif", variants: ["300", "regular", "500", "600", "700", "800"] },
  { family: "Lato", category: "sans-serif", variants: ["100", "300", "regular", "700", "900"] },
  { family: "Montserrat", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Poppins", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Inter", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Oswald", category: "sans-serif", variants: ["200", "300", "regular", "500", "600", "700"] },
  { family: "Raleway", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Playfair Display", category: "serif", variants: ["regular", "500", "600", "700", "800", "900"] },
  { family: "Merriweather", category: "serif", variants: ["300", "regular", "700", "900"] },
  { family: "Nunito", category: "sans-serif", variants: ["200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Ubuntu", category: "sans-serif", variants: ["300", "regular", "500", "700"] },
  { family: "PT Sans", category: "sans-serif", variants: ["regular", "700"] },
  { family: "Bebas Neue", category: "display", variants: ["regular"] },
  { family: "Dancing Script", category: "handwriting", variants: ["regular", "500", "600", "700"] },
  { family: "Pacifico", category: "handwriting", variants: ["regular"] },
  { family: "Abril Fatface", category: "display", variants: ["regular"] },
  { family: "Alfa Slab One", category: "display", variants: ["regular"] },
  { family: "Anton", category: "sans-serif", variants: ["regular"] },
  { family: "Archivo", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Archivo Black", category: "sans-serif", variants: ["regular"] },
  { family: "Arvo", category: "serif", variants: ["regular", "700"] },
  { family: "Asap", category: "sans-serif", variants: ["regular", "500", "600", "700"] },
  { family: "Barlow", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Barlow Condensed", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Bitter", category: "serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Cabin", category: "sans-serif", variants: ["regular", "500", "600", "700"] },
  { family: "Cairo", category: "sans-serif", variants: ["200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Caveat", category: "handwriting", variants: ["regular", "500", "600", "700"] },
  { family: "Cinzel", category: "serif", variants: ["regular", "500", "600", "700", "800", "900"] },
  { family: "Comfortaa", category: "display", variants: ["300", "regular", "500", "600", "700"] },
  { family: "Cormorant Garamond", category: "serif", variants: ["300", "regular", "500", "600", "700"] },
  { family: "Crimson Text", category: "serif", variants: ["regular", "600", "700"] },
  { family: "DM Sans", category: "sans-serif", variants: ["regular", "500", "700"] },
  { family: "DM Serif Display", category: "serif", variants: ["regular"] },
  { family: "Dosis", category: "sans-serif", variants: ["200", "300", "regular", "500", "600", "700", "800"] },
  { family: "EB Garamond", category: "serif", variants: ["regular", "500", "600", "700", "800"] },
  { family: "Exo 2", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Fira Sans", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Fira Code", category: "monospace", variants: ["300", "regular", "500", "600", "700"] },
  { family: "Fredoka One", category: "display", variants: ["regular"] },
  { family: "Great Vibes", category: "handwriting", variants: ["regular"] },
  { family: "Heebo", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Hind", category: "sans-serif", variants: ["300", "regular", "500", "600", "700"] },
  { family: "IBM Plex Sans", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700"] },
  { family: "IBM Plex Mono", category: "monospace", variants: ["100", "200", "300", "regular", "500", "600", "700"] },
  { family: "Inconsolata", category: "monospace", variants: ["200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "JetBrains Mono", category: "monospace", variants: ["100", "200", "300", "regular", "500", "600", "700", "800"] },
  { family: "Josefin Sans", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700"] },
  { family: "Kanit", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Karla", category: "sans-serif", variants: ["200", "300", "regular", "500", "600", "700", "800"] },
  { family: "Lora", category: "serif", variants: ["regular", "500", "600", "700"] },
  { family: "Lobster", category: "display", variants: ["regular"] },
  { family: "Lobster Two", category: "display", variants: ["regular", "700"] },
  { family: "Manrope", category: "sans-serif", variants: ["200", "300", "regular", "500", "600", "700", "800"] },
  { family: "Maven Pro", category: "sans-serif", variants: ["regular", "500", "600", "700", "800", "900"] },
  { family: "Mukta", category: "sans-serif", variants: ["200", "300", "regular", "500", "600", "700", "800"] },
  { family: "Mulish", category: "sans-serif", variants: ["200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Noto Sans", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Noto Serif", category: "serif", variants: ["regular", "700"] },
  { family: "Nunito Sans", category: "sans-serif", variants: ["200", "300", "regular", "600", "700", "800", "900"] },
  { family: "Overpass", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Oxygen", category: "sans-serif", variants: ["300", "regular", "700"] },
  { family: "PT Serif", category: "serif", variants: ["regular", "700"] },
  { family: "Permanent Marker", category: "handwriting", variants: ["regular"] },
  { family: "Philosopher", category: "sans-serif", variants: ["regular", "700"] },
  { family: "Quicksand", category: "sans-serif", variants: ["300", "regular", "500", "600", "700"] },
  { family: "Righteous", category: "display", variants: ["regular"] },
  { family: "Roboto Condensed", category: "sans-serif", variants: ["300", "regular", "700"] },
  { family: "Roboto Mono", category: "monospace", variants: ["100", "200", "300", "regular", "500", "600", "700"] },
  { family: "Roboto Slab", category: "serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Rubik", category: "sans-serif", variants: ["300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Russo One", category: "sans-serif", variants: ["regular"] },
  { family: "Sacramento", category: "handwriting", variants: ["regular"] },
  { family: "Satisfy", category: "handwriting", variants: ["regular"] },
  { family: "Shadows Into Light", category: "handwriting", variants: ["regular"] },
  { family: "Signika", category: "sans-serif", variants: ["300", "regular", "500", "600", "700"] },
  { family: "Source Code Pro", category: "monospace", variants: ["200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Source Sans Pro", category: "sans-serif", variants: ["200", "300", "regular", "600", "700", "900"] },
  { family: "Source Serif Pro", category: "serif", variants: ["200", "300", "regular", "600", "700", "900"] },
  { family: "Space Grotesk", category: "sans-serif", variants: ["300", "regular", "500", "600", "700"] },
  { family: "Space Mono", category: "monospace", variants: ["regular", "700"] },
  { family: "Spectral", category: "serif", variants: ["200", "300", "regular", "500", "600", "700", "800"] },
  { family: "Teko", category: "sans-serif", variants: ["300", "regular", "500", "600", "700"] },
  { family: "Titillium Web", category: "sans-serif", variants: ["200", "300", "regular", "600", "700", "900"] },
  { family: "Urbanist", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Varela Round", category: "sans-serif", variants: ["regular"] },
  { family: "Work Sans", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Yellowtail", category: "handwriting", variants: ["regular"] },
  { family: "Zilla Slab", category: "serif", variants: ["300", "regular", "500", "600", "700"] },
  // Additional fonts
  { family: "Libre Baskerville", category: "serif", variants: ["regular", "700"] },
  { family: "Vollkorn", category: "serif", variants: ["regular", "500", "600", "700", "800", "900"] },
  { family: "Cardo", category: "serif", variants: ["regular", "700"] },
  { family: "Alegreya", category: "serif", variants: ["regular", "500", "600", "700", "800", "900"] },
  { family: "Old Standard TT", category: "serif", variants: ["regular", "700"] },
  { family: "Sorts Mill Goudy", category: "serif", variants: ["regular"] },
  { family: "Unna", category: "serif", variants: ["regular", "700"] },
  { family: "Gentium Book Basic", category: "serif", variants: ["regular", "700"] },
  { family: "Neuton", category: "serif", variants: ["200", "300", "regular", "700", "800"] },
  { family: "Amiri", category: "serif", variants: ["regular", "700"] },
  { family: "Martel", category: "serif", variants: ["200", "300", "regular", "600", "700", "800", "900"] },
  { family: "Trirong", category: "serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Faustina", category: "serif", variants: ["300", "regular", "500", "600", "700", "800"] },
  { family: "Lustria", category: "serif", variants: ["regular"] },
  { family: "Domine", category: "serif", variants: ["regular", "500", "600", "700"] },
  { family: "Lexend", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Outfit", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Plus Jakarta Sans", category: "sans-serif", variants: ["200", "300", "regular", "500", "600", "700", "800"] },
  { family: "Be Vietnam Pro", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Sora", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800"] },
  { family: "Red Hat Display", category: "sans-serif", variants: ["300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Public Sans", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Albert Sans", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Figtree", category: "sans-serif", variants: ["300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Bungee", category: "display", variants: ["regular"] },
  { family: "Bangers", category: "display", variants: ["regular"] },
  { family: "Passion One", category: "display", variants: ["regular", "700", "900"] },
  { family: "Press Start 2P", category: "display", variants: ["regular"] },
  { family: "Silkscreen", category: "display", variants: ["regular", "700"] },
  { family: "Monoton", category: "display", variants: ["regular"] },
  { family: "Ultra", category: "serif", variants: ["regular"] },
  { family: "Shrikhand", category: "display", variants: ["regular"] },
  { family: "Black Ops One", category: "display", variants: ["regular"] },
  { family: "Bowlby One SC", category: "display", variants: ["regular"] },
  { family: "Fugaz One", category: "display", variants: ["regular"] },
  { family: "Cookie", category: "handwriting", variants: ["regular"] },
  { family: "Courgette", category: "handwriting", variants: ["regular"] },
  { family: "Tangerine", category: "handwriting", variants: ["regular", "700"] },
  { family: "Allura", category: "handwriting", variants: ["regular"] },
  { family: "Alex Brush", category: "handwriting", variants: ["regular"] },
  { family: "Pinyon Script", category: "handwriting", variants: ["regular"] },
  { family: "Rouge Script", category: "handwriting", variants: ["regular"] },
  { family: "Niconne", category: "handwriting", variants: ["regular"] },
  { family: "Kaushan Script", category: "handwriting", variants: ["regular"] },
  { family: "Playball", category: "handwriting", variants: ["regular"] },
  { family: "Marck Script", category: "handwriting", variants: ["regular"] },
  { family: "Merienda", category: "handwriting", variants: ["300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Damion", category: "handwriting", variants: ["regular"] },
  { family: "Herr Von Muellerhoff", category: "handwriting", variants: ["regular"] },
  { family: "Engagement", category: "handwriting", variants: ["regular"] },
  { family: "Mr Dafoe", category: "handwriting", variants: ["regular"] },
  { family: "Monsieur La Doulaise", category: "handwriting", variants: ["regular"] },
  { family: "Norican", category: "handwriting", variants: ["regular"] },
  { family: "Anonymous Pro", category: "monospace", variants: ["regular", "700"] },
  { family: "Cousine", category: "monospace", variants: ["regular", "700"] },
  { family: "PT Mono", category: "monospace", variants: ["regular"] },
  { family: "Ubuntu Mono", category: "monospace", variants: ["regular", "700"] },
  { family: "Overpass Mono", category: "monospace", variants: ["300", "regular", "500", "600", "700"] },
  { family: "Cinzel Decorative", category: "display", variants: ["regular", "700", "900"] },
  { family: "Marcellus", category: "serif", variants: ["regular"] },
  { family: "Poiret One", category: "display", variants: ["regular"] },
  { family: "Josefin Slab", category: "serif", variants: ["100", "200", "300", "regular", "500", "600", "700"] },
  { family: "Gloock", category: "serif", variants: ["regular"] },
  { family: "Fraunces", category: "serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Cormorant", category: "serif", variants: ["300", "regular", "500", "600", "700"] },
  { family: "Bodoni Moda", category: "serif", variants: ["regular", "500", "600", "700", "800", "900"] },
  { family: "Yeseva One", category: "display", variants: ["regular"] },
  { family: "Forum", category: "display", variants: ["regular"] },
  { family: "Italiana", category: "serif", variants: ["regular"] },
  { family: "Julius Sans One", category: "sans-serif", variants: ["regular"] },
  { family: "Nixie One", category: "display", variants: ["regular"] },
  { family: "Overlock", category: "display", variants: ["regular", "700", "900"] },
  { family: "Questrial", category: "sans-serif", variants: ["regular"] },
  { family: "Tenor Sans", category: "sans-serif", variants: ["regular"] },
  { family: "Belleza", category: "sans-serif", variants: ["regular"] },
  // New fonts batch
  { family: "League Spartan", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Fjalla One", category: "sans-serif", variants: ["regular"] },
  { family: "Acme", category: "sans-serif", variants: ["regular"] },
  { family: "Bree Serif", category: "serif", variants: ["regular"] },
  { family: "Chivo", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Crete Round", category: "serif", variants: ["regular"] },
  { family: "Didact Gothic", category: "sans-serif", variants: ["regular"] },
  { family: "Encode Sans", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Exo", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Gelasio", category: "serif", variants: ["regular", "500", "600", "700"] },
  { family: "Gochi Hand", category: "handwriting", variants: ["regular"] },
  { family: "Handlee", category: "handwriting", variants: ["regular"] },
  { family: "Indie Flower", category: "handwriting", variants: ["regular"] },
  { family: "Jost", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Kalam", category: "handwriting", variants: ["300", "regular", "700"] },
  { family: "Libre Franklin", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Literata", category: "serif", variants: ["200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Mate", category: "serif", variants: ["regular"] },
  { family: "Nanum Gothic", category: "sans-serif", variants: ["regular", "700", "800"] },
  { family: "Newsreader", category: "serif", variants: ["200", "300", "regular", "500", "600", "700", "800"] },
  { family: "Noticia Text", category: "serif", variants: ["regular", "700"] },
  { family: "Pathway Gothic One", category: "sans-serif", variants: ["regular"] },
  { family: "Petrona", category: "serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Piazzolla", category: "serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Pridi", category: "serif", variants: ["200", "300", "regular", "500", "600", "700"] },
  { family: "Prompt", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Reem Kufi", category: "sans-serif", variants: ["regular", "500", "600", "700"] },
  { family: "Rokkitt", category: "serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Saira", category: "sans-serif", variants: ["100", "200", "300", "regular", "500", "600", "700", "800", "900"] },
  { family: "Sen", category: "sans-serif", variants: ["regular", "500", "600", "700", "800"] },
  { family: "Signika Negative", category: "sans-serif", variants: ["300", "regular", "500", "600", "700"] },
  { family: "Yanone Kaffeesatz", category: "sans-serif", variants: ["200", "300", "regular", "500", "600", "700"] },
  { family: "Zen Kaku Gothic New", category: "sans-serif", variants: ["300", "regular", "500", "700", "900"] },
];

const loadedFonts = new Set<string>();
let customFonts: GoogleFont[] = [];

// Load custom fonts from localStorage
const loadCustomFontsFromStorage = (): GoogleFont[] => {
  try {
    const stored = localStorage.getItem('customFonts');
    if (stored) {
      const fonts = JSON.parse(stored) as GoogleFont[];
      // Re-inject font faces for custom fonts
      fonts.forEach(font => {
        const storedData = localStorage.getItem(`customFont_${font.family}`);
        if (storedData) {
          injectCustomFontFace(font.family, storedData);
        }
      });
      return fonts;
    }
  } catch (e) {
    console.error('Error loading custom fonts:', e);
  }
  return [];
};

// Save custom fonts to localStorage
const saveCustomFontsToStorage = (fonts: GoogleFont[]) => {
  try {
    localStorage.setItem('customFonts', JSON.stringify(fonts));
  } catch (e) {
    console.error('Error saving custom fonts:', e);
  }
};

// Inject a custom font face into the document
const injectCustomFontFace = (fontFamily: string, dataUrl: string) => {
  const styleId = `custom-font-${fontFamily.replace(/\s+/g, '-')}`;
  
  // Remove existing style if present
  const existing = document.getElementById(styleId);
  if (existing) existing.remove();
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @font-face {
      font-family: '${fontFamily}';
      src: url('${dataUrl}') format('truetype');
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }
  `;
  document.head.appendChild(style);
};

export const loadGoogleFont = (fontFamily: string): void => {
  if (loadedFonts.has(fontFamily)) return;

  const bundledSource = BUNDLED_FONT_FILES[fontFamily];
  if (bundledSource && typeof FontFace !== "undefined" && document.fonts) {
    const face = new FontFace(fontFamily, `url(${bundledSource})`, {
      weight: "400",
      style: "normal",
      display: "swap",
    });
    document.fonts.add(face);
    loadedFonts.add(fontFamily);
    void face.load().catch(() => loadedFonts.delete(fontFamily));
    return;
  }
  
  // Check if it's a system font or custom font
  const isSystemFont = SYSTEM_FONTS.some(f => f.family === fontFamily);
  const isCustomFont = customFonts.some(f => f.family === fontFamily);
  if (isSystemFont || isCustomFont) return;
  
  // Create link element to load the font
  const link = document.createElement("link");
  link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, "+")}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
  link.rel = "stylesheet";
  document.head.appendChild(link);
  
  loadedFonts.add(fontFamily);
};
// Local workspaces can provide their own font faces without requesting a duplicate stylesheet.
export const registerLoadedFont = (fontFamily: string): void => { loadedFonts.add(fontFamily); };

export const addCustomFont = async (file: File): Promise<GoogleFont | null> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const fontName = file.name.replace(/\.(ttf|otf|woff|woff2)$/i, '').replace(/[-_]/g, ' ');
      
      // Capitalize first letters
      const formattedName = fontName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // Check if font already exists
      if (customFonts.some(f => f.family === formattedName)) {
        resolve(null);
        return;
      }
      
      // Inject the font face
      injectCustomFontFace(formattedName, dataUrl);
      
      // Store font data
      localStorage.setItem(`customFont_${formattedName}`, dataUrl);
      
      const newFont: GoogleFont = {
        family: formattedName,
        category: 'custom',
        variants: ['regular'],
        isCustom: true,
      };
      
      customFonts = [...customFonts, newFont];
      saveCustomFontsToStorage(customFonts);
      loadedFonts.add(formattedName);
      
      resolve(newFont);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};

export const removeCustomFont = (fontFamily: string): boolean => {
  const index = customFonts.findIndex(f => f.family === fontFamily);
  if (index === -1) return false;
  
  customFonts = customFonts.filter(f => f.family !== fontFamily);
  saveCustomFontsToStorage(customFonts);
  
  // Remove font data
  localStorage.removeItem(`customFont_${fontFamily}`);
  
  // Remove style element
  const styleId = `custom-font-${fontFamily.replace(/\s+/g, '-')}`;
  const existing = document.getElementById(styleId);
  if (existing) existing.remove();
  
  loadedFonts.delete(fontFamily);
  
  return true;
};

export const getCustomFonts = (): GoogleFont[] => {
  return [...customFonts];
};

export const useGoogleFonts = () => {
  const [fonts, setFonts] = useState<GoogleFont[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [customFontsList, setCustomFontsList] = useState<GoogleFont[]>([]);

  useEffect(() => {
    // Load custom fonts from storage
    customFonts = loadCustomFontsFromStorage();
    setCustomFontsList(customFonts);
  }, []);
  useEffect(() => {
    // Combine system fonts, custom fonts, and Google fonts
    const allFonts = [...customFontsList, ...BUNDLED_FONTS, ...SYSTEM_FONTS, ...GOOGLE_FONTS].filter((font, index, list) => list.findIndex((entry) => entry.family === font.family) === index);
    
    // Sort: Custom fonts first, then popular fonts, then alphabetically
    allFonts.sort((a, b) => {
      // Custom fonts always first
      if (a.isCustom && !b.isCustom) return -1;
      if (!a.isCustom && b.isCustom) return 1;
      
      const aPopular = POPULAR_FONTS.includes(a.family);
      const bPopular = POPULAR_FONTS.includes(b.family);
      
      if (aPopular && !bPopular) return -1;
      if (!aPopular && bPopular) return 1;
      
      if (aPopular && bPopular) {
        return POPULAR_FONTS.indexOf(a.family) - POPULAR_FONTS.indexOf(b.family);
      }
      
      return a.family.localeCompare(b.family);
    });
    
    setFonts(allFonts);
    setLoading(false);
  }, [customFontsList]);

  const filteredFonts = fonts.filter(font => {
    const matchesSearch = font.family.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || 
      font.category === selectedCategory || 
      (selectedCategory === "custom" && font.isCustom);
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", "custom", "sans-serif", "serif", "display", "handwriting", "monospace"];

  const preloadFont = useCallback((fontFamily: string) => {
    loadGoogleFont(fontFamily);
  }, []);

  const addFont = useCallback(async (file: File): Promise<GoogleFont | null> => {
    const newFont = await addCustomFont(file);
    if (newFont) {
      setCustomFontsList(prev => [...prev, newFont]);
    }
    return newFont;
  }, []);

  const removeFont = useCallback((fontFamily: string): boolean => {
    const result = removeCustomFont(fontFamily);
    if (result) {
      setCustomFontsList(prev => prev.filter(f => f.family !== fontFamily));
    }
    return result;
  }, []);

  return {
    fonts: filteredFonts,
    allFonts: fonts,
    customFonts: customFontsList,
    loading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
    preloadFont,
    loadGoogleFont,
    addCustomFont: addFont,
    removeCustomFont: removeFont,
  };
};
