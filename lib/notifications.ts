import { Resend } from "resend";
import { BookingConfirmationEmail } from "@/emails/booking-confirmation";
import { WaitlistOpeningEmail } from "@/emails/waitlist-opening";
import { getSupabaseService, hasSupabaseEnv } from "@/lib/supabase";

let resend: Resend | null = null;

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  resend ??= new Resend(process.env.RESEND_API_KEY);
  return resend;
}

export async function sendTelegramAlert(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { skipped: true };
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message }),
  });
  if (!response.ok) throw new Error(`Telegram alert failed: ${response.status}`);
  return response.json();
}

export async function sendBookingEmails(input: {
  playerName: string;
  playerEmail: string;
  adminEmail: string;
  courtId: number;
  window: string;
  total: number;
  /** Optional ICS calendar payload. When present we attach it so both the
   *  player and the admin land it in their calendar with one click. */
  ics?: string;
}) {
  const client = getResend();
  if (!client) return { skipped: true };
  const attachments = input.ics
    ? [
        {
          filename: "breathe-booking.ics",
          // Resend's SDK accepts base64-encoded `content` strings for binary
          // attachments. ICS is text but base64 sidesteps any character-set
          // mangling along the way.
          content: Buffer.from(input.ics, "utf8").toString("base64"),
        },
      ]
    : undefined;
  return client.emails.send({
    from: "Breathe Pickleball <bookings@breathepickleball.com>",
    to: [input.playerEmail, input.adminEmail],
    subject: `Breathe Pickleball booking - Court ${input.courtId}`,
    react: BookingConfirmationEmail(input),
    attachments,
  });
}

/** Pop the oldest unnotified waitlist entry for a freed slot, mark it
 *  notified, and email + Telegram-ping. No-op when Supabase env is missing. */
export async function notifyWaitlistNext(input: { courtId: number; startTime: string }) {
  if (!hasSupabaseEnv()) return { skipped: true };
  const supabase = getSupabaseService();
  const dt = new Date(input.startTime);
  // slot_date / slot_time stored in Asia/Kolkata wall-clock — convert by
  // forming a YYYY-MM-DD / HH:MM:SS string in that zone.
  const tz = "Asia/Kolkata";
  const dateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const slotDate = dateFmt.format(dt); // YYYY-MM-DD
  const slotTime = timeFmt.format(dt); // HH:MM:SS

  const { data: entry, error: fetchError } = await supabase
    .from("waitlist")
    .select("id, player_email, player_name")
    .eq("court_id", input.courtId)
    .eq("slot_date", slotDate)
    .eq("slot_time", slotTime)
    .eq("notified", false)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (fetchError || !entry) return { skipped: true };

  const client = getResend();
  const windowLabel = dt.toLocaleString("en-IN", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  if (client) {
    await client.emails
      .send({
        from: "Breathe Pickleball <bookings@breathepickleball.com>",
        to: [entry.player_email],
        subject: `A Breathe slot just opened — Court ${input.courtId}`,
        react: WaitlistOpeningEmail({
          playerName: entry.player_name,
          courtId: input.courtId,
          windowLabel,
          bookUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://breathe-web-six.vercel.app"}/book`,
        }),
      })
      .catch(() => undefined);
  }

  await supabase
    .from("waitlist")
    .update({ notified: true, notified_at: new Date().toISOString() })
    .eq("id", entry.id);

  await sendTelegramAlert(
    `🔔 Waitlist notified: ${entry.player_email} for Court ${input.courtId} ${windowLabel}`,
  ).catch(() => undefined);

  return { notified: entry.player_email };
}

export async function mirrorBookingToSheets(payload: unknown) {
  const url = process.env.GOOGLE_APPS_SCRIPT_WEBAPP_URL;
  if (!url) return { skipped: true };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    await sendTelegramAlert(`Sheets sync failed with status ${response.status}`);
    throw new Error(`Sheets sync failed: ${response.status}`);
  }
  return response.json().catch(() => ({ ok: true }));
}
