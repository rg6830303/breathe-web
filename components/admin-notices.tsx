"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";

export type AdminNotice = {
  id: string;
  title: string;
  body: string | null;
  category: "daily" | "weekly" | "monthly";
  active: boolean;
  created_at: string;
};

const field = "rounded-xl border border-brand/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand";

export function AdminNotices({ initial }: { initial: AdminNotice[] }) {
  const [notices, setNotices] = useState(initial);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<AdminNotice["category"]>("daily");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function create() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, category }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload.error || "Couldn't publish notice.");
        return;
      }
      setNotices((current) => [payload.notice as AdminNotice, ...current]);
      setTitle("");
      setBody("");
    });
  }

  function toggle(id: string, active: boolean) {
    setNotices((current) => current.map((n) => (n.id === id ? { ...n, active } : n)));
    startTransition(async () => {
      await fetch("/api/notices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active }),
      });
    });
  }

  function remove(id: string) {
    setNotices((current) => current.filter((n) => n.id !== id));
    startTransition(async () => {
      await fetch("/api/notices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      {/* Create */}
      <div className="rounded-3xl border border-brand/10 bg-white p-6 shadow-soft">
        <h3 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
          <Plus className="h-5 w-5 text-brand" /> New notice
        </h3>
        <div className="mt-4 grid gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className={field}
            aria-label="Notice title"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Body"
            className={field}
            aria-label="Notice body"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as AdminNotice["category"])}
            className={field}
            aria-label="Notice category"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={create}
            disabled={isPending}
            className="rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-glow transition hover:bg-brand-600 disabled:opacity-60"
          >
            {isPending ? "Publishing…" : "Publish notice"}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="rounded-3xl border border-brand/10 bg-white p-6 shadow-soft">
        <h3 className="font-display text-lg font-extrabold text-ink">All notices</h3>
        <div className="mt-4 max-h-[480px] space-y-3 overflow-y-auto pr-1">
          {notices.length === 0 && <p className="text-sm text-slatey">No notices yet — publish the first one.</p>}
          {notices.map((n) => (
            <div key={n.id} className="rounded-2xl border border-brand/10 bg-brand/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-brand">
                      {n.category}
                    </span>
                    {!n.active && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-slatey">
                        Hidden
                      </span>
                    )}
                  </div>
                  <h4 className="mt-1 font-bold text-ink">{n.title}</h4>
                  {n.body && <p className="mt-1 text-sm text-slatey">{n.body}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-1 text-xs font-bold text-ink">
                    <input
                      type="checkbox"
                      checked={n.active}
                      onChange={(e) => toggle(n.id, e.target.checked)}
                      className="h-4 w-4 accent-brand"
                    />
                    Active
                  </label>
                  <button
                    type="button"
                    onClick={() => remove(n.id)}
                    aria-label={`Delete ${n.title}`}
                    className="rounded-full p-2 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
