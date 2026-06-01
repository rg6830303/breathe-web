"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Megaphone, Pencil, Plus, Trash2, X, Check } from "lucide-react";
import { AdminSubHeader } from "@/components/admin/admin-sub-header";

type Notice = {
  id: string;
  title: string;
  body: string | null;
  category: "daily" | "weekly" | "monthly";
  active: boolean;
  created_at: number;
  updated_at: number;
};

export default function AdminNoticesPage() {
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<{ title: string; body: string; category: "daily" | "weekly" | "monthly"; active: boolean }>({
    title: "",
    body: "",
    category: "daily",
    active: true,
  });

  function resetForm() {
    setForm({ title: "", body: "", category: "daily", active: true });
    setEditing(null);
    setShowForm(false);
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/notices");
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load notices.");
      setNotices(data.notices ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load notices.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const url = editing ? `/api/admin/notices/${editing.id}` : "/api/admin/notices";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save.");
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this notice?")) return;
    try {
      const res = await fetch(`/api/admin/notices/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Could not delete.");
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
    }
  }

  async function onToggle(n: Notice) {
    try {
      await fetch(`/api/admin/notices/${n.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !n.active }),
      });
      load();
    } catch (err) {
      console.error(err);
    }
  }

  function startEdit(n: Notice) {
    setEditing(n);
    setForm({
      title: n.title,
      body: n.body ?? "",
      category: n.category,
      active: n.active,
    });
    setShowForm(true);
  }

  return (
    <main className="min-h-screen bg-brand-50/30 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <AdminSubHeader
            title="Notice board"
            subtitle="Banner messages shown on the homepage and dashboard."
            icon={<Megaphone className="h-6 w-6 text-lime" />}
            actions={
              !showForm ? (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2 text-sm font-bold text-gray-900 shadow-soft transition hover:bg-lime-dark"
                >
                  <Plus className="h-4 w-4" /> New notice
                </button>
              ) : undefined
            }
          />
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {showForm && (
          <form onSubmit={onSubmit} className="mb-6 grid gap-3 rounded-3xl border border-brand/10 bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold text-ink">
                {editing ? "Edit notice" : "Create notice"}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-brand/15 text-ink hover:bg-brand/5"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slatey">Title</span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                maxLength={160}
                className="w-full rounded-xl border border-brand/15 bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slatey">Body</span>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={3}
                maxLength={2000}
                className="w-full rounded-xl border border-brand/15 bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slatey">Category</span>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as typeof form.category })}
                  className="w-full rounded-xl border border-brand/15 bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              <label className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4 rounded border-brand/30 accent-brand"
                />
                <span className="text-sm font-semibold text-ink">Active (shown publicly)</span>
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand-600 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {editing ? "Save changes" : "Publish notice"}
            </button>
          </form>
        )}

        {loading ? (
          <div className="rounded-3xl border border-brand/10 bg-white p-10 text-center text-sm text-slatey shadow-soft">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-brand" /> Loading notices…
          </div>
        ) : notices.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-brand/20 bg-brand/[0.03] p-10 text-center text-sm text-slatey">
            <Megaphone className="mx-auto mb-2 h-6 w-6 text-slatey/70" />
            No notices yet. Create your first one to broadcast on the public site.
          </div>
        ) : (
          <div className="grid gap-3">
            {notices.map((n) => (
              <div key={n.id} className="rounded-2xl border border-brand/10 bg-white p-5 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg font-extrabold text-ink">{n.title}</h3>
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
                        {n.category}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          n.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {n.active ? "Active" : "Hidden"}
                      </span>
                    </div>
                    {n.body && <p className="mt-2 text-sm text-slatey whitespace-pre-wrap">{n.body}</p>}
                    <p className="mt-2 text-[10px] text-slatey">
                      Updated {new Date(n.updated_at).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onToggle(n)}
                      className="rounded-lg border border-brand/15 px-2.5 py-1 text-[11px] font-bold text-brand hover:bg-brand/5"
                    >
                      {n.active ? "Hide" : "Show"}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(n)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand/15 text-ink hover:bg-brand/5"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(n.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
