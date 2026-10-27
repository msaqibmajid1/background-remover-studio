export interface WordStylePreset {
  name: string;
  category: string;
  slots: {
    color: string;
    backgroundColor?: string;
    bold: boolean;
    italic: boolean;
  }[];
}

export const WORD_STYLE_PRESETS: WordStylePreset[] = [
  // Warm Colors
  { name: "Sunset", category: "Warm", slots: [{ color: "#FF6B35", bold: true, italic: false }, { color: "#F7C59F", bold: false, italic: false }, { color: "#EFEFD0", bold: false, italic: false }] },
  { name: "Fire", category: "Warm", slots: [{ color: "#DC2F02", bold: true, italic: false }, { color: "#F48C06", bold: false, italic: false }, { color: "#FFBA08", bold: false, italic: false }] },
  { name: "Autumn", category: "Warm", slots: [{ color: "#D4A373", bold: true, italic: false }, { color: "#CCD5AE", bold: false, italic: false }, { color: "#E9EDC9", bold: false, italic: false }] },
  { name: "Peach", category: "Warm", slots: [{ color: "#FFCDB2", bold: true, italic: false }, { color: "#FFB4A2", bold: false, italic: false }, { color: "#E5989B", bold: false, italic: false }] },
  { name: "Terracotta", category: "Warm", slots: [{ color: "#C1666B", bold: true, italic: false }, { color: "#D4B483", bold: false, italic: false }, { color: "#E4DFDA", bold: false, italic: false }] },
  { name: "Amber", category: "Warm", slots: [{ color: "#FF8C00", bold: true, italic: false }, { color: "#FFA500", bold: false, italic: false }, { color: "#FFD700", bold: false, italic: false }] },
  { name: "Coral", category: "Warm", slots: [{ color: "#FF6B6B", bold: true, italic: false }, { color: "#FF8E72", bold: false, italic: false }, { color: "#FFA07A", bold: false, italic: false }] },
  { name: "Rust", category: "Warm", slots: [{ color: "#B7410E", bold: true, italic: false }, { color: "#CD5C5C", bold: false, italic: false }, { color: "#E97451", bold: false, italic: false }] },
  { name: "Mango", category: "Warm", slots: [{ color: "#FF6D00", bold: true, italic: false }, { color: "#FF9100", bold: false, italic: false }, { color: "#FFAB00", bold: false, italic: false }] },
  { name: "Papaya", category: "Warm", slots: [{ color: "#FF5722", bold: true, italic: false }, { color: "#FF7043", bold: false, italic: false }, { color: "#FF8A65", bold: false, italic: false }] },

  // Cool Colors
  { name: "Ocean", category: "Cool", slots: [{ color: "#0077B6", bold: true, italic: false }, { color: "#00B4D8", bold: false, italic: false }, { color: "#90E0EF", bold: false, italic: false }] },
  { name: "Arctic", category: "Cool", slots: [{ color: "#003049", bold: true, italic: false }, { color: "#669BBC", bold: false, italic: false }, { color: "#C1D5E0", bold: false, italic: false }] },
  { name: "Glacier", category: "Cool", slots: [{ color: "#4CC9F0", bold: true, italic: false }, { color: "#7FDBFF", bold: false, italic: false }, { color: "#B2FCFF", bold: false, italic: false }] },
  { name: "Navy", category: "Cool", slots: [{ color: "#001F54", bold: true, italic: false }, { color: "#034078", bold: false, italic: false }, { color: "#1282A2", bold: false, italic: false }] },
  { name: "Teal", category: "Cool", slots: [{ color: "#006D77", bold: true, italic: false }, { color: "#83C5BE", bold: false, italic: false }, { color: "#EDF6F9", bold: false, italic: false }] },
  { name: "Ice", category: "Cool", slots: [{ color: "#CAF0F8", bold: true, italic: false }, { color: "#ADE8F4", bold: false, italic: false }, { color: "#90E0EF", bold: false, italic: false }] },
  { name: "Sapphire", category: "Cool", slots: [{ color: "#0F4C5C", bold: true, italic: false }, { color: "#2364AA", bold: false, italic: false }, { color: "#3DA5D9", bold: false, italic: false }] },
  { name: "Cobalt", category: "Cool", slots: [{ color: "#003566", bold: true, italic: false }, { color: "#0066CC", bold: false, italic: false }, { color: "#3399FF", bold: false, italic: false }] },
  { name: "Azure", category: "Cool", slots: [{ color: "#007FFF", bold: true, italic: false }, { color: "#4DA6FF", bold: false, italic: false }, { color: "#99CCFF", bold: false, italic: false }] },
  { name: "Aqua", category: "Cool", slots: [{ color: "#00CED1", bold: true, italic: false }, { color: "#40E0D0", bold: false, italic: false }, { color: "#7FFFD4", bold: false, italic: false }] },

  // Nature
  { name: "Forest", category: "Nature", slots: [{ color: "#2D6A4F", bold: true, italic: false }, { color: "#40916C", bold: false, italic: false }, { color: "#95D5B2", bold: false, italic: false }] },
  { name: "Meadow", category: "Nature", slots: [{ color: "#606C38", bold: true, italic: false }, { color: "#7CB518", bold: false, italic: false }, { color: "#DAD7CD", bold: false, italic: false }] },
  { name: "Jungle", category: "Nature", slots: [{ color: "#1B4332", bold: true, italic: false }, { color: "#2D6A4F", bold: false, italic: false }, { color: "#52B788", bold: false, italic: false }] },
  { name: "Moss", category: "Nature", slots: [{ color: "#4A7C59", bold: true, italic: false }, { color: "#8FB996", bold: false, italic: false }, { color: "#DAF7A6", bold: false, italic: false }] },
  { name: "Sage", category: "Nature", slots: [{ color: "#9DC183", bold: true, italic: false }, { color: "#C9E4CA", bold: false, italic: false }, { color: "#E8F5E9", bold: false, italic: false }] },
  { name: "Olive", category: "Nature", slots: [{ color: "#556B2F", bold: true, italic: false }, { color: "#6B8E23", bold: false, italic: false }, { color: "#9ACD32", bold: false, italic: false }] },
  { name: "Fern", category: "Nature", slots: [{ color: "#228B22", bold: true, italic: false }, { color: "#32CD32", bold: false, italic: false }, { color: "#90EE90", bold: false, italic: false }] },
  { name: "Pine", category: "Nature", slots: [{ color: "#1D3C34", bold: true, italic: false }, { color: "#2E5A4E", bold: false, italic: false }, { color: "#3F7869", bold: false, italic: false }] },
  { name: "Mint", category: "Nature", slots: [{ color: "#00A86B", bold: true, italic: false }, { color: "#3EB489", bold: false, italic: false }, { color: "#98FF98", bold: false, italic: false }] },
  { name: "Eucalyptus", category: "Nature", slots: [{ color: "#5F8575", bold: true, italic: false }, { color: "#8FBC8F", bold: false, italic: false }, { color: "#C1E1C1", bold: false, italic: false }] },

  // Neon & Vibrant
  { name: "Neon", category: "Neon", slots: [{ color: "#FF00FF", bold: true, italic: false }, { color: "#00FFFF", bold: false, italic: false }, { color: "#FFFF00", bold: false, italic: false }] },
  { name: "Electric", category: "Neon", slots: [{ color: "#00FF00", bold: true, italic: false }, { color: "#FF1493", bold: false, italic: false }, { color: "#00CED1", bold: false, italic: false }] },
  { name: "Cyber", category: "Neon", slots: [{ color: "#FF0055", bold: true, italic: false }, { color: "#00FFAA", bold: false, italic: false }, { color: "#AA00FF", bold: false, italic: false }] },
  { name: "Laser", category: "Neon", slots: [{ color: "#FF3F00", bold: true, italic: false }, { color: "#7FFF00", bold: false, italic: false }, { color: "#FF00FF", bold: false, italic: false }] },
  { name: "Rave", category: "Neon", slots: [{ color: "#FF0099", bold: true, italic: false }, { color: "#00FF99", bold: false, italic: false }, { color: "#9900FF", bold: false, italic: false }] },
  { name: "Disco", category: "Neon", slots: [{ color: "#F0F", bold: true, italic: false }, { color: "#0FF", bold: false, italic: false }, { color: "#FF0", bold: false, italic: false }, { color: "#F00", bold: false, italic: false }] },
  { name: "Plasma", category: "Neon", slots: [{ color: "#E040FB", bold: true, italic: false }, { color: "#7C4DFF", bold: false, italic: false }, { color: "#536DFE", bold: false, italic: false }] },
  { name: "Glow", category: "Neon", slots: [{ color: "#39FF14", bold: true, italic: false }, { color: "#FF073A", bold: false, italic: false }, { color: "#00BFFF", bold: false, italic: false }] },
  { name: "Voltage", category: "Neon", slots: [{ color: "#CCFF00", bold: true, italic: false }, { color: "#FF6600", bold: false, italic: false }, { color: "#FF00CC", bold: false, italic: false }] },
  { name: "Ultraviolet", category: "Neon", slots: [{ color: "#8B00FF", bold: true, italic: false }, { color: "#4B0082", bold: false, italic: false }, { color: "#9400D3", bold: false, italic: false }] },

  // Pastel
  { name: "Candy", category: "Pastel", slots: [{ color: "#FF69B4", bold: true, italic: false }, { color: "#DDA0DD", bold: false, italic: false }, { color: "#87CEEB", bold: false, italic: false }] },
  { name: "Macaron", category: "Pastel", slots: [{ color: "#FFB7CE", bold: true, italic: false }, { color: "#B5EAD7", bold: false, italic: false }, { color: "#FFDAC1", bold: false, italic: false }] },
  { name: "Bubblegum", category: "Pastel", slots: [{ color: "#FF85C0", bold: true, italic: false }, { color: "#FFC0CB", bold: false, italic: false }, { color: "#FFE4E1", bold: false, italic: false }] },
  { name: "Cotton Candy", category: "Pastel", slots: [{ color: "#FFB6C1", bold: true, italic: false }, { color: "#DDA0DD", bold: false, italic: false }, { color: "#E6E6FA", bold: false, italic: false }] },
  { name: "Easter", category: "Pastel", slots: [{ color: "#FFD1DC", bold: true, italic: false }, { color: "#FFFACD", bold: false, italic: false }, { color: "#E0BBE4", bold: false, italic: false }, { color: "#D4F0F0", bold: false, italic: false }] },
  { name: "Sorbet", category: "Pastel", slots: [{ color: "#FFDAB9", bold: true, italic: false }, { color: "#E0FFFF", bold: false, italic: false }, { color: "#FAFAD2", bold: false, italic: false }] },
  { name: "Lavender", category: "Pastel", slots: [{ color: "#E6E6FA", bold: true, italic: false }, { color: "#D8BFD8", bold: false, italic: false }, { color: "#DDA0DD", bold: false, italic: false }] },
  { name: "Blush", category: "Pastel", slots: [{ color: "#F5C6CB", bold: true, italic: false }, { color: "#F8D7DA", bold: false, italic: false }, { color: "#FCE4EC", bold: false, italic: false }] },
  { name: "Lemonade", category: "Pastel", slots: [{ color: "#FFFACD", bold: true, italic: false }, { color: "#FAFAD2", bold: false, italic: false }, { color: "#FFFFE0", bold: false, italic: false }] },
  { name: "Baby", category: "Pastel", slots: [{ color: "#89CFF0", bold: true, italic: false }, { color: "#FFB7CE", bold: false, italic: false }, { color: "#FFFDD0", bold: false, italic: false }] },

  // Earth Tones
  { name: "Desert", category: "Earth", slots: [{ color: "#C19A6B", bold: true, italic: false }, { color: "#D2B48C", bold: false, italic: false }, { color: "#F5DEB3", bold: false, italic: false }] },
  { name: "Clay", category: "Earth", slots: [{ color: "#8B4513", bold: true, italic: false }, { color: "#A0522D", bold: false, italic: false }, { color: "#CD853F", bold: false, italic: false }] },
  { name: "Sand", category: "Earth", slots: [{ color: "#C2B280", bold: true, italic: false }, { color: "#D2B48C", bold: false, italic: false }, { color: "#EED9C4", bold: false, italic: false }] },
  { name: "Dune", category: "Earth", slots: [{ color: "#967969", bold: true, italic: false }, { color: "#C4A484", bold: false, italic: false }, { color: "#E0C9A6", bold: false, italic: false }] },
  { name: "Sahara", category: "Earth", slots: [{ color: "#C9A959", bold: true, italic: false }, { color: "#D4AF37", bold: false, italic: false }, { color: "#ECD540", bold: false, italic: false }] },
  { name: "Coffee", category: "Earth", slots: [{ color: "#6F4E37", bold: true, italic: false }, { color: "#A67B5B", bold: false, italic: false }, { color: "#C4A484", bold: false, italic: false }] },
  { name: "Chocolate", category: "Earth", slots: [{ color: "#3D1C02", bold: true, italic: false }, { color: "#7B3F00", bold: false, italic: false }, { color: "#D2691E", bold: false, italic: false }] },
  { name: "Caramel", category: "Earth", slots: [{ color: "#FF7518", bold: true, italic: false }, { color: "#FFD59A", bold: false, italic: false }, { color: "#FFF3E0", bold: false, italic: false }] },
  { name: "Mocha", category: "Earth", slots: [{ color: "#4B371C", bold: true, italic: false }, { color: "#6B4423", bold: false, italic: false }, { color: "#8B5A2B", bold: false, italic: false }] },
  { name: "Espresso", category: "Earth", slots: [{ color: "#3C2005", bold: true, italic: false }, { color: "#5C3317", bold: false, italic: false }, { color: "#704214", bold: false, italic: false }] },

  // Metallic
  { name: "Gold & Silver", category: "Metallic", slots: [{ color: "#FFD700", bold: true, italic: false }, { color: "#C0C0C0", bold: false, italic: false }] },
  { name: "Bronze", category: "Metallic", slots: [{ color: "#CD7F32", bold: true, italic: false }, { color: "#B87333", bold: false, italic: false }, { color: "#DEB887", bold: false, italic: false }] },
  { name: "Rose Gold", category: "Metallic", slots: [{ color: "#B76E79", bold: true, italic: false }, { color: "#E8B4B8", bold: false, italic: false }, { color: "#F4C2C2", bold: false, italic: false }] },
  { name: "Platinum", category: "Metallic", slots: [{ color: "#E5E4E2", bold: true, italic: false }, { color: "#D9D9D9", bold: false, italic: false }, { color: "#BCC6CC", bold: false, italic: false }] },
  { name: "Copper", category: "Metallic", slots: [{ color: "#B87333", bold: true, italic: false }, { color: "#DA8A67", bold: false, italic: false }, { color: "#F0C8A0", bold: false, italic: false }] },
  { name: "Chrome", category: "Metallic", slots: [{ color: "#DBE4EB", bold: true, italic: false }, { color: "#B8C4CF", bold: false, italic: false }, { color: "#8E99A4", bold: false, italic: false }] },
  { name: "Brass", category: "Metallic", slots: [{ color: "#B5A642", bold: true, italic: false }, { color: "#C9AE5D", bold: false, italic: false }, { color: "#E1CC4F", bold: false, italic: false }] },
  { name: "Titanium", category: "Metallic", slots: [{ color: "#878681", bold: true, italic: false }, { color: "#A9A9A9", bold: false, italic: false }, { color: "#C0C0C0", bold: false, italic: false }] },
  { name: "Steel", category: "Metallic", slots: [{ color: "#71797E", bold: true, italic: false }, { color: "#848884", bold: false, italic: false }, { color: "#B0C4DE", bold: false, italic: false }] },
  { name: "Pewter", category: "Metallic", slots: [{ color: "#8F9779", bold: true, italic: false }, { color: "#A4A6A4", bold: false, italic: false }, { color: "#C4C4C4", bold: false, italic: false }] },

  // Monochrome
  { name: "Monochrome", category: "Mono", slots: [{ color: "#000000", bold: true, italic: false }, { color: "#666666", bold: false, italic: false }, { color: "#AAAAAA", bold: false, italic: false }] },
  { name: "Noir", category: "Mono", slots: [{ color: "#1A1A1A", bold: true, italic: false }, { color: "#333333", bold: false, italic: false }, { color: "#4D4D4D", bold: false, italic: false }] },
  { name: "Charcoal", category: "Mono", slots: [{ color: "#36454F", bold: true, italic: false }, { color: "#536878", bold: false, italic: false }, { color: "#708090", bold: false, italic: false }] },
  { name: "Slate", category: "Mono", slots: [{ color: "#708090", bold: true, italic: false }, { color: "#778899", bold: false, italic: false }, { color: "#B0C4DE", bold: false, italic: false }] },
  { name: "Silver", category: "Mono", slots: [{ color: "#C0C0C0", bold: true, italic: false }, { color: "#D3D3D3", bold: false, italic: false }, { color: "#E8E8E8", bold: false, italic: false }] },
  { name: "Snow", category: "Mono", slots: [{ color: "#FFFAFA", bold: true, italic: false }, { color: "#F5F5F5", bold: false, italic: false }, { color: "#DCDCDC", bold: false, italic: false }] },
  { name: "Ink", category: "Mono", slots: [{ color: "#1F1F1F", bold: true, italic: false }, { color: "#3D3D3D", bold: false, italic: false }, { color: "#5C5C5C", bold: false, italic: false }] },
  { name: "Ash", category: "Mono", slots: [{ color: "#B2BEB5", bold: true, italic: false }, { color: "#ACB78E", bold: false, italic: false }, { color: "#C4C4C4", bold: false, italic: false }] },
  { name: "Graphite", category: "Mono", slots: [{ color: "#474A51", bold: true, italic: false }, { color: "#5A5A5A", bold: false, italic: false }, { color: "#6E6E6E", bold: false, italic: false }] },
  { name: "Ivory", category: "Mono", slots: [{ color: "#FFFFF0", bold: true, italic: false }, { color: "#FAF0E6", bold: false, italic: false }, { color: "#FDF5E6", bold: false, italic: false }] },

  // Purple & Pink
  { name: "Violet", category: "Purple", slots: [{ color: "#7B68EE", bold: true, italic: false }, { color: "#9370DB", bold: false, italic: false }, { color: "#BA55D3", bold: false, italic: false }] },
  { name: "Grape", category: "Purple", slots: [{ color: "#6F2DA8", bold: true, italic: false }, { color: "#9966CC", bold: false, italic: false }, { color: "#CC99FF", bold: false, italic: false }] },
  { name: "Orchid", category: "Purple", slots: [{ color: "#DA70D6", bold: true, italic: false }, { color: "#EE82EE", bold: false, italic: false }, { color: "#DDA0DD", bold: false, italic: false }] },
  { name: "Plum", category: "Purple", slots: [{ color: "#8E4585", bold: true, italic: false }, { color: "#A569BD", bold: false, italic: false }, { color: "#BB8FCE", bold: false, italic: false }] },
  { name: "Magenta", category: "Purple", slots: [{ color: "#FF00FF", bold: true, italic: false }, { color: "#FF66FF", bold: false, italic: false }, { color: "#FF99FF", bold: false, italic: false }] },
  { name: "Fuchsia", category: "Purple", slots: [{ color: "#FF00FF", bold: true, italic: false }, { color: "#FF77FF", bold: false, italic: false }, { color: "#FFBBFF", bold: false, italic: false }] },
  { name: "Rose", category: "Purple", slots: [{ color: "#FF007F", bold: true, italic: false }, { color: "#FF69B4", bold: false, italic: false }, { color: "#FFB6C1", bold: false, italic: false }] },
  { name: "Berry", category: "Purple", slots: [{ color: "#8E4585", bold: true, italic: false }, { color: "#C71585", bold: false, italic: false }, { color: "#DB7093", bold: false, italic: false }] },
  { name: "Amethyst", category: "Purple", slots: [{ color: "#9966CC", bold: true, italic: false }, { color: "#B19CD9", bold: false, italic: false }, { color: "#E6E6FA", bold: false, italic: false }] },
  { name: "Mauve", category: "Purple", slots: [{ color: "#E0B0FF", bold: true, italic: false }, { color: "#D8BFD8", bold: false, italic: false }, { color: "#DCD0FF", bold: false, italic: false }] },

  // High Contrast
  { name: "Red Alert", category: "Contrast", slots: [{ color: "#FF0000", bold: true, italic: false }, { color: "#FFFFFF", bold: false, italic: false }] },
  { name: "Warning", category: "Contrast", slots: [{ color: "#FFD700", bold: true, italic: false }, { color: "#000000", bold: false, italic: false }] },
  { name: "Stop Sign", category: "Contrast", slots: [{ color: "#FF0000", bold: true, italic: false }, { color: "#FFFFFF", bold: true, italic: false }, { color: "#000000", bold: false, italic: false }] },
  { name: "Caution", category: "Contrast", slots: [{ color: "#FFCC00", bold: true, italic: false }, { color: "#333333", bold: false, italic: false }] },
  { name: "Emergency", category: "Contrast", slots: [{ color: "#FF4136", bold: true, italic: false }, { color: "#001F3F", bold: false, italic: false }, { color: "#FFFFFF", bold: false, italic: false }] },
  { name: "Traffic Light", category: "Contrast", slots: [{ color: "#FF0000", bold: true, italic: false }, { color: "#FFFF00", bold: false, italic: false }, { color: "#00FF00", bold: false, italic: false }] },
  { name: "Zebra", category: "Contrast", slots: [{ color: "#000000", bold: true, italic: false }, { color: "#FFFFFF", bold: true, italic: false }] },
  { name: "Newspaper", category: "Contrast", slots: [{ color: "#1A1A1A", bold: true, italic: false }, { color: "#666666", bold: false, italic: false }] },
  { name: "Blueprint", category: "Contrast", slots: [{ color: "#FFFFFF", bold: true, italic: false }, { color: "#4169E1", bold: false, italic: false }] },
  { name: "Chalkboard", category: "Contrast", slots: [{ color: "#FFFFFF", bold: true, italic: false }, { color: "#2F4F4F", bold: false, italic: false }] },

  // Seasonal
  { name: "Spring", category: "Seasonal", slots: [{ color: "#FFB7C5", bold: true, italic: false }, { color: "#98FB98", bold: false, italic: false }, { color: "#87CEEB", bold: false, italic: false }] },
  { name: "Summer", category: "Seasonal", slots: [{ color: "#FF6347", bold: true, italic: false }, { color: "#FFD700", bold: false, italic: false }, { color: "#00CED1", bold: false, italic: false }] },
  { name: "Winter", category: "Seasonal", slots: [{ color: "#4169E1", bold: true, italic: false }, { color: "#B0E0E6", bold: false, italic: false }, { color: "#FFFAFA", bold: false, italic: false }] },
  { name: "Fall", category: "Seasonal", slots: [{ color: "#D2691E", bold: true, italic: false }, { color: "#FF8C00", bold: false, italic: false }, { color: "#FFD700", bold: false, italic: false }] },
  { name: "Christmas", category: "Seasonal", slots: [{ color: "#C41E3A", bold: true, italic: false }, { color: "#228B22", bold: false, italic: false }, { color: "#FFD700", bold: false, italic: false }] },
  { name: "Halloween", category: "Seasonal", slots: [{ color: "#FF6600", bold: true, italic: false }, { color: "#000000", bold: false, italic: false }, { color: "#800080", bold: false, italic: false }] },
  { name: "Valentine", category: "Seasonal", slots: [{ color: "#FF1493", bold: true, italic: false }, { color: "#FF69B4", bold: false, italic: false }, { color: "#FFB6C1", bold: false, italic: false }] },
  { name: "St Patrick", category: "Seasonal", slots: [{ color: "#009A44", bold: true, italic: false }, { color: "#FFD700", bold: false, italic: false }, { color: "#FFFFFF", bold: false, italic: false }] },
  { name: "Independence", category: "Seasonal", slots: [{ color: "#BF0A30", bold: true, italic: false }, { color: "#FFFFFF", bold: false, italic: false }, { color: "#002868", bold: false, italic: false }] },
  { name: "Thanksgiving", category: "Seasonal", slots: [{ color: "#8B4513", bold: true, italic: false }, { color: "#FF8C00", bold: false, italic: false }, { color: "#DAA520", bold: false, italic: false }] },

  // Brand-Inspired
  { name: "YouTube", category: "Brand", slots: [{ color: "#FF0000", bold: true, italic: false }, { color: "#FFFFFF", bold: false, italic: false }, { color: "#282828", bold: false, italic: false }] },
  { name: "Facebook", category: "Brand", slots: [{ color: "#1877F2", bold: true, italic: false }, { color: "#FFFFFF", bold: false, italic: false }] },
  { name: "Instagram", category: "Brand", slots: [{ color: "#E4405F", bold: true, italic: false }, { color: "#FFDC80", bold: false, italic: false }, { color: "#833AB4", bold: false, italic: false }] },
  { name: "Twitter", category: "Brand", slots: [{ color: "#1DA1F2", bold: true, italic: false }, { color: "#FFFFFF", bold: false, italic: false }, { color: "#14171A", bold: false, italic: false }] },
  { name: "Spotify", category: "Brand", slots: [{ color: "#1DB954", bold: true, italic: false }, { color: "#FFFFFF", bold: false, italic: false }, { color: "#191414", bold: false, italic: false }] },
  { name: "Netflix", category: "Brand", slots: [{ color: "#E50914", bold: true, italic: false }, { color: "#FFFFFF", bold: false, italic: false }, { color: "#141414", bold: false, italic: false }] },
  { name: "Slack", category: "Brand", slots: [{ color: "#4A154B", bold: true, italic: false }, { color: "#36C5F0", bold: false, italic: false }, { color: "#2EB67D", bold: false, italic: false }, { color: "#ECB22E", bold: false, italic: false }] },
  { name: "Discord", category: "Brand", slots: [{ color: "#5865F2", bold: true, italic: false }, { color: "#FFFFFF", bold: false, italic: false }, { color: "#23272A", bold: false, italic: false }] },
  { name: "TikTok", category: "Brand", slots: [{ color: "#FF0050", bold: true, italic: false }, { color: "#00F2EA", bold: false, italic: false }, { color: "#000000", bold: false, italic: false }] },
  { name: "LinkedIn", category: "Brand", slots: [{ color: "#0A66C2", bold: true, italic: false }, { color: "#FFFFFF", bold: false, italic: false }] },

  // Text with Background
  { name: "Highlight Yellow", category: "Highlight", slots: [{ color: "#000000", backgroundColor: "#FFFF00", bold: true, italic: false }, { color: "#333333", bold: false, italic: false }] },
  { name: "Highlight Pink", category: "Highlight", slots: [{ color: "#000000", backgroundColor: "#FF69B4", bold: true, italic: false }, { color: "#333333", bold: false, italic: false }] },
  { name: "Highlight Green", category: "Highlight", slots: [{ color: "#000000", backgroundColor: "#00FF00", bold: true, italic: false }, { color: "#333333", bold: false, italic: false }] },
  { name: "Highlight Cyan", category: "Highlight", slots: [{ color: "#000000", backgroundColor: "#00FFFF", bold: true, italic: false }, { color: "#333333", bold: false, italic: false }] },
  { name: "Tag Red", category: "Highlight", slots: [{ color: "#FFFFFF", backgroundColor: "#FF0000", bold: true, italic: false }, { color: "#000000", bold: false, italic: false }] },
  { name: "Tag Blue", category: "Highlight", slots: [{ color: "#FFFFFF", backgroundColor: "#0066FF", bold: true, italic: false }, { color: "#000000", bold: false, italic: false }] },
  { name: "Tag Green", category: "Highlight", slots: [{ color: "#FFFFFF", backgroundColor: "#00AA00", bold: true, italic: false }, { color: "#000000", bold: false, italic: false }] },
  { name: "Tag Purple", category: "Highlight", slots: [{ color: "#FFFFFF", backgroundColor: "#8800FF", bold: true, italic: false }, { color: "#000000", bold: false, italic: false }] },
  { name: "Badge Orange", category: "Highlight", slots: [{ color: "#FFFFFF", backgroundColor: "#FF6600", bold: true, italic: false }, { color: "#333333", bold: false, italic: false }] },
  { name: "Badge Black", category: "Highlight", slots: [{ color: "#FFFFFF", backgroundColor: "#000000", bold: true, italic: false }, { color: "#666666", bold: false, italic: false }] },
];

export const PRESET_CATEGORIES = [
  "All",
  "Warm",
  "Cool", 
  "Nature",
  "Neon",
  "Pastel",
  "Earth",
  "Metallic",
  "Mono",
  "Purple",
  "Contrast",
  "Seasonal",
  "Brand",
  "Highlight",
  "Image"
];

// Interface for dynamically generated presets from images
export interface DynamicPreset {
  name: string;
  category: "Image";
  slots: {
    color: string;
    backgroundColor?: string;
    bold: boolean;
    italic: boolean;
  }[];
  source?: string; // Optional: image source URL
}
