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
    <div className="relative mx-auto max-w-md overflow-hidden rounded-3xl border-2 border-white/15 bg-ink/80">
      {/* Tape stripe top */}
      <div aria-hidden className="tape-stripe h-1 w-full" />

      {/* Court-line texture */}
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
        {/* Header row */}
        <div className="mb-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-[0.65rem] font-extrabold uppercase tracking-[0.22em] text-lime">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-lime" />
            </span>
            Live availability
          </span>
          <span className="text-[0.65rem] font-bold uppercase tracking-wide text-white/50">Today · next 3h</span>
        </div>

        {/* Grid */}
        <div className="overflow-hidden rounded-2xl border border-white/10">
          {/* Column headers */}
          <div
            className="grid border-b border-white/10 bg-white/5 text-[0.6rem] font-extrabold uppercase tracking-[0.15em] text-white/50"
            style={{ gridTemplateColumns: "72px repeat(3, 1fr)" }}
          >
            <div className="px-3 py-2.5">Time</div>
            {Array.from({ length: COURT_COUNT }, (_, i) => (
              <div key={i} className="px-2 py-2.5 text-center">
                C{i + 1}
              </div>
            ))}
          </div>

          {/* Rows */}
          {rows.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="grid border-b border-white/5 last:border-b-0"
                  style={{ gridTemplateColumns: "72px repeat(3, 1fr)" }}
                >
                  <div className="px-3 py-3 text-xs font-semibold text-white/30">·</div>
                  {Array.from({ length: COURT_COUNT }, (_, c) => (
                    <div key={c} className="px-2 py-3 text-center">
                      <span className="inline-block h-5 w-12 animate-pulse rounded bg-white/10" />
                    </div>
                  ))}
                </div>
              ))
            : rows.map((row) => (
                <div
                  key={row.iso}
                  className="grid border-b border-white/5 last:border-b-0"
                  style={{ gridTemplateColumns: "72px repeat(3, 1fr)" }}
                >
                  <div className="px-3 py-3 text-xs font-extrabold text-white">{row.label}</div>
                  {row.cells.map((status, c) => (
                    <div key={c} className="px-2 py-2 text-center">
                      {status === "open" ? (
                        <span className="inline-block rounded-lg border-2 border-lime/50 bg-lime/20 px-2 py-1 text-[0.6rem] font-extrabold uppercase tracking-wide text-lime">
                          Open
                        </span>
                      ) : (
                        <span className="inline-block rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[0.6rem] font-bold uppercase tracking-wide text-white/30">
                          Full
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
        </div>

        {/* CTA */}
        <Link
          href="/book"
          className="btn-accent mt-5 w-full justify-center"
        >
          See all open slots <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
