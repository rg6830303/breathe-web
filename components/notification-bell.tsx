"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";

type Item = {
  id: string;
  title: string;
  body: string | null;
  url: string | null;
  read_at: number | null;
  created_at: number;
};

function ago(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

/**
 * Bell + dropdown inbox of past notifications for the logged-in user or admin.
 * Reads /api/notifications; opening the panel marks everything read.
 */
export function NotificationBell({ onDark = false }: { onDark?: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    // Poll quietly so notifications recorded server-side (bookings, dues,
    // admin actions, pushes) surface in the bell without a manual refresh.
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 45000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  // Close on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setItems(data.items ?? []);
          setUnread(data.unread ?? 0);
          if (data.unread > 0) {
            await fetch("/api/notifications", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            });
            setUnread(0);
            setItems((cur) => cur.map((i) => ({ ...i, read_at: i.read_at ?? Date.now() })));
          }
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Notifications"
        className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
          onDark
            ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
            : "border-ink/10 bg-white text-ink hover:border-brand/40 dark:border-white/10 dark:bg-white/5 dark:text-white"
        }`}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#E24B4A] px-1 text-[0.65rem] font-extrabold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border-2 border-ink/10 bg-white shadow-card dark:border-white/10 dark:bg-[#111c38]">
          <div className="flex items-center justify-between border-b-2 border-ink/10 px-4 py-3 dark:border-white/10">
            <span className="font-display text-sm font-extrabold text-ink dark:text-white">Notifications</span>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-brand" />}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slatey dark:text-white/40">
                No notifications yet.
              </div>
            ) : (
              <ul className="divide-y divide-ink/5 dark:divide-white/5">
                {items.map((n) => {
                  const Inner = (
                    <div className={`px-4 py-3 transition ${n.read_at ? "" : "bg-brand/5 dark:bg-white/5"}`}>
                      <div className="flex items-start gap-2">
                        {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />}
                        <div className={n.read_at ? "pl-4" : ""}>
                          <div className="text-sm font-bold text-ink dark:text-white">{n.title}</div>
                          {n.body && <div className="mt-0.5 text-xs leading-5 text-slatey dark:text-white/55">{n.body}</div>}
                          <div className="mt-1 text-[0.65rem] font-semibold uppercase tracking-wide text-slatey/70 dark:text-white/35">
                            {ago(n.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                  return (
                    <li key={n.id}>
                      {n.url ? (
                        <a href={n.url} className="block hover:bg-ink/[0.02] dark:hover:bg-white/[0.03]">
                          {Inner}
                        </a>
                      ) : (
                        Inner
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {items.length > 0 && (
            <div className="flex items-center justify-center gap-1.5 border-t-2 border-ink/10 px-4 py-2 text-[0.7rem] font-bold uppercase tracking-wide text-slatey dark:border-white/10 dark:text-white/40">
              <Check className="h-3.5 w-3.5" /> All caught up
            </div>
          )}
        </div>
      )}
    </div>
  );
}
