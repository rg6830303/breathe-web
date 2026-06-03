import nodemailer, { type Transporter } from "nodemailer";

/**
 * Resolve Gmail SMTP credentials from env. Accepts several common variable
 * names because operators frequently name them differently in Vercel
 * (GMAIL_APP_PASSWORD vs GMAIL_PASS vs SMTP_PASS, etc.). Whitespace is stripped
 * from the App Password since Gmail displays it grouped like "abcd efgh ijkl".
 */
function resolveCreds(): { user: string; pass: string } {
  const user = (
    process.env.GMAIL_USER ||
    process.env.SMTP_USER ||
    process.env.EMAIL_USER ||
    ""
  )
    .trim()
    .replace(/^['"]|['"]$/g, ""); // strip stray surrounding quotes
  const passRaw =
    process.env.GMAIL_APP_PASSWORD ||
    process.env.GMAIL_APP_PASS ||
    process.env.GMAIL_PASSWORD ||
    process.env.GMAIL_PASS ||
    process.env.SMTP_PASSWORD ||
    process.env.SMTP_PASS ||
    process.env.EMAIL_PASS ||
    "";
  // App Passwords are 16 lowercase letters, shown grouped as "abcd efgh ijkl
  // mnop". Strip ALL whitespace and any quotes a copy-paste may have added.
  const pass = passRaw.replace(/^['"]|['"]$/g, "").replace(/\s+/g, "");
  return { user, pass };
}

/**
 * Human-readable reason the current Gmail credentials look wrong, or null if
 * they look usable. A real Gmail App Password is exactly 16 letters — the most
 * common cause of "no email sends" is pasting the normal account password (too
 * long / contains digits & symbols) or a truncated code.
 */
function credIssue(): string | null {
  const { user, pass } = resolveCreds();
  if (!user) return "GMAIL_USER is not set.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(user)) return `GMAIL_USER ("${user}") is not a valid email address.`;
  if (!pass) return "GMAIL_APP_PASSWORD is not set.";
  if (pass.length !== 16) {
    return (
      `GMAIL_APP_PASSWORD looks wrong: after removing spaces it is ${pass.length} characters, ` +
      `but a Google App Password is exactly 16 letters. Generate one at ` +
      `https://myaccount.google.com/apppasswords (2-Step Verification must be ON) and paste only the 16 letters.`
    );
  }
  return null;
}

type TransportKind = "465-ssl" | "587-starttls";

function buildTransport(kind: TransportKind): Transporter {
  const { user, pass } = resolveCreds();
  const is465 = kind === "465-ssl";
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: is465 ? 465 : 587,
    secure: is465, // 465 implicit TLS, 587 STARTTLS
    auth: { user, pass },
    connectionTimeout: 12_000,
    greetingTimeout: 8_000,
    socketTimeout: 18_000,
    tls: { minVersion: "TLSv1.2" },
  });
}

let primary: Transporter | null = null;
function getPrimary(): Transporter {
  const issue = credIssue();
  if (issue) throw new Error(issue);
  primary ??= buildTransport("465-ssl");
  return primary;
}

export type MailAttachment = {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  encoding?: string;
};

export type MailOptions = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  attachments?: MailAttachment[];
};

export function fromAddress(displayName = "Breathe Pickleball"): string {
  const { user } = resolveCreds();
  // Gmail SMTP only lets you send "From" the authenticated account (or a
  // verified alias). For a Gmail-only setup (no company domain), forcing From
  // to a non-verified address like play@breathepickleball.in makes Gmail
  // rewrite the header and spam-flag the message. So we ALWAYS send From the
  // authenticated Gmail user, and surface the business address as Reply-To.
  // GMAIL_FROM is honoured only if it equals the authenticated user (i.e. a
  // genuinely verified alias).
  const override = process.env.GMAIL_FROM?.trim();
  const addr = override && override === user ? override : user || "bookings@breathepickleball.in";
  return `${displayName} <${addr}>`;
}

export type SendResult =
  | { ok: true; messageId: string; accepted: string[]; rejected: string[]; transport: TransportKind | "resend" }
  | { ok: false; error: string; code?: string };

const RETRYABLE = new Set(["ETIMEDOUT", "ECONNECTION", "ESOCKET", "ECONNRESET", "EDNS", "EAI_AGAIN"]);

/**
 * Resend transport (preferred when RESEND_API_KEY is set). Sends over HTTPS —
 * far more reliable than SMTP on serverless egress — and, once you verify your
 * domain in Resend, signs mail with DKIM/SPF for breathepickleball.in so it
 * lands in the inbox instead of spam. Falls back to Gmail SMTP if it fails or
 * isn't configured. Uses fetch (no SDK dependency).
 */
function resendFrom(): string {
  // Must be an address on a domain you've verified in Resend. Until you verify
  // your own domain you can use Resend's shared "onboarding@resend.dev" sender
  // (delivers to your own account email only — good for the first smoke test).
  return (process.env.RESEND_FROM || "Breathe Pickleball <onboarding@resend.dev>").trim();
}

async function sendViaResend(opts: MailOptions, apiKey: string): Promise<SendResult> {
  const to = Array.isArray(opts.to) ? opts.to : [opts.to];
  const replyTo =
    opts.replyTo || process.env.REPLY_TO_EMAIL || process.env.GMAIL_FROM?.trim() || undefined;
  const attachments = opts.attachments?.map((a) => ({
    filename: a.filename,
    content: Buffer.isBuffer(a.content)
      ? a.content.toString("base64")
      : Buffer.from(String(a.content)).toString("base64"),
  }));

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: resendFrom(),
        to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(attachments?.length ? { attachments } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok || !data.id) {
      return { ok: false, error: data.message || data.name || `Resend HTTP ${res.status}`, code: "RESEND" };
    }
    return { ok: true, messageId: data.id, accepted: to, rejected: [], transport: "resend" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), code: "RESEND" };
  }
}

async function trySend(transport: Transporter, opts: MailOptions) {
  const { user } = resolveCreds();
  const fromAddr = user || "bookings@breathepickleball.in";
  // Reply-To = the business address so replies reach the club inbox even
  // though the message is sent (and DKIM-signed) by the Gmail account.
  const replyTo =
    opts.replyTo || process.env.REPLY_TO_EMAIL || process.env.GMAIL_FROM?.trim() || fromAddr;

  return transport.sendMail({
    from: fromAddress(),
    // Envelope sender = authenticated Gmail user so SPF/DKIM align (Gmail signs
    // mail from the authenticated account). Mismatched From is the #1 reason
    // transactional mail lands in spam.
    sender: fromAddr,
    envelope: { from: fromAddr, to: Array.isArray(opts.to) ? opts.to : [opts.to] },
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    replyTo,
    // Deliverability headers: a stable List-Unsubscribe (one-click) plus a
    // transactional Precedence/Auto-Submitted signal reduce spam scoring.
    headers: {
      "List-Unsubscribe": `<mailto:${replyTo}?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      "X-Entity-Ref-ID": `breathe-${Date.now()}`,
      "Auto-Submitted": "auto-generated",
    },
    attachments: opts.attachments,
  });
}

/**
 * Send mail. Tries 465 (implicit SSL); on a connection-level failure (common
 * on serverless egress) falls back once to 587 (STARTTLS).
 */
export async function sendMail(opts: MailOptions): Promise<SendResult> {
  // Preferred path: Resend over HTTPS (reliable on serverless + inbox-grade
  // deliverability once the domain is verified). If it fails, fall through to
  // Gmail SMTP so a transient Resend issue never drops a transactional email.
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    const r = await sendViaResend(opts, resendKey);
    if (r.ok) return r;
    console.error("[mailer] Resend failed, falling back to Gmail SMTP:", r.error);
  }

  try {
    const info = await trySend(getPrimary(), opts);
    return {
      ok: true,
      messageId: info.messageId,
      accepted: (info.accepted ?? []).map(String),
      rejected: (info.rejected ?? []).map(String),
      transport: "465-ssl",
    };
  } catch (err) {
    const code = (err as { code?: string })?.code;
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[mailer 465 send error]", { code, msg });
    // Gmail rejected the login. This is a credential problem, NOT a network one,
    // so retrying the other port won't help — return a clear, fixable reason.
    if (code === "EAUTH") {
      const hint =
        credIssue() ||
        "Gmail rejected the App Password. Confirm 2-Step Verification is ON and the GMAIL_APP_PASSWORD is a fresh 16-letter App Password (not your normal Gmail password).";
      return { ok: false, error: hint, code };
    }
    if (code && RETRYABLE.has(code)) {
      try {
        const info = await trySend(buildTransport("587-starttls"), opts);
        console.log("[mailer] delivered via 587 STARTTLS fallback");
        return {
          ok: true,
          messageId: info.messageId,
          accepted: (info.accepted ?? []).map(String),
          rejected: (info.rejected ?? []).map(String),
          transport: "587-starttls",
        };
      } catch (err2) {
        const code2 = (err2 as { code?: string })?.code;
        const msg2 = err2 instanceof Error ? err2.message : String(err2);
        console.error("[mailer 587 fallback error]", { code: code2, msg: msg2 });
        return { ok: false, error: msg2, code: code2 };
      }
    }
    return { ok: false, error: msg, code };
  }
}

export type VerifyResult = { ok: boolean; error?: string; code?: string; transport?: TransportKind };

export async function verifyMailer(): Promise<VerifyResult> {
  // When Resend is the active transport, a healthy API key is all that's needed
  // (Resend has no SMTP-style verify; delivery is confirmed by the smoke test).
  if (process.env.RESEND_API_KEY?.trim()) return { ok: true };
  const issue = credIssue();
  if (issue) return { ok: false, error: issue };
  try {
    await buildTransport("465-ssl").verify();
    return { ok: true, transport: "465-ssl" };
  } catch (err) {
    const code = (err as { code?: string })?.code;
    try {
      await buildTransport("587-starttls").verify();
      return { ok: true, transport: "587-starttls" };
    } catch (err2) {
      const msg2 = err2 instanceof Error ? err2.message : String(err2);
      return { ok: false, error: msg2, code: (err2 as { code?: string })?.code ?? code };
    }
  }
}

function maskEmail(addr: string): string | null {
  if (!addr || !addr.includes("@")) return null;
  const [local, domain] = addr.split("@");
  const shown = local.length <= 2 ? local : `${local.slice(0, 2)}****${local.slice(-2)}`;
  return `${shown}@${domain}`;
}

/** Public-safe diagnostic: presence + length only, never secret values. */
export function mailerConfigState() {
  const { user, pass } = resolveCreds();
  const rawUser = process.env.GMAIL_USER || process.env.SMTP_USER || process.env.EMAIL_USER || "";
  const rawPass =
    process.env.GMAIL_APP_PASSWORD ||
    process.env.GMAIL_APP_PASS ||
    process.env.GMAIL_PASSWORD ||
    process.env.GMAIL_PASS ||
    process.env.SMTP_PASSWORD ||
    process.env.SMTP_PASS ||
    process.env.EMAIL_PASS ||
    "";
  return {
    gmailUserPresent: !!user,
    // Masked (e.g. "rg****03@gmail.com") so the public health endpoint confirms
    // the right account without exposing the full address to harvesters.
    gmailUserMasked: maskEmail(user),
    gmailUserTrimmedLength: user.length,
    gmailUserHasSpaces: rawUser ? rawUser !== rawUser.trim() : false,
    gmailAppPasswordPresent: !!pass,
    gmailAppPasswordCleanedLength: pass.length,
    gmailAppPasswordLooksValid: pass.length === 16,
    gmailAppPasswordHadSpaces: /\s/.test(rawPass.trim()),
    credentialIssue: credIssue(),
    // Resend is the preferred transport when configured.
    resendConfigured: !!process.env.RESEND_API_KEY?.trim(),
    resendFrom: process.env.RESEND_API_KEY?.trim() ? resendFrom() : null,
    activeTransport: process.env.RESEND_API_KEY?.trim() ? "resend (Gmail SMTP fallback)" : "gmail-smtp",
    resolvedUserVar:
      (process.env.GMAIL_USER && "GMAIL_USER") ||
      (process.env.SMTP_USER && "SMTP_USER") ||
      (process.env.EMAIL_USER && "EMAIL_USER") ||
      null,
    adminEmailPresent: !!process.env.ADMIN_EMAIL,
    fromOverridePresent: !!process.env.GMAIL_FROM,
  };
}
