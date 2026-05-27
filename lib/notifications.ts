import { Resend } from "resend";
import { BookingConfirmationEmail } from "@/emails/booking-confirmation";

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
}) {
  const client = getResend();
  if (!client) return { skipped: true };
  return client.emails.send({
    from: "Breathe Pickleball <bookings@breathepickleball.com>",
    to: [input.playerEmail, input.adminEmail],
    subject: `Breathe Pickleball booking - Court ${input.courtId}`,
    react: BookingConfirmationEmail(input),
  });
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
