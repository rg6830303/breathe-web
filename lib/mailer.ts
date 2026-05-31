import nodemailer, { type Transporter } from "nodemailer";

/**
 * Resolve Gmail SMTP credentials from env. We accept several common variable
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
  ).trim();
  const passRaw =
    process.env.GMAIL_APP_PASSWORD ||
    process.env.GMAIL_APP_PASS ||
    process.env.GMAIL_PASSWORD ||
    process.env.GMAIL_PASS ||
    process.env.SMTP_PASSWORD ||
    process.env.SMTP_PASS ||
    process.env.EMAIL_PASS ||
    "";
  const pass = passRaw.replace(/\s+/g, "");
  return { user, pass };
}

type TransportKind = "465-ssl" | "587-starttls";

function buildTransport(kind: TransportKind): Transporter {
  const { user, pass } = resolveCreds();
  const is465 = kind === "465-ssl";
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: is465 ? 465 : 587,
    secure: is465, // 465 = implicit TLS, 587 = STARTTLS
    auth: { user, pass },
    // Keep timeouts comfortably under the route maxDuration (30s) so the
    // function returns a real error instead of being killed mid-connect.
    connectionTimeout: 12_000,
    greetingTimeout: 8_000,
    socketTimeout: 18_000,
    tls: { minVersion: "TLSv1.2" },
  });
}

// Cache the primary (465) transport across warm invocations.
let primary: Transporter | null = null;
function getPrimary(): Transporter {
  const { user, pass } = resolveCreds();
  if (!user || !pass) {
    throw new Error(
      "Gmail credentials missing. Set GMAIL_USER and GMAIL_APP_PASSWORD in Vercel (Production env). " +
        "The App Password is a 16-char code from https://myaccount.google.com/apppasswords (requires 2FA).",
    );
  }
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
  // Gmail requires the From address to be the authenticated account (or a
  // verified alias), so always send as the authenticated user.
  const addr = process.env.GMAIL_FROM?.trim() || user || "bookings@breathepickleball.in";
  return `${displayName} <${addr}>`;
}

export type SendResult =
  | { ok: true; messageId: string; accepted: string[]; rejected: string[]; transport: TransportKind }
  | { ok: false; error: string; code?: string };

/** Connection-level error codes that justify retrying on the alternate port. */
const RETRYABLE = new Set(["ETIMEDOUT", "ECONNECTION", "ESOCKET", "ECONNRESET", "EDNS", "EAI_AGAIN"]);

async function trySend(transport: Transporter, opts: MailOptions) {
  return transport.sendMail({
    from: fromAddress(),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    replyTo: opts.replyTo,
    attachments: opts.attachments,
  });
}

/**
 * Send mail. Tries 465 (implicit SSL) first; on a connection-level failure
 * (common on serverless egress) falls back once to 587 (STARTTLS), which many
 * Vercel/Lambda networks allow when 465 is blocked or throttled.
 */
export async function sendMail(opts: MailOptions): Promise<SendResult> {
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

    if (code && RETRYABLE.has(code)) {
      try {
        const fallback = buildTransport("587-starttls");
        const info = await trySend(fallback, opts);
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

/** Verify the SMTP connection, trying 465 then 587. */
export async function verifyMailer(): Promise<VerifyResult> {
  const { user, pass } = resolveCreds();
  if (!user || !pass) {
    return { ok: false, error: "GMAIL_USER / GMAIL_APP_PASSWORD missing in env." };
  }
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
      const code2 = (err2 as { code?: string })?.code ?? code;
      return { ok: false, error: msg2, code: code2 };
    }
  }
}

/**
 * Diagnostic surface — safe to expose publicly; no secret values are returned,
 * only presence + length checks across all accepted variable names.
 */
export function mailerConfigState() {
  const { user, pass } = resolveCreds();
  const rawUser =
    process.env.GMAIL_USER || process.env.SMTP_USER || process.env.EMAIL_USER || "";
  return {
    gmailUserPresent: !!user,
    gmailUserTrimmedLength: user.length,
    gmailUserHasSpaces: rawUser ? rawUser !== rawUser.trim() : false,
    gmailAppPasswordPresent: !!pass,
    gmailAppPasswordCleanedLength: pass.length,
    resolvedUserVar:
      (process.env.GMAIL_USER && "GMAIL_USER") ||
      (process.env.SMTP_USER && "SMTP_USER") ||
      (process.env.EMAIL_USER && "EMAIL_USER") ||
      null,
    adminEmailPresent: !!process.env.ADMIN_EMAIL,
    fromOverridePresent: !!process.env.GMAIL_FROM,
  };
}
