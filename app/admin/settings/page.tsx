"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Settings as SettingsIcon, ShieldCheck, Check } from "lucide-react";
import { AdminSubHeader } from "@/components/admin/admin-sub-header";

type Config = Record<string, string>;

const FIELD_LABELS: Record<string, string> = {
  total_courts: "Total courts",
  slot_duration_min: "Slot duration (min)",
  open_time: "Open time (24h)",
  close_time: "Close time (24h)",
  default_price: "Default price (₹)",
  prime_price: "Prime price (₹)",
  prime_start: "Prime start (24h)",
  prime_end: "Prime end (24h)",
};

const NUMERIC_FIELDS = new Set(["total_courts", "slot_duration_min", "default_price", "prime_price"]);
const TIME_FIELDS = new Set(["open_time", "close_time", "prime_start", "prime_end"]);

export default function AdminSettingsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<Config>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/admin/config")
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/admin/login");
          return null;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load settings.");
        return data;
      })
      .then((data) => {
        if (data?.config) setConfig(data.config);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load settings."))
      .finally(() => setLoading(false));
  }, [router]);

  async function saveConfig(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save.");
      setSuccess("Settings saved.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);

    if (pwForm.next.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError("Passwords do not match.");
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not change password.");
      setPwForm({ current: "", next: "", confirm: "" });
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 4000);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Could not change password.");
    } finally {
      setPwSaving(false);
    }
  }

  const FIELD_KEYS = Object.keys(FIELD_LABELS);

  return (
    <main className="min-h-screen bg-brand-50/30 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <AdminSubHeader title="Settings" subtitle="Venue configuration and admin account." icon={<SettingsIcon className="h-6 w-6 text-lime" />} />
        </div>

        {loading ? (
          <div className="rounded-3xl border border-brand/10 bg-white p-10 text-center text-sm text-slatey shadow-soft">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-brand" /> Loading settings…
          </div>
        ) : (
          <>
            <form onSubmit={saveConfig} className="rounded-3xl border border-brand/10 bg-white p-6 shadow-soft">
              <h2 className="font-display text-lg font-extrabold text-ink">Venue configuration</h2>
              <p className="text-xs text-slatey">Used by the booking grid and pricing engine.</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {FIELD_KEYS.map((key) => (
                  <label key={key} className="block">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slatey">
                      {FIELD_LABELS[key]}
                    </span>
                    <input
                      type={TIME_FIELDS.has(key) ? "time" : NUMERIC_FIELDS.has(key) ? "number" : "text"}
                      value={config[key] ?? ""}
                      onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                      className="w-full rounded-xl border border-brand/15 bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                  </label>
                ))}
              </div>

              {error && (
                <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  <Check className="h-3 w-3" /> {success}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand-600 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save settings
              </button>
            </form>

            <form onSubmit={savePassword} className="mt-6 rounded-3xl border border-brand/10 bg-white p-6 shadow-soft">
              <h2 className="font-display text-lg font-extrabold text-ink">
                <ShieldCheck className="mr-2 inline h-5 w-5 text-brand" /> Change admin password
              </h2>
              <p className="text-xs text-slatey">8+ characters. You&apos;ll stay signed in after the change.</p>

              <div className="mt-5 grid gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slatey">Current password</span>
                  <input
                    type="password"
                    value={pwForm.current}
                    onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-brand/15 bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slatey">New password</span>
                  <input
                    type="password"
                    value={pwForm.next}
                    onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-brand/15 bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slatey">Confirm new password</span>
                  <input
                    type="password"
                    value={pwForm.confirm}
                    onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-brand/15 bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </label>
              </div>

              {pwError && (
                <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {pwError}
                </div>
              )}
              {pwSuccess && (
                <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  <Check className="h-3 w-3" /> Password updated.
                </div>
              )}

              <button
                type="submit"
                disabled={pwSaving}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-ink/85 disabled:opacity-60"
              >
                {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Update password
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
