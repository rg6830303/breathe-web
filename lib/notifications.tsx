import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { BookingInvoice } from "@/lib/pdf/BookingInvoice";
import { sendMail } from "@/lib/mailer";
import { sendPushToUser, sendPushToAdmins } from "@/lib/push";
import { recordNotification } from "@/lib/notify-store";

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = process.env.TELEGRAM_ADMIN_CHAT_ID;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

const VENUE_ADDRESS = "Panchawati Complex, Plot 2, Biman Nagar, Kaikhali, Kolkata 700052";

/**
 * Welcome email the moment a new account is created (email/password signup OR
 * first Google sign-in). Best-effort — never blocks account creation. Uses the
 * same inbox-grade template language (From = authenticated Gmail, Reply-To,
 * List-Unsubscribe via sendMail) and greets the user by first name.
 */
export async function notifyWelcome(user: { email: string; name: string }): Promise<void> {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.breathepickleball.in";
    const firstName = (user.name || "there").trim().split(" ")[0] || "there";
    const html =
      `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0d1426">` +
      `<div style="text-align:center;margin-bottom:16px"><img src="${siteUrl}/icons/icon-192.png" alt="Breathe Pickleball" width="56" height="56" style="border-radius:14px"/></div>` +
      `<h2 style="text-align:center;margin:0 0 8px">Welcome, ${firstName} 🎾</h2>` +
      `<p style="color:#475569;line-height:1.6">Your Breathe Pickleball account is ready. Book any of our 3 pro courts in seconds, track your sessions &amp; streaks, and join tournaments — all from your dashboard.</p>` +
      `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">` +
      `<tr><td style="padding:6px 0;color:#64748b">Open daily</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#0d1426">5 AM – 11 PM</td></tr>` +
      `<tr><td style="padding:6px 0;color:#64748b">Equipment</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#0d1426">Paddles &amp; balls included</td></tr>` +
      `</table>` +
      `<p style="text-align:center;margin:24px 0"><a href="${siteUrl}/book" style="background:#2F5BFF;color:#fff;text-decoration:none;padding:13px 28px;border-radius:9999px;font-weight:700;display:inline-block">Book your first slot</a></p>` +
      `<p style="color:#475569;font-size:13px;line-height:1.6"><strong>Venue:</strong> ${VENUE_ADDRESS}</p>` +
      `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>` +
      `<p style="color:#94a3b8;font-size:12px">Breathe Pickleball · Panchwati Complex, Kaikhali, Kolkata</p>` +
      `</div>`;
    const text =
      `Welcome to Breathe Pickleball, ${firstName}!\n\n` +
      `Your account is ready. Book any of our 3 pro courts in seconds, track your sessions, and join tournaments.\n\n` +
      `Open daily 5 AM – 11 PM · paddles & balls included.\n\n` +
      `Book your first slot: ${siteUrl}/book\n\nVenue: ${VENUE_ADDRESS}`;
    const r = await sendMail({
      to: user.email,
      subject: `Welcome to Breathe Pickleball, ${firstName} 🎾`,
      html,
      text,
    });
    if (!r.ok) console.error("[welcome email failed]", r.error);
    else console.log("[welcome email sent]", { to: user.email, id: r.messageId });
  } catch (err) {
    console.error("[notifyWelcome error]", err);
  }
}

export async function notifyBookingConfirmed(b: {
  id: string;
  userId?: string;
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
  amountPaid?: number;
  sport?: string;
  /** When an order has several slots, a human summary of all of them. */
  slotsSummary?: string;
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
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.breathepickleball.in";

    const total = b.amount;
    const amountPaid = b.amountPaid !== undefined ? b.amountPaid : total;
    const dueAmount = Math.max(0, total - amountPaid);
    const sport = b.sport || "pickleball";

    // No GST charged — subtotal equals total.
    const subtotal = b.subtotal ?? total;
    const gst = 0;

    // Render PDF invoice (best-effort). TIME-BOXED: @react-pdf/renderer can hang
    // on the serverless runtime, and since the email send awaits this, a hang
    // would silently swallow the entire confirmation email. Race it against an
    // 8s timeout so the email ALWAYS goes out (with or without the attachment).
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await Promise.race<Buffer>([
        renderToBuffer(
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
            amountPaid={amountPaid}
            sport={sport}
          />,
        ),
        new Promise<Buffer>((_, reject) => setTimeout(() => reject(new Error("pdf render timeout")), 8000)),
      ]);
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

    let sportEmoji = "🎾";
    let sportName = "Pickleball";
    let displayCourt = b.courtNumber ? `Court ${b.courtNumber}` : "";
    if (sport === "cricket") {
      sportEmoji = "🏏";
      sportName = "Cricket Turf";
      displayCourt = "Cricket Turf (Courts 1, 2 & 3)";
    } else if (sport === "badminton") {
      sportEmoji = "🏸";
      sportName = "Badminton";
      displayCourt = "Badminton Court (Court 1)";
    }

    // 1. Player confirmation email with PDF attached.
    const courtRow = sport === "cricket"
      ? `<tr><td style="padding:6px 0;color:#64748b">Court</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#0d1426">Cricket Turf (Full Arena)</td></tr>`
      : b.courtNumber
      ? `<tr><td style="padding:6px 0;color:#64748b">Court</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#0d1426">Court ${b.courtNumber}</td></tr>`
      : "";

    const playerHtml =
      `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0d1426">` +
      `<div style="text-align:center;margin-bottom:16px"><img src="${siteUrl}/icons/icon-192.png" alt="Breathe Pickleball" width="56" height="56" style="border-radius:14px"/></div>` +
      `<h2 style="text-align:center;margin:0 0 4px">Booking confirmed ${sportEmoji}</h2>` +
      `<p style="text-align:center;color:#64748b;margin:0 0 20px">Reference ${shortRef}</p>` +
      `<p style="color:#475569;line-height:1.6">Hi ${b.userName}, your ${sportName} booking is confirmed. Here are your details:</p>` +
      `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">` +
      `<tr><td style="padding:6px 0;color:#64748b">Sport</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#0d1426">${sportName}</td></tr>` +
      `<tr><td style="padding:6px 0;color:#64748b">Date</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#0d1426">${dateStr}</td></tr>` +
      `<tr><td style="padding:6px 0;color:#64748b">Time</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#0d1426">${slotRange}</td></tr>` +
      courtRow +
      (b.slotsSummary
        ? `<tr><td style="padding:6px 0;color:#64748b;vertical-align:top">All slots</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#0d1426">${b.slotsSummary}</td></tr>`
        : "") +
      `<tr><td style="padding:6px 0;color:#64748b">Total court bill</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#0d1426">₹${total.toLocaleString("en-IN")}</td></tr>` +
      `<tr><td style="padding:6px 0;color:#64748b">Paid online (Advance)</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#22c55e">₹${amountPaid.toLocaleString("en-IN")}</td></tr>` +
      `<tr><td style="padding:6px 0;color:#64748b">Due amount at premises</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#ef4444">₹${dueAmount.toLocaleString("en-IN")}</td></tr>` +
      `</table>` +
      `<p style="background:#fef3c7;color:#92400e;padding:12px;border-radius:12px;font-size:13px;line-height:1.5;margin:16px 0">` +
      `<strong>Note:</strong> Only the ₹200 slot confirmation advance has been charged online. The remaining balance of <strong>₹${dueAmount}</strong> is payable at the venue after play.` +
      `</p>` +
      `<p style="text-align:center;margin:24px 0"><a href="${siteUrl}/dashboard?booking=${b.id}" style="background:#2F5BFF;color:#fff;text-decoration:none;padding:13px 28px;border-radius:9999px;font-weight:700;display:inline-block">View my booking</a></p>` +
      `<p style="color:#475569;font-size:13px;line-height:1.6"><strong>Venue:</strong> ${VENUE_ADDRESS}</p>` +
      `<p style="color:#94a3b8;font-size:12px;line-height:1.6">Free cancellation up to 4 hours before your slot. Your invoice is attached as a PDF.</p>` +
      `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>` +
      `<p style="color:#94a3b8;font-size:12px">Breathe Club · Panchwati Complex, Kaikhali, Kolkata</p>` +
      `</div>`;

    const playerText =
      `Hi ${b.userName},\n\n` +
      `Your ${sportName} booking is confirmed.\n\n` +
      `Date: ${dateStr}\n` +
      `Time: ${slotRange}\n` +
      (sport === "cricket" ? `Court: Cricket Turf\n` : b.courtNumber ? `Court: ${b.courtNumber}\n` : "") +
      `Total bill: Rs. ${total.toLocaleString("en-IN")}\n` +
      `Paid online: Rs. ${amountPaid.toLocaleString("en-IN")}\n` +
      `Due at venue: Rs. ${dueAmount.toLocaleString("en-IN")}\n` +
      `Reference: ${shortRef}\n\n` +
      `* Note: Only the ₹200 advance is paid. The remaining Rs. ${dueAmount} is payable on the club premises after play.\n\n` +
      `Venue: ${VENUE_ADDRESS}\n\n` +
      `Manage your booking: ${siteUrl}/dashboard\n\n` +
      `Free cancellation up to 4 hours before your slot.`;

    const playerResult = await sendMail({
      to: b.userEmail,
      subject: `Confirmed: ${sportName} - ${dateStr} at ${format12h(b.slotTime)} | Ref ${shortRef}`,
      html: playerHtml,
      text: playerText,
      attachments,
    });
    const emailed = playerResult.ok;
    if (!playerResult.ok) console.error("[player email failed]", playerResult.error);
    else console.log(`Player email sent for booking ${shortRef} (${playerResult.messageId})`);

    // 2. Admin notification email with the same PDF attached.
    if (ADMIN_EMAIL) {
      const courtLine = sport === "cricket" ? "Court: Cricket Turf\n" : b.courtNumber ? `Court: ${b.courtNumber}\n` : "";
      const phoneLine = b.userPhone ? `Phone: ${b.userPhone}\n` : "";
      const adminText =
        `New ${sportName} booking received.\n\n` +
        `Customer: ${b.userName}\n` +
        `${phoneLine}` +
        `Email: ${b.userEmail}\n` +
        `Sport: ${sportName}\n` +
        `Date: ${dateStr}\n` +
        `Time: ${slotRange}\n` +
        `${courtLine}` +
        `Total court bill: Rs. ${total.toLocaleString("en-IN")}\n` +
        `Paid online (Advance): Rs. ${amountPaid.toLocaleString("en-IN")}\n` +
        `Due at venue: Rs. ${dueAmount.toLocaleString("en-IN")}\n` +
        `Ref: ${shortRef}\n\n` +
        `Admin: ${siteUrl}/admin/customers`;

      const adminResult = await sendMail({
        to: ADMIN_EMAIL,
        subject: `New booking: ${b.userName} (${sportName}) — ${b.slotDate} ${b.slotTime}`,
        text: adminText,
        attachments,
      });
      if (!adminResult.ok) console.error("[admin email failed]", adminResult.error);
      else console.log(`Admin email sent for booking ${shortRef} (${adminResult.messageId})`);
    } else {
      console.warn("ADMIN_EMAIL not configured — skipping admin email notification.");
    }

    // 3. Telegram alert.
    if (TG_TOKEN && TG_CHAT) {
      const courtText = sport === "cricket" ? " · Cricket Turf" : b.courtNumber ? ` · Court ${b.courtNumber}` : "";
      const phoneText = b.userPhone ? ` (${b.userPhone})` : "";
      const msg = `🎾 *New ${sportName} Booking*\n${b.userName}${phoneText}\n📅 ${dateStr}\n⏰ ${slotRange}${courtText}\n💰 Total: ₹${total} · Paid: ₹${amountPaid} · Due: ₹${dueAmount}\nRef: ${shortRef}`;

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

    // 4. Web-push + persistent inbox: the player's PWA + every admin device.
    try {
      const courtText = displayCourt ? ` · ${displayCourt}` : "";
      const userBody = `${sportName} · ${dateStr} · ${slotRange}${courtText}`;
      const adminBody = `${b.userName} booked ${sportName} — ${dateStr} ${slotRange}${courtText} · ₹${total.toLocaleString("en-IN")}`;
      if (b.userId) {
        await sendPushToUser(b.userId, {
          title: "Booking confirmed 🎾",
          body: userBody,
          url: `/dashboard?booking=${b.id}`,
          tag: `booking-${b.id}`,
        }).catch(() => {});
        await recordNotification({ userId: b.userId, role: "user", title: "Booking confirmed 🎾", body: userBody, url: `/dashboard?booking=${b.id}` });
      }
      await sendPushToAdmins({ title: `New ${sportName} booking`, body: adminBody, url: "/admin", tag: `admin-booking-${b.id}` }).catch(() => {});
      await recordNotification({ role: "admin", title: `New ${sportName} booking`, body: adminBody, url: "/admin" });
    } catch (pushErr) {
      console.error("[push dispatch error]", pushErr);
    }

    return { emailed };
  } catch (err) {
    console.error("[notification dispatcher error]", err);
    return { emailed: false };
  }
}

/** Booking-cancelled email to the player + a heads-up to the admin inbox. */
export async function notifyBookingCancelled(b: {
  id: string;
  userId?: string;
  userEmail: string;
  userName: string;
  slotDate: string;
  slotTime: string;
  courtNumber?: number;
  amount?: number;
  refunded?: boolean;
  sport?: string;
}): Promise<{ emailed: boolean }> {
  try {
    const dateStr = new Date(b.slotDate).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
    const shortRef = b.id.slice(0, 8).toUpperCase();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.breathepickleball.in";

    let sportName = "Pickleball";
    let displayCourt = b.courtNumber ? `Court ${b.courtNumber}` : "";
    if (b.sport === "cricket") {
      sportName = "Cricket Turf";
      displayCourt = "Cricket Turf (Courts 1, 2 & 3)";
    } else if (b.sport === "badminton") {
      sportName = "Badminton";
      displayCourt = "Badminton Court (Court 1)";
    }

    const court = displayCourt ? ` · ${displayCourt}` : "";

    const html =
      `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0d1426">` +
      `<div style="text-align:center;margin-bottom:16px"><img src="${siteUrl}/icons/icon-192.png" alt="Breathe Pickleball" width="64" height="64" style="border-radius:16px"/></div>` +
      `<h2 style="text-align:center;margin:0 0 8px">Booking cancelled</h2>` +
      `<p style="color:#475569;line-height:1.6">Hi ${b.userName}, your booking for <strong>${sportName}</strong> on <strong>${dateStr}</strong> at <strong>${format12h(b.slotTime)}</strong>${court} has been cancelled. The slot is now open again.</p>` +
      (b.amount ? `<p style="color:#475569">Any eligible refund will be processed per our cancellation policy.</p>` : "") +
      `<p style="color:#94a3b8;font-size:13px">Reference: ${shortRef}</p>` +
      `<p style="text-align:center;margin-top:20px"><a href="${siteUrl}/book" style="background:#2F5BFF;color:#fff;text-decoration:none;padding:12px 24px;border-radius:9999px;font-weight:700">Book another slot</a></p>` +
      `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>` +
      `<p style="color:#94a3b8;font-size:12px">Breathe Pickleball · Panchwati Complex, Kaikhali, Kolkata</p>` +
      `</div>`;
    const text =
      `Hi ${b.userName},\n\n` +
      `Your booking for ${sportName} on ${dateStr} at ${format12h(b.slotTime)}${court} has been cancelled. The slot is now open again.\n\n` +
      (b.amount ? `Any eligible refund will be processed per our cancellation policy.\n\n` : "") +
      `Reference: ${shortRef}\n\nBook another slot: ${siteUrl}/book`;

    const result = await sendMail({
      to: b.userEmail,
      subject: `Cancelled: ${sportName} - ${dateStr} at ${format12h(b.slotTime)} | Ref ${shortRef}`,
      html,
      text,
    });
    if (ADMIN_EMAIL) {
      await sendMail({
        to: ADMIN_EMAIL,
        subject: `Booking cancelled: ${b.userName} (${sportName}) — ${b.slotDate} ${b.slotTime}`,
        text: `${b.userName} (${b.userEmail}) cancelled their booking for ${sportName} on ${dateStr} at ${format12h(b.slotTime)}${court}. Ref ${shortRef}.`,
      }).catch((e) => console.error("[cancel admin email error]", e));
    }

    // Web-push + inbox for the cancellation (player) and a heads-up to admins.
    try {
      const refundLine = b.refunded ? " · refund processed" : b.amount ? " · refund being processed" : "";
      const userBody = `${dateStr} at ${format12h(b.slotTime)}${court} was cancelled${refundLine}.`;
      if (b.userId) {
        await sendPushToUser(b.userId, { title: "Booking cancelled", body: userBody, url: "/dashboard", tag: `cancel-${b.id}` }).catch(() => {});
        await recordNotification({ userId: b.userId, role: "user", title: "Booking cancelled", body: userBody, url: "/dashboard" });
      }
      const adminBody = `${b.userName} cancelled ${dateStr} ${format12h(b.slotTime)}${court}${refundLine}.`;
      await sendPushToAdmins({ title: "Booking cancelled", body: adminBody, url: "/admin", tag: `admin-cancel-${b.id}` }).catch(() => {});
      await recordNotification({ role: "admin", title: "Booking cancelled", body: adminBody, url: "/admin" });
    } catch (pushErr) {
      console.error("[cancel push dispatch error]", pushErr);
    }

    return { emailed: result.ok };
  } catch (err) {
    console.error("[notifyBookingCancelled error]", err);
    return { emailed: false };
  }
}

export async function notifyOutstandingDue(b: {
  id: string;
  userEmail: string;
  userName: string;
  slotDate: string;
  slotTime: string;
  durationMin: number;
  total: number;
  amountPaid: number;
  sport?: string;
  courtNumber?: number;
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
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.breathepickleball.in";

    const total = b.total;
    const amountPaid = b.amountPaid;
    const dueAmount = Math.max(0, total - amountPaid);
    const sport = b.sport || "pickleball";
    const sportName = sport.charAt(0).toUpperCase() + sport.slice(1);
    const sportEmoji = sport === "cricket" ? "🏏" : sport === "badminton" ? "🏸" : "🎾";

    const html =
      `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0d1426">` +
      `<div style="text-align:center;margin-bottom:16px"><img src="${siteUrl}/icons/icon-192.png" alt="Breathe Pickleball" width="56" height="56" style="border-radius:14px"/></div>` +
      `<h2 style="text-align:center;margin:0 0 4px">Outstanding Dues Reminder ${sportEmoji}</h2>` +
      `<p style="text-align:center;color:#64748b;margin:0 0 20px">Reference ${shortRef}</p>` +
      `<p style="color:#475569;line-height:1.6">Hi ${b.userName}, thank you for playing at Breathe Club! This is a gentle reminder regarding the outstanding balance for your recent ${sportName} session:</p>` +
      `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">` +
      `<tr><td style="padding:6px 0;color:#64748b">Sport</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#0d1426">${sportName}</td></tr>` +
      `<tr><td style="padding:6px 0;color:#64748b">Date</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#0d1426">${dateStr}</td></tr>` +
      `<tr><td style="padding:6px 0;color:#64748b">Time</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#0d1426">${slotRange}</td></tr>` +
      `<tr><td style="padding:6px 0;color:#64748b">Total court bill</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#0d1426">₹${total.toLocaleString("en-IN")}</td></tr>` +
      `<tr><td style="padding:6px 0;color:#64748b">Paid online (Advance)</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#22c55e">₹${amountPaid.toLocaleString("en-IN")}</td></tr>` +
      `<tr><td style="padding:6px 0;color:#64748b">Outstanding Due</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#ef4444">₹${dueAmount.toLocaleString("en-IN")}</td></tr>` +
      `</table>` +
      `<p style="background:#fef3c7;color:#92400e;padding:12px;border-radius:12px;font-size:13px;line-height:1.5;margin:16px 0">` +
      `Please settle the outstanding balance of <strong>₹${dueAmount}</strong> at the club premises if you haven't already. You can pay via UPI, card, or cash at the reception.` +
      `</p>` +
      `<p style="color:#475569;font-size:13px;line-height:1.6"><strong>Venue:</strong> ${VENUE_ADDRESS}</p>` +
      `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>` +
      `<p style="color:#94a3b8;font-size:12px">Breathe Club · Panchwati Complex, Kaikhali, Kolkata</p>` +
      `</div>`;

    const text =
      `Hi ${b.userName},\n\n` +
      `This is a reminder to settle your outstanding balance for your recent ${sportName} session at Breathe Club.\n\n` +
      `Date: ${dateStr}\n` +
      `Time: ${slotRange}\n` +
      `Total bill: Rs. ${total.toLocaleString("en-IN")}\n` +
      `Paid online (Advance): Rs. ${amountPaid.toLocaleString("en-IN")}\n` +
      `Outstanding Due: Rs. ${dueAmount.toLocaleString("en-IN")}\n` +
      `Reference: ${shortRef}\n\n` +
      `Please settle the outstanding amount of Rs. ${dueAmount} at the club premises via UPI, card, or cash if you haven't done so already.\n\n` +
      `Venue: ${VENUE_ADDRESS}`;

    const result = await sendMail({
      to: b.userEmail,
      subject: `Outstanding Balance Reminder | Ref ${shortRef}`,
      html,
      text,
    });
    return { emailed: result.ok };
  } catch (err) {
    console.error("[notifyOutstandingDue error]", err);
    return { emailed: false };
  }
}

/**
 * Fan-out for any admin-side action (member added, slot blocked, expense
 * recorded, notice/tournament published, dues cleared, …). Writes the shared
 * admin inbox feed, pushes to every admin device, and emails ADMIN_EMAIL.
 * Best-effort: every channel is independently guarded so one failure never
 * blocks the others, and the whole thing never throws to the caller.
 *
 * NOTE: this was previously imported by several admin routes but never defined,
 * so admin-console notifications silently no-op'd. Defining it restores the
 * admin inbox + push for those actions.
 */
export async function notifyAdminAction(
  title: string,
  body: string,
  opts?: { actor?: string; url?: string },
): Promise<void> {
  const url = opts?.url || "/admin";
  const detail = opts?.actor ? `${body} · by ${opts.actor}` : body;

  // 1. Persistent admin inbox (drives the console notification bell).
  try {
    await recordNotification({ role: "admin", title, body: detail, url });
  } catch (e) {
    console.error("[notifyAdminAction inbox error]", e);
  }

  // 2. Web-push to every admin device.
  try {
    await sendPushToAdmins({ title, body: detail, url, tag: `admin-${Date.now()}` });
  } catch (e) {
    console.error("[notifyAdminAction push error]", e);
  }

  // 3. Email the owner (best-effort).
  if (ADMIN_EMAIL) {
    try {
      await sendMail({
        to: ADMIN_EMAIL,
        subject: `Breathe Admin — ${title}`,
        text: `${title}\n\n${detail}\n\nOpen the console: ${
          process.env.NEXT_PUBLIC_SITE_URL || "https://www.breathepickleball.in"
        }${url}`,
      });
    } catch (e) {
      console.error("[notifyAdminAction email error]", e);
    }
  }
}

/**
 * Sent when the admin marks a booking's outstanding dues as cleared (paid at
 * the club). Emails the player a thank-you / dues-cleared receipt and drops a
 * confirmation into their portal inbox + a push to their devices.
 */
export async function notifyDuesCleared(b: {
  id: string;
  userId?: string;
  userEmail: string;
  userName: string;
  slotDate: string;
  slotTime: string;
  durationMin?: number;
  total: number;
  sport?: string;
  courtNumber?: number;
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
    const slotRange = b.durationMin
      ? `${format12h(b.slotTime)} – ${format12h(computeEndTime(b.slotTime, b.durationMin))}`
      : format12h(b.slotTime);
    const shortRef = b.id.slice(0, 8).toUpperCase();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.breathepickleball.in";
    const firstName = (b.userName || "there").trim().split(" ")[0];
    const sport = b.sport || "pickleball";
    const sportName = sport.charAt(0).toUpperCase() + sport.slice(1);
    const total = b.total;

    const html =
      `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0d1426">` +
      `<div style="text-align:center;margin-bottom:16px"><img src="${siteUrl}/icons/icon-192.png" alt="Breathe Pickleball" width="56" height="56" style="border-radius:14px"/></div>` +
      `<h2 style="text-align:center;margin:0 0 4px">Dues cleared ✅</h2>` +
      `<p style="text-align:center;color:#64748b;margin:0 0 20px">Reference ${shortRef}</p>` +
      `<p style="color:#475569;line-height:1.6">Hi ${firstName}, thank you! We've received the full payment for your ${sportName} session — your account is now fully settled. We hope you had a great game and look forward to seeing you on the court again soon. 🎾</p>` +
      `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">` +
      `<tr><td style="padding:6px 0;color:#64748b">Sport</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#0d1426">${sportName}</td></tr>` +
      `<tr><td style="padding:6px 0;color:#64748b">Date</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#0d1426">${dateStr}</td></tr>` +
      `<tr><td style="padding:6px 0;color:#64748b">Time</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#0d1426">${slotRange}</td></tr>` +
      `<tr><td style="padding:6px 0;color:#64748b">Total bill</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#0d1426">₹${total.toLocaleString("en-IN")}</td></tr>` +
      `<tr><td style="padding:6px 0;color:#64748b">Status</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#22c55e">Fully paid</td></tr>` +
      `</table>` +
      `<p style="background:#dcfce7;color:#166534;padding:12px;border-radius:12px;font-size:13px;line-height:1.5;margin:16px 0">No outstanding balance remains on this booking. Thank you for choosing Breathe Club!</p>` +
      `<p style="text-align:center;margin:24px 0"><a href="${siteUrl}/dashboard" style="background:#2F5BFF;color:#fff;text-decoration:none;padding:13px 28px;border-radius:9999px;font-weight:700;display:inline-block">View my bookings</a></p>` +
      `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>` +
      `<p style="color:#94a3b8;font-size:12px">Breathe Club · Panchwati Complex, Kaikhali, Kolkata</p>` +
      `</div>`;

    const text =
      `Hi ${firstName},\n\n` +
      `Thank you! We've received full payment for your ${sportName} session — your account is now fully settled.\n\n` +
      `Date: ${dateStr}\n` +
      `Time: ${slotRange}\n` +
      `Total bill: Rs. ${total.toLocaleString("en-IN")}\n` +
      `Status: Fully paid (no dues remaining)\n` +
      `Reference: ${shortRef}\n\n` +
      `We hope you had a great game and look forward to seeing you again soon!\n\n` +
      `Venue: ${VENUE_ADDRESS}`;

    const result = await sendMail({
      to: b.userEmail,
      subject: `Dues cleared — thank you! | Ref ${shortRef}`,
      html,
      text,
    });

    // Portal inbox + push to the player's devices.
    try {
      const inboxBody = `Your dues for ${sportName} on ${dateStr} are cleared. Account fully settled — thank you!`;
      if (b.userId) {
        await sendPushToUser(b.userId, {
          title: "Dues cleared ✅",
          body: inboxBody,
          url: `/dashboard?booking=${b.id}`,
          tag: `dues-${b.id}`,
        }).catch(() => {});
        await recordNotification({
          userId: b.userId,
          role: "user",
          title: "Dues cleared ✅",
          body: inboxBody,
          url: `/dashboard?booking=${b.id}`,
        });
      }
    } catch (pushErr) {
      console.error("[notifyDuesCleared push error]", pushErr);
    }

    return { emailed: result.ok };
  } catch (err) {
    console.error("[notifyDuesCleared error]", err);
    return { emailed: false };
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
