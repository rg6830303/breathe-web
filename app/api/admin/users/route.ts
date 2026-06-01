import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db/ensure";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSchema();
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    type Row = {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      created_at: string;
      booking_count: number;
      total_spent: number;
    };
    const byEmail = new Map<string, Row>();

    // 1. Primary source: Turso (with booking aggregates).
    try {
      const result = await turso.execute({
        sql: `SELECT u.id, u.full_name as name, u.email, u.phone, u.created_at,
                     COUNT(b.id) AS booking_count,
                     COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN b.amount_paid ELSE 0 END), 0) AS total_spent
              FROM users u
              LEFT JOIN bookings b ON b.user_id = u.id
              GROUP BY u.id
              ORDER BY u.created_at DESC`,
        args: [],
      });
      for (const row of result.rows) {
        const email = String(row.email).toLowerCase();
        byEmail.set(email, {
          id: String(row.id),
          name: String(row.name),
          email: String(row.email),
          phone: row.phone ? String(row.phone) : null,
          created_at: String(row.created_at),
          booking_count: Number(row.booking_count),
          total_spent: Number(row.total_spent),
        });
      }
    } catch (dbErr) {
      console.error("[admin users turso error]", dbErr);
    }

    // 2. Merge in any Supabase-only users (signups that landed there when Turso
    //    was unreachable). De-duped by email so nobody is missing from the list.
    try {
      const { supabase, hasSupabase } = require("@/lib/supabase");
      if (hasSupabase) {
        const { data, error } = await supabase
          .from("users")
          .select("id, full_name, email, phone, created_at");
        if (data && !error) {
          for (const u of data as Array<Record<string, unknown>>) {
            const email = String(u.email ?? "").toLowerCase();
            if (!email || byEmail.has(email)) continue;
            byEmail.set(email, {
              id: String(u.id),
              name: String(u.full_name ?? email),
              email: String(u.email),
              phone: u.phone ? String(u.phone) : null,
              created_at: String(u.created_at ?? ""),
              booking_count: 0,
              total_spent: 0,
            });
          }
        }
      }
    } catch (sbErr) {
      console.error("[admin users supabase merge error]", sbErr);
    }

    const users = Array.from(byEmail.values()).sort((a, b) =>
      String(b.created_at).localeCompare(String(a.created_at)),
    );

    return NextResponse.json({ users, count: users.length });
  } catch (err: unknown) {
    console.error("[admin users error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
