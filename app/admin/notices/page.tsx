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

  const inputCls = "w-full rounded-xl border-2 border-ink/10 bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 dark:border-white/10 dark:bg-[#111c38] dark:text-white";
  const labelCls = "mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50";

  return (
    <main className="min-h-screen-safe bg-brand-50/30 px-4 py-8 dark:bg-ink sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <AdminSubHeader
            title="Notice board"
            subtitle="Banner messages shown on the homepage and dashboard."
            icon={<Megaphone className="h-5 w-5 text-lime" />}
            actions={
              !showForm ? (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="btn-accent px-4 py-2 text-sm"
                >
                  <Plus className="h-4 w-4" /> New notice
                </button>
              ) : undefined
            }
          />
        </div>

        {error && (
          <div role="alert" className="mb-5 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Create / edit form */}
        {showForm && (
          <form onSubmit={onSubmit} className="card-sport mb-6 p-6">
            <div className="mb-4 flex items-center justify-between border-b-2 border-ink/10 pb-4 dark:border-white/10">
              <div>
                <span className="eyebrow">{editing ? "Edit" : "Create"}</span>
                <h2 className="mt-1 font-display text-lg font-extrabold tracking-tight text-ink dark:text-white">
                  {editing ? "Edit notice" : "Create notice"}
                </h2>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-ink/10 text-ink/50 hover:border-ink/30 hover:text-ink dark:border-white/10 dark:text-white/50 dark:hover:text-white"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid gap-4">
              <label className="block">
                <span className={labelCls}>Title</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  maxLength={160}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Body</span>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={3}
                  maxLength={2000}
                  className={inputCls}
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className={labelCls}>Category</span>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as typeof form.category })}
                    className={inputCls}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </label>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border-2 border-ink/10 px-3 py-2 transition hover:border-brand/30 dark:border-white/10" style={{ marginTop: "1.625rem" }}>
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="h-4 w-4 rounded border-ink/20 accent-brand"
                  />
                  <span className="text-sm font-semibold text-ink dark:text-white">Active (shown publicly)</span>
                </label>
              </div>
            </div>

            <div className="mt-5 flex">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editing ? "Save changes" : "Publish notice"}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex items-center justify-center rounded-3xl border-2 border-ink/10 bg-white p-10 text-sm text-ink/40 dark:border-white/10 dark:bg-[#111c38] dark:text-white/40">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-brand" /> Loading notices…
          </div>
        ) : notices.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-ink/10 p-10 text-center dark:border-white/10">
            <Megaphone className="mx-auto mb-3 h-8 w-8 text-ink/30 dark:text-white/30" />
            <p className="text-sm font-semibold text-ink/50 dark:text-white/50">
              No notices yet. Create your first one to broadcast on the public site.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {notices.map((n) => (
              <div key={n.id} className="card-sport p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base font-extrabold tracking-tight text-ink dark:text-white">{n.title}</h3>
                      <span className="tag-sport capitalize">{n.category}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                          n.active
                            ? "bg-lime/20 text-lime-dark"
                            : "bg-ink/10 text-ink/50 dark:bg-white/10 dark:text-white/50"
                        }`}
                      >
                        {n.active ? "Active" : "Hidden"}
                      </span>
                    </div>
                    {n.body && <p className="mt-2 text-sm text-ink/60 dark:text-white/60 whitespace-pre-wrap">{n.body}</p>}
                    <p className="mt-2 text-[10px] font-semibold text-ink/40 dark:text-white/40">
                      Updated {new Date(n.updated_at).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onToggle(n)}
                      className="btn-outline px-2.5 py-1.5 text-xs"
                    >
                      {n.active ? "Hide" : "Show"}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(n)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-ink/10 text-ink/60 transition hover:border-brand/30 hover:text-brand dark:border-white/10 dark:text-white/60 dark:hover:text-brand-300"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(n.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-red-200 text-red-600 transition hover:bg-red-50"
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
