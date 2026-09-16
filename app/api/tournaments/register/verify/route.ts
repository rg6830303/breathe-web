import { NextResponse } from "next/server";
import crypto from "node:crypto";
import Razorpay from "razorpay";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { ensureSchema } from "@/lib/db/ensure";
import { ensureTournamentSchema } from "@/lib/db/tournament-schema";
import { tournamentRegistrationSchema, formatZodError } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Confirm a paid tournament registration and write the entry.
 *
 * Payment verification mirrors /api/bookings/verify-payment: with a
 * RAZORPAY_KEY_SECRET the HMAC signature MUST match; with only the public key
 * (direct checkout) we accept the payment id the gateway returned.
 */
export async function POST(req: Request) {
  try {
    await ensureSchema().catch(() => {});
    await ensureTournamentSchema().catch(() => {});
    // No session required — tournament entry is open to guests.
    const session = await getSession();

    const body = await req.json().catch(() => ({}));
    const parsed = tournamentRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const {
      tournament_id, category, skill_level, phone, partner_name, notes,
      player_name, email, age, sex, photo_url, dupr_id, dupr_level,
    } = parsed.data;

    const orderId = String(body.orderId ?? "");
    const paymentId = String(body.paymentId ?? "");
    const signature = String(body.signature ?? "");

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (secret) {
      if (!orderId || !paymentId || !signature) {
        return NextResponse.json({ error: "Missing payment fields." }, { status: 400 });
      }
      const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
      if (expected !== signature) {
        return NextResponse.json({ error: "Invalid payment signature." }, { status: 401 });
      }
    } else if (!paymentId) {
      return NextResponse.json({ error: "Missing payment reference." }, { status: 400 });
    }

    // Re-read the tournament (never trust a client-sent fee).
    let t: Record<string, unknown> | undefined;
    try {
      const r = await turso.execute({
        sql: "SELECT id, name, event_date, fee, status, active FROM tournaments WHERE id = ? LIMIT 1",
        args: [tournament_id],
      });
      t = r.rows[0] as Record<string, unknown> | undefined;
    } catch (dbErr) {
      console.error("[tournament verify lookup error]", dbErr);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
    if (!t || Number(t.active) !== 1 || String(t.status) !== "open") {
      return NextResponse.json({ error: "That tournament isn't open for registration." }, { status: 400 });
    }
    const fee = Math.max(0, Number(t.fee) || 0);

    // A logged-in player's name/email come from their account (a client can't
    // register someone else under their session); a guest's come from the form.
    let userName = player_name;
    let userEmail = email;
    if (session) {
      try {
        const u = await turso.execute({
          sql: "SELECT full_name, email FROM users WHERE id = ? LIMIT 1",
          args: [session.id],
        });
        const row = u.rows[0];
        if (row) {
          userName = String(row.full_name ?? userName);
          userEmail = String(row.email ?? userEmail).toLowerCase();
        }
      } catch (dbErr) {
        console.error("[tournament verify user fetch error]", dbErr);
      }
    }

    const id = uuid();
    const now = Date.now();
    const INSERT_SQL = `INSERT INTO tournament_registrations (
                id, tournament_id, user_id, player_name, email, phone,
                age, sex, photo_url, dupr_id, dupr_level,
                category, skill_level, partner_name, notes,
                fee, amount_paid, payment_id, status, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)`;
    const argsFor = (userId: string | null) => [
      id, tournament_id, userId, userName, userEmail, phone,
      age, sex, photo_url, dupr_id || null, dupr_level || null,
      category, skill_level, partner_name || null, notes || null,
      fee, amountPaid, paymentId || null, now,
    ];

    /**
     * What was ACTUALLY captured, asked of Razorpay rather than assumed from
     * the event's fee. If the gateway cannot be reached we fall back to the
     * fee, and the admin console shows any mismatch between the two.
     */
    let amountPaid = fee;
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    if (secret && keyId && paymentId) {
      try {
        const rzp = new Razorpay({ key_id: keyId, key_secret: secret });
        const p = (await rzp.payments.fetch(paymentId)) as unknown as { amount?: number };
        const paise = Number(p?.amount ?? 0);
        if (paise > 0) amountPaid = Math.round(paise / 100);
      } catch (rzpErr) {
        console.error("[tournament verify amount fetch error]", rzpErr);
      }
    }

    /**
     * Complete the entry that create-order parked against this order. This is
     * the normal path: the row already holds the entrant's whole form, so
     * confirming it needs no re-insert and cannot lose anything.
     */
    if (orderId) {
      try {
        const done = await turso.execute({
          sql: `UPDATE tournament_registrations
                SET status = 'confirmed', payment_id = ?, amount_paid = ?
                WHERE order_id = ? AND status = 'pending'`,
          args: [paymentId || null, amountPaid, orderId],
        });
        if (done.rowsAffected) {
          const existing = await turso.execute({
            sql: "SELECT id FROM tournament_registrations WHERE order_id = ? LIMIT 1",
            args: [orderId],
          });
          const rowId = existing.rows[0] ? String(existing.rows[0].id) : id;
          notifyEntry(rowId, userName, userEmail, t, category, skill_level, partner_name, amountPaid, session?.id);
          return NextResponse.json({ ok: true, id: rowId, fee: amountPaid, tournamentName: String(t.name) });
        }
      } catch (dbErr) {
        console.error("[tournament verify confirm pending error]", dbErr);
      }
    }

    /**
     * Write the entry. The player has ALREADY paid by this point, so an entry
     * must never be lost to a schema problem: we retry down a ladder of
     * progressively simpler inserts, and if every one of them fails we alert
     * the club with the payment reference rather than dropping it silently.
     */
    const LEGACY_SQL = `INSERT INTO tournament_registrations (
                id, tournament_id, user_id, player_name, email, phone,
                category, skill_level, partner_name, notes,
                fee, amount_paid, payment_id, status, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)`;
    const legacyArgs = (userId: string | null) => [
      id, tournament_id, userId, userName, userEmail, phone,
      category, skill_level, partner_name || null,
      // The detail the legacy columns can't hold still reaches the club.
      [notes || "", `age ${age}`, sex, dupr_id ? `DUPR ${dupr_id}` : "", dupr_level ? `level ${dupr_level}` : ""]
        .filter(Boolean)
        .join(" · "),
      fee, amountPaid, paymentId || null, now,
    ];

    type Attempt = { label: string; sql: string; args: unknown[] };
    const attempts: Attempt[] = [
      { label: "full", sql: INSERT_SQL, args: argsFor(session?.id ?? null) },
      // Older database where user_id is still NOT NULL and the entrant is a guest.
      { label: "full+guest-id", sql: INSERT_SQL, args: argsFor(session ? session.id : `guest-${id}`) },
      // Database that never got the age/sex/photo/DUPR columns.
      { label: "legacy", sql: LEGACY_SQL, args: legacyArgs(session?.id ?? null) },
      { label: "legacy+guest-id", sql: LEGACY_SQL, args: legacyArgs(session ? session.id : `guest-${id}`) },
    ];

    let wrote: string | null = null;
    let lastErr: unknown = null;
    for (const attempt of attempts) {
      try {
        await turso.execute({ sql: attempt.sql, args: attempt.args });
        wrote = attempt.label;
        break;
      } catch (insertErr) {
        lastErr = insertErr;
        const msg = String((insertErr as Error)?.message ?? "").toLowerCase();
        // A duplicate is a real answer, not a schema problem — stop retrying.
        if (msg.includes("unique") || msg.includes("duplicate")) {
          return NextResponse.json(
            { error: "That email is already registered for this tournament." },
            { status: 409 },
          );
        }
        console.error(`[tournament verify insert failed: ${attempt.label}]`, insertErr);
      }
    }

    if (!wrote) {
      // Paid, but unwritable. Shout about it: the club gets the payment id and
      // the entrant's details so the entry can be reconstructed by hand, and
      // the entrant is told their money is safe and who to contact.
      console.error("[tournament verify ALL INSERTS FAILED]", {
        paymentId,
        tournament_id,
        email: userEmail,
        lastErr,
      });
      try {
        const { notifyAdminAction } = require("@/lib/notifications");
        if (notifyAdminAction) {
          await notifyAdminAction(
            "URGENT: paid tournament entry could not be saved",
            `${userName} · ${userEmail} · ${phone} · ${String(t.name)} · ₹${fee} · payment ${paymentId || "?"}. ` +
              `Add this entry manually — the payment succeeded but the database write failed.`,
            { url: "/admin" },
          ).catch(() => {});
        }
      } catch {
        // Notification is best-effort; the console.error above is the record.
      }
      return NextResponse.json(
        {
          error:
            `Your payment went through (ref ${paymentId || "—"}) but we couldn't save your entry. ` +
            `Please contact the club with that reference — you will not be charged again.`,
        },
        { status: 500 },
      );
    }
    if (wrote !== "full") console.warn(`[tournament verify insert used fallback: ${wrote}]`);

    notifyEntry(id, userName, userEmail, t, category, skill_level, partner_name, amountPaid, session?.id);

    return NextResponse.json({ ok: true, id, fee: amountPaid, tournamentName: String(t.name) });
  } catch (err) {
    console.error("[tournament verify error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

/**
 * Confirmation email + inbox/push + admin ping, fired in the background so a
 * slow SMTP never delays (or fails) the response the entrant is waiting on.
 * Shared by both completion paths: confirming the pending row, and inserting.
 */
function notifyEntry(
  id: string,
  userName: string,
  userEmail: string,
  t: Record<string, unknown>,
  category: string,
  skillLevel: string | undefined,
  partnerName: string | undefined,
  amountPaid: number,
  userId?: string,
) {
  try {
    const { notifyTournamentRegistration, notifyAdminAction } = require("@/lib/notifications");
    const { waitUntil } = require("@vercel/functions");
    const run = (async () => {
      if (notifyTournamentRegistration) {
        await notifyTournamentRegistration({
          id,
          userId,
          userEmail,
          userName,
          tournamentName: String(t.name),
          eventDate: t.event_date ? String(t.event_date) : null,
          category,
          skillLevel,
          partnerName: partnerName || null,
          fee: amountPaid,
        }).catch((e: unknown) => console.error("[tournament notify error]", e));
      }
      if (notifyAdminAction) {
        await notifyAdminAction(
          "Tournament registration",
          `${userName} · ${String(t.name)} · ${category.replace("_", " ")} · ₹${amountPaid}`,
          { url: "/admin" },
        ).catch(() => {});
      }
    })();
    if (waitUntil) waitUntil(run);
  } catch (e) {
    console.warn("[tournament notify dispatch skipped]", e);
  }
}
