"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, UserPlus, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";

const TIMES: string[] = (() => {
  const out: string[] = [];
  for (let m = 6 * 60; m <= 22 * 60 + 30; m += 30) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    out.push(`${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
  }
  return out;
})();

function todayIST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function WalkInModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({
    slot_date: todayIST(),
    slot_time: "18:00",
    court_number: 1,
    duration_min: 60,
    guest_name: "",
    guest_phone: "",
    guest_email: "",
    amount: 700,
    notes: "",
    notify_guest: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/bookings/walk-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          court_number: Number(form.court_number),
          duration_min: Number(form.duration_min),
          amount: Number(form.amount),
          guest_email: form.guest_email || undefined,
          guest_phone: form.guest_phone || undefined,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create booking.");
      toast.show(`Walk-in booked: ${form.guest_name || "guest"} on Court ${form.court_number}`, "success");
      router.refresh();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not create booking.";
      setError(msg);
      toast.show(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-brand/10 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-brand/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-brand" />
                <h3 className="font-display text-lg font-extrabold text-ink">Walk-in booking</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-brand/15 text-ink hover:bg-brand/5"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="grid gap-3 p-5">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slatey">Date</span>
                  <input
                    type="date"
                    value={form.slot_date}
                    onChange={(e) => setForm({ ...form, slot_date: e.target.value })}
                    required
                    className="w-full rounded-xl border border-brand/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slatey">Time</span>
                  <select
                    value={form.slot_time}
                    onChange={(e) => setForm({ ...form, slot_time: e.target.value })}
                    className="w-full rounded-xl border border-brand/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                  >
                    {TIMES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slatey">Court</span>
                  <select
                    value={form.court_number}
                    onChange={(e) => setForm({ ...form, court_number: Number(e.target.value) })}
                    className="w-full rounded-xl border border-brand/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                  >
                    <option value={1}>Court 1</option>
                    <option value={2}>Court 2</option>
                    <option value={3}>Court 3</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slatey">Duration</span>
                  <select
                    value={form.duration_min}
                    onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })}
                    className="w-full rounded-xl border border-brand/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                  >
                    <option value={30}>30 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                    <option value={120}>120 min</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slatey">Amount (₹)</span>
                  <input
                    type="number"
                    min={0}
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    className="w-full rounded-xl border border-brand/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slatey">Guest name</span>
                <input
                  type="text"
                  required
                  value={form.guest_name}
                  onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
                  className="w-full rounded-xl border border-brand/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slatey">Phone</span>
                  <input
                    type="tel"
                    value={form.guest_phone}
                    onChange={(e) => setForm({ ...form, guest_phone: e.target.value })}
                    className="w-full rounded-xl border border-brand/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slatey">Email (optional)</span>
                  <input
                    type="email"
                    value={form.guest_email}
                    onChange={(e) => setForm({ ...form, guest_email: e.target.value })}
                    className="w-full rounded-xl border border-brand/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slatey">Notes</span>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Cash payment, paid in advance"
                  className="w-full rounded-xl border border-brand/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                />
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.notify_guest}
                  onChange={(e) => setForm({ ...form, notify_guest: e.target.checked })}
                  className="h-4 w-4 accent-brand"
                />
                <span className="text-xs font-semibold text-ink">
                  Email confirmation + PDF invoice to guest{" "}
                  <span className="text-slatey">(requires email above)</span>
                </span>
              </label>

              {error && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-brand/15 px-4 py-2 text-sm font-bold text-ink hover:bg-brand/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-bold text-white shadow-glow transition hover:bg-brand-600 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Create booking
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
