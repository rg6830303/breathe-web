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

function Row({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between border-b-2 border-ink/5 py-2.5 text-sm last:border-0 dark:border-white/5">
      <span className="text-ink/60 dark:text-white/60">{label}</span>
      <span className={`inline-flex items-center gap-1.5 font-semibold ${ok ? "text-lime-dark" : "text-red-600"}`}>
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
      {/* Health panel */}
      <div className="card-sport p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <span className="eyebrow">SMTP status</span>
            <h3 className="mt-1 flex items-center gap-2 font-display text-base font-extrabold tracking-tight text-ink dark:text-white">
              <ShieldCheck className="h-5 w-5 text-brand" /> Email health
            </h3>
          </div>
          <button
            onClick={loadHealth}
            className="btn-outline px-2.5 py-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-ink/40 dark:text-white/40">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-brand" /> Checking…
          </div>
        ) : !health ? (
          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
            Could not load email health.
          </div>
        ) : (
          <>
            <div
              className={`mb-5 flex items-center gap-3 rounded-2xl border-2 p-3.5 text-sm font-bold ${
                verifyOk
                  ? "border-lime/40 bg-lime/10 text-lime-dark"
                  : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-600/40 dark:bg-amber-950/20 dark:text-amber-300"
              }`}
            >
              {verifyOk ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
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
              <div className="mt-3 rounded-xl border-2 border-red-200 bg-red-50 p-3 text-xs text-red-600">
                {health.smtpVerify.error}
              </div>
            )}
            {health.hint && <p className="mt-3 text-xs text-ink/50 dark:text-white/50">{health.hint}</p>}
          </>
        )}
      </div>

      {/* Test send */}
      <div className="card-sport p-5">
        <span className="eyebrow">Test delivery</span>
        <h3 className="mt-1 mb-2 flex items-center gap-2 font-display text-base font-extrabold tracking-tight text-ink dark:text-white">
          <Mail className="h-5 w-5 text-brand" /> Send a test email
        </h3>
        <p className="mb-5 text-sm text-ink/50 dark:text-white/50">
          Fires a real email through the live Gmail SMTP connection so you can confirm delivery end-to-end.
        </p>
        <form onSubmit={sendTest} className="grid gap-3">
          <div>
            <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Recipient email</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-xl border-2 border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 dark:border-white/15 dark:bg-[#111c38] dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="btn-primary w-full justify-center disabled:opacity-60"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "Sending…" : "Send test email"}
          </button>
        </form>
        {result && (
          <div className={`mt-4 flex items-start gap-2 rounded-xl border-2 p-3 text-sm font-semibold ${
            result.ok
              ? "border-lime/40 bg-lime/10 text-lime-dark"
              : "border-red-200 bg-red-50 text-red-600"
          }`}>
            {result.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{result.msg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
