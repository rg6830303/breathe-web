"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, ShieldOff, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";

function todayIST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function BulkBlockModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({
    slot_date: todayIST(),
    start_time: "06:00",
    end_time: "22:30",
    courts: [1, 2, 3],
    reason: "Maintenance",
    fullDay: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ inserted: number } | null>(null);

  function toggleCourt(c: number) {
    setForm((f) => ({
      ...f,
      courts: f.courts.includes(c) ? f.courts.filter((x) => x !== c) : [...f.courts, c].sort(),
    }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    setDone(null);
    try {
      if (form.courts.length === 0) throw new Error("Pick at least one court.");
      const payload: Record<string, unknown> = {
        slot_date: form.slot_date,
        courts: form.courts,
        reason: form.reason,
      };
      if (!form.fullDay) {
        payload.start_time = form.start_time;
        payload.end_time = form.end_time;
      }
      const res = await fetch("/api/admin/slots/bulk-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not block.");
      setDone({ inserted: data.inserted ?? 0 });
      toast.show(`Closed ${data.inserted ?? 0} slot${(data.inserted ?? 0) === 1 ? "" : "s"} — hidden from players`, "success");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not block.";
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
            className="w-full max-w-md overflow-hidden rounded-3xl border-2 border-ink/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0d1426]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-ink/10 bg-ink/[0.03] px-5 py-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink text-white dark:bg-white/10">
                  <ShieldOff className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Court control</p>
                  <h3 className="font-display text-base font-extrabold tracking-tight text-ink dark:text-white">Close slots</h3>
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

            <form onSubmit={onSubmit} className="grid gap-3 p-5">
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

              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border-2 border-ink/10 px-3 py-2 transition hover:border-brand/30 dark:border-white/10">
                <input
                  type="checkbox"
                  checked={form.fullDay}
                  onChange={(e) => setForm({ ...form, fullDay: e.target.checked })}
                  className="h-4 w-4 accent-brand"
                />
                <span className="text-sm font-semibold text-ink dark:text-white">Close the entire day</span>
              </label>

              {!form.fullDay && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className={labelCls}>From</span>
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                      className={inputCls}
                    />
                  </label>
                  <label className="block">
                    <span className={labelCls}>To</span>
                    <input
                      type="time"
                      value={form.end_time}
                      onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                      className={inputCls}
                    />
                  </label>
                </div>
              )}

              <div>
                <span className={labelCls}>Courts to close</span>
                <div className="flex gap-2">
                  {[1, 2, 3].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCourt(c)}
                      className={`flex-1 rounded-xl border-2 px-3 py-2.5 text-sm font-extrabold uppercase tracking-wide transition ${
                        form.courts.includes(c)
                          ? "border-brand bg-brand text-white"
                          : "border-ink/10 bg-white text-ink hover:border-brand/30 dark:border-white/10 dark:bg-[#111c38] dark:text-white"
                      }`}
                    >
                      Court {c}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className={labelCls}>Reason</span>
                <input
                  type="text"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Maintenance, holiday, private event…"
                  className={inputCls}
                />
              </label>

              {error && (
                <div role="alert" className="rounded-xl border-2 border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}
              {done && (
                <div className="rounded-xl border-2 border-lime/40 bg-lime/10 px-3 py-2 text-sm font-semibold text-lime-dark">
                  Blocked {done.inserted} slot{done.inserted === 1 ? "" : "s"}. Existing bookings were left alone.
                </div>
              )}

              <div className="mt-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-outline px-4 py-2.5 text-xs"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-dark px-5 py-2.5 text-xs disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                  Block slots
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
