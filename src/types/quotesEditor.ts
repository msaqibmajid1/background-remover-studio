// Types for the advanced Quotes Editor

export interface UploadedImage {
  id: string;
  file: File;
  dataUrl: string;
  name: string;
}

export interface QuoteItem {
  id: string;
  text: string;
  author: string;
  linkedImageId: string | null; // null means "Random Image"
  customStyle?: Partial<QuoteCustomStyle>;
  isExpanded?: boolean;
}

export interface QuoteCustomStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  textColor: string;
  authorColor: string;
  backgroundColor: string;
}

export type LayoutType = 
  | 'horizontal-split'      // Image left, text right
  | 'horizontal-split-reverse' // Text left, image right
  | 'vertical-stack'        // Image top, text bottom
  | 'vertical-stack-reverse' // Text top, image bottom
  | 'image-background'      // Full image with text overlay
  | 'corner-overlay'        // Image in corner with text
  | 'text-only';            // Just text, no image

export type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9' | '3:4';

export interface AspectRatioConfig {
  label: string;
  value: AspectRatio;
  width: number;
  height: number;
}

export const ASPECT_RATIOS: AspectRatioConfig[] = [
  { label: 'Square', value: '1:1', width: 1080, height: 1080 },
  { label: 'Portrait', value: '4:5', width: 1080, height: 1350 },
  { label: 'Story', value: '9:16', width: 1080, height: 1920 },
  { label: 'Landscape', value: '16:9', width: 1920, height: 1080 },
  { label: 'Tall Portrait', value: '3:4', width: 1080, height: 1440 },
];

export type ImageFilter = 'none' | 'grayscale' | 'sepia' | 'brightness' | 'contrast' | 'blur';

export interface GlobalStyles {
  // Quote Typography
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  
  // Author Typography (NEW)
  authorFontFamily: string;
  authorFontSize: number;
  authorFontWeight: 'normal' | 'bold';
  authorFontStyle: 'normal' | 'italic';
  authorTextAlign: 'left' | 'center' | 'right';
  authorTextTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  authorLetterSpacing: number;
  authorWrapText: boolean;
  
  // Colors
  textColor: string;
  authorColor: string;
  quoteBackground: string;
  canvasBackground: string;
  
  // Spacing & Options
  padding: number;
  addQuotationMarks: boolean;
  addAuthorDash: boolean;
  authorSpacing: number; // Gap between quote and author
  
  // Image Settings
  imageFilter: ImageFilter;
  backgroundTexture: string | null;
  
  // Background Image for Text Area
  quoteBackgroundImage: string | null;
  
  // Auto-fit text option
  autoFitText: boolean;
}

export type ImageFit = 'cover' | 'contain' | 'fill';
export type LayoutDirection = 'ltr' | 'rtl';

export interface LayoutSettings {
  layoutType: LayoutType;
  aspectRatio: AspectRatio;
  direction: LayoutDirection;
  imageTextRatio: number; // 0-100, percentage for image
  imageFit: ImageFit;
  imagePositionX: number; // 0-100
  imagePositionY: number; // 0-100
}

export interface GeneratedImage {
  id: string;
  dataUrl: string;
  quoteId: string;
  imageId: string | null;
}

export interface QuotesEditorProject {
  type: 'quotes-editor';
  version: string;
  timestamp: number;
  images: Array<{
    id: string;
    name: string;
    dataUrl: string;
  }>;
  quotes: QuoteItem[];
  globalStyles: GlobalStyles;
  layoutSettings: LayoutSettings;
}

export const DEFAULT_GLOBAL_STYLES: GlobalStyles = {
  // Quote Typography
  fontFamily: 'Georgia',
  fontSize: 32,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'center',
  
  // Author Typography
  authorFontFamily: 'Georgia',
  authorFontSize: 18,
  authorFontWeight: 'normal',
  authorFontStyle: 'italic',
  authorTextAlign: 'center',
  authorTextTransform: 'none',
  authorLetterSpacing: 0,
  authorWrapText: false,
  
  // Colors
  textColor: '#ffffff',
  authorColor: '#cccccc',
  quoteBackground: '#1a1a1a',
  canvasBackground: '#000000',
  
  // Spacing
  padding: 40,
  addQuotationMarks: true,
  addAuthorDash: true,
  authorSpacing: 20,
  
  // Image
  imageFilter: 'none',
  backgroundTexture: null,
  quoteBackgroundImage: null,
  autoFitText: false,
};

export const DEFAULT_LAYOUT_SETTINGS: LayoutSettings = {
  layoutType: 'horizontal-split',
  aspectRatio: '1:1',
  direction: 'ltr',
  imageTextRatio: 50,
  imageFit: 'cover',
  imagePositionX: 50,
  imagePositionY: 50,
};

export const FONT_OPTIONS = [
  // Serif Fonts
  'Georgia',
  'Playfair Display',
  'Merriweather',
  'Lora',
  'Cormorant Garamond',
  'EB Garamond',
  'Source Serif Pro',
  'Libre Baskerville',
  'Crimson Text',
  'Spectral',
  'Noto Serif',
  'PT Serif',
  'Bitter',
  'Domine',
  'Arvo',
  'Vollkorn',
  'Cardo',
  'Alegreya',
  'Old Standard TT',
  'Sorts Mill Goudy',
  'Unna',
  'Gentium Book Basic',
  'Neuton',
  'Amiri',
  'Martel',
  'Trirong',
  'Faustina',
  'Sahitya',
  'Lustria',
  
  // Sans-Serif Fonts
  'Roboto',
  'Open Sans',
  'Montserrat',
  'Raleway',
  'Poppins',
  'Inter',
  'Oswald',
  'Lato',
  'Source Sans Pro',
  'Nunito',
  'Work Sans',
  'Quicksand',
  'Rubik',
  'Karla',
  'DM Sans',
  'Cabin',
  'Mulish',
  'Josefin Sans',
  'Barlow',
  'Exo 2',
  'Cairo',
  'Catamaran',
  'Heebo',
  'Asap',
  'Archivo',
  'Lexend',
  'Outfit',
  'Plus Jakarta Sans',
  'Be Vietnam Pro',
  'Space Grotesk',
  'Manrope',
  'Sora',
  'Urbanist',
  'Red Hat Display',
  'Public Sans',
  'Albert Sans',
  'Figtree',
  'Onest',
  'Satoshi',
  'General Sans',
  
  // Display Fonts
  'Abril Fatface',
  'Bebas Neue',
  'Anton',
  'Russo One',
  'Righteous',
  'Bungee',
  'Bangers',
  'Fredoka One',
  'Passion One',
  'Permanent Marker',
  'Press Start 2P',
  'Silkscreen',
  'Monoton',
  'Ultra',
  'Shrikhand',
  'Alfa Slab One',
  'Black Ops One',
  'Bowlby One SC',
  'Fugaz One',
  
  // Script & Handwriting Fonts
  'Dancing Script',
  'Pacifico',
  'Lobster',
  'Great Vibes',
  'Sacramento',
  'Satisfy',
  'Cookie',
  'Courgette',
  'Tangerine',
  'Allura',
  'Alex Brush',
  'Pinyon Script',
  'Rouge Script',
  'Niconne',
  'Yellowtail',
  'Kaushan Script',
  'Playball',
  'Marck Script',
  'Merienda',
  'Damion',
  'Herr Von Muellerhoff',
  'Engagement',
  'Mr Dafoe',
  'Monsieur La Doulaise',
  'Norican',
  
  // Monospace Fonts
  'JetBrains Mono',
  'Fira Code',
  'Source Code Pro',
  'Roboto Mono',
  'Space Mono',
  'IBM Plex Mono',
  'Inconsolata',
  'Anonymous Pro',
  'Cousine',
  'PT Mono',
  'Ubuntu Mono',
  'Overpass Mono',
  
  // Decorative & Unique
  'Cinzel',
  'Cinzel Decorative',
  'Philosopher',
  'Marcellus',
  'Poiret One',
  'Josefin Slab',
  'Gloock',
  'Fraunces',
  'Cormorant',
  'Bodoni Moda',
  'DM Serif Display',
  'Yeseva One',
  'Forum',
  'Italiana',
  'Julius Sans One',
  'Nixie One',
  'Overlock',
  'Questrial',
  'Tenor Sans',
  'Belleza',
];

export const QUICK_THEMES = [
  { name: 'Classic', textColor: '#000000', quoteBackground: '#ffffff' },
  { name: 'Dark', textColor: '#ffffff', quoteBackground: '#1a1a1a' },
  { name: 'Blue', textColor: '#ffffff', quoteBackground: '#1e3a5f' },
  { name: 'Green', textColor: '#ffffff', quoteBackground: '#1a4d3e' },
  { name: 'Purple', textColor: '#ffffff', quoteBackground: '#4a1a6b' },
  { name: 'Warm', textColor: '#3d2914', quoteBackground: '#f5e6d3' },
];
