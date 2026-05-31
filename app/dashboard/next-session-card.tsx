"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, MapPin } from "lucide-react";
import { CancelBookingButton } from "./cancel-button";

type Props = {
  bookingId: string;
  slotDate: string;
  slotTime: string;
  endTime: string;
  courtNumber: number;
  total: number;
};

function diff(now: number, then: number) {
  const ms = then - now;
  if (ms <= 0) return "Starting now";
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const minutes = totalMin % 60;
  if (days >= 1) return `${days}d ${hours}h`;
  if (hours >= 1) return `${hours}h ${minutes}m`;
  return `${minutes} minutes`;
}

export function NextSessionCard({
  bookingId,
  slotDate,
  slotTime,
  endTime,
  courtNumber,
  total,
}: Props) {
  const slotMs = new Date(`${slotDate}T${slotTime}:00+05:30`).getTime();
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const canCancel = slotMs - now >= 4 * 60 * 60 * 1000;
  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${slotDate}T00:00:00`));

  function format12(hhmm: string) {
    const [h, m] = hhmm.split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-brand/15 bg-gradient-to-br from-brand-50 via-white to-brand-50/50 shadow-soft">
      <div className="grid gap-4 p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand text-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
            <Clock3 className="h-3 w-3" /> Next session in {diff(now, slotMs)}
          </span>
          <h2 className="mt-3 font-display text-2xl font-extrabold text-ink sm:text-3xl">{dateLabel}</h2>
          <p className="mt-1 text-sm text-slatey">
            {format12(slotTime)} – {format12(endTime)} · Court {courtNumber} · ₹{total.toLocaleString("en-IN")}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-slatey">
            <MapPin className="h-3.5 w-3.5 text-brand" />
            Panchawati Complex, Kaikhali, Kolkata 700052
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2 md:items-end">
          <Link
            href={`/dashboard?booking=${bookingId}`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand-600"
          >
            View receipt <ArrowRight className="h-4 w-4" />
          </Link>
          <CancelBookingButton
            bookingId={bookingId}
            disabled={!canCancel}
            disabledReason={!canCancel ? "Closes 4h before" : undefined}
          />
        </div>
      </div>
    </div>
  );
}
