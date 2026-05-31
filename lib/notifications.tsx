import { Resend } from "resend";
import React from "react";
import BookingConfirmation from "@/emails/BookingConfirmation";
import { renderToBuffer } from "@react-pdf/renderer";
import { BookingInvoice } from "@/lib/pdf/BookingInvoice";

const resend = new Resend(process.env.RESEND_API_KEY);
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = process.env.TELEGRAM_ADMIN_CHAT_ID;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

const VENUE_ADDRESS = "Panchawati Complex, Plot 2, Biman Nagar, Kaikhali, Kolkata 700052";

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
      timeZone: "Asia/Kolkata",
    });

    const endTime = computeEndTime(b.slotTime, b.durationMin);
    const slotRange = `${format12h(b.slotTime)} – ${format12h(endTime)}`;
    const shortRef = b.id.slice(0, 8).toUpperCase();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://breathe-web-six.vercel.app";

    const total = b.amount;
    const subtotal = b.subtotal ?? Math.round(total * 0.847);
    const gst = b.gst ?? total - subtotal;

    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await renderToBuffer(
        <BookingInvoice
          customerName={b.userName}
          customerEmail={b.userEmail}
          customerPhone={b.userPhone}
          bookingId={shortRef}
          slotDate={dateStr}
          slotTime={slotRange}
          duration={`${b.durationMin} minutes`}
          courtNumber={b.courtNumber}
          subtotal={subtotal}
          gst={gst}
          total={total}
          venueAddress={VENUE_ADDRESS}
        />,
      );
    } catch (pdfErr) {
      console.error("[pdf render error]", pdfErr);
    }

    resend.emails
      .send({
        from: "Breathe Pickleball <bookings@breathepickleball.in>",
        to: b.userEmail,
        subject: `Confirmed: ${dateStr} at ${format12h(b.slotTime)} | Ref ${shortRef}`,
        react: React.createElement(BookingConfirmation, {
          customerName: b.userName,
          bookingId: shortRef,
          slotDate: dateStr,
          slotTime: slotRange,
          duration: `${b.durationMin} minutes`,
          amount: total,
          venueAddress: VENUE_ADDRESS,
          bookingUrl: `${siteUrl}/dashboard?booking=${b.id}`,
        }),
        ...(pdfBuffer
          ? {
              attachments: [
                {
                  filename: `Breathe-Invoice-${shortRef}.pdf`,
                  content: pdfBuffer.toString("base64"),
                },
              ],
            }
          : {}),
      })
      .then((res) => {
        if (res.error) console.error("[email error details]", res.error);
        else console.log(`Email sent to ${b.userEmail} for booking ${shortRef}`);
      })
      .catch((e) => console.error("[email send exception]", e));

    if (ADMIN_EMAIL) {
      const courtLine = b.courtNumber ? `Court: ${b.courtNumber}\n` : "";
      const phoneLine = b.userPhone ? `Phone: ${b.userPhone}\n` : "";
      const adminText =
        `New booking received.\n\n` +
        `Customer: ${b.userName}\n` +
        `${phoneLine}` +
        `Email: ${b.userEmail}\n` +
        `Date: ${dateStr}\n` +
        `Time: ${slotRange}\n` +
        `${courtLine}` +
        `Amount: ₹${total.toLocaleString("en-IN")} (subtotal ₹${subtotal.toLocaleString("en-IN")} + GST ₹${gst.toLocaleString("en-IN")})\n` +
        `Ref: ${shortRef}`;

      resend.emails
        .send({
          from: "Breathe Bookings <bookings@breathepickleball.in>",
          to: ADMIN_EMAIL,
          subject: `New booking: ${b.userName} — ${b.slotDate} ${b.slotTime}`,
          text: adminText,
          ...(pdfBuffer
            ? {
                attachments: [
                  {
                    filename: `Breathe-Invoice-${shortRef}.pdf`,
                    content: pdfBuffer.toString("base64"),
                  },
                ],
              }
            : {}),
        })
        .then((res) => {
          if (res.error) console.error("[admin email error]", res.error);
          else console.log(`Admin notified for booking ${shortRef}`);
        })
        .catch((e) => console.error("[admin email exception]", e));
    } else {
      console.warn("ADMIN_EMAIL not configured — skipping admin email notification.");
    }

    if (TG_TOKEN && TG_CHAT) {
      const courtText = b.courtNumber ? ` · Court ${b.courtNumber}` : "";
      const phoneText = b.userPhone ? ` (${b.userPhone})` : "";
      const msg = `🎾 *New Booking*\n${b.userName}${phoneText}\n📅 ${dateStr}\n⏰ ${slotRange}${courtText}\n💰 ₹${total.toLocaleString("en-IN")}\nRef: ${shortRef}`;

      fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TG_CHAT, text: msg, parse_mode: "Markdown" }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const errBody = await res.text();
            console.error("[telegram error body]", errBody);
          } else {
            console.log(`Telegram alert sent for booking ${shortRef}`);
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
