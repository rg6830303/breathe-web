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
      <div className="card-sport overflow-hidden bg-white dark:bg-[#111c38]">
        {/* Tape stripe accent */}
        <div aria-hidden className="tape-stripe h-1 w-full" />

        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-extrabold text-ink dark:text-white">Profile</h3>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="btn-outline py-1.5 text-xs"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          </div>

          <dl className="mt-5 grid gap-4 text-sm">
            <div className="rounded-xl border-2 border-ink/8 bg-ink/[0.02] px-4 py-3 dark:border-white/8 dark:bg-white/[0.02]">
              <dt className="text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-slatey dark:text-white/40">Name</dt>
              <dd className="mt-0.5 font-display text-base font-extrabold text-ink dark:text-white">{initialName}</dd>
            </div>
            <div className="rounded-xl border-2 border-ink/8 bg-ink/[0.02] px-4 py-3 dark:border-white/8 dark:bg-white/[0.02]">
              <dt className="text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-slatey dark:text-white/40">Email</dt>
              <dd className="mt-0.5 font-semibold text-ink dark:text-white">{email}</dd>
            </div>
            <div className="rounded-xl border-2 border-ink/8 bg-ink/[0.02] px-4 py-3 dark:border-white/8 dark:bg-white/[0.02]">
              <dt className="text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-slatey dark:text-white/40">Phone</dt>
              <dd className="mt-0.5 font-semibold text-ink dark:text-white">
                {initialPhone || <span className="text-slatey italic dark:text-white/35">Not set</span>}
              </dd>
            </div>
          </dl>

          <div className="mt-5 border-t-2 border-ink/8 pt-4 dark:border-white/8">
            <button
              type="button"
              onClick={onForgot}
              disabled={saving}
              className="text-xs font-extrabold uppercase tracking-wide text-brand hover:underline disabled:opacity-60 dark:text-brand-300"
            >
              {saving ? "Sending…" : "Email me a password reset link"}
            </button>
          </div>

          {saved && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border-2 border-lime/40 bg-lime/10 px-3 py-1.5 text-xs font-extrabold text-lime-dark">
              <Check className="h-3.5 w-3.5" /> Sent — check your inbox.
            </div>
          )}
          {error && (
            <p className="mt-3 rounded-xl border-2 border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSave} className="card-sport overflow-hidden bg-white dark:bg-[#111c38]">
      {/* Tape stripe accent */}
      <div aria-hidden className="tape-stripe h-1 w-full" />

      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-extrabold text-ink dark:text-white">Edit profile</h3>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setName(initialName);
              setPhone(initialPhone ?? "");
              setError(null);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink/10 text-ink transition hover:border-brand hover:text-brand dark:border-white/10 dark:text-white dark:hover:border-brand-300 dark:hover:text-brand-300"
            aria-label="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="block">
            <span className="mb-1.5 block text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-slatey dark:text-white/40">
              Name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border-2 border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-brand-300"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-slatey dark:text-white/40">
              Phone
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 9000000000"
              className="w-full rounded-xl border-2 border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-brand-300"
            />
          </label>

          {error && (
            <p className="rounded-xl border-2 border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full justify-center disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save changes
          </button>
        </div>
      </div>
    </form>
  );
}
