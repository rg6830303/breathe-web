"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Info, Loader2, Lock, ReceiptText } from "lucide-react";
import type { Slot } from "@/lib/types";
import { calculateTotals } from "@/lib/pricing";

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

export function BookingGrid({ initialSlots, initialDate }: { initialSlots: Slot[]; initialDate: string }) {
  const [date, setDate] = useState(initialDate);
  const [slots, setSlots] = useState(initialSlots);
  const [selected, setSelected] = useState<Slot[]>([]);
  const [paddles, setPaddles] = useState(false);
  const [balls, setBalls] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

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

        <div className="flex items-center justify-between px-5 py-3 text-xs text-slatey">
          <span className="font-semibold text-ink">{dateLabel(date)}</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-brand/30 bg-brand/5" /> Open</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-brand" /> Selected</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-slate-200" /> Booked</span>
          </div>
        </div>

        {/* Header */}
        <div className="grid border-y border-brand/10 bg-brand/5 text-center text-xs font-bold uppercase tracking-wide text-ink" style={{ gridTemplateColumns: gridCols }}>
          <div className="p-3 text-slatey">Time</div>
          {courts.map((c) => (
            <div key={c.id} className="border-l border-brand/10 p-3 text-brand">
              {c.name}
            </div>
          ))}
        </div>

        <div className="relative max-h-[640px] overflow-y-auto">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-brand" />
            </div>
          )}
          {rows.map((row) => (
            <div key={row.startTime} className="grid border-b border-brand/5" style={{ gridTemplateColumns: gridCols }}>
              <div className="flex items-center justify-center bg-brand/[0.03] p-2 text-center text-xs font-bold text-slatey">
                {timeLabel(row.startTime)}
              </div>
              {row.cells.map((slot, idx) => {
                if (!slot) return <div key={idx} className="border-l border-brand/5" />;
                const sel = isSelected(slot);
                return (
                  <button
                    key={`${slot.courtId}-${slot.startTime}`}
                    onClick={() => toggle(slot)}
                    disabled={slot.booked}
                    className={`slot-cell m-1 rounded-xl border p-2 text-left transition ${
                      slot.booked
                        ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                        : sel
                          ? "border-brand bg-brand text-white shadow-glow"
                          : "border-brand/20 bg-brand/[0.04] text-ink hover:border-brand hover:bg-brand/10"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>{slot.booked ? "Booked" : sel ? "Selected" : "Open"}</span>
                      {slot.booked ? <Lock className="h-3.5 w-3.5" /> : sel ? <Check className="h-3.5 w-3.5" /> : null}
                    </div>
                    {!slot.booked && (
                      <div className={`mt-1 text-xs font-semibold ${sel ? "text-white/90" : "text-slatey"}`}>₹{slot.price}</div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {/* Summary */}
      <aside className="h-fit rounded-3xl border border-brand/10 bg-white p-5 shadow-card lg:sticky lg:top-28">
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
          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-brand/20 bg-brand/5 p-3 text-xs text-ink">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <span>
              Slots held! Online payment is being connected — our team will message you on {" "}
              <strong>WhatsApp</strong> to confirm and collect payment.
            </span>
          </div>
        )}

        <p className="mt-3 flex items-start gap-2 text-[0.7rem] leading-5 text-slatey">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Prices vary by time of day. Off-peak is most affordable; prime-time evenings are premium.
        </p>
      </aside>
    </div>
  );
}
