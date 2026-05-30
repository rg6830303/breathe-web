"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarDays, CalendarPlus, Check, Info, Lock, MessageCircle, ReceiptText, Share2 } from "lucide-react";
import type { Slot } from "@/lib/types";
import { calculateTotals } from "@/lib/pricing";
import { BookingStickyBar } from "@/components/booking-sticky-bar";
import { WaitlistModal, type WaitlistTarget } from "@/components/waitlist-modal";
import { generateMultiICS, whatsappBatchLink, type IcsBooking } from "@/lib/ics";

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(
    new Date(`${value}T00:00:00`),
  );
}

const PADDLE_PRICE = 300;
const BALL_PRICE = 120;

type Band = "morning" | "afternoon" | "evening";
const BANDS: { key: Band; label: string }[] = [
  { key: "morning", label: "Morning · 6–12" },
  { key: "afternoon", label: "Afternoon · 12–5" },
  { key: "evening", label: "Evening · 5–11" },
];

function bandFor(hour: number): Band {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function defaultBand(): Band {
  return bandFor(new Date().getHours());
}

export function BookingGrid({ initialSlots, initialDate }: { initialSlots: Slot[]; initialDate: string }) {
  const [date, setDate] = useState(initialDate);
  const [slots, setSlots] = useState(initialSlots);
  const [selected, setSelected] = useState<Slot[]>([]);
  const [paddles, setPaddles] = useState(false);
  const [balls, setBalls] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [mobileCourt, setMobileCourt] = useState<number>(1);
  const [band, setBand] = useState<Band>(defaultBand());
  const [toast, setToast] = useState<string | null>(null);
  const [waitlistTarget, setWaitlistTarget] = useState<WaitlistTarget | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/slots?date=${date}`)
      .then((res) => res.json())
      .then((payload) => {
        if (cancelled) return;
        setSlots(payload.slots ?? []);
        setSelected([]);
        setConfirmed(false);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [date]);

  // Distinct courts and time rows derived from the live slot feed.
  const courts = useMemo(() => {
    const map = new Map<number, string>();
    slots.forEach((s) => map.set(s.courtId, s.courtName));
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.id - b.id);
  }, [slots]);

  const rows = useMemo(() => {
    const starts = Array.from(new Set(slots.map((s) => s.startTime))).sort();
    return starts.map((startTime) => ({
      startTime,
      cells: courts.map((c) => slots.find((s) => s.startTime === startTime && s.courtId === c.id)),
    }));
  }, [slots, courts]);

  // Filter rows by selected time-of-day band on mobile + desktop.
  const visibleRows = useMemo(
    () => rows.filter((r) => bandFor(new Date(r.startTime).getHours()) === band),
    [rows, band],
  );

  // When switching to a tab whose court no longer exists in the data (e.g.
  // courts loaded from Supabase ordering), fall back to the first one.
  useEffect(() => {
    if (courts.length > 0 && !courts.some((c) => c.id === mobileCourt)) {
      setMobileCourt(courts[0]!.id);
    }
  }, [courts, mobileCourt]);

  const equipmentTotal = (paddles ? PADDLE_PRICE : 0) + (balls ? BALL_PRICE : 0);
  const base = selected.reduce((sum, slot) => sum + slot.price, 0);
  const totals = calculateTotals(base, equipmentTotal);

  function isSelected(slot: Slot) {
    return selected.some((i) => i.courtId === slot.courtId && i.startTime === slot.startTime);
  }

  function toggle(slot: Slot) {
    if (slot.booked) return;
    setConfirmed(false);
    setSelected((current) =>
      isSelected(slot)
        ? current.filter((i) => !(i.courtId === slot.courtId && i.startTime === slot.startTime))
        : [...current, slot],
    );
  }

  const minDate = new Date().toISOString().slice(0, 10);
  const gridCols = `64px repeat(${Math.max(courts.length, 1)}, minmax(0, 1fr))`;

  // Build the IcsBooking list for the confirmation block. Bookings are local
  // (no server round-trip yet); we synthesise a stable id from court+start so
  // the ICS UID is deterministic and replaceable on update if needed.
  const confirmedBookings: IcsBooking[] = selected.map((s) => ({
    courtId: s.courtId,
    startTime: new Date(s.startTime),
    endTime: new Date(s.endTime),
    bookingId: `${date}-${s.courtId}-${new Date(s.startTime).getTime()}`,
  }));

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }

  function downloadIcs() {
    const ics = generateMultiICS(confirmedBookings);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "breathe-booking.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function shareBooking() {
    const first = confirmedBookings[0];
    if (!first) return;
    const dateStr = first.startTime.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    const timeStr = first.startTime.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
    const shareData = {
      title: "Court at Breathe Pickleball",
      text: `Court ${first.courtId} · ${dateStr} · ${timeStr}`,
      url: typeof window !== "undefined" ? window.location.href : "https://breathe-web-six.vercel.app",
    };
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled the share sheet — silent no-op is fine.
      }
      return;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(shareData.url);
      showToast("Link copied");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Court matrix */}
      <section className="overflow-hidden rounded-3xl border border-brand/10 bg-white shadow-soft">
        <div className="flex flex-col gap-4 border-b border-brand/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-xl font-extrabold text-ink">Book a court</h1>
              <p className="text-sm text-slatey">30-minute slots · {courts.length} courts</p>
            </div>
          </div>
          <input
            type="date"
            min={minDate}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-brand/15 bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-brand"
          />
        </div>

        <div className="flex flex-col gap-3 px-5 py-3 text-xs text-slatey sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold text-ink">{dateLabel(date)}</span>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-slot-openBg ring-1 ring-slot-openBorder" /> Open
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-slot-selected" /> Selected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-slot-bookedBg ring-1 ring-slate-300" /> Booked
            </span>
          </div>
        </div>

        {/* Time-of-day filter pills (mobile + desktop) */}
        <div className="flex gap-2 overflow-x-auto border-y border-brand/10 bg-brand/[0.03] px-5 py-3">
          {BANDS.map((b) => {
            const isActive = band === b.key;
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => setBand(b.key)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  isActive ? "bg-brand text-white shadow-soft" : "bg-white text-ink/70 border border-brand/15 hover:text-brand"
                }`}
                aria-pressed={isActive}
              >
                {b.label}
              </button>
            );
          })}
        </div>

        {/* MOBILE: court tabs + stacked rows */}
        <div className="lg:hidden">
          <div className="flex gap-1 border-b border-brand/10 bg-white px-3 py-2">
            {courts.map((c) => {
              const isActive = mobileCourt === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setMobileCourt(c.id)}
                  className={`flex-1 rounded-full px-3 py-2 text-xs font-bold transition ${
                    isActive ? "bg-brand text-white shadow-soft" : "text-ink/70 hover:bg-brand/5"
                  }`}
                  aria-pressed={isActive}
                >
                  {c.name}
                </button>
              );
            })}
          </div>

          <div className="relative">
            {loading ? (
              <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading slots">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="animate-pulse h-12 bg-gray-100 rounded-lg" />
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {visibleRows.length === 0 && (
                  <li className="p-6 text-center text-sm text-slatey">No slots in this time band.</li>
                )}
                {visibleRows.map((row) => {
                  const cell = row.cells.find((c) => c?.courtId === mobileCourt);
                  if (!cell) return null;
                  const sel = isSelected(cell);
                  const disabled = cell.booked;
                  return (
                    <li
                      key={`${cell.courtId}-${cell.startTime}`}
                      className={`flex items-center justify-between min-h-[52px] px-4 py-3 border-b border-gray-100 ${
                        disabled ? "cursor-default" : "cursor-pointer"
                      }`}
                      onClick={() => !disabled && toggle(cell)}
                    >
                      <div>
                        <div className="text-sm font-bold text-ink">{timeLabel(cell.startTime)}</div>
                        <div className="text-xs text-slatey">{cell.courtName} · ₹{cell.price}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {disabled && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setWaitlistTarget({
                                courtId: cell.courtId,
                                courtName: cell.courtName,
                                startTime: cell.startTime,
                                endTime: cell.endTime,
                              });
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-brand/20 px-2.5 py-1 text-[0.65rem] font-bold text-brand hover:bg-brand/5"
                          >
                            <Bell className="h-3 w-3" /> Notify me
                          </button>
                        )}
                        <SlotPill state={disabled ? "booked" : sel ? "selected" : "open"} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* DESKTOP: existing grid layout, retuned colors */}
        <div className="hidden lg:block">
          <div
            className="grid border-y border-brand/10 bg-brand/5 text-center text-xs font-bold uppercase tracking-wide text-ink"
            style={{ gridTemplateColumns: gridCols }}
          >
            <div className="p-3 text-slatey">Time</div>
            {courts.map((c) => (
              <div key={c.id} className="border-l border-brand/10 p-3 text-brand">
                {c.name}
              </div>
            ))}
          </div>

          <div className="relative max-h-[640px] overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading slots">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="animate-pulse h-12 bg-gray-100 rounded-lg" />
                ))}
              </div>
            ) : (
              visibleRows.map((row) => (
                <div
                  key={row.startTime}
                  className="grid border-b border-brand/5"
                  style={{ gridTemplateColumns: gridCols }}
                >
                  <div className="flex items-center justify-center bg-brand/[0.03] p-2 text-center text-xs font-bold text-slatey">
                    {timeLabel(row.startTime)}
                  </div>
                  {row.cells.map((slot, idx) => {
                    if (!slot) return <div key={idx} className="border-l border-brand/5" />;
                    const sel = isSelected(slot);
                    const state: SlotState = slot.booked ? "booked" : sel ? "selected" : "open";
                    return (
                      <div key={`${slot.courtId}-${slot.startTime}`} className="relative m-1">
                        <button
                          onClick={() => toggle(slot)}
                          disabled={slot.booked}
                          className={`w-full min-h-[48px] rounded-xl border p-2 text-left transition ${slotClass(state)}`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span>{state === "booked" ? "Booked" : state === "selected" ? "Selected" : "Open"}</span>
                            {state === "booked" ? (
                              <Lock className="h-3.5 w-3.5" />
                            ) : state === "selected" ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : null}
                          </div>
                          {!slot.booked && (
                            <div className={`mt-1 text-xs font-semibold ${state === "selected" ? "text-white/90" : "text-slatey"}`}>
                              ₹{slot.price}
                            </div>
                          )}
                        </button>
                        {slot.booked && (
                          <button
                            type="button"
                            onClick={() =>
                              setWaitlistTarget({
                                courtId: slot.courtId,
                                courtName: slot.courtName,
                                startTime: slot.startTime,
                                endTime: slot.endTime,
                              })
                            }
                            aria-label={`Notify me when ${slot.courtName} at ${timeLabel(slot.startTime)} opens up`}
                            className="absolute right-1.5 bottom-1.5 inline-flex items-center gap-1 rounded-full border border-brand/30 bg-white px-2 py-0.5 text-[0.6rem] font-bold text-brand shadow-sm hover:bg-brand/5"
                          >
                            <Bell className="h-2.5 w-2.5" /> Notify
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Summary */}
      <aside id="reservation-summary" className="h-fit rounded-3xl border border-brand/10 bg-white p-5 shadow-card lg:sticky lg:top-28 scroll-mt-24">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
          <ReceiptText className="h-5 w-5 text-brand" /> Reservation summary
        </h2>

        <div className="mt-4 space-y-2">
          {selected.length === 0 && (
            <p className="rounded-2xl border border-dashed border-brand/20 bg-brand/[0.03] p-4 text-sm text-slatey">
              Tap open slots in the grid to build your booking.
            </p>
          )}
          {selected.map((slot) => (
            <div key={`${slot.courtId}-${slot.startTime}`} className="rounded-2xl border border-brand/10 bg-brand/[0.03] p-3">
              <div className="flex justify-between text-sm font-bold text-ink">
                <span>{slot.courtName}</span>
                <span>₹{slot.price}</span>
              </div>
              <p className="text-xs text-slatey">
                {timeLabel(slot.startTime)} – {timeLabel(slot.endTime)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-1 border-t border-brand/10 pt-4">
          <label className="flex cursor-pointer items-center justify-between rounded-xl px-2 py-2 text-sm hover:bg-brand/5">
            <span className="text-ink">Pro paddles ×2 <span className="text-slatey">(₹{PADDLE_PRICE})</span></span>
            <input type="checkbox" checked={paddles} onChange={(e) => setPaddles(e.target.checked)} className="h-4 w-4 accent-brand" />
          </label>
          <label className="flex cursor-pointer items-center justify-between rounded-xl px-2 py-2 text-sm hover:bg-brand/5">
            <span className="text-ink">Premium ball tube <span className="text-slatey">(₹{BALL_PRICE})</span></span>
            <input type="checkbox" checked={balls} onChange={(e) => setBalls(e.target.checked)} className="h-4 w-4 accent-brand" />
          </label>
        </div>

        <div className="mt-4 space-y-2 border-t border-brand/10 pt-4 text-sm">
          <div className="flex justify-between text-slatey"><span>Subtotal</span><span className="font-semibold text-ink">₹{totals.subtotal}</span></div>
          <div className="flex justify-between text-slatey"><span>GST & fees (18%)</span><span className="font-semibold text-ink">₹{totals.taxes}</span></div>
          <div className="mt-2 flex items-center justify-between rounded-2xl brand-gradient px-4 py-3 text-lg font-extrabold text-white">
            <span>Total</span><span>₹{totals.total}</span>
          </div>
        </div>

        <button
          onClick={() => selected.length > 0 && setConfirmed(true)}
          disabled={selected.length === 0}
          className="mt-4 w-full rounded-2xl bg-brand px-4 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {selected.length === 0 ? "Select a slot to continue" : `Confirm ${selected.length} slot${selected.length > 1 ? "s" : ""}`}
        </button>

        {confirmed && (
          <div className="mt-3 space-y-3">
            <div className="flex items-start gap-2 rounded-2xl border border-brand/20 bg-brand/5 p-3 text-xs text-ink">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <span>
                Slots held! Online payment is being connected — our team will message you on {" "}
                <strong>WhatsApp</strong> to confirm and collect payment.
              </span>
            </div>

            {/* Calendar / share / WhatsApp actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={downloadIcs}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand/20 bg-white px-3 py-2.5 text-xs font-bold text-brand hover:bg-brand/5"
              >
                <CalendarPlus className="h-4 w-4" /> Add to Calendar
              </button>
              <button
                type="button"
                onClick={shareBooking}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand/20 bg-white px-3 py-2.5 text-xs font-bold text-brand hover:bg-brand/5"
              >
                <Share2 className="h-4 w-4" /> Share Booking
              </button>
            </div>
            <a
              href={whatsappBatchLink(confirmedBookings)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-2.5 text-xs font-bold text-white hover:opacity-90"
            >
              <MessageCircle className="h-4 w-4" /> Message us on WhatsApp ↗
            </a>

            {toast && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-xl border border-brand/20 bg-ink px-3 py-2 text-center text-xs font-bold text-white"
              >
                {toast}
              </div>
            )}
          </div>
        )}

        <p className="mt-3 flex items-start gap-2 text-[0.7rem] leading-5 text-slatey">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Prices vary by time of day. Off-peak is most affordable; prime-time evenings are premium.
        </p>
      </aside>

      <BookingStickyBar
        selectedCount={selected.length}
        total={totals.total}
        onContinue={() => {
          // Scroll the summary into view; on mobile the aside lives below the
          // grid so this jumps the user straight to the confirm button.
          document.getElementById("reservation-summary")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

      {waitlistTarget && (
        <WaitlistModal target={waitlistTarget} onClose={() => setWaitlistTarget(null)} />
      )}
    </div>
  );
}

type SlotState = "open" | "booked" | "selected";

function slotClass(state: SlotState) {
  switch (state) {
    case "booked":
      return "cursor-not-allowed border-slate-300 bg-slot-bookedBg text-slot-booked line-through";
    case "selected":
      return "border-brand bg-slot-selected text-white shadow-glow";
    case "open":
    default:
      return "border-slot-openBorder bg-slot-openBg text-slot-open hover:border-brand";
  }
}

/** Compact status pill used in the mobile rows. */
function SlotPill({ state }: { state: SlotState }) {
  if (state === "booked") {
    return (
      <span className="rounded-full bg-slot-bookedBg px-3 py-1 text-xs font-semibold text-slot-booked line-through">
        Booked
      </span>
    );
  }
  if (state === "selected") {
    return (
      <span className="rounded-full bg-slot-selected px-3 py-1 text-xs font-bold text-white">
        Selected
      </span>
    );
  }
  return (
    <span className="rounded-full border border-slot-openBorder bg-slot-openBg px-3 py-1 text-xs font-bold text-slot-open">
      Open
    </span>
  );
}
