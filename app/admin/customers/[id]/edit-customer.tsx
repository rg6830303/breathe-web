"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Save, Trash2, X } from "lucide-react";
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

  if (!open) {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-brand/20 bg-white px-3 py-2 text-xs font-bold text-brand hover:bg-brand/5"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit profile
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand/20 bg-white p-4 shadow-soft">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-bold text-slatey">
          Name
          <input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="mt-1 w-full rounded-xl border border-brand/15 px-3 py-2 text-sm font-normal text-ink outline-none focus:border-brand"
          />
        </label>
        <label className="text-xs font-bold text-slatey">
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 w-full rounded-xl border border-brand/15 px-3 py-2 text-sm font-normal text-ink outline-none focus:border-brand"
          />
        </label>
        <label className="text-xs font-bold text-slatey">
          Phone
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="mt-1 w-full rounded-xl border border-brand/15 px-3 py-2 text-sm font-normal text-ink outline-none focus:border-brand"
          />
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white shadow-glow hover:bg-brand-600 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-brand/15 px-4 py-2 text-xs font-bold text-ink/70 hover:bg-brand/5"
        >
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
      </div>
    </div>
  );
}
