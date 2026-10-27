import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/deviceId";
import { logActivity } from "@/lib/activityLogger";
import { toast } from "sonner";
import type { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastCheckedUserId = useRef<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Reset device check when user changes
        if (!session?.user || session.user.id !== lastCheckedUserId.current) {
          lastCheckedUserId.current = null;
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Device check on session load
  useEffect(() => {
    if (!user || lastCheckedUserId.current === user.id) return;

    const checkDevice = async () => {
      // Skip check for admins
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin" as const,
      });
      if (isAdmin) {
        lastCheckedUserId.current = user.id;
        await logActivity(user.id, "session_start", { admin: true });
        return;
      }

      const deviceId = getDeviceId();
      const { data: isValid } = await supabase.rpc("check_device", {
        _user_id: user.id,
        _device_id: deviceId,
      });

      lastCheckedUserId.current = user.id;

      if (isValid !== true) {
        await logActivity(user.id, "device_blocked", { device_id: deviceId });
        toast.error(
          "Device not authorized. Contact admin with your Device ID.",
          {
            duration: 30000,
            action: {
              label: "Copy Device ID",
              onClick: () => {
                navigator.clipboard.writeText(deviceId);
                toast.success("Device ID copied to clipboard!");
              },
            },
          }
        );
        await supabase.auth.signOut();
      } else {
        await logActivity(user.id, "session_start", { device_id: deviceId });
      }
    };

    checkDevice();
  }, [user]);

  const signOut = async () => {
    if (user) {
      await logActivity(user.id, "logout");
    }
    lastCheckedUserId.current = null;
    await supabase.auth.signOut();
  };

  return { user, session, loading, signOut };
}
