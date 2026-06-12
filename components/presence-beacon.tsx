"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Invisible heartbeat that powers the admin "Live traffic" view. One stable id
 * per browser tab (sessionStorage) beats the current path every ~20s while the
 * tab is visible. Role/label are resolved server-side from the session, so this
 * sends nothing sensitive. Best-effort — failures are swallowed.
 */
export function PresenceBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    let id = "";
    try {
      id = sessionStorage.getItem("bp_presence_id") || "";
      if (!id) {
        id = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)) as string;
        sessionStorage.setItem("bp_presence_id", id);
      }
    } catch {
      id = Math.random().toString(36).slice(2);
    }

    let stopped = false;
    const beat = () => {
      if (stopped || document.visibilityState === "hidden") return;
      fetch("/api/presence/beat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, path: pathname || "/" }),
        keepalive: true,
      }).catch(() => {});
    };

    beat();
    const iv = setInterval(beat, 20_000);
    const onVis = () => {
      if (document.visibilityState === "visible") beat();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stopped = true;
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pathname]);

  return null;
}
