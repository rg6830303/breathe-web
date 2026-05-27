"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle2, CircleSlash, ReceiptText } from "lucide-react";
import type { Slot } from "@/lib/types";
import { calculateTotals } from "@/lib/pricing";

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function BookingGrid({ initialSlots, initialDate }: { initialSlots: Slot[]; initialDate: string }) {
  const [date, setDate] = useState(initialDate);
  const [slots, setSlots] = useState(initialSlots);
  const [selected, setSelected] = useState<Slot[]>([]);
  const [paddles, setPaddles] = useState(false);
  const [balls, setBalls] = useState(false);

  useEffect(() => {
    fetch(`/api/slots?date=${date}`)
      .then((res) => res.json())
      .then((payload) => {
        setSlots(payload.slots);
        setSelected([]);
      });
  }, [date]);

  const rows = useMemo(() => {
    const starts = Array.from(new Set(slots.map((slot) => slot.startTime)));
    return starts.map((startTime) => ({
      startTime,
      court1: slots.find((slot) => slot.startTime === startTime && slot.courtId === 1),
      court2: slots.find((slot) => slot.startTime === startTime && slot.courtId === 2),
    }));
  }, [slots]);

  const equipmentTotal = (paddles ? 300 : 0) + (balls ? 120 : 0);
  const base = selected.reduce((sum, slot) => sum + slot.price, 0);
  const totals = calculateTotals(base, equipmentTotal);

  function toggle(slot: Slot) {
    if (slot.booked) return;
    setSelected((current) =>
      current.some((item) => item.courtId === slot.courtId && item.startTime === slot.startTime)
        ? current.filter((item) => !(item.courtId === slot.courtId && item.startTime === slot.startTime))
        : [...current, slot],
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="glass overflow-hidden rounded-lg">
        <div className="flex flex-col gap-4 border-b border-line p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-volt" />
            <div>
              <h1 className="font-display text-3xl font-black text-white">Book a Court</h1>
              <p className="text-sm text-slate-400">Court 1 and Court 2, half-hour increments</p>
            </div>
          </div>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-md border border-line bg-midnight px-3 py-2 text-sm text-white"
          />
        </div>
        <div className="grid grid-cols-[76px_1fr_1fr] border-b border-line bg-[#081629] text-center text-sm font-black uppercase text-slate-300">
          <div className="p-4">Time</div>
          <div className="border-l border-line p-4 text-volt">Court 1</div>
          <div className="border-l border-line p-4 text-court">Court 2</div>
        </div>
        <div className="max-h-[690px] overflow-y-auto">
          {rows.map((row) => (
            <div key={row.startTime} className="grid grid-cols-[76px_1fr_1fr] border-b border-line/60">
              <div className="flex items-center justify-center bg-midnight/70 p-2 text-xs font-bold text-slate-400">
                {timeLabel(row.startTime)}
              </div>
              {[row.court1, row.court2].map((slot) => {
                if (!slot) return null;
                const isSelected = selected.some((item) => item.courtId === slot.courtId && item.startTime === slot.startTime);
                return (
                  <button
                    key={`${slot.courtId}-${slot.startTime}`}
                    onClick={() => toggle(slot)}
                    className={`slot-cell m-1 rounded-md border p-2 text-left transition ${
                      slot.booked
                        ? "cursor-not-allowed border-red-300/20 bg-red-400/10 text-red-200/70"
                        : isSelected
                          ? "border-volt bg-volt/20 shadow-volt"
                          : "border-court/35 bg-court/8 hover:border-volt hover:bg-volt/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black">{slot.booked ? "Booked" : isSelected ? "Selected" : "Open"}</span>
                      {slot.booked ? <CircleSlash className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    </div>
                    {!slot.booked && <div className="mt-1 text-xs text-slate-300">INR {slot.price}</div>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </section>
      <aside className="glass h-fit rounded-lg p-5 shadow-glow">
        <h2 className="mb-5 flex items-center gap-2 font-display text-2xl font-black text-white">
          <ReceiptText className="h-5 w-5 text-volt" /> Reservation Summary
        </h2>
        <div className="space-y-3">
          {selected.length === 0 && <p className="rounded-md border border-line p-4 text-sm text-slate-400">Highlight open grid elements to price your booking.</p>}
          {selected.map((slot) => (
            <div key={`${slot.courtId}-${slot.startTime}`} className="rounded-md border border-line bg-midnight/70 p-3">
              <div className="flex justify-between font-bold text-white">
                <span>{slot.courtName}</span>
                <span>INR {slot.price}</span>
              </div>
              <p className="text-xs text-slate-400">{timeLabel(slot.startTime)} - {timeLabel(slot.endTime)}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 space-y-2 border-t border-line pt-5">
          <label className="flex items-center justify-between rounded-md p-2 text-sm hover:bg-court/10">
            <span>Pro paddles x2</span>
            <input type="checkbox" checked={paddles} onChange={(event) => setPaddles(event.target.checked)} />
          </label>
          <label className="flex items-center justify-between rounded-md p-2 text-sm hover:bg-court/10">
            <span>Premium ball tube</span>
            <input type="checkbox" checked={balls} onChange={(event) => setBalls(event.target.checked)} />
          </label>
        </div>
        <div className="mt-5 space-y-2 border-t border-line pt-5 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>INR {totals.subtotal}</span></div>
          <div className="flex justify-between"><span>GST and fees</span><span>INR {totals.taxes}</span></div>
          <div className="flex items-center justify-between rounded-md border border-volt/40 bg-volt/10 p-3 text-xl font-black text-volt">
            <span>Total</span><span>INR {totals.total}</span>
          </div>
        </div>
        <button className="mt-5 w-full rounded-md bg-court px-4 py-3 font-black text-white shadow-glow transition hover:bg-volt hover:text-midnight">
          Confirm Booking
        </button>
      </aside>
    </div>
  );
}
