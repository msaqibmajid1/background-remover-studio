export interface MultiColorPreset {
  id: string;
  name: string;
  category: string;
  colors: string[]; // Array of colors to apply to words
  description?: string;
}

export const multiColorPresets: MultiColorPreset[] = [
  // Two-Color Presets (NEW)
  { id: "two-red-blue", name: "Red & Blue", category: "Two-Color", colors: ["#DC2626", "#2563EB"], description: "Classic contrast" },
  { id: "two-black-gold", name: "Black & Gold", category: "Two-Color", colors: ["#1a1a2e", "#D4AF37"], description: "Luxury duo" },
  { id: "two-pink-cyan", name: "Pink & Cyan", category: "Two-Color", colors: ["#EC4899", "#06B6D4"], description: "Vibrant duo" },
  { id: "two-green-orange", name: "Green & Orange", category: "Two-Color", colors: ["#22C55E", "#F97316"], description: "Nature and energy" },
  { id: "two-purple-yellow", name: "Purple & Yellow", category: "Two-Color", colors: ["#8B5CF6", "#FACC15"], description: "Bold contrast" },
  { id: "two-navy-coral", name: "Navy & Coral", category: "Two-Color", colors: ["#1E3A8A", "#F43F5E"], description: "Sophisticated" },
  { id: "two-teal-rose", name: "Teal & Rose", category: "Two-Color", colors: ["#14B8A6", "#F472B6"], description: "Modern pair" },
  { id: "two-indigo-amber", name: "Indigo & Amber", category: "Two-Color", colors: ["#6366F1", "#F59E0B"], description: "Deep and warm" },
  { id: "two-red-white", name: "Red & White", category: "Two-Color", colors: ["#DC2626", "#FFFFFF"], description: "Bold classic" },
  { id: "two-blue-white", name: "Blue & White", category: "Two-Color", colors: ["#3B82F6", "#FFFFFF"], description: "Clean contrast" },
  { id: "two-black-white", name: "Black & White", category: "Two-Color", colors: ["#1a1a2e", "#FFFFFF"], description: "Monochrome" },
  { id: "two-green-white", name: "Green & White", category: "Two-Color", colors: ["#22C55E", "#FFFFFF"], description: "Fresh clean" },
  { id: "two-orange-black", name: "Orange & Black", category: "Two-Color", colors: ["#F97316", "#1a1a2e"], description: "Halloween style" },
  { id: "two-magenta-lime", name: "Magenta & Lime", category: "Two-Color", colors: ["#D946EF", "#84CC16"], description: "Electric pop" },
  { id: "two-crimson-gold", name: "Crimson & Gold", category: "Two-Color", colors: ["#BE123C", "#EAB308"], description: "Regal duo" },
  { id: "two-forest-sky", name: "Forest & Sky", category: "Two-Color", colors: ["#166534", "#0EA5E9"], description: "Nature harmony" },
  { id: "two-burgundy-silver", name: "Burgundy & Silver", category: "Two-Color", colors: ["#7F1D1D", "#C0C0C0"], description: "Elegant pair" },
  { id: "two-turquoise-coral", name: "Turquoise & Coral", category: "Two-Color", colors: ["#2DD4BF", "#FB7185"], description: "Tropical duo" },
  { id: "two-slate-lime", name: "Slate & Lime", category: "Two-Color", colors: ["#475569", "#A3E635"], description: "Modern tech" },
  { id: "two-violet-peach", name: "Violet & Peach", category: "Two-Color", colors: ["#7C3AED", "#FDBA74"], description: "Soft contrast" },

  // Inspirational
  { id: "inspirational-1", name: "Inspirational Story", category: "Inspirational", colors: ["#1a1a2e", "#FF6B35", "#1a1a2e", "#00CED1", "#1a1a2e"], description: "Orange and cyan accents" },
  { id: "inspirational-2", name: "Success Quote", category: "Inspirational", colors: ["#00CED1", "#1a1a2e", "#FF6B35", "#1a1a2e", "#00CED1"], description: "Alternating accents" },
  { id: "inspirational-3", name: "Motivational", category: "Inspirational", colors: ["#4ECDC4", "#1a1a2e", "#FF6B6B", "#1a1a2e"], description: "Teal and coral" },
  { id: "inspirational-4", name: "Believe", category: "Inspirational", colors: ["#6366F1", "#FFFFFF", "#F59E0B", "#FFFFFF"], description: "Purple and gold" },
  { id: "inspirational-5", name: "Dream Big", category: "Inspirational", colors: ["#EC4899", "#FFFFFF", "#8B5CF6", "#FFFFFF", "#06B6D4"], description: "Pink purple cyan" },
  
  // Movie/TV
  { id: "movie-1", name: "Movie Promo", category: "Movie/TV", colors: ["#FFFFFF", "#FFD700", "#FFFFFF", "#FF0000", "#FFFFFF"], description: "Gold and red highlights" },
  { id: "movie-2", name: "Thriller", category: "Movie/TV", colors: ["#FF0000", "#FFFFFF", "#FF0000", "#FFFFFF"], description: "Red white alternating" },
  { id: "movie-3", name: "Drama", category: "Movie/TV", colors: ["#1a1a2e", "#C0C0C0", "#FFD700", "#C0C0C0"], description: "Silver and gold" },
  { id: "movie-4", name: "Action", category: "Movie/TV", colors: ["#FF4500", "#FFFFFF", "#FF4500", "#FFD700"], description: "Orange fire" },
  { id: "movie-5", name: "Mystery", category: "Movie/TV", colors: ["#4B0082", "#FFFFFF", "#8B008B", "#FFFFFF"], description: "Purple mystery" },
  
  // News
  { id: "news-1", name: "Breaking News", category: "News", colors: ["#FF0000", "#FFFFFF", "#FF0000", "#FFD700"], description: "Urgent red" },
  { id: "news-2", name: "Headlines", category: "News", colors: ["#1E40AF", "#FFFFFF", "#DC2626", "#FFFFFF"], description: "Blue and red" },
  { id: "news-3", name: "Alert", category: "News", colors: ["#F59E0B", "#1a1a2e", "#F59E0B", "#1a1a2e"], description: "Warning yellow" },
  { id: "news-4", name: "Update", category: "News", colors: ["#059669", "#FFFFFF", "#059669", "#FFFFFF"], description: "Green update" },
  { id: "news-5", name: "Exclusive", category: "News", colors: ["#7C3AED", "#FFFFFF", "#EC4899", "#FFFFFF"], description: "Purple pink" },
  
  // Social Media
  { id: "social-1", name: "Trending", category: "Social Media", colors: ["#1DA1F2", "#FFFFFF", "#FF6B6B", "#FFFFFF", "#1DA1F2"], description: "Twitter style" },
  { id: "social-2", name: "Viral", category: "Social Media", colors: ["#E1306C", "#FFFFFF", "#F77737", "#FFFFFF"], description: "Instagram gradient" },
  { id: "social-3", name: "Like & Share", category: "Social Media", colors: ["#4267B2", "#FFFFFF", "#FF0000", "#FFFFFF"], description: "Facebook style" },
  { id: "social-4", name: "Subscribe", category: "Social Media", colors: ["#FF0000", "#FFFFFF", "#FF0000", "#FFFFFF"], description: "YouTube style" },
  { id: "social-5", name: "Follow", category: "Social Media", colors: ["#00F2EA", "#FFFFFF", "#FF0050", "#FFFFFF"], description: "TikTok style" },
  
  // Business
  { id: "business-1", name: "Corporate", category: "Business", colors: ["#1E3A8A", "#FFFFFF", "#059669", "#FFFFFF"], description: "Professional blue green" },
  { id: "business-2", name: "Growth", category: "Business", colors: ["#10B981", "#1a1a2e", "#10B981", "#F59E0B"], description: "Green growth" },
  { id: "business-3", name: "Premium", category: "Business", colors: ["#1a1a2e", "#D4AF37", "#1a1a2e", "#D4AF37"], description: "Gold premium" },
  { id: "business-4", name: "Launch", category: "Business", colors: ["#6366F1", "#FFFFFF", "#EC4899", "#FFFFFF"], description: "Launch colors" },
  { id: "business-5", name: "Success", category: "Business", colors: ["#059669", "#FFFFFF", "#F59E0B", "#FFFFFF"], description: "Success metrics" },
  
  // Events
  { id: "event-1", name: "Party", category: "Events", colors: ["#FF1493", "#00BFFF", "#FFD700", "#FF1493"], description: "Party vibes" },
  { id: "event-2", name: "Concert", category: "Events", colors: ["#8B5CF6", "#FF6B6B", "#00CED1", "#FFD700"], description: "Concert lights" },
  { id: "event-3", name: "Wedding", category: "Events", colors: ["#F8E8EE", "#D4AF37", "#F8E8EE", "#C0C0C0"], description: "Elegant wedding" },
  { id: "event-4", name: "Birthday", category: "Events", colors: ["#FF6B6B", "#4ECDC4", "#FFD93D", "#6BCB77"], description: "Birthday colors" },
  { id: "event-5", name: "Holiday", category: "Events", colors: ["#DC2626", "#22C55E", "#DC2626", "#FFFFFF"], description: "Holiday spirit" },
  
  // Sports
  { id: "sports-1", name: "Champion", category: "Sports", colors: ["#FFD700", "#FFFFFF", "#FFD700", "#1a1a2e"], description: "Gold champion" },
  { id: "sports-2", name: "Victory", category: "Sports", colors: ["#22C55E", "#FFFFFF", "#22C55E", "#FFD700"], description: "Victory green" },
  { id: "sports-3", name: "Team Spirit", category: "Sports", colors: ["#EF4444", "#FFFFFF", "#3B82F6", "#FFFFFF"], description: "Red vs blue" },
  { id: "sports-4", name: "Finals", category: "Sports", colors: ["#F97316", "#1a1a2e", "#F97316", "#FFD700"], description: "Finals orange" },
  { id: "sports-5", name: "MVP", category: "Sports", colors: ["#A855F7", "#FFFFFF", "#FFD700", "#FFFFFF"], description: "MVP purple gold" },
  
  // Gaming
  { id: "gaming-1", name: "Level Up", category: "Gaming", colors: ["#00FF00", "#FFFFFF", "#00FF00", "#FFD700"], description: "Level up green" },
  { id: "gaming-2", name: "Epic", category: "Gaming", colors: ["#A855F7", "#FFFFFF", "#06B6D4", "#FFFFFF"], description: "Epic purple cyan" },
  { id: "gaming-3", name: "Legendary", category: "Gaming", colors: ["#F97316", "#FFFFFF", "#F97316", "#FFD700"], description: "Legendary orange" },
  { id: "gaming-4", name: "Boss Battle", category: "Gaming", colors: ["#DC2626", "#FFFFFF", "#7C3AED", "#FFFFFF"], description: "Boss red purple" },
  { id: "gaming-5", name: "Victory Royale", category: "Gaming", colors: ["#FFD700", "#1a1a2e", "#FFD700", "#00CED1"], description: "Victory gold" },
  
  // Retro
  { id: "retro-1", name: "80s Neon", category: "Retro", colors: ["#FF00FF", "#00FFFF", "#FF00FF", "#FFD700"], description: "80s neon" },
  { id: "retro-2", name: "Synthwave", category: "Retro", colors: ["#FF1493", "#00CED1", "#FF1493", "#9400D3"], description: "Synthwave" },
  { id: "retro-3", name: "Vintage", category: "Retro", colors: ["#8B4513", "#F5DEB3", "#8B4513", "#D2691E"], description: "Vintage brown" },
  { id: "retro-4", name: "Disco", category: "Retro", colors: ["#FFD700", "#FF1493", "#00BFFF", "#32CD32"], description: "Disco lights" },
  { id: "retro-5", name: "Arcade", category: "Retro", colors: ["#00FF00", "#FF0000", "#FFFF00", "#00FFFF"], description: "Arcade colors" },
  
  // Nature
  { id: "nature-1", name: "Ocean", category: "Nature", colors: ["#0077B6", "#00B4D8", "#0077B6", "#CAF0F8"], description: "Ocean blues" },
  { id: "nature-2", name: "Forest", category: "Nature", colors: ["#2D6A4F", "#40916C", "#2D6A4F", "#95D5B2"], description: "Forest greens" },
  { id: "nature-3", name: "Sunset", category: "Nature", colors: ["#FF6B35", "#F7931E", "#FF6B35", "#FFD700"], description: "Sunset warm" },
  { id: "nature-4", name: "Spring", category: "Nature", colors: ["#FF69B4", "#98FB98", "#FF69B4", "#87CEEB"], description: "Spring bloom" },
  { id: "nature-5", name: "Autumn", category: "Nature", colors: ["#D2691E", "#8B4513", "#FF8C00", "#FFD700"], description: "Autumn leaves" },
  
  // Elegant
  { id: "elegant-1", name: "Luxury", category: "Elegant", colors: ["#D4AF37", "#1a1a2e", "#D4AF37", "#C0C0C0"], description: "Luxury gold" },
  { id: "elegant-2", name: "Royal", category: "Elegant", colors: ["#4B0082", "#D4AF37", "#4B0082", "#FFFFFF"], description: "Royal purple" },
  { id: "elegant-3", name: "Sophisticated", category: "Elegant", colors: ["#1a1a2e", "#C0C0C0", "#1a1a2e", "#D4AF37"], description: "Sophisticated" },
  { id: "elegant-4", name: "Chic", category: "Elegant", colors: ["#F8E8EE", "#1a1a2e", "#F8E8EE", "#D4AF37"], description: "Chic pink" },
  { id: "elegant-5", name: "Classic", category: "Elegant", colors: ["#8B0000", "#D4AF37", "#8B0000", "#FFFFFF"], description: "Classic red gold" },
  
  // Vibrant
  { id: "vibrant-1", name: "Rainbow", category: "Vibrant", colors: ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#8B00FF"], description: "Full rainbow" },
  { id: "vibrant-2", name: "Candy", category: "Vibrant", colors: ["#FF69B4", "#87CEEB", "#FFD700", "#98FB98"], description: "Candy colors" },
  { id: "vibrant-3", name: "Electric", category: "Vibrant", colors: ["#00FFFF", "#FF00FF", "#FFFF00", "#00FF00"], description: "Electric neon" },
  { id: "vibrant-4", name: "Pop Art", category: "Vibrant", colors: ["#FF0000", "#FFFF00", "#0000FF", "#00FF00"], description: "Pop art primary" },
  { id: "vibrant-5", name: "Tropical", category: "Vibrant", colors: ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3"], description: "Tropical vibes" },
  
  // Dark Theme
  { id: "dark-1", name: "Dark Mode", category: "Dark Theme", colors: ["#FFFFFF", "#FF6B6B", "#FFFFFF", "#4ECDC4"], description: "Dark mode accents" },
  { id: "dark-2", name: "Midnight", category: "Dark Theme", colors: ["#8B5CF6", "#FFFFFF", "#06B6D4", "#FFFFFF"], description: "Midnight colors" },
  { id: "dark-3", name: "Shadow", category: "Dark Theme", colors: ["#6B7280", "#FFFFFF", "#A855F7", "#FFFFFF"], description: "Shadow purple" },
  { id: "dark-4", name: "Noir", category: "Dark Theme", colors: ["#FFFFFF", "#DC2626", "#FFFFFF", "#1a1a2e"], description: "Film noir" },
  { id: "dark-5", name: "Stealth", category: "Dark Theme", colors: ["#22D3EE", "#1a1a2e", "#22D3EE", "#6B7280"], description: "Stealth cyan" },
  
  // Light Theme
  { id: "light-1", name: "Clean", category: "Light Theme", colors: ["#1a1a2e", "#3B82F6", "#1a1a2e", "#10B981"], description: "Clean professional" },
  { id: "light-2", name: "Minimal", category: "Light Theme", colors: ["#374151", "#EC4899", "#374151", "#8B5CF6"], description: "Minimal accent" },
  { id: "light-3", name: "Fresh", category: "Light Theme", colors: ["#059669", "#1a1a2e", "#F59E0B", "#1a1a2e"], description: "Fresh green yellow" },
  { id: "light-4", name: "Soft", category: "Light Theme", colors: ["#6366F1", "#9CA3AF", "#F472B6", "#9CA3AF"], description: "Soft pastels" },
  { id: "light-5", name: "Bright", category: "Light Theme", colors: ["#EF4444", "#1a1a2e", "#3B82F6", "#1a1a2e"], description: "Bright contrast" },
  
  // Bold
  { id: "bold-1", name: "Fire", category: "Bold", colors: ["#FF0000", "#FF4500", "#FFD700", "#FF0000"], description: "Fire gradient" },
  { id: "bold-2", name: "Ice", category: "Bold", colors: ["#00BFFF", "#E0FFFF", "#00CED1", "#87CEEB"], description: "Ice cool" },
  { id: "bold-3", name: "Thunder", category: "Bold", colors: ["#FFD700", "#FFFFFF", "#FFD700", "#1a1a2e"], description: "Thunder strike" },
  { id: "bold-4", name: "Galaxy", category: "Bold", colors: ["#8B00FF", "#FF1493", "#00BFFF", "#FFD700"], description: "Galaxy colors" },
  { id: "bold-5", name: "Explosion", category: "Bold", colors: ["#FF4500", "#FFD700", "#FF0000", "#FFFFFF"], description: "Explosive orange" },
  
  // Seasonal
  { id: "seasonal-1", name: "Summer", category: "Seasonal", colors: ["#FF6B35", "#FFD700", "#00CED1", "#FF6B35"], description: "Summer sun" },
  { id: "seasonal-2", name: "Winter", category: "Seasonal", colors: ["#87CEEB", "#FFFFFF", "#ADD8E6", "#E0FFFF"], description: "Winter frost" },
  { id: "seasonal-3", name: "Halloween", category: "Seasonal", colors: ["#FF4500", "#1a1a2e", "#800080", "#FF4500"], description: "Halloween spooky" },
  { id: "seasonal-4", name: "Valentine", category: "Seasonal", colors: ["#FF1493", "#FF69B4", "#DC143C", "#FFB6C1"], description: "Valentine love" },
  { id: "seasonal-5", name: "St Patrick", category: "Seasonal", colors: ["#228B22", "#FFD700", "#228B22", "#FFFFFF"], description: "St Patrick green" },
  
  // Tech
  { id: "tech-1", name: "Code", category: "Tech", colors: ["#00FF00", "#FFFFFF", "#00FF00", "#1a1a2e"], description: "Matrix code" },
  { id: "tech-2", name: "Cyber", category: "Tech", colors: ["#00FFFF", "#FF00FF", "#00FFFF", "#FFFFFF"], description: "Cyberpunk" },
  { id: "tech-3", name: "AI", category: "Tech", colors: ["#6366F1", "#FFFFFF", "#22D3EE", "#FFFFFF"], description: "AI future" },
  { id: "tech-4", name: "Digital", category: "Tech", colors: ["#3B82F6", "#10B981", "#3B82F6", "#FFFFFF"], description: "Digital blue green" },
  { id: "tech-5", name: "Startup", category: "Tech", colors: ["#8B5CF6", "#F59E0B", "#8B5CF6", "#FFFFFF"], description: "Startup energy" },
  
  // Food
  { id: "food-1", name: "Fresh", category: "Food", colors: ["#22C55E", "#FFFFFF", "#EF4444", "#FFFFFF"], description: "Fresh produce" },
  { id: "food-2", name: "Dessert", category: "Food", colors: ["#EC4899", "#F472B6", "#A855F7", "#FFFFFF"], description: "Sweet dessert" },
  { id: "food-3", name: "Coffee", category: "Food", colors: ["#78350F", "#D97706", "#78350F", "#FEF3C7"], description: "Coffee tones" },
  { id: "food-4", name: "Citrus", category: "Food", colors: ["#F97316", "#FACC15", "#84CC16", "#F97316"], description: "Citrus fresh" },
  { id: "food-5", name: "Berry", category: "Food", colors: ["#BE185D", "#7C3AED", "#BE185D", "#FBCFE8"], description: "Berry mix" },

  // Additional presets to reach 100+
  { id: "gradient-1", name: "Sunset Blend", category: "Gradients", colors: ["#F97316", "#EC4899", "#8B5CF6", "#06B6D4"], description: "Sunset to ocean" },
  { id: "gradient-2", name: "Aurora", category: "Gradients", colors: ["#22C55E", "#06B6D4", "#8B5CF6", "#EC4899"], description: "Northern lights" },
  { id: "gradient-3", name: "Dusk", category: "Gradients", colors: ["#1E3A8A", "#7C3AED", "#EC4899", "#F97316"], description: "Dusk sky" },
  { id: "gradient-4", name: "Ocean Deep", category: "Gradients", colors: ["#0EA5E9", "#0284C7", "#0369A1", "#075985"], description: "Ocean depth" },
  { id: "gradient-5", name: "Forest Dawn", category: "Gradients", colors: ["#166534", "#22C55E", "#86EFAC", "#FEF08A"], description: "Forest at dawn" },
  
  { id: "contrast-1", name: "Black Gold", category: "High Contrast", colors: ["#1a1a2e", "#D4AF37", "#1a1a2e", "#D4AF37"], description: "Luxury contrast" },
  { id: "contrast-2", name: "Red White", category: "High Contrast", colors: ["#DC2626", "#FFFFFF", "#DC2626", "#FFFFFF"], description: "Bold statement" },
  { id: "contrast-3", name: "Blue Orange", category: "High Contrast", colors: ["#2563EB", "#F97316", "#2563EB", "#F97316"], description: "Complementary" },
  { id: "contrast-4", name: "Purple Yellow", category: "High Contrast", colors: ["#7C3AED", "#FACC15", "#7C3AED", "#FACC15"], description: "Royal pop" },
  { id: "contrast-5", name: "Teal Coral", category: "High Contrast", colors: ["#14B8A6", "#F43F5E", "#14B8A6", "#F43F5E"], description: "Modern contrast" },
];