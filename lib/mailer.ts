import nodemailer, { type Transporter } from "nodemailer";

let cached: Transporter | null = null;

function getTransport(): Transporter {
  if (cached) return cached;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      "GMAIL_USER and GMAIL_APP_PASSWORD must be set. Enable 2FA on the Gmail account and create an App Password (16 chars) at https://myaccount.google.com/apppasswords.",
    );
  }
  cached = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
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
  const user = process.env.GMAIL_USER ?? "bookings@breathepickleball.in";
  return `${displayName} <${user}>`;
}

export async function sendMail(opts: MailOptions): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
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
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[mailer sendMail error]", msg);
    return { ok: false, error: msg };
  }
}

export async function verifyMailer(): Promise<{ ok: boolean; error?: string }> {
  try {
    const transport = getTransport();
    await transport.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
