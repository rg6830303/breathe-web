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
    sport: "pickleball",
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

  const inputCls = "w-full rounded-xl border-2 border-ink/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand dark:border-white/15 dark:bg-[#111c38] dark:text-white";
  const labelCls = "mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-3xl border-2 border-ink/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0d1426]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-ink/10 bg-ink/[0.03] px-5 py-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white">
                  <UserPlus className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand dark:text-brand-300">New booking</p>
                  <h3 className="font-display text-base font-extrabold tracking-tight text-ink dark:text-white">Walk-in booking</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-ink/10 text-ink/50 transition hover:border-ink/30 hover:text-ink dark:border-white/10 dark:text-white/50 dark:hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="grid gap-3 overflow-y-auto p-5" style={{ maxHeight: "calc(100vh - 160px)" }}>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={labelCls}>Date</span>
                  <input
                    type="date"
                    value={form.slot_date}
                    onChange={(e) => setForm({ ...form, slot_date: e.target.value })}
                    required
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className={labelCls}>Time</span>
                  <select
                    value={form.slot_time}
                    onChange={(e) => setForm({ ...form, slot_time: e.target.value })}
                    className={inputCls}
                  >
                    {TIMES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={labelCls}>Sport</span>
                  <select
                    value={form.sport}
                    onChange={(e) => {
                      const nextSport = e.target.value as "pickleball" | "badminton" | "cricket";
                      setForm({
                        ...form,
                        sport: nextSport,
                        court_number: nextSport === "pickleball" ? form.court_number : 1,
                      });
                    }}
                    className={inputCls}
                  >
                    <option value="pickleball">🎾 Pickleball</option>
                    <option value="badminton">🏸 Badminton</option>
                    <option value="cricket">🏏 Cricket</option>
                  </select>
                </label>
                <label className="block">
                  <span className={labelCls}>Court</span>
                  <select
                    value={form.sport === "pickleball" ? form.court_number : 1}
                    onChange={(e) => setForm({ ...form, court_number: Number(e.target.value) })}
                    disabled={form.sport !== "pickleball"}
                    className={`${inputCls} disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    <option value={1}>Court 1</option>
                    <option value={2}>Court 2</option>
                    <option value={3}>Court 3</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={labelCls}>Duration</span>
                  <select
                    value={form.duration_min}
                    onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })}
                    className={inputCls}
                  >
                    <option value={30}>30 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                    <option value={120}>120 min</option>
                  </select>
                </label>
                <label className="block">
                  <span className={labelCls}>Amount (₹)</span>
                  <input
                    type="number"
                    min={0}
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    className={inputCls}
                  />
                </label>
              </div>

              <label className="block">
                <span className={labelCls}>Guest name</span>
                <input
                  type="text"
                  required
                  value={form.guest_name}
                  onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
                  className={inputCls}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={labelCls}>Phone</span>
                  <input
                    type="tel"
                    value={form.guest_phone}
                    onChange={(e) => setForm({ ...form, guest_phone: e.target.value })}
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className={labelCls}>Email (optional)</span>
                  <input
                    type="email"
                    value={form.guest_email}
                    onChange={(e) => setForm({ ...form, guest_email: e.target.value })}
                    className={inputCls}
                  />
                </label>
              </div>

              <label className="block">
                <span className={labelCls}>Notes</span>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Cash payment, paid in advance"
                  className={inputCls}
                />
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.notify_guest}
                  onChange={(e) => setForm({ ...form, notify_guest: e.target.checked })}
                  className="h-4 w-4 accent-brand"
                />
                <span className="text-xs font-semibold text-ink dark:text-white">
                  Email confirmation + PDF invoice to guest{" "}
                  <span className="text-ink/50 dark:text-white/50">(requires email above)</span>
                </span>
              </label>

              {error && (
                <div role="alert" className="rounded-xl border-2 border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-outline px-4 py-2.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary px-5 py-2.5 text-xs disabled:opacity-60"
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
