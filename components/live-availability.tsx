"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

type CellStatus = "open" | "booked" | "blocked";
type Row = { time: string; label: string; cells: CellStatus[] };

const COURTS = [1, 2, 3] as const;

function todayIST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function nowHHMMIST() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}
function label12h(t: string) {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(d);
}

export function LiveAvailability() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [allDone, setAllDone] = useState(false);

  useEffect(() => {
    let active = true;
    const load = () => {
      fetch(`/api/slots?date=${todayIST()}`)
        .then((r) => r.json())
        .then((d) => {
          if (!active) return;
          const slots: { court: number; time: string; status: CellStatus }[] = Array.isArray(d.slots) ? d.slots : [];
          const now = nowHHMMIST();
          const times = Array.from(new Set(slots.map((s) => s.time))).sort().filter((t) => t >= now);
          const upcoming = times.slice(0, 6);
          setAllDone(upcoming.length === 0);
          setRows(
            upcoming.map((time) => ({
              time,
              label: label12h(time),
              cells: COURTS.map((c) => slots.find((s) => s.court === c && s.time === time)?.status ?? "open"),
            })),
          );
        })
        .catch(() => active && setRows([]));
    };
    load();
    const id = setInterval(load, 30000); // keep it live
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="relative mx-auto max-w-md overflow-hidden rounded-3xl border-2 border-white/15 bg-ink/80">
      <div aria-hidden className="tape-stripe h-1 w-full" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-[0.65rem] font-extrabold uppercase tracking-[0.22em] text-lime">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-lime" />
            </span>
            Live availability
          </span>
          <span className="text-[0.65rem] font-bold uppercase tracking-wide text-white/50">Today</span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div
            className="grid border-b border-white/10 bg-white/5 text-[0.6rem] font-extrabold uppercase tracking-[0.15em] text-white/50"
            style={{ gridTemplateColumns: "72px repeat(3, 1fr)" }}
          >
            <div className="px-3 py-2.5">Time</div>
            {COURTS.map((i) => (
              <div key={i} className="px-2 py-2.5 text-center">C{i}</div>
            ))}
          </div>

          {rows === null ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="grid border-b border-white/5 last:border-b-0" style={{ gridTemplateColumns: "72px repeat(3, 1fr)" }}>
                <div className="px-3 py-3 text-xs font-semibold text-white/30">·</div>
                {COURTS.map((c) => (
                  <div key={c} className="px-2 py-3 text-center">
                    <span className="inline-block h-5 w-12 animate-pulse rounded bg-white/10" />
                  </div>
                ))}
              </div>
            ))
          ) : allDone ? (
            <div className="px-4 py-8 text-center text-xs font-semibold text-white/55">
              Today&apos;s slots are done — book a court for tomorrow.
            </div>
          ) : (
            rows.map((row) => (
              <div key={row.time} className="grid border-b border-white/5 last:border-b-0" style={{ gridTemplateColumns: "72px repeat(3, 1fr)" }}>
                <div className="px-3 py-3 text-xs font-extrabold text-white">{row.label}</div>
                {row.cells.map((status, c) => (
                  <div key={c} className="px-2 py-2 text-center">
                    {status === "open" ? (
                      <span className="inline-block rounded-lg border-2 border-lime/50 bg-lime/20 px-2 py-1 text-[0.6rem] font-extrabold uppercase tracking-wide text-lime">
                        Open
                      </span>
                    ) : (
                      <span className="inline-block rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[0.6rem] font-bold uppercase tracking-wide text-white/30">
                        {status === "blocked" ? "—" : "Full"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        <Link href="/book" className="btn-accent mt-5 w-full justify-center">
          See all open slots <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
