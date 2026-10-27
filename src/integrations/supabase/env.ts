const FALLBACK_PROJECT_ID = "ubxkffskvmlcpvqbxtvm";
const FALLBACK_SUPABASE_URL = `https://${FALLBACK_PROJECT_ID}.supabase.co`;

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
export const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID || FALLBACK_PROJECT_ID;

export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_URL.includes(".supabase.co") &&
  SUPABASE_PUBLISHABLE_KEY.length > 20;

export const missingSupabaseEnv = [
  !SUPABASE_PUBLISHABLE_KEY ? "VITE_SUPABASE_PUBLISHABLE_KEY" : null,
].filter(Boolean) as string[];

export const usingSupabaseFallbacks = {
  url: !import.meta.env.VITE_SUPABASE_URL,
  projectId: !import.meta.env.VITE_SUPABASE_PROJECT_ID,
};
