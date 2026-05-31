"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Mail, RefreshCw, Send, ShieldCheck, XCircle } from "lucide-react";

type Health = {
  config: {
    gmailUserPresent: boolean;
    gmailUserTrimmedLength: number;
    gmailAppPasswordPresent: boolean;
    gmailAppPasswordCleanedLength: number;
    resolvedUserVar: string | null;
    adminEmailPresent: boolean;
  };
  smtpVerify: { ok: boolean; error?: string; code?: string; transport?: string };
  hint?: string;
};

const card = "rounded-2xl border border-brand/10 bg-white p-5 shadow-soft";

function Row({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-brand/5 py-2.5 text-sm last:border-0">
      <span className="text-ink/70">{label}</span>
      <span className={`inline-flex items-center gap-1.5 font-semibold ${ok ? "text-emerald-600" : "text-red-600"}`}>
        {ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        {detail ?? (ok ? "OK" : "Missing")}
      </span>
    </div>
  );
}

export function EmailPanel() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health/email");
      setHealth(await res.json());
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHealth(); }, []);

  async function sendTest(e: React.FormEvent) {
    e.preventDefault();
    if (!to.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim() }),
      });
      const data = await res.json();
      if (res.ok && data?.sent?.ok) {
        setResult({ ok: true, msg: `Sent via ${data.sent.transport ?? "SMTP"}. Check the inbox (and spam).` });
      } else {
        const err = data?.sent?.error || data?.error || data?.verify?.error || "Send failed.";
        setResult({ ok: false, msg: `${err}${data?.sent?.code ? ` (${data.sent.code})` : ""}` });
      }
    } catch {
      setResult({ ok: false, msg: "Request failed." });
    } finally {
      setSending(false);
    }
  }

  const verifyOk = health?.smtpVerify?.ok;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className={card}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-base font-extrabold text-ink">
            <ShieldCheck className="h-5 w-5 text-brand" /> Email health
          </h3>
          <button onClick={loadHealth} className="inline-flex items-center gap-1 rounded-lg border border-brand/15 px-2.5 py-1.5 text-xs font-bold text-ink/70 hover:bg-brand/5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-slatey"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking…</div>
        ) : !health ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">Could not load email health.</p>
        ) : (
          <>
            <div
              className={`mb-4 flex items-center gap-2 rounded-xl border p-3 text-sm font-semibold ${
                verifyOk ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {verifyOk ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              {verifyOk
                ? `SMTP connected${health.smtpVerify.transport ? ` (${health.smtpVerify.transport})` : ""}`
                : `SMTP not connected${health.smtpVerify.code ? ` — ${health.smtpVerify.code}` : ""}`}
            </div>

            <Row label="Gmail user configured" ok={health.config.gmailUserPresent} detail={health.config.resolvedUserVar ?? undefined} />
            <Row
              label="App password configured"
              ok={health.config.gmailAppPasswordPresent && health.config.gmailAppPasswordCleanedLength === 16}
              detail={health.config.gmailAppPasswordPresent ? `${health.config.gmailAppPasswordCleanedLength} chars` : "Missing"}
            />
            <Row label="Admin email set" ok={health.config.adminEmailPresent} />
            <Row label="SMTP handshake" ok={!!verifyOk} detail={verifyOk ? "Verified" : "Failed"} />

            {!verifyOk && health.smtpVerify?.error && (
              <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-600">{health.smtpVerify.error}</p>
            )}
            {health.hint && <p className="mt-3 text-xs text-slatey">{health.hint}</p>}
          </>
        )}
      </div>

      <div className={card}>
        <h3 className="mb-3 flex items-center gap-2 font-display text-base font-extrabold text-ink">
          <Mail className="h-5 w-5 text-brand" /> Send a test email
        </h3>
        <p className="mb-4 text-sm text-slatey">
          Fires a real email through the live Gmail SMTP connection so you can confirm delivery end-to-end.
        </p>
        <form onSubmit={sendTest} className="grid gap-3">
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full rounded-xl border border-brand/15 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
          />
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-glow transition hover:bg-brand-600 disabled:opacity-60"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "Sending…" : "Send test email"}
          </button>
        </form>
        {result && (
          <div className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-sm ${result.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-600"}`}>
            {result.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{result.msg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
