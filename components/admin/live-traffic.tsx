"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Users, Shield, Eye, RefreshCw } from "lucide-react";

type Visitor = { role: string; label: string; path: string; secondsAgo: number };
type LiveData = {
  total: number;
  byRole: Record<string, number>;
  topPaths: { path: string; count: number }[];
  visitors: Visitor[];
  now: number;
};

const PRETTY_PATH: Record<string, string> = {
  "/": "Home",
  "/book": "Booking",
  "/dashboard": "Player dashboard",
  "/pricing": "Pricing",
  "/cart": "Cart",
  "/payment": "Payment",
  "/tournaments": "Tournaments",
  "/about": "About",
  "/contact": "Contact",
  "/login": "Login",
  "/signup": "Sign up",
};
function prettyPath(p: string): string {
  if (PRETTY_PATH[p]) return PRETTY_PATH[p];
  if (p.startsWith("/admin")) return "Admin console";
  return p;
}
function roleDot(role: string): string {
  return role === "admin" ? "bg-brand" : role === "user" ? "bg-lime" : "bg-ink/30 dark:bg-white/30";
}

/**
 * Live traffic — a Shopify-style "who's on the site right now" view for the
 * owner. Polls /api/admin/live every 5s and shows the live visitor count,
 * a player/guest/staff breakdown, the busiest pages, and a live activity list.
 */
export function LiveTraffic() {
  const [data, setData] = useState<LiveData | null>(null);
  const [err, setErr] = useState(false);
  const [pulse, setPulse] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/admin/live", { cache: "no-store" });
      if (!r.ok) {
        setErr(true);
        return;
      }
      const d = (await r.json()) as LiveData;
      setData(d);
      setErr(false);
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    } catch {
      setErr(true);
    }
  }

  useEffect(() => {
    load();
    // 12s poll keeps the view fresh without hammering the DB on the free tier.
    timer.current = setInterval(load, 12_000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const total = data?.total ?? 0;
  const guests = data?.byRole?.guest ?? 0;
  const users = data?.byRole?.user ?? 0;
  const admins = data?.byRole?.admin ?? 0;

  return (
    <section className="card-sport overflow-hidden rounded-2xl p-0">
      <div aria-hidden className="tape-stripe h-1 w-full" />
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`absolute inline-flex h-full w-full rounded-full bg-lime opacity-75 ${total > 0 ? "animate-ping" : ""}`} />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-lime-dark" />
          </span>
          <h3 className="font-display text-lg font-extrabold tracking-tight text-ink dark:text-white">Live traffic</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[0.65rem] font-extrabold uppercase tracking-wide text-slatey dark:text-white/40">
          <RefreshCw className={`h-3 w-3 ${pulse ? "animate-spin" : ""}`} /> auto · 5s
        </span>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-3">
        {/* Big live count */}
        <div className="flex flex-col justify-center rounded-2xl border-2 border-ink/10 bg-ink/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.02]">
          <span className="flex items-center gap-1.5 text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-slatey dark:text-white/40">
            <Eye className="h-3.5 w-3.5" /> On the site now
          </span>
          <motion.span
            key={total}
            initial={{ scale: 0.9, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mt-1 font-display text-5xl font-extrabold text-ink dark:text-white"
          >
            {err ? "—" : total}
          </motion.span>
          <span className="mt-1 text-xs text-slatey dark:text-white/45">active visitor{total === 1 ? "" : "s"}</span>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-1 gap-2 sm:col-span-2 sm:grid-cols-3">
          {[
            { label: "Players", value: users, icon: <Users className="h-4 w-4" />, tint: "text-lime-dark" },
            { label: "Guests", value: guests, icon: <Activity className="h-4 w-4" />, tint: "text-ink/60 dark:text-white/60" },
            { label: "Staff", value: admins, icon: <Shield className="h-4 w-4" />, tint: "text-brand dark:text-brand-300" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border-2 border-ink/10 p-3 dark:border-white/10">
              <span className={`flex items-center gap-1.5 text-[0.6rem] font-extrabold uppercase tracking-[0.16em] ${s.tint}`}>
                {s.icon} {s.label}
              </span>
              <div className="mt-1 font-display text-2xl font-extrabold text-ink dark:text-white">{s.value}</div>
            </div>
          ))}

          {/* Busiest pages */}
          <div className="rounded-2xl border-2 border-ink/10 p-3 dark:border-white/10 sm:col-span-3">
            <span className="text-[0.6rem] font-extrabold uppercase tracking-[0.16em] text-slatey dark:text-white/40">Busiest pages</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(data?.topPaths ?? []).length === 0 ? (
                <span className="text-xs text-slatey dark:text-white/40">No active pages.</span>
              ) : (
                data!.topPaths.map((p) => (
                  <span key={p.path} className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand dark:bg-brand/20 dark:text-brand-300">
                    {prettyPath(p.path)} <span className="rounded-full bg-brand/20 px-1.5 text-[0.65rem]">{p.count}</span>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Live activity list */}
      <div className="border-t-2 border-ink/10 px-5 py-4 dark:border-white/10">
        <span className="text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-slatey dark:text-white/40">Live activity</span>
        {(data?.visitors ?? []).length === 0 ? (
          <p className="mt-2 text-xs text-slatey dark:text-white/40">{err ? "Couldn't load live traffic." : "No one is browsing right now."}</p>
        ) : (
          <ul className="mt-2 max-h-64 space-y-1.5 overflow-y-auto">
            {data!.visitors.map((v, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-xl border border-ink/5 px-3 py-2 text-sm dark:border-white/5">
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${roleDot(v.role)}`} />
                  <span className="truncate font-semibold text-ink dark:text-white">{v.role === "guest" ? "Guest" : v.label}</span>
                  <span className="truncate text-slatey dark:text-white/45">· {prettyPath(v.path)}</span>
                </span>
                <span className="shrink-0 text-[0.65rem] font-bold uppercase tracking-wide text-slatey dark:text-white/35">
                  {v.secondsAgo < 5 ? "now" : `${v.secondsAgo}s`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
