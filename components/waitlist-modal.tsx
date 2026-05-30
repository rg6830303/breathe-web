"use client";

import { useState, useTransition } from "react";
import { Bell, X } from "lucide-react";

export type WaitlistTarget = {
  courtId: number;
  courtName: string;
  startTime: string; // ISO
  endTime: string;   // ISO (unused but kept for symmetry)
};

/** Small modal for joining the waitlist on a booked slot. Email-only — we
 *  don't require the user to have an account so passers-by can still queue. */
export function WaitlistModal({ target, onClose }: { target: WaitlistTarget; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const dt = new Date(target.startTime);
    const pad = (n: number) => n.toString().padStart(2, "0");
    const slotDate = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    const slotTime = `${pad(dt.getHours())}:${pad(dt.getMinutes())}:00`;
    startTransition(async () => {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtId: target.courtId,
          slotDate,
          slotTime,
          playerEmail: email,
          playerName: name || undefined,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || "Couldn't join the waitlist. Try again.");
        return;
      }
      setDone(true);
    });
  }

  const timeLabel = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(target.startTime));
  const dateLabel = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(new Date(target.startTime));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
              <Bell className="h-5 w-5 text-brand" /> Notify me when free
            </h3>
            <p className="mt-1 text-sm text-slatey">
              We'll email you the second {target.courtName} opens up on {dateLabel} at {timeLabel}.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 hover:bg-brand/5">
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="mt-5 rounded-2xl border border-brand/20 bg-brand/5 p-4 text-sm text-ink">
            You're on the waitlist. We'll email <strong>{email}</strong> if this slot frees up.
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <label className="mt-4 block text-xs font-bold text-ink">Email</label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="mt-1 w-full rounded-xl border border-brand/15 px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <label className="mt-3 block text-xs font-bold text-ink">Name (optional)</label>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="So we can greet you"
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
                onClick={onClose}
                className="rounded-full border border-brand/20 px-4 py-2 text-sm font-bold text-ink/70 hover:bg-brand/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || !email}
                onClick={submit}
                className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white shadow-soft hover:bg-brand-600 disabled:opacity-60"
              >
                {isPending ? "Joining…" : "Notify me"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
