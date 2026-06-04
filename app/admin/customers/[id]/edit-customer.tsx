"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Loader2, Pencil, Save, Trash2, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function EditCustomer({
  id,
  initial,
}: {
  id: string;
  initial: { full_name: string; email: string; phone: string | null };
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    full_name: initial.full_name,
    email: initial.email,
    phone: initial.phone ?? "",
  });

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save.");
      toast.show("Customer updated", "success");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not save.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function grantPass() {
    if (!confirm("Grant a 12-Hour Bulk Pass to this customer (offline sale)?")) return;
    try {
      const res = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: id, grantPackage: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not grant.");
      toast.show(`12-hour pass added. Balance: ${Math.round((data.balanceMin / 60) * 10) / 10}h`, "success");
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not grant.", "error");
    }
  }

  async function remove() {
    if (!confirm(`Delete ${initial.full_name}? This removes the user and all their bookings. This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/customers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not delete.");
      toast.show("Customer deleted", "success");
      router.push("/admin");
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not delete.", "error");
      setDeleting(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border-2 border-ink/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand dark:border-white/10 dark:bg-[#111c38] dark:text-white";

  if (!open) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-outline px-3 py-2 text-xs"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit profile
        </button>
        <button
          type="button"
          onClick={grantPass}
          className="btn-accent px-3 py-2 text-xs"
        >
          <Clock className="h-3.5 w-3.5" /> Grant 12h pass
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-red-200 bg-white px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/20"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete
        </button>
      </div>
    );
  }

  return (
    <div className="card-sport w-full p-5">
      <span className="eyebrow">Edit profile</span>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-extrabold uppercase tracking-wide text-ink/50 dark:text-white/50">
          Name
          <input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className={`mt-1 ${inputCls}`}
          />
        </label>
        <label className="text-xs font-extrabold uppercase tracking-wide text-ink/50 dark:text-white/50">
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={`mt-1 ${inputCls}`}
          />
        </label>
        <label className="text-xs font-extrabold uppercase tracking-wide text-ink/50 dark:text-white/50">
          Phone
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={`mt-1 ${inputCls}`}
          />
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="btn-primary px-4 py-2 text-xs disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-outline px-4 py-2 text-xs"
        >
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
      </div>
    </div>
  );
}
