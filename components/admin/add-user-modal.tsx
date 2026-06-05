"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, UserPlus, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function AddUserModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, password: form.password || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add user.");
      toast.show(`User added: ${form.full_name}`, "success");
      setForm({ full_name: "", email: "", phone: "", password: "" });
      onAdded();
      onClose();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not add user.", "error");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-xl border-2 border-ink/10 bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-brand dark:border-white/15 dark:bg-[#111c38] dark:text-white";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/60 p-4 sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-3xl border-2 border-ink/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0d1426]"
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b-2 border-ink/10 bg-ink/[0.03] px-5 py-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white">
                  <UserPlus className="h-4 w-4" />
                </span>
                <h3 className="font-display text-base font-extrabold uppercase tracking-tight text-ink dark:text-white">
                  Add member (offline)
                </h3>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-ink/10 text-ink/50 transition hover:border-ink/30 hover:text-ink dark:border-white/10 dark:text-white/50 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              <p className="mb-4 text-xs text-ink/50 dark:text-white/50">
                Manually register a walk-in / phone member. Leave the password blank and they can use "Forgot password" to set their own.
              </p>
              <form onSubmit={submit} className="grid gap-3">
                <div>
                  <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Full name</label>
                  <input required placeholder="e.g. Rahul Gupta" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Email</label>
                  <input required type="email" placeholder="rahul@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Phone (optional)</label>
                  <input placeholder="+91 98765 43210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Temp password (optional)</label>
                  <input type="text" placeholder="Leave blank for self-serve reset" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} />
                </div>
                <div className="mt-1 flex gap-2">
                  <button type="button" onClick={onClose} className="btn-outline flex-1 justify-center py-2.5 text-xs">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center py-2.5 text-xs disabled:opacity-60">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Add user
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
