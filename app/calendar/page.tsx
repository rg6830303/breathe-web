"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, CalendarDays, Loader2, Clock, Users, RefreshCw } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { WeatherWidget } from "@/components/weather-widget";
import { PageHero } from "@/components/ui/page-hero";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

const SLOTS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00",
];

const TOTAL_COURTS = 3;

function getDayLabel(date: Date) {
  const today = new Date();
  const diff = Math.round((date.getTime() - today.setHours(0, 0, 0, 0)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return date.toLocaleDateString("en-IN", { weekday: "short" });
}

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getWeekDates(offset = 0) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + offset * 7 + i);
    return d;
  });
}

type SlotData = Record<string, Record<string, number>>; // date -> time -> bookings count

export default function CalendarPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [slots, setSlots] = useState<SlotData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const weekDates = getWeekDates(weekOffset);
  const startDate = formatDate(weekDates[0]);
  const endDate = formatDate(weekDates[6]);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/slots?from=${startDate}&to=${endDate}`);
      if (!res.ok) throw new Error("Failed to load slots");
      const data = await res.json();
      // data.slots: array of { date, time, booked }
      const mapped: SlotData = {};
      if (Array.isArray(data.slots)) {
        for (const s of data.slots) {
          if (!mapped[s.date]) mapped[s.date] = {};
          mapped[s.date][s.time] = Number(s.booked ?? 0);
        }
      }
      setSlots(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  function getAvailability(date: string, time: string): "available" | "limited" | "full" | "past" {
    const now = new Date();
    const slotDt = new Date(`${date}T${time}:00`);
    if (slotDt < now) return "past";
    const booked = slots[date]?.[time] ?? 0;
    if (booked >= TOTAL_COURTS) return "full";
    if (booked >= TOTAL_COURTS - 1) return "limited";
    return "available";
  }

  function getCellStyle(status: ReturnType<typeof getAvailability>) {
    switch (status) {
      case "available":
        return "border-2 border-lime/50 bg-lime/15 text-lime-dark hover:border-lime hover:bg-lime/25 cursor-pointer";
      case "limited":
        return "border-2 border-amber-400/60 bg-amber-50 text-amber-800 hover:bg-amber-100 cursor-pointer dark:border-amber-400/30 dark:bg-amber-900/20 dark:text-amber-400";
      case "full":
        return "border-2 border-red-200/60 bg-red-50/80 text-red-500 cursor-not-allowed dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400";
      case "past":
        return "border-2 border-ink/5 bg-ink/[0.02] text-ink/20 cursor-not-allowed dark:border-white/5 dark:bg-white/[0.02] dark:text-white/15";
    }
  }

  function getCellLabel(status: ReturnType<typeof getAvailability>, date: string, time: string) {
    if (status === "past") return "—";
    const booked = slots[date]?.[time] ?? 0;
    const free = TOTAL_COURTS - booked;
    if (status === "full") return "Full";
    return `${free}/${TOTAL_COURTS}`;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <>
      <Nav />
      <main className="app-surface min-h-screen bg-white pb-16 dark:bg-ink">
        {/* Bold page hero */}
        <PageHero
          label="Court availability"
          title="Weekly Calendar"
          subtitle="See real-time slot availability across all 3 courts. Green = open, amber = 1 slot left, red = full."
        >
          <Link href="/book" className="btn-accent">
            Book a slot <ArrowRight className="h-4 w-4" />
          </Link>
        </PageHero>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Week navigation */}
          <ScrollReveal>
            <div className="mt-7 mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWeekOffset((v) => Math.max(0, v - 1))}
                  disabled={weekOffset === 0}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink/10 bg-white text-ink transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-brand-300 dark:hover:text-brand-300"
                  aria-label="Previous week"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-display text-sm font-extrabold text-ink dark:text-white">
                  {weekDates[0].toLocaleDateString("en-IN", { day: "numeric", month: "short" })} –{" "}
                  {weekDates[6].toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <button
                  onClick={() => setWeekOffset((v) => v + 1)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink/10 bg-white text-ink transition hover:border-brand hover:text-brand dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-brand-300 dark:hover:text-brand-300"
                  aria-label="Next week"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {weekOffset !== 0 && (
                  <button
                    onClick={() => setWeekOffset(0)}
                    className="text-xs font-extrabold uppercase tracking-wide text-brand hover:underline dark:text-brand-300"
                  >
                    Jump to today
                  </button>
                )}
                <button
                  onClick={fetchSlots}
                  disabled={loading}
                  className="btn-outline py-1.5 text-xs"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
            </div>
          </ScrollReveal>

          {/* Legend */}
          <ScrollReveal delay={0.05}>
            <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-ink/8 bg-white px-4 py-3 text-xs font-bold dark:border-white/8 dark:bg-white/5">
              <span className="font-extrabold uppercase tracking-wide text-slatey dark:text-white/50">Legend:</span>
              <span className="flex items-center gap-1.5 text-lime-dark">
                <span className="h-3 w-3 rounded border-2 border-lime/50 bg-lime/20" />
                Available
              </span>
              <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <span className="h-3 w-3 rounded border-2 border-amber-400/60 bg-amber-100 dark:bg-amber-900/30" />
                1 slot left
              </span>
              <span className="flex items-center gap-1.5 text-red-500 dark:text-red-400">
                <span className="h-3 w-3 rounded border-2 border-red-200/60 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10" />
                Full
              </span>
              <span className="flex items-center gap-1.5 text-ink/30 dark:text-white/20">
                <span className="h-3 w-3 rounded border-2 border-ink/5 bg-ink/5 dark:border-white/5 dark:bg-white/5" />
                Past
              </span>
            </div>
          </ScrollReveal>

          {/* Weather widget */}
          <div className="mb-5">
            <WeatherWidget compact />
          </div>

          {error && (
            <div className="mb-5 rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
              {error} —{" "}
              <button onClick={fetchSlots} className="font-extrabold underline">
                Retry
              </button>
            </div>
          )}

          {/* Calendar grid */}
          <ScrollReveal delay={0.1}>
            <div className="overflow-x-auto rounded-3xl border-2 border-ink/10 bg-white dark:border-white/10 dark:bg-[#111c38]">
              {/* Top tape stripe */}
              <div
                aria-hidden
                className="h-1.5 w-full"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(-45deg, #c6f432 0, #c6f432 14px, #0d1426 14px, #0d1426 28px)",
                }}
              />

              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-24">
                  <Loader2 className="h-9 w-9 animate-spin text-brand" />
                  <p className="text-sm font-bold text-slatey dark:text-white/40">Loading availability…</p>
                </div>
              ) : (
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-ink/10 dark:border-white/10">
                      <th className="sticky left-0 z-10 bg-white px-4 py-3.5 text-left dark:bg-[#111c38]">
                        <span className="flex items-center gap-1.5 text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-slatey dark:text-white/40">
                          <Clock className="h-3.5 w-3.5" /> Time
                        </span>
                      </th>
                      {weekDates.map((d) => {
                        const isToday = formatDate(d) === formatDate(new Date());
                        return (
                          <th
                            key={d.toISOString()}
                            className={`px-2 py-3.5 text-center text-[0.65rem] font-extrabold uppercase tracking-[0.15em] ${
                              isToday ? "text-brand dark:text-brand-300" : "text-slatey dark:text-white/40"
                            }`}
                          >
                            <div
                              className={
                                isToday
                                  ? "rounded-xl bg-brand/10 px-2 py-0.5 dark:bg-brand/20"
                                  : ""
                              }
                            >
                              <div>{getDayLabel(d)}</div>
                              <div className="font-display text-sm font-extrabold text-ink dark:text-white">
                                {d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                              </div>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {SLOTS.map((time, rowIdx) => (
                      <tr
                        key={time}
                        className={
                          rowIdx % 2 === 0
                            ? "bg-white dark:bg-[#111c38]"
                            : "bg-ink/[0.015] dark:bg-white/[0.02]"
                        }
                      >
                        <td className="sticky left-0 z-10 border-r-2 border-ink/5 bg-inherit px-4 py-2 dark:border-white/5">
                          <span className="font-mono text-xs font-extrabold text-slatey dark:text-white/40">
                            {time}
                          </span>
                        </td>
                        {weekDates.map((d) => {
                          const dateStr = formatDate(d);
                          const status = getAvailability(dateStr, time);
                          const label = getCellLabel(status, dateStr, time);
                          const cellClass = getCellStyle(status);
                          return (
                            <td key={dateStr} className="px-1.5 py-1.5 text-center">
                              {status === "available" || status === "limited" ? (
                                <Link
                                  href={`/book?date=${dateStr}&time=${time}`}
                                  className={`block rounded-xl border px-2 py-2 text-[0.6rem] font-extrabold uppercase tracking-wide transition ${cellClass}`}
                                >
                                  <span className="flex items-center justify-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {label}
                                  </span>
                                </Link>
                              ) : (
                                <div
                                  className={`block rounded-xl border px-2 py-2 text-[0.6rem] font-bold uppercase tracking-wide ${cellClass}`}
                                >
                                  {label}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </ScrollReveal>

          <p className="mt-5 text-center text-xs font-semibold text-slatey dark:text-white/40">
            Availability updates every minute. Each cell shows courts free out of {TOTAL_COURTS} total.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
