import { Resend } from "resend";
import BookingConfirmation from "@/emails/BookingConfirmation";
import React from "react";

const resend = new Resend(process.env.RESEND_API_KEY);
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = process.env.TELEGRAM_ADMIN_CHAT_ID;

export async function notifyBookingConfirmed(b: {
  id: string;
  userEmail: string;
  userName: string;
  userPhone?: string;
  slotDate: string;
  slotTime: string;
  durationMin: number;
  amount: number;
  courtNumber?: number;
  subtotal?: number;
  gst?: number;
}) {
  try {
    const date = new Date(b.slotDate);
    const dateStr = date.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata"
    });
    
    const endTime = computeEndTime(b.slotTime, b.durationMin);
    const slotRange = `${format12h(b.slotTime)} – ${format12h(endTime)}`;
    const shortRef = b.id.slice(0, 8).toUpperCase();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://breathe-web-six.vercel.app";

    // 1. Email player (don't block on failure)
    resend.emails
      .send({
        from: "Breathe Pickleball <bookings@breathepickleball.in>",
        to: b.userEmail,
        subject: `Confirmed: ${dateStr} at ${format12h(b.slotTime)}`,
        react: React.createElement(BookingConfirmation, {
          customerName: b.userName,
          bookingId: shortRef,
          slotDate: dateStr,
          slotTime: slotRange,
          duration: `${b.durationMin} minutes`,
          amount: b.amount,
          venueAddress: "Panchawati Complex, Plot 2, Biman Nagar, Kaikhali, Kolkata 700052",
          bookingUrl: `${siteUrl}/dashboard?booking=${b.id}`
        })
      })
      .then((res) => {
        if (res.error) {
          console.error("[email error details]", res.error);
        } else {
          console.log(`✅ Email sent to ${b.userEmail} for booking ${shortRef}`);
        }
      })
      .catch((e) => console.error("[email send exception]", e));

    // 2. Telegram admin alert
    if (TG_TOKEN && TG_CHAT) {
      const phoneText = b.userPhone ? ` (${b.userPhone})` : "";
      const msg = `🎾 *New Booking*\n${b.userName}${phoneText}\n📅 ${dateStr}\n⏰ ${slotRange}\n💰 ₹${b.amount}\nRef: ${shortRef}`;
      
      fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TG_CHAT,
          text: msg,
          parse_mode: "Markdown"
        })
      })
        .then(async (res) => {
          if (!res.ok) {
            const errBody = await res.text();
            console.error("[telegram error body]", errBody);
          } else {
            console.log(`✅ Telegram alert sent for booking ${shortRef}`);
          }
        })
        .catch((e) => console.error("[telegram send exception]", e));
    } else {
      console.warn("Telegram notifications skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID not configured.");
    }
  } catch (err) {
    console.error("[notification dispatcher error]", err);
  }
}

function computeEndTime(hhmm: string, dur: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const t = h * 60 + m + dur;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

function format12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
