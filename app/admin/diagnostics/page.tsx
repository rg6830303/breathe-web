"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  X,
  Activity,
} from "lucide-react";
import { AdminSubHeader } from "@/components/admin/admin-sub-header";

type HealthResp = {
  config: {
    gmailUserPresent: boolean;
    gmailUserTrimmedLength: number;
    gmailUserHasSpaces: boolean;
    gmailAppPasswordPresent: boolean;
    gmailAppPasswordCleanedLength: number;
    gmailAppPasswordHadSpaces: boolean;
    adminEmailPresent: boolean;
    fromOverridePresent: boolean;
  };
  smtpVerify: { ok: boolean; error?: string; code?: string };
  expectedAppPasswordLength: number;
  hint?: string;
};

type SendResp = {
  ok: boolean;
  to?: string;
  messageId?: string;
  error?: string;
  code?: string;
  accepted?: string[];
  rejected?: string[];
};

function Row({ label, ok, value }: { label: string; ok?: boolean; value?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b-2 border-ink/5 py-2.5 text-sm last:border-0 dark:border-white/5">
      <span className="text-ink/60 dark:text-white/60">{label}</span>
      <span className="flex items-center gap-2 font-mono text-ink dark:text-white">
        {value}
        {ok === true && <Check className="h-4 w-4 text-lime-dark" />}
        {ok === false && <X className="h-4 w-4 text-red-600" />}
      </span>
    </div>
  );
}

export default function DiagnosticsPage() {
  const router = useRouter();
  const [health, setHealth] = useState<HealthResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendTo, setSendTo] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [sendResult, setSendResult] = useState<SendResp | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setAuthError(null);
    try {
      // Use the admin-only endpoint so we also verify the admin session works.
      const r = await fetch("/api/admin/test-email", { method: "GET" });
      if (r.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = (await r.json()) as HealthResp & { signedInAs?: string };
      setHealth(data);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Could not load diagnostics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSendBusy(true);
    setSendResult(null);
    try {
      const r = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: sendTo || undefined }),
      });
      const data = (await r.json()) as SendResp;
      setSendResult(data);
    } catch (err) {
      setSendResult({ ok: false, error: err instanceof Error ? err.message : "Network error." });
    } finally {
      setSendBusy(false);
    }
  }

  const c = health?.config;
  const v = health?.smtpVerify;
  const allGood =
    !!c?.gmailUserPresent &&
    !!c?.gmailAppPasswordPresent &&
    c?.gmailAppPasswordCleanedLength === 16 &&
    v?.ok === true;

  return (
    <main className="app-surface min-h-screen-safe bg-brand-50/30 px-4 py-8 dark:bg-ink sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <AdminSubHeader
          title="Email diagnostics"
          subtitle="Live status of the Gmail SMTP transport used for password resets, booking confirmations, and admin notifications."
          icon={<Activity className="h-5 w-5 text-lime" />}
          actions={
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-white/20 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white transition hover:border-lime hover:text-lime"
              aria-label="Reload"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          }
        />

        {authError && (
          <div className="flex items-start gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {authError}
          </div>
        )}

        {loading && !health ? (
          <div className="flex items-center justify-center rounded-3xl border-2 border-ink/10 bg-white p-10 text-sm text-ink/40 dark:border-white/10 dark:bg-[#111c38] dark:text-white/40">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-brand" /> Querying SMTP…
          </div>
        ) : health ? (
          <div className="space-y-6">
            {/* Status banner */}
            <div
              className={`overflow-hidden rounded-3xl border-2 p-5 ${
                allGood
                  ? "border-lime/40 bg-lime/10"
                  : "border-amber-300 bg-amber-50 dark:border-amber-600/30 dark:bg-amber-950/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <Mail className={`h-8 w-8 ${allGood ? "text-lime-dark" : "text-amber-600 dark:text-amber-400"}`} />
                <div>
                  <div className="font-display text-lg font-extrabold tracking-tight text-ink dark:text-white">
                    {allGood ? "Mailer healthy" : "Mailer not ready"}
                  </div>
                  <div className="text-xs text-ink/60 dark:text-white/60">{health.hint}</div>
                </div>
              </div>
            </div>

            {/* Config */}
            <section className="card-sport p-5">
              <span className="eyebrow">Environment</span>
              <h2 className="mt-1 mb-4 font-display text-base font-extrabold tracking-tight text-ink dark:text-white">
                Configuration
              </h2>
              <Row label="GMAIL_USER set" ok={c?.gmailUserPresent} value={c?.gmailUserPresent ? "✓" : "missing"} />
              <Row
                label="GMAIL_USER trimmed length"
                value={c?.gmailUserTrimmedLength}
                ok={!!c?.gmailUserPresent && !c.gmailUserHasSpaces}
              />
              {c?.gmailUserHasSpaces && (
                <Row label="⚠ GMAIL_USER has leading/trailing whitespace" ok={false} value="trimmed for send" />
              )}
              <Row
                label="GMAIL_APP_PASSWORD set"
                ok={c?.gmailAppPasswordPresent}
                value={c?.gmailAppPasswordPresent ? "✓" : "missing"}
              />
              <Row
                label="GMAIL_APP_PASSWORD cleaned length"
                value={c?.gmailAppPasswordCleanedLength}
                ok={c?.gmailAppPasswordCleanedLength === 16}
              />
              {c?.gmailAppPasswordHadSpaces && (
                <Row label="⚠ GMAIL_APP_PASSWORD had spaces" ok={false} value="stripped for send" />
              )}
              <Row label="ADMIN_EMAIL set" ok={c?.adminEmailPresent} value={c?.adminEmailPresent ? "✓" : "missing"} />
            </section>

            {/* SMTP verify */}
            <section className="card-sport p-5">
              <span className="eyebrow">Connection</span>
              <h2 className="mt-1 mb-4 font-display text-base font-extrabold tracking-tight text-ink dark:text-white">
                SMTP verify
              </h2>
              <Row label="Verify result" ok={v?.ok} value={v?.ok ? "passed" : "failed"} />
              {v?.code && <Row label="Error code" value={v.code} />}
              {v?.error && (
                <div className="mt-3 rounded-xl border-2 border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <div className="font-extrabold uppercase tracking-wide">SMTP error</div>
                  <pre className="mt-1 whitespace-pre-wrap break-all">{v.error}</pre>
                </div>
              )}
            </section>

            {/* Test send */}
            <section className="card-sport p-5">
              <span className="eyebrow">Test delivery</span>
              <h2 className="mt-1 mb-4 font-display text-base font-extrabold tracking-tight text-ink dark:text-white">
                Send a test email
              </h2>
              <form onSubmit={onSend} className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  value={sendTo}
                  onChange={(e) => setSendTo(e.target.value)}
                  placeholder="leave blank to send to ADMIN_EMAIL"
                  className="flex-1 rounded-xl border-2 border-ink/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand dark:border-white/10 dark:bg-[#111c38] dark:text-white"
                />
                <button
                  type="submit"
                  disabled={sendBusy}
                  className="btn-primary disabled:opacity-60"
                >
                  {sendBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send test
                </button>
              </form>

              {sendResult && (
                <div
                  className={`mt-4 rounded-xl border-2 p-3 text-sm font-semibold ${
                    sendResult.ok
                      ? "border-lime/40 bg-lime/10 text-lime-dark"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  <div className="font-extrabold uppercase tracking-wide">
                    {sendResult.ok ? `Sent to ${sendResult.to}` : `Send failed${sendResult.code ? ` (${sendResult.code})` : ""}`}
                  </div>
                  {sendResult.messageId && (
                    <div className="mt-1 text-xs">
                      Message ID: <span className="font-mono">{sendResult.messageId}</span>
                    </div>
                  )}
                  {sendResult.error && (
                    <pre className="mt-2 whitespace-pre-wrap break-all text-xs">{sendResult.error}</pre>
                  )}
                  {sendResult.rejected && sendResult.rejected.length > 0 && (
                    <div className="mt-1 text-xs">Rejected: {sendResult.rejected.join(", ")}</div>
                  )}
                </div>
              )}
            </section>

            {/* Troubleshooting tips */}
            <section className="card-sport p-5">
              <span className="eyebrow">Help</span>
              <h2 className="mt-1 mb-4 font-display text-base font-extrabold tracking-tight text-ink dark:text-white">
                If verify fails
              </h2>
              <ul className="list-disc space-y-2.5 pl-5 text-sm text-ink/60 dark:text-white/60">
                <li>
                  Code <code className="rounded-md bg-ink/5 px-1.5 py-0.5 font-mono text-ink dark:bg-white/10 dark:text-white">EAUTH</code> → Gmail rejected the credentials. Most common cause is
                  a wrong / revoked App Password. Generate a fresh one at{" "}
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-brand underline dark:text-brand-300"
                  >
                    myaccount.google.com/apppasswords
                  </a>
                  , paste it into <code className="rounded-md bg-ink/5 px-1.5 py-0.5 font-mono text-ink dark:bg-white/10 dark:text-white">GMAIL_APP_PASSWORD</code> in Vercel, and redeploy.
                </li>
                <li>
                  Code <code className="rounded-md bg-ink/5 px-1.5 py-0.5 font-mono text-ink dark:bg-white/10 dark:text-white">ETIMEDOUT</code> → outbound port 465 is blocked from Vercel. Rare,
                  but happens. We&apos;ll switch to port 587 STARTTLS.
                </li>
                <li>
                  Length ≠ 16 → the value in Vercel has extra characters (quotes, newline). Re-paste it cleanly.
                </li>
                <li>
                  After changing any env var in Vercel: <strong className="text-ink dark:text-white">redeploy</strong>. Functions cache env at cold start.
                </li>
              </ul>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
