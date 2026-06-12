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
  sport?: string;
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
    // No GST charged — subtotal equals total.
    const subtotal = b.subtotal ?? total;
    const gst = 0;

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
          sport={b.sport}
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

    let sportEmoji = "🎾";
    let sportName = "Pickleball";
    let displayCourt = b.courtNumber ? `Court ${b.courtNumber}` : "";
    if (b.sport === "cricket") {
      sportEmoji = "🏏";
      sportName = "Cricket Turf";
      displayCourt = "Cricket Turf (Courts 1, 2 & 3)";
    } else if (b.sport === "badminton") {
      sportEmoji = "🏸";
      sportName = "Badminton";
      displayCourt = "Badminton Court (Court 1)";
    }

    // 1. Player confirmation email with PDF attached.
    const courtRow = displayCourt
      ? `<tr><td style="padding:6px 0;color:#64748b">Court / Turf</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#0d1426">${displayCourt}</td></tr>`
      : "";
    const playerHtml =
      `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0d1426">` +
      `<div style="text-align:center;margin-bottom:16px"><img src="${siteUrl}/icons/icon-192.png" alt="Breathe Pickleball" width="56" height="56" style="border-radius:14px"/></div>` +
      `<h2 style="text-align:center;margin:0 0 4px">${sportName} Booking Confirmed ${sportEmoji}</h2>` +
      `<p style="text-align:center;color:#64748b;margin:0 0 20px">Reference ${shortRef}</p>` +
      `<p style="color:#475569;line-height:1.6">Hi ${b.userName}, your booking is confirmed. Here are the details:</p>` +
      `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">` +
      `<tr><td style="padding:6px 0;color:#64748b">Sport</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#0d1426">${sportName}</td></tr>` +
      `<tr><td style="padding:6px 0;color:#64748b">Date</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#0d1426">${dateStr}</td></tr>` +
      `<tr><td style="padding:6px 0;color:#64748b">Time</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#0d1426">${slotRange}</td></tr>` +
      courtRow +
      `<tr><td style="padding:6px 0;color:#64748b">Amount paid</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#0d1426">₹${total.toLocaleString("en-IN")}</td></tr>` +
      `</table>` +
      `<p style="text-align:center;margin:24px 0"><a href="${siteUrl}/dashboard?booking=${b.id}" style="background:#2F5BFF;color:#fff;text-decoration:none;padding:13px 28px;border-radius:9999px;font-weight:700;display:inline-block">View my booking</a></p>` +
      `<p style="color:#475569;font-size:13px;line-height:1.6"><strong>Venue:</strong> ${VENUE_ADDRESS}</p>` +
      `<p style="color:#94a3b8;font-size:12px;line-height:1.6">Free cancellation up to 4 hours before your slot. Your invoice is attached as a PDF.</p>` +
      `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>` +
      `<p style="color:#94a3b8;font-size:12px">Breathe Pickleball · Panchwati Complex, Kaikhali, Kolkata</p>` +
      `</div>`;

    const playerText =
      `Hi ${b.userName},\n\n` +
      `Your ${sportName} booking is confirmed.\n\n` +
      `Sport: ${sportName}\n` +
      `Date: ${dateStr}\n` +
      `Time: ${slotRange}\n` +
      (displayCourt ? `Location: ${displayCourt}\n` : "") +
      `Amount: Rs. ${total.toLocaleString("en-IN")}\n` +
      `Reference: ${shortRef}\n\n` +
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
      const courtLine = displayCourt ? `Location: ${displayCourt}\n` : "";
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
        `Amount: Rs. ${total.toLocaleString("en-IN")}\n` +
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

    // 3. Telegram alert (unchanged).
    if (TG_TOKEN && TG_CHAT) {
      const courtText = displayCourt ? ` · ${displayCourt}` : "";
      const phoneText = b.userPhone ? ` (${b.userPhone})` : "";
      const msg = `🎾 *New ${sportName} Booking*\n${b.userName}${phoneText}\n📅 ${dateStr}\n⏰ ${slotRange}${courtText}\n💰 ₹${total.toLocaleString("en-IN")}\nRef: ${shortRef}`;

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

/**
 * Owner confirmation for an action taken in the admin console (slot blocks,
 * walk-ins, user/expense/tournament/notice changes …). Emails ADMIN_EMAIL,
 * drops a persistent inbox entry, and pushes to every admin device — so the
 * owner has a durable record of "what changed" in their Gmail. Never throws.
 */
export async function notifyAdminAction(
  action: string,
  detail: string,
  opts?: { actor?: string },
): Promise<void> {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.breathepickleball.in";
    const when = new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    });
    const actor = opts?.actor ? ` · ${opts.actor}` : "";

    if (ADMIN_EMAIL) {
      const html =
        `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0d1426">` +
        `<div style="text-align:center;margin-bottom:16px"><img src="${siteUrl}/icons/icon-192.png" alt="Breathe Pickleball" width="56" height="56" style="border-radius:14px"/></div>` +
        `<h2 style="text-align:center;margin:0 0 4px">Admin action confirmed</h2>` +
        `<p style="text-align:center;color:#64748b;margin:0 0 20px">${when} IST${actor}</p>` +
        `<table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:14px">` +
        `<tr><td style="padding:6px 0;color:#64748b">Action</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#0d1426">${action}</td></tr>` +
        `<tr><td style="padding:6px 0;color:#64748b">Details</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#0d1426">${detail}</td></tr>` +
        `</table>` +
        `<p style="text-align:center;margin:24px 0"><a href="${siteUrl}/admin" style="background:#2F5BFF;color:#fff;text-decoration:none;padding:12px 24px;border-radius:9999px;font-weight:700;display:inline-block">Open admin console</a></p>` +
        `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>` +
        `<p style="color:#94a3b8;font-size:12px">Breathe Pickleball · automated admin confirmation</p>` +
        `</div>`;
      const text =
        `Admin action confirmed (${when} IST)${actor}\n\n` +
        `Action: ${action}\nDetails: ${detail}\n\n` +
        `Console: ${siteUrl}/admin`;
      await sendMail({ to: ADMIN_EMAIL, subject: `Admin: ${action} — ${detail}`.slice(0, 120), html, text })
        .then((r) => {
          if (!r.ok) console.error("[admin action email failed]", r.error);
        })
        .catch((e) => console.error("[admin action email error]", e));
    } else {
      console.warn("ADMIN_EMAIL not set — skipping admin action email.");
    }

    await recordNotification({ role: "admin", title: action, body: detail, url: "/admin" }).catch(() => {});
    await sendPushToAdmins({ title: `Admin: ${action}`, body: detail, url: "/admin", tag: `admin-action-${Date.now()}` }).catch(() => {});
  } catch (err) {
    console.error("[notifyAdminAction error]", err);
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
