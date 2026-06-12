"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  ShieldCheck,
  XCircle,
  Users,
  Search,
} from "lucide-react";

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

type RegisteredUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
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

  // Outreach states
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [recipientsMode, setRecipientsMode] = useState<"all" | "selected">("all");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [outreachSending, setOutreachSending] = useState(false);
  const [outreachResult, setOutreachResult] = useState<{
    ok: boolean;
    msg: string;
    total?: number;
    successCount?: number;
    failCount?: number;
  } | null>(null);

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

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
    loadUsers();
  }, []);

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
      // Handle both the wrapped 'sent' object and direct 'ok' flag from the API
      const isSentOk = data?.ok || data?.sent?.ok;
      if (res.ok && isSentOk) {
        const transportUsed = data?.sent?.transport || data?.transport || "SMTP";
        setResult({ ok: true, msg: `Sent via ${transportUsed}. Check the inbox (and spam).` });
      } else {
        const err = data?.sent?.error || data?.error || data?.verify?.error || "Send failed.";
        const code = data?.sent?.code || data?.code;
        setResult({ ok: false, msg: `${err}${code ? ` (${code})` : ""}` });
      }
    } catch {
      setResult({ ok: false, msg: "Request failed." });
    } finally {
      setSending(false);
    }
  }

  async function handleOutreachSend(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;
    
    const targets = recipientsMode === "all" ? ["all"] : selectedEmails;
    if (targets.length === 0) {
      setOutreachResult({ ok: false, msg: "Please select at least one recipient user." });
      return;
    }

    setOutreachSending(true);
    setOutreachResult(null);

    try {
      const res = await fetch("/api/admin/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          description: description.trim(),
          recipients: targets,
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        setOutreachResult({
          ok: true,
          msg: `Outreach completed! Successfully sent to ${data.successCount} of ${data.total} user(s).`,
          total: data.total,
          successCount: data.successCount,
          failCount: data.failCount,
        });
        // Clear inputs on success
        setSubject("");
        setDescription("");
        setSelectedEmails([]);
      } else {
        setOutreachResult({
          ok: false,
          msg: data.error || "Failed to send outreach emails.",
        });
      }
    } catch {
      setOutreachResult({ ok: false, msg: "Outreach request failed." });
    } finally {
      setOutreachSending(false);
    }
  }

  const toggleUserEmail = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const selectAllFiltered = (filteredEmails: string[]) => {
    setSelectedEmails((prev) => {
      const next = [...prev];
      filteredEmails.forEach((email) => {
        if (!next.includes(email)) next.push(email);
      });
      return next;
    });
  };

  const deselectAllFiltered = (filteredEmails: string[]) => {
    setSelectedEmails((prev) => prev.filter((email) => !filteredEmails.includes(email)));
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredEmails = filteredUsers.map((u) => u.email);

  const verifyOk = health?.smtpVerify?.ok;

  return (
    <div className="space-y-6">
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
            <button onClick={loadHealth} className="btn-outline px-2.5 py-1.5 text-xs">
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

              <Row
                label="Gmail user configured"
                ok={health.config.gmailUserPresent}
                detail={health.config.resolvedUserVar ?? undefined}
              />
              <Row
                label="App password configured"
                ok={health.config.gmailAppPasswordPresent && health.config.gmailAppPasswordCleanedLength === 16}
                detail={
                  health.config.gmailAppPasswordPresent
                    ? `${health.config.gmailAppPasswordCleanedLength} chars`
                    : "Missing"
                }
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
              <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">
                Recipient email
              </label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border-2 border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 dark:border-white/15 dark:bg-[#111c38] dark:text-white"
              />
            </div>
            <button type="submit" disabled={sending} className="btn-primary w-full justify-center disabled:opacity-60">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? "Sending…" : "Send test email"}
            </button>
          </form>
          {result && (
            <div
              className={`mt-4 flex items-start gap-2 rounded-xl border-2 p-3 text-sm font-semibold ${
                result.ok ? "border-lime/40 bg-lime/10 text-lime-dark" : "border-red-200 bg-red-50 text-red-600"
              }`}
            >
              {result.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
              <span>{result.msg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Outreach Panel */}
      <div className="card-sport p-5">
        <span className="eyebrow">Marketing & Updates</span>
        <h3 className="mt-1 mb-2 flex items-center gap-2 font-display text-base font-extrabold tracking-tight text-ink dark:text-white">
          <Users className="h-5 w-5 text-brand" /> User Outreach Communication
        </h3>
        <p className="mb-5 text-sm text-ink/50 dark:text-white/50">
          Send newsletters, event updates, tournament promotions, or custom personal messages directly to users via email.
        </p>

        <form onSubmit={handleOutreachSend} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Summer Pickleball Tournament Open for Registrations!"
                  required
                  className="w-full rounded-xl border-2 border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 dark:border-white/15 dark:bg-[#111c38] dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">
                  Message Content (Description)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write the body of your email here..."
                  required
                  rows={8}
                  className="w-full rounded-xl border-2 border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 dark:border-white/15 dark:bg-[#111c38] dark:text-white resize-none"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">
                  Recipients Group
                </label>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 text-sm text-ink dark:text-white cursor-pointer">
                    <input
                      type="radio"
                      name="recipientsMode"
                      checked={recipientsMode === "all"}
                      onChange={() => setRecipientsMode("all")}
                      className="accent-brand h-4 w-4"
                    />
                    <span>All Users ({users.length})</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-ink dark:text-white cursor-pointer">
                    <input
                      type="radio"
                      name="recipientsMode"
                      checked={recipientsMode === "selected"}
                      onChange={() => setRecipientsMode("selected")}
                      className="accent-brand h-4 w-4"
                    />
                    <span>Select Specific Users ({selectedEmails.length})</span>
                  </label>
                </div>

                {recipientsMode === "selected" && (
                  <div className="rounded-2xl border-2 border-ink/10 bg-ink/[0.01] p-3.5 dark:border-white/10 dark:bg-white/[0.01]">
                    <div className="flex items-center gap-2 mb-3 bg-white px-3 py-1.5 rounded-xl border-2 border-ink/10 dark:bg-[#0d1426] dark:border-white/10">
                      <Search className="h-4 w-4 text-ink/40 dark:text-white/40" />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Search by name or email..."
                        className="bg-transparent border-0 text-sm outline-none w-full text-ink dark:text-white"
                      />
                    </div>

                    <div className="flex justify-between items-center mb-2 px-1 text-xs">
                      <span className="text-ink/50 dark:text-white/50">
                        Showing {filteredUsers.length} of {users.length}
                      </span>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => selectAllFiltered(filteredEmails)}
                          className="font-bold text-brand hover:underline dark:text-brand-300"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => deselectAllFiltered(filteredEmails)}
                          className="font-bold text-ink/60 hover:underline dark:text-white/60"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    {usersLoading ? (
                      <div className="flex items-center justify-center h-48 text-xs text-ink/40 dark:text-white/40">
                        <Loader2 className="animate-spin mr-1 h-3 w-3" /> Loading user directory...
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="flex items-center justify-center h-48 text-xs text-ink/40 dark:text-white/40">
                        No registered users found matching &quot;{userSearch}&quot;
                      </div>
                    ) : (
                      <div className="h-48 overflow-y-auto space-y-1.5 pr-1.5 scrollbar-thin">
                        {filteredUsers.map((u) => {
                          const isChecked = selectedEmails.includes(u.email);
                          return (
                            <div
                              key={u.id}
                              onClick={() => toggleUserEmail(u.email)}
                              className={`flex items-center justify-between p-2 rounded-xl text-xs transition cursor-pointer ${
                                isChecked
                                  ? "bg-brand/5 border-2 border-brand/20 dark:bg-brand/10 dark:border-brand-300/20"
                                  : "border-2 border-transparent hover:bg-ink/5 dark:hover:bg-white/5"
                              }`}
                            >
                              <div className="font-semibold text-ink dark:text-white">
                                {u.name}
                                <span className="block font-normal text-[10px] text-ink/50 dark:text-white/40">
                                  {u.email}
                                </span>
                              </div>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // toggled by row click
                                className="accent-brand h-3.5 w-3.5 rounded cursor-pointer"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={outreachSending || (recipientsMode === "selected" && selectedEmails.length === 0)}
            className="btn-primary w-full justify-center disabled:opacity-60"
          >
            {outreachSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {outreachSending
              ? `Sending to ${recipientsMode === "all" ? users.length : selectedEmails.length} recipients...`
              : `Send Outreach Email (${recipientsMode === "all" ? users.length : selectedEmails.length})`}
          </button>
        </form>

        {outreachResult && (
          <div
            className={`mt-4 rounded-xl border-2 p-3.5 text-sm font-semibold ${
              outreachResult.ok
                ? "border-lime/40 bg-lime/10 text-lime-dark"
                : "border-red-200 bg-red-50 text-red-600"
            }`}
          >
            <div className="flex items-start gap-2">
              {outreachResult.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <div>
                <div>{outreachResult.msg}</div>
                {outreachResult.ok && outreachResult.failCount !== undefined && outreachResult.failCount > 0 && (
                  <div className="mt-1 text-xs font-normal text-ink/70 dark:text-white/70">
                    💡 Sent successfully: {outreachResult.successCount} | Failed sends: {outreachResult.failCount} (check logs)
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
