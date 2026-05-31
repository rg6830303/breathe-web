import nodemailer, { type Transporter } from "nodemailer";

let cached: Transporter | null = null;

/**
 * Build a nodemailer transport against Gmail SMTP.
 *
 * Uses explicit host/port (smtp.gmail.com:465 SSL) rather than the `service:
 * "gmail"` shortcut so behaviour is the same in local dev and on Vercel's
 * Lambda runtime. Trims whitespace from the App Password because Gmail
 * displays them grouped like "abcd efgh ijkl mnop" and operators frequently
 * paste them with spaces or trailing newlines.
 */
function getTransport(): Transporter {
  if (cached) return cached;
  const user = process.env.GMAIL_USER?.trim();
  const passRaw = process.env.GMAIL_APP_PASSWORD;
  const pass = passRaw ? passRaw.replace(/\s+/g, "") : undefined;
  if (!user || !pass) {
    throw new Error(
      "GMAIL_USER and GMAIL_APP_PASSWORD must be set. Enable 2FA on the Gmail account and create an App Password (16 chars) at https://myaccount.google.com/apppasswords.",
    );
  }
  cached = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
    tls: { minVersion: "TLSv1.2" },
  });
  return cached;
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
  const user = (process.env.GMAIL_USER ?? "bookings@breathepickleball.in").trim();
  return `${displayName} <${user}>`;
}

export type SendResult =
  | { ok: true; messageId: string; accepted: string[]; rejected: string[] }
  | { ok: false; error: string; code?: string };

export async function sendMail(opts: MailOptions): Promise<SendResult> {
  try {
    const transport = getTransport();
    const info = await transport.sendMail({
      from: fromAddress(),
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      replyTo: opts.replyTo,
      attachments: opts.attachments,
    });
    return {
      ok: true,
      messageId: info.messageId,
      accepted: (info.accepted ?? []).map(String),
      rejected: (info.rejected ?? []).map(String),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string })?.code;
    console.error("[mailer sendMail error]", { code, msg });
    return { ok: false, error: msg, code };
  }
}

export type VerifyResult = { ok: boolean; error?: string; code?: string };

export async function verifyMailer(): Promise<VerifyResult> {
  try {
    const transport = getTransport();
    await transport.verify();
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string })?.code;
    return { ok: false, error: msg, code };
  }
}

/**
 * Diagnostic surface — safe to expose publicly; no values are returned, only
 * presence + length checks.
 */
export function mailerConfigState() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const fromOverride = process.env.GMAIL_FROM;
  const adminEmail = process.env.ADMIN_EMAIL;
  return {
    gmailUserPresent: !!user,
    gmailUserTrimmedLength: user?.trim().length ?? 0,
    gmailUserHasSpaces: user ? user !== user.trim() : false,
    gmailAppPasswordPresent: !!pass,
    gmailAppPasswordCleanedLength: pass ? pass.replace(/\s+/g, "").length : 0,
    gmailAppPasswordHadSpaces: pass ? pass.replace(/\s+/g, "") !== pass : false,
    adminEmailPresent: !!adminEmail,
    fromOverridePresent: !!fromOverride,
  };
}
