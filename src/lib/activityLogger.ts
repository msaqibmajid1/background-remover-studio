import { supabase } from "@/integrations/supabase/client";
import { getDeviceId, getDeviceName } from "@/lib/deviceId";

let cachedIp: string | null = null;
const geoCache = new Map<string, { city: string | null; country: string | null }>();

async function fetchIp(): Promise<string | null> {
  if (cachedIp) return cachedIp;
  try {
    const res = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    cachedIp = typeof data?.ip === "string" ? data.ip : null;
    return cachedIp;
  } catch {
    return null;
  }
}

async function fetchGeoFromIp(ip: string): Promise<{ city: string | null; country: string | null } | null> {
  if (geoCache.has(ip)) {
    return geoCache.get(ip) ?? null;
  }

  const providers = [
    async () => {
      const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
        signal: AbortSignal.timeout(3500),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.success !== true) return null;
      return {
        city: typeof data.city === "string" && data.city.trim() ? data.city : null,
        country: typeof data.country === "string" && data.country.trim() ? data.country : null,
      };
    },
    async () => {
      const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
        signal: AbortSignal.timeout(3500),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.error) return null;
      return {
        city: typeof data.city === "string" && data.city.trim() ? data.city : null,
        country:
          typeof data.country_name === "string" && data.country_name.trim()
            ? data.country_name
            : typeof data.country === "string" && data.country.trim()
              ? data.country
              : null,
      };
    },
  ];

  for (const provider of providers) {
    try {
      const geo = await provider();
      if (geo?.city || geo?.country) {
        geoCache.set(ip, geo);
        return geo;
      }
    } catch {
      // try next provider
    }
  }

  return null;
}

function getEnvironmentInfo(): Record<string, unknown> {
  return {
    device_id: getDeviceId(),
    device_name: getDeviceName(),
    user_agent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screen_resolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    referrer: document.referrer || null,
  };
}

export async function logActivity(
  userId: string,
  action: string,
  details?: Record<string, unknown>
) {
  try {
    const envInfo = getEnvironmentInfo();
    const ip = await fetchIp();
    const geo = ip ? await fetchGeoFromIp(ip) : null;

    const enrichedDetails = {
      ...envInfo,
      ...(ip ? { ip_address: ip } : {}),
      ...(geo?.city ? { ip_city: geo.city } : {}),
      ...(geo?.country ? { ip_country: geo.country } : {}),
      ...(details || {}),
    };

    await supabase.from("user_activity_logs").insert({
      user_id: userId,
      action,
      details: enrichedDetails,
    });
  } catch (e) {
    console.error("Failed to log activity:", e);
  }
}
