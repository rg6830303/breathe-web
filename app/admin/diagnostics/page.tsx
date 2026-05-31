"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  X,
} from "lucide-react";

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
    <div className="flex items-center justify-between border-b border-brand/5 py-2 text-sm last:border-0">
      <span className="text-slatey">{label}</span>
      <span className="flex items-center gap-2 font-mono text-ink">
        {value}
        {ok === true && <Check className="h-4 w-4 text-emerald-600" />}
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
    <main className="min-h-screen bg-brand-50/30 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/admin"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand/15 bg-white text-ink hover:bg-brand/5"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Email diagnostics</h1>
            <p className="text-xs text-slatey">
              Live status of the Gmail SMTP transport used for password resets, booking confirmations, and admin
              notifications.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand/15 bg-white text-ink hover:bg-brand/5"
            aria-label="Reload"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {authError && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {authError}
          </div>
        )}

        {loading && !health ? (
          <div className="rounded-3xl border border-brand/10 bg-white p-10 text-center text-sm text-slatey shadow-soft">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-brand" /> Querying SMTP…
          </div>
        ) : health ? (
          <>
            <div
              className={`mb-4 rounded-3xl border p-5 shadow-soft ${
                allGood ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Mail className={`h-8 w-8 ${allGood ? "text-emerald-600" : "text-amber-600"}`} />
                <div>
                  <div className="font-display text-lg font-extrabold text-ink">
                    {allGood ? "Mailer healthy" : "Mailer not ready"}
                  </div>
                  <div className="text-xs text-ink/70">{health.hint}</div>
                </div>
              </div>
            </div>

            <section className="rounded-3xl border border-brand/10 bg-white p-5 shadow-soft">
              <h2 className="mb-2 font-display text-base font-extrabold text-ink">Configuration</h2>
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

            <section className="mt-4 rounded-3xl border border-brand/10 bg-white p-5 shadow-soft">
              <h2 className="mb-2 font-display text-base font-extrabold text-ink">SMTP verify</h2>
              <Row label="Verify result" ok={v?.ok} value={v?.ok ? "passed" : "failed"} />
              {v?.code && <Row label="Error code" value={v.code} />}
              {v?.error && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <div className="font-bold">SMTP error</div>
                  <pre className="mt-1 whitespace-pre-wrap break-all">{v.error}</pre>
                </div>
              )}
            </section>

            <section className="mt-4 rounded-3xl border border-brand/10 bg-white p-5 shadow-soft">
              <h2 className="mb-3 font-display text-base font-extrabold text-ink">Send a test email</h2>
              <form onSubmit={onSend} className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  value={sendTo}
                  onChange={(e) => setSendTo(e.target.value)}
                  placeholder="leave blank to send to ADMIN_EMAIL"
                  className="flex-1 rounded-xl border border-brand/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                />
                <button
                  type="submit"
                  disabled={sendBusy}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-bold text-white shadow-glow transition hover:bg-brand-600 disabled:opacity-60"
                >
                  {sendBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send test
                </button>
              </form>

              {sendResult && (
                <div
                  className={`mt-4 rounded-xl border p-3 text-sm ${
                    sendResult.ok
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  <div className="font-bold">
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

            <section className="mt-4 rounded-3xl border border-brand/10 bg-white p-5 shadow-soft">
              <h2 className="mb-2 font-display text-base font-extrabold text-ink">If verify fails</h2>
              <ul className="list-disc space-y-2 pl-5 text-sm text-slatey">
                <li>
                  Code <code className="font-mono text-ink">EAUTH</code> → Gmail rejected the credentials. Most common cause is
                  a wrong / revoked App Password. Generate a fresh one at{" "}
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand underline"
                  >
                    myaccount.google.com/apppasswords
                  </a>
                  , paste it into <code className="font-mono text-ink">GMAIL_APP_PASSWORD</code> in Vercel, and redeploy.
                </li>
                <li>
                  Code <code className="font-mono text-ink">ETIMEDOUT</code> → outbound port 465 is blocked from Vercel. Rare,
                  but happens. We&apos;ll switch to port 587 STARTTLS.
                </li>
                <li>
                  Length ≠ 16 → the value in Vercel has extra characters (quotes, newline). Re-paste it cleanly.
                </li>
                <li>
                  After changing any env var in Vercel: <strong>redeploy</strong>. Functions cache env at cold start.
                </li>
              </ul>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
