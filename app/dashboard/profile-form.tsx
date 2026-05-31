"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Pencil, X } from "lucide-react";

export function ProfileForm({
  initialName,
  initialPhone,
  email,
}: {
  initialName: string;
  initialPhone: string | null;
  email: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/player/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone: phone || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save changes.");
      setSaved(true);
      setEditing(false);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function onForgot() {
    setError(null);
    setSaving(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch {
      setError("Could not send reset email.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="rounded-3xl border border-brand/10 bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-extrabold text-ink">Profile</h3>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 rounded-full border border-brand/15 px-3 py-1.5 text-xs font-bold text-brand transition hover:bg-brand/5"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
        </div>
        <dl className="mt-4 grid gap-3 text-sm">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-slatey">Name</dt>
            <dd className="mt-0.5 font-semibold text-ink">{initialName}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-slatey">Email</dt>
            <dd className="mt-0.5 text-ink">{email}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-slatey">Phone</dt>
            <dd className="mt-0.5 text-ink">{initialPhone || <span className="text-slatey italic">Not set</span>}</dd>
          </div>
        </dl>
        <div className="mt-5 border-t border-brand/10 pt-4">
          <button
            type="button"
            onClick={onForgot}
            disabled={saving}
            className="text-xs font-semibold text-brand hover:underline disabled:opacity-60"
          >
            {saving ? "Sending…" : "Email me a password reset link"}
          </button>
        </div>
        {saved && (
          <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
            <Check className="h-3 w-3" /> Sent — check your inbox.
          </p>
        )}
        {error && <p className="mt-3 text-xs text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={onSave} className="rounded-3xl border border-brand/10 bg-white p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-extrabold text-ink">Edit profile</h3>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setName(initialName);
            setPhone(initialPhone ?? "");
            setError(null);
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-brand/15 text-ink hover:bg-brand/5"
          aria-label="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-4 grid gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slatey">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-xl border border-brand/15 bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slatey">Phone</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 9000000000"
            className="w-full rounded-xl border border-brand/15 bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>
        {error && <p className="text-xs text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand-600 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save changes
        </button>
      </div>
    </form>
  );
}
