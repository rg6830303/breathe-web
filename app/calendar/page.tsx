"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, CalendarDays, Loader2, Clock, Users, RefreshCw } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { WeatherWidget } from "@/components/weather-widget";

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
      case "available": return "bg-lime/20 border-lime/40 text-lime-dark hover:bg-lime/30 cursor-pointer";
      case "limited":   return "bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200 cursor-pointer";
      case "full":      return "bg-red-100 border-red-200 text-red-600 cursor-not-allowed";
      case "past":      return "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed";
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
      <main className="app-surface min-h-screen bg-brand-50/20 pb-16">
        {/* Hero */}
        <section className="brand-gradient brand-mesh relative overflow-hidden text-white">
          <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/60">
                  <CalendarDays className="h-4 w-4" /> Court Availability
                </div>
                <h1 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">
                  Weekly Calendar
                </h1>
                <p className="mt-2 text-sm text-white/70 max-w-md">
                  See real-time slot availability across all 3 courts. Green = open, amber = 1 slot left, red = full.
                </p>
              </div>
              <Link
                href="/book"
                className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-3 text-sm font-bold text-gray-900 shadow-soft transition hover:bg-lime-dark"
              >
                Book a slot <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Legend */}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-lime/80" />
                Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-amber-400" />
                1 slot left
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-red-400" />
                Full
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-gray-300" />
                Past
              </span>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Week nav */}
          <div className="mt-6 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekOffset((v) => Math.max(0, v - 1))}
                disabled={weekOffset === 0}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand/20 text-ink disabled:opacity-30 hover:bg-brand/5 transition"
                aria-label="Previous week"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-bold text-ink">
                {weekDates[0].toLocaleDateString("en-IN", { day: "numeric", month: "short" })} –{" "}
                {weekDates[6].toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              <button
                onClick={() => setWeekOffset((v) => v + 1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand/20 text-ink hover:bg-brand/5 transition"
                aria-label="Next week"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Jump to today
                </button>
              )}
              <button
                onClick={fetchSlots}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/5 transition disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Weather widget */}
          <div className="mb-5">
            <WeatherWidget compact />
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error} —{" "}
              <button onClick={fetchSlots} className="font-bold underline">
                Retry
              </button>
            </div>
          )}

          {/* Calendar grid — horizontal scroll on mobile */}
          <div className="overflow-x-auto rounded-3xl border border-brand/10 bg-white shadow-soft">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20">
                <Loader2 className="h-8 w-8 animate-spin text-brand" />
                <p className="text-sm text-slatey">Loading availability…</p>
              </div>
            ) : (
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-brand/10">
                    <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slatey">
                      <Clock className="h-3.5 w-3.5 inline mr-1" />Time
                    </th>
                    {weekDates.map((d) => {
                      const isToday = formatDate(d) === formatDate(new Date());
                      return (
                        <th
                          key={d.toISOString()}
                          className={`px-2 py-3 text-center text-xs font-bold uppercase tracking-wide ${isToday ? "text-brand" : "text-slatey"}`}
                        >
                          <div className={`${isToday ? "rounded-full bg-brand/10 px-2 py-0.5" : ""}`}>
                            <div>{getDayLabel(d)}</div>
                            <div className="font-extrabold text-ink">
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
                      className={rowIdx % 2 === 0 ? "bg-white" : "bg-brand-50/30"}
                    >
                      <td className="sticky left-0 z-10 border-r border-brand/10 bg-inherit px-4 py-2 font-mono text-xs font-semibold text-slatey whitespace-nowrap">
                        {time}
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
                                className={`block rounded-lg border px-2 py-2 text-[11px] font-bold transition ${cellClass}`}
                              >
                                <span className="flex items-center justify-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {label}
                                </span>
                              </Link>
                            ) : (
                              <div
                                className={`block rounded-lg border px-2 py-2 text-[11px] font-bold ${cellClass}`}
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

          <p className="mt-4 text-center text-xs text-slatey">
            Availability updates every minute. Each cell shows courts free out of {TOTAL_COURTS} total.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
