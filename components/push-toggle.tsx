"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { getVapidPublicKey, urlBase64ToUint8Array } from "@/lib/push-public";

type State = "loading" | "unsupported" | "default" | "granted" | "denied" | "blocked";

/**
 * Enable/disable web-push notifications for the installed PWA. Works for both
 * the player dashboard and the admin console — the API tags the device's role
 * from the session, so admins get staff alerts and players get their own.
 */
export function PushToggle({ className = "" }: { className?: string }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  useEffect(() => {
    if (!supported) {
      setState("unsupported");
      return;
    }
    (async () => {
      try {
        if (Notification.permission === "denied") {
          setState("denied");
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setState(sub ? "granted" : Notification.permission === "granted" ? "granted" : "default");
        if (sub && Notification.permission !== "granted") setState("default");
        setState(sub ? "granted" : "default");
      } catch {
        setState("default");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "default");
        setMsg(perm === "denied" ? "Notifications are blocked in your browser settings." : null);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(getVapidPublicKey()) as BufferSource,
        });
      }
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("save failed");
      setState("granted");
      setMsg("Notifications are on for this device.");
    } catch (e) {
      console.error("[push enable]", e);
      setMsg("Couldn't enable notifications. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
      setState("default");
      setMsg("Notifications turned off for this device.");
    } catch (e) {
      console.error("[push disable]", e);
    } finally {
      setBusy(false);
    }
  }

  const on = state === "granted";

  return (
    <div className={`card-sport p-5 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              on ? "bg-brand text-white" : "bg-brand/10 text-brand dark:bg-white/10 dark:text-brand-300"
            }`}
          >
            {on ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          </span>
          <div>
            <h3 className="font-display text-base font-extrabold text-ink dark:text-white">Notifications</h3>
            <p className="mt-0.5 text-xs leading-5 text-slatey dark:text-white/55">
              {state === "unsupported"
                ? "This browser doesn't support push notifications. Install the app to your home screen first."
                : state === "denied"
                  ? "Blocked. Enable notifications for this site in your browser settings, then reload."
                  : on
                    ? "You'll get booking confirmations and updates on this device."
                    : "Turn on to get booking confirmations and club updates — even when the app is closed."}
            </p>
          </div>
        </div>

        {state !== "unsupported" && state !== "denied" && (
          <button
            type="button"
            onClick={on ? disable : enable}
            disabled={busy}
            aria-pressed={on}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-60 ${
              on ? "bg-brand" : "bg-ink/15 dark:bg-white/20"
            }`}
          >
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition ${
                on ? "translate-x-6" : "translate-x-1"
              }`}
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin text-brand" /> : null}
            </span>
          </button>
        )}
      </div>

      {(state === "denied" || state === "unsupported") && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border-2 border-ink/10 bg-ink/[0.02] px-3 py-2 text-xs text-slatey dark:border-white/10 dark:bg-white/[0.02] dark:text-white/55">
          <BellOff className="h-4 w-4 shrink-0" />
          {state === "unsupported"
            ? "On iPhone/iPad: open in Safari → Share → Add to Home Screen, then open the installed app."
            : "Notifications are blocked at the browser level."}
        </div>
      )}

      {msg && <p className="mt-3 text-xs font-semibold text-brand dark:text-brand-300">{msg}</p>}
    </div>
  );
}
