import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { ensureSchema } from "@/lib/db/ensure";
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
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Please log in to register." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const parsed = tournamentRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const { tournament_id, category, skill_level, phone, partner_name, notes } = parsed.data;

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

    // Player details come from the account, not the client payload.
    let userName = session.name;
    let userEmail = session.email;
    try {
      const u = await turso.execute({
        sql: "SELECT full_name, email FROM users WHERE id = ? LIMIT 1",
        args: [session.id],
      });
      const row = u.rows[0];
      if (row) {
        userName = String(row.full_name ?? userName);
        userEmail = String(row.email ?? userEmail);
      }
    } catch (dbErr) {
      console.error("[tournament verify user fetch error]", dbErr);
    }

    const id = uuid();
    const now = Date.now();
    try {
      await turso.execute({
        sql: `INSERT INTO tournament_registrations (
                id, tournament_id, user_id, player_name, email, phone,
                category, skill_level, partner_name, notes,
                fee, amount_paid, payment_id, status, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)`,
        args: [
          id,
          tournament_id,
          session.id,
          userName,
          userEmail,
          phone,
          category,
          skill_level,
          partner_name || null,
          notes || null,
          fee,
          fee,
          paymentId || null,
          now,
        ],
      });
    } catch (insertErr) {
      // The partial unique index makes a duplicate confirmed entry impossible;
      // treat a collision as "already registered" rather than a server error.
      const msg = String((insertErr as Error)?.message ?? "").toLowerCase();
      if (msg.includes("unique") || msg.includes("duplicate")) {
        return NextResponse.json({ error: "You're already registered for this category." }, { status: 409 });
      }
      console.error("[tournament verify insert error]", insertErr);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    // Confirmation email + inbox/push, in the background so a slow SMTP never
    // blocks (or fails) the response.
    try {
      const { notifyTournamentRegistration, notifyAdminAction } = require("@/lib/notifications");
      const { waitUntil } = require("@vercel/functions");
      const run = (async () => {
        if (notifyTournamentRegistration) {
          await notifyTournamentRegistration({
            id,
            userId: session.id,
            userEmail,
            userName,
            tournamentName: String(t.name),
            eventDate: t.event_date ? String(t.event_date) : null,
            category,
            skillLevel: skill_level,
            partnerName: partner_name || null,
            fee,
          }).catch((e: unknown) => console.error("[tournament notify error]", e));
        }
        if (notifyAdminAction) {
          await notifyAdminAction(
            "Tournament registration",
            `${userName} · ${String(t.name)} · ${category.replace("_", " ")} · ₹${fee}`,
            { url: "/admin" },
          ).catch(() => {});
        }
      })();
      if (waitUntil) waitUntil(run);
      else await run;
    } catch (e) {
      console.warn("[tournament notify dispatch skipped]", e);
    }

    return NextResponse.json({ ok: true, id, fee, tournamentName: String(t.name) });
  } catch (err) {
    console.error("[tournament verify error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
