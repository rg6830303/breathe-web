import React from "react";
import { render } from "@react-email/render";
import { renderToBuffer } from "@react-pdf/renderer";
import BookingConfirmation from "@/emails/BookingConfirmation";
import { BookingInvoice } from "@/lib/pdf/BookingInvoice";
import { sendMail } from "@/lib/mailer";

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
}): Promise<{ emailed: boolean }> {
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

    // Render PDF invoice (best-effort — never block the email send if it fails).
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

    const attachments = pdfBuffer
      ? [
          {
            filename: `Breathe-Invoice-${shortRef}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ]
      : undefined;

    // 1. Player confirmation email with PDF attached.
    const playerHtml = await render(
      <BookingConfirmation
        customerName={b.userName}
        bookingId={shortRef}
        slotDate={dateStr}
        slotTime={slotRange}
        duration={`${b.durationMin} minutes`}
        amount={total}
        venueAddress={VENUE_ADDRESS}
        bookingUrl={`${siteUrl}/dashboard?booking=${b.id}`}
      />,
    );

    const playerText =
      `Hi ${b.userName},\n\n` +
      `Your booking is confirmed.\n\n` +
      `Date: ${dateStr}\n` +
      `Time: ${slotRange}\n` +
      (b.courtNumber ? `Court: ${b.courtNumber}\n` : "") +
      `Amount: Rs. ${total.toLocaleString("en-IN")}\n` +
      `Reference: ${shortRef}\n\n` +
      `Venue: ${VENUE_ADDRESS}\n\n` +
      `Manage your booking: ${siteUrl}/dashboard\n\n` +
      `Free cancellation up to 4 hours before your slot.`;

    const playerResult = await sendMail({
      to: b.userEmail,
      subject: `Confirmed: ${dateStr} at ${format12h(b.slotTime)} | Ref ${shortRef}`,
      html: playerHtml,
      text: playerText,
      attachments,
    });
    const emailed = playerResult.ok;
    if (!playerResult.ok) console.error("[player email failed]", playerResult.error);
    else console.log(`Player email sent for booking ${shortRef} (${playerResult.messageId})`);

    // 2. Admin notification email with the same PDF attached.
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
        `Amount: Rs. ${total.toLocaleString("en-IN")} (subtotal Rs. ${subtotal.toLocaleString("en-IN")} + GST Rs. ${gst.toLocaleString("en-IN")})\n` +
        `Ref: ${shortRef}\n\n` +
        `Admin: ${siteUrl}/admin/customers`;

      const adminResult = await sendMail({
        to: ADMIN_EMAIL,
        subject: `New booking: ${b.userName} — ${b.slotDate} ${b.slotTime}`,
        text: adminText,
        attachments,
      });
      if (!adminResult.ok) console.error("[admin email failed]", adminResult.error);
      else console.log(`Admin email sent for booking ${shortRef} (${adminResult.messageId})`);
    } else {
      console.warn("ADMIN_EMAIL not configured — skipping admin email notification.");
    }

    // 3. Telegram alert (unchanged).
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
