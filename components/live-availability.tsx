"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

type CellStatus = "open" | "booked";

type Row = {
  label: string;
  iso: string;
  cells: CellStatus[]; // index = courtIdx
};

const COURT_COUNT = 3;

/** Round `d` UP to the next half-hour boundary. */
function nextHalfHour(d: Date) {
  const out = new Date(d);
  out.setSeconds(0, 0);
  const m = out.getMinutes();
  if (m === 0 || m === 30) {
    // already on a half-hour; do nothing
  } else if (m < 30) {
    out.setMinutes(30);
  } else {
    out.setMinutes(0);
    out.setHours(out.getHours() + 1);
  }
  return out;
}

/** Deterministic-ish demo "booked" status driven by (hour, minute, courtIdx)
 *  so the layout stays stable across renders rather than flickering. */
function demoBooked(d: Date, courtIdx: number): boolean {
  const key = d.getHours() * 6 + Math.floor(d.getMinutes() / 30) + courtIdx * 7;
  return key % 5 === 0 || key % 7 === 0;
}

function formatTime(d: Date) {
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(d);
}

export function LiveAvailability() {
  const [rows, setRows] = useState<Row[]>([]);

  // Computed on the client to honour the user's local clock and avoid SSR
  // hydration mismatches. 6 half-hour rows from the next boundary forward.
  useEffect(() => {
    const start = nextHalfHour(new Date());
    const next: Row[] = [];
    for (let i = 0; i < 6; i++) {
      const t = new Date(start.getTime() + i * 30 * 60 * 1000);
      next.push({
        label: formatTime(t),
        iso: t.toISOString(),
        cells: Array.from({ length: COURT_COUNT }, (_, c) => (demoBooked(t, c) ? "booked" : "open") as CellStatus),
      });
    }
    setRows(next);
  }, []);

  return (
    <div className="relative mx-auto max-w-md rounded-3xl border border-white/20 bg-white/10 p-5 shadow-glow backdrop-blur-md">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-lime">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-lime" />
          </span>
          Live availability
        </span>
        <span className="text-xs font-semibold text-white/70">Today · next 3h</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/15 bg-white/5">
        {/* Header */}
        <div className="grid grid-cols-[72px_repeat(3,1fr)] border-b border-white/10 bg-white/5 text-[0.65rem] font-bold uppercase tracking-wide text-white/70">
          <div className="px-3 py-2">Time</div>
          {Array.from({ length: COURT_COUNT }, (_, i) => (
            <div key={i} className="px-2 py-2 text-center">
              Court {i + 1}
            </div>
          ))}
        </div>

        {/* Rows */}
        {rows.length === 0 ? (
          // Server-render placeholder; client effect populates rows on mount.
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[72px_repeat(3,1fr)] border-b border-white/5">
              <div className="px-3 py-3 text-xs font-semibold text-white/40">·</div>
              {Array.from({ length: COURT_COUNT }, (_, c) => (
                <div key={c} className="px-2 py-3 text-center">
                  <span className="inline-block h-5 w-12 rounded bg-white/10" />
                </div>
              ))}
            </div>
          ))
        ) : (
          rows.map((row) => (
            <div key={row.iso} className="grid grid-cols-[72px_repeat(3,1fr)] border-b border-white/5 last:border-b-0">
              <div className="px-3 py-3 text-xs font-bold text-white">{row.label}</div>
              {row.cells.map((status, c) => (
                <div key={c} className="px-2 py-2 text-center">
                  {status === "open" ? (
                    <span className="inline-block rounded border border-slot-openBorder bg-slot-openBg px-2 py-0.5 text-xs font-bold text-slot-open">
                      Open
                    </span>
                  ) : (
                    <span className="inline-block rounded border border-white/15 bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/40">
                      Booked
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <Link
        href="/book"
        className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-lime px-5 py-3 text-sm font-bold text-gray-900 transition hover:bg-lime-dark"
      >
        See all open slots <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
