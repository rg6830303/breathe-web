import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { v4 as uuid } from "uuid";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { ensureSchema } from "@/lib/db/ensure";
import { ensureTournamentSchema } from "@/lib/db/tournament-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Recover tournament entries whose payment succeeded but whose row was never
 * written — the case that lost a paid ₹1,200 entry while the
 * tournament_registrations table was missing from the database.
 *
 * The entry is not gone: /api/tournaments/register/create-order stamps
 * `tournament_id`, `category` and `email` into the Razorpay order's notes, and
 * the payment itself carries the email, contact and amount. So the row can be
 * rebuilt from the gateway rather than retyped from a receipt.
 *
 *   GET  → captured tournament payments from the last N days that have no
 *          registration row, with everything known about each.
 *   POST → import one of them (`{ payment_id, ... }`), with any detail the
 *          gateway cannot know (age, sex, DUPR) supplied by the admin.
 *
 * What Razorpay never had — the profile photo, age, sex and DUPR fields — is
 * simply absent; the import fills what it can and leaves those blank.
 */

type Orphan = {
  payment_id: string;
  amount: number;
  email: string | null;
  contact: string | null;
  method: string | null;
  created_at: number;
  tournament_id: string | null;
  tournament_name: string | null;
  category: string;
  /** False when the payment carries no tournament notes — it may be unrelated. */
  labelled: boolean;
};

function rzpClient() {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

/** Order notes hold the tournament context; payment notes may be empty. */
async function notesFor(rzp: Razorpay, payment: Record<string, unknown>): Promise<Record<string, string>> {
  const own = (payment.notes ?? {}) as Record<string, string>;
  if (own && Object.keys(own).length > 0) return own;
  const orderId = payment.order_id ? String(payment.order_id) : "";
  if (!orderId) return {};
  try {
    const order = (await rzp.orders.fetch(orderId)) as unknown as { notes?: Record<string, string> };
    return order.notes ?? {};
  } catch {
    return {};
  }
}

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSchema().catch(() => {});
    await ensureTournamentSchema().catch(() => {});

    const rzp = rzpClient();
    if (!rzp) {
      return NextResponse.json(
        { error: "Razorpay is not configured with a key secret, so payments cannot be read back." },
        { status: 400 },
      );
    }

    const days = Math.min(90, Math.max(1, Number(req.nextUrl.searchParams.get("days") ?? 30)));
    const includeUnlabelled = req.nextUrl.searchParams.get("all") === "1";
    const to = Math.floor(Date.now() / 1000);
    const from = to - days * 24 * 60 * 60;

    let payments: Array<Record<string, unknown>> = [];
    try {
      const res = (await rzp.payments.all({ from, to, count: 100 })) as unknown as {
        items?: Array<Record<string, unknown>>;
      };
      payments = res.items ?? [];
    } catch (rzpErr) {
      console.error("[recover payments fetch error]", rzpErr);
      return NextResponse.json({ error: "Could not read payments from Razorpay." }, { status: 502 });
    }

    // Payment ids already recorded — anything else is a candidate.
    const known = new Set<string>();
    try {
      const rows = await turso.execute(
        "SELECT payment_id FROM tournament_registrations WHERE payment_id IS NOT NULL",
      );
      for (const r of rows.rows) known.add(String(r.payment_id));
    } catch (dbErr) {
      console.error("[recover known ids error]", dbErr);
    }

    // Tournament names, so the list reads as events rather than ids.
    const names = new Map<string, string>();
    try {
      const rows = await turso.execute("SELECT id, name FROM tournaments");
      for (const r of rows.rows) names.set(String(r.id), String(r.name));
    } catch {
      // Names are cosmetic here.
    }

    const orphans: Orphan[] = [];
    for (const p of payments) {
      const id = String(p.id ?? "");
      if (!id || known.has(id)) continue;
      // Only money that was actually taken.
      if (String(p.status ?? "") !== "captured") continue;

      const notes = await notesFor(rzp, p);
      // A court booking is not a tournament entry. Payments with no notes at
      // all are excluded by default: they are as likely to be a booking or a
      // test charge as an entry, and importing one mislabels it as a paid
      // registration. ?all=1 surfaces them, flagged, for a deliberate look.
      const labelled = notes.kind === "tournament";
      if (!labelled && !(notes.kind === undefined && includeUnlabelled)) continue;
      if (notes.kind && notes.kind !== "tournament") continue;

      orphans.push({
        payment_id: id,
        amount: Math.round(Number(p.amount ?? 0) / 100),
        email: p.email ? String(p.email) : notes.email ?? null,
        contact: p.contact ? String(p.contact) : null,
        method: p.method ? String(p.method) : null,
        created_at: Number(p.created_at ?? 0) * 1000,
        tournament_id: notes.tournament_id ?? null,
        tournament_name: notes.tournament_id ? names.get(notes.tournament_id) ?? null : null,
        category: notes.category ?? "singles",
        labelled,
      });
    }

    orphans.sort((a, b) => b.created_at - a.created_at);
    return NextResponse.json({ orphans, days }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[recover list error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSchema().catch(() => {});
    await ensureTournamentSchema().catch(() => {});

    const b = await req.json().catch(() => ({}));
    const paymentId = String(b.payment_id ?? "").trim();
    if (!paymentId) return NextResponse.json({ error: "A payment id is required." }, { status: 400 });

    const rzp = rzpClient();
    if (!rzp) return NextResponse.json({ error: "Razorpay is not configured." }, { status: 400 });

    // Re-fetch rather than trusting the client: the amount and the event this
    // entry belongs to come from the gateway, not from the request body.
    let payment: Record<string, unknown>;
    try {
      payment = (await rzp.payments.fetch(paymentId)) as unknown as Record<string, unknown>;
    } catch (rzpErr) {
      console.error("[recover payment fetch error]", rzpErr);
      return NextResponse.json({ error: "That payment could not be read from Razorpay." }, { status: 404 });
    }
    if (String(payment.status ?? "") !== "captured") {
      return NextResponse.json({ error: "That payment was not captured, so there is nothing to import." }, { status: 400 });
    }

    const notes = await notesFor(rzp, payment);
    const tournamentId = String(b.tournament_id ?? notes.tournament_id ?? "").trim();
    if (!tournamentId) {
      return NextResponse.json({ error: "Choose which tournament this payment was for." }, { status: 400 });
    }

    const category = String(b.category ?? notes.category ?? "singles");
    const email = String(b.email ?? payment.email ?? notes.email ?? "").trim().toLowerCase();
    const phone = String(b.phone ?? payment.contact ?? "").trim();
    const playerName = String(b.player_name ?? "").trim() || email.split("@")[0] || "Recovered entry";
    const ageRaw = Number(b.age);
    const age = Number.isFinite(ageRaw) && ageRaw >= 8 && ageRaw <= 99 ? Math.round(ageRaw) : null;
    const sex = ["male", "female", "other"].includes(String(b.sex)) ? String(b.sex) : null;
    const duprId = String(b.dupr_id ?? "").trim() || null;
    const duprLevel = String(b.dupr_level ?? "").trim() || null;

    if (!email) return NextResponse.json({ error: "This payment has no email — enter one." }, { status: 400 });

    let fee = 0;
    try {
      const t = await turso.execute({ sql: "SELECT fee FROM tournaments WHERE id = ? LIMIT 1", args: [tournamentId] });
      if (!t.rows[0]) return NextResponse.json({ error: "That tournament no longer exists." }, { status: 400 });
      fee = Math.max(0, Number(t.rows[0].fee) || 0);
    } catch (dbErr) {
      console.error("[recover tournament lookup error]", dbErr);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }

    const amountPaid = Math.round(Number(payment.amount ?? 0) / 100) || fee;

    // A captain entry is ₹3,000; a payment of ₹200 is not one. Refuse the
    // mismatch rather than filing it under the wrong event, unless the admin
    // has looked at it and said to import it anyway.
    if (amountPaid !== fee && b.confirm_mismatch !== true) {
      return NextResponse.json(
        {
          error:
            `This payment is ₹${amountPaid.toLocaleString("en-IN")} but that event's entry fee is ` +
            `₹${fee.toLocaleString("en-IN")}. Check it is the right event before importing.`,
          mismatch: { amount_paid: amountPaid, fee },
        },
        { status: 409 },
      );
    }

    // Idempotent: importing the same payment twice must not create a second entry.
    try {
      const dup = await turso.execute({
        sql: "SELECT id FROM tournament_registrations WHERE payment_id = ? LIMIT 1",
        args: [paymentId],
      });
      if (dup.rows[0]) {
        return NextResponse.json({ error: "That payment is already recorded as an entry." }, { status: 409 });
      }
    } catch {
      // Fall through — the insert below is still guarded.
    }

    const id = uuid();
    const createdAt = Number(payment.created_at ?? 0) * 1000 || Date.now();
    const note =
      `Recovered from Razorpay payment ${paymentId} by ${admin.email}. ` +
      `Photo and any DUPR/age details were not captured by the gateway.` +
      (amountPaid !== fee ? ` Amount paid (₹${amountPaid}) does not match the ₹${fee} entry fee.` : "");

    try {
      await turso.execute({
        sql: `INSERT INTO tournament_registrations (
                id, tournament_id, user_id, player_name, email, phone,
                age, sex, photo_url, dupr_id, dupr_level,
                category, skill_level, partner_name, notes,
                fee, amount_paid, payment_id, source, status, created_at
              ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, NULL, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, 'recovered', 'confirmed', ?)`,
        args: [
          id, tournamentId, playerName, email, phone || null,
          age, sex, duprId, duprLevel, category,
          note, fee, amountPaid, paymentId, createdAt,
        ],
      });
    } catch (dbErr) {
      const msg = String((dbErr as Error)?.message ?? "").toLowerCase();
      if (msg.includes("unique") || msg.includes("duplicate")) {
        return NextResponse.json(
          { error: "That email already has a confirmed entry for this tournament." },
          { status: 409 },
        );
      }
      console.error("[recover insert error]", dbErr);
      return NextResponse.json({ error: "Could not save that entry." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id, payment_id: paymentId, amount_paid: amountPaid });
  } catch (err) {
    console.error("[recover post error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
