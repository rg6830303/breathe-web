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
            className="w-full max-w-md overflow-hidden rounded-3xl border border-brand/10 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-brand/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShieldOff className="h-5 w-5 text-brand" />
                <h3 className="font-display text-lg font-extrabold text-ink">Close slots</h3>
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

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.fullDay}
                  onChange={(e) => setForm({ ...form, fullDay: e.target.checked })}
                  className="h-4 w-4 accent-brand"
                />
                <span className="text-sm font-semibold text-ink">Close the entire day</span>
              </label>

              {!form.fullDay && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slatey">From</span>
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                      className="w-full rounded-xl border border-brand/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slatey">To</span>
                    <input
                      type="time"
                      value={form.end_time}
                      onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                      className="w-full rounded-xl border border-brand/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                    />
                  </label>
                </div>
              )}

              <div>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slatey">Courts</span>
                <div className="flex gap-2">
                  {[1, 2, 3].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCourt(c)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                        form.courts.includes(c)
                          ? "border-brand bg-brand text-white"
                          : "border-brand/15 bg-white text-ink hover:bg-brand/5"
                      }`}
                    >
                      Court {c}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slatey">Reason</span>
                <input
                  type="text"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Maintenance, holiday, private event…"
                  className="w-full rounded-xl border border-brand/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                />
              </label>

              {error && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              {done && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Blocked {done.inserted} slot{done.inserted === 1 ? "" : "s"}. Existing bookings were left alone.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-brand/15 px-4 py-2 text-sm font-bold text-ink hover:bg-brand/5"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2 text-sm font-bold text-white shadow-soft transition hover:bg-ink/85 disabled:opacity-60"
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
