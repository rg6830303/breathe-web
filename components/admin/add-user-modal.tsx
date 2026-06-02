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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/50 p-4 backdrop-blur-sm sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-brand/10 bg-white p-6 shadow-card"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
                <UserPlus className="h-5 w-5 text-brand" /> Add a user (offline)
              </h3>
              <button onClick={onClose} aria-label="Close" className="text-slatey hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-xs text-slatey">
              Manually register a walk-in / phone member. Leave the password blank and they can use “Forgot password” to set their own.
            </p>
            <form onSubmit={submit} className="grid gap-3">
              <input required placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="rounded-xl border border-brand/15 px-3 py-2.5 text-sm outline-none focus:border-brand" />
              <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl border border-brand/15 px-3 py-2.5 text-sm outline-none focus:border-brand" />
              <input placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl border border-brand/15 px-3 py-2.5 text-sm outline-none focus:border-brand" />
              <input type="text" placeholder="Temp password (optional)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="rounded-xl border border-brand/15 px-3 py-2.5 text-sm outline-none focus:border-brand" />
              <button type="submit" disabled={saving} className="mt-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-glow hover:bg-brand-600 disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Add user
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
