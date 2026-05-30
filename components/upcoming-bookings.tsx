"use client";

import { useState, useTransition } from "react";
import { Calendar, Clock, X } from "lucide-react";

export type UpcomingBooking = {
  id: number;
  courtId: number;
  startTime: string;
  endTime: string;
  totalAmount: number;
  status: string;
};

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

export function UpcomingBookings({ initial }: { initial: UpcomingBooking[] }) {
  const [bookings, setBookings] = useState(initial);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    setConfirmingId(null);
    setReason("");
    setError(null);
  }

  function doCancel(id: number) {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id, reason: reason || undefined }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || "Couldn't cancel right now. Try again.");
        return;
      }
      setBookings((current) => current.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)));
      close();
    });
  }

  if (bookings.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-brand/20 bg-brand/[0.03] p-6 text-sm text-slatey">
        No upcoming bookings — head to <a href="/book" className="font-bold text-brand hover:underline">/book</a> to reserve a court.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((b) => {
        const startsIn = new Date(b.startTime).getTime() - Date.now();
        const freeCancel = startsIn >= FOUR_HOURS_MS;
        const cancelled = b.status === "cancelled";
        return (
          <div
            key={b.id}
            className={`flex flex-col gap-3 rounded-3xl border border-brand/10 bg-white p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between ${
              cancelled ? "opacity-60" : ""
            }`}
          >
            <div>
              <div className="font-display text-base font-bold text-ink">Court {b.courtId}</div>
              <div className="mt-1 flex items-center gap-3 text-xs text-slatey">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(b.startTime).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(b.startTime).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} –{" "}
                  {new Date(b.endTime).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                </span>
                <span className="font-bold text-brand">₹{b.totalAmount}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {cancelled ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slatey">Cancelled</span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingId(b.id)}
                  className="rounded-full border border-brand/20 px-4 py-2 text-xs font-bold text-brand transition hover:bg-brand/5"
                  aria-label={`Cancel booking for Court ${b.courtId}`}
                >
                  Cancel booking
                </button>
              )}
            </div>
          </div>
        );
      })}

      {confirmingId !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-extrabold text-ink">Cancel this booking?</h3>
                <p className="mt-1 text-sm text-slatey">
                  Free cancellation up to 4 hours before your slot. After that, no refund.
                </p>
              </div>
              <button onClick={close} aria-label="Close" className="rounded-full p-1.5 hover:bg-brand/5">
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-4 block text-xs font-bold text-ink">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Helps us improve scheduling"
              className="mt-1 w-full rounded-xl border border-brand/15 px-3 py-2 text-sm outline-none focus:border-brand"
            />

            {error && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                {error}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-full border border-brand/20 px-4 py-2 text-sm font-bold text-ink/70 hover:bg-brand/5"
              >
                Keep booking
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => doCancel(confirmingId)}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-soft hover:bg-red-700 disabled:opacity-60"
              >
                {isPending ? "Cancelling…" : "Cancel booking"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
