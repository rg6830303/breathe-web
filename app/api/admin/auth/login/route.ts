import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { cookies } from "next/headers";
import { turso } from "@/lib/turso";
import { signToken, ADMIN_COOKIE, ADMIN_SESSION_MAX_AGE } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { loginSchema, formatZodError } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * Admin login resolution order:
 *   1. Turso `admins` table row matching email (bcrypt compare)
 *   2. Supabase `admins` mirror (bcrypt compare) — only if Turso missed
 *   3. ADMIN_EMAIL + ADMIN_PASSWORD_HASH env-var bcrypt compare
 *   4. ADMIN_EMAIL + ADMIN_PASSWORD env-var plaintext compare (last resort,
 *      so that an admin can still log in even when db-init has not been run
 *      or Turso is unreachable)
 *
 * Each step logs which path was tried + the result to the Vercel function
 * log so misconfiguration is observable.
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    // Tightened from 20 → 6 per 15 min per IP. Admin is a single known account,
    // so a low ceiling massively shrinks the brute-force surface.
    const rl = await checkRateLimit(`admin-login:${ip}`, 6, 15 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const { email, password } = parsed.data;

    const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const envPassHash = process.env.ADMIN_PASSWORD_HASH?.trim();
    const envPassPlain = process.env.ADMIN_PASSWORD;
    const sessionSecretSet = !!(process.env.SESSION_SECRET || process.env.JWT_SECRET);

    console.log("[admin-login] attempt", {
      email,
      envEmailSet: !!envEmail,
      envEmailMatches: envEmail ? email === envEmail : null,
      envPassHashSet: !!envPassHash,
      envPassPlainSet: !!envPassPlain,
      sessionSecretSet,
    });

    if (!sessionSecretSet && process.env.NODE_ENV === "production") {
      console.error("[admin-login] SESSION_SECRET (or JWT_SECRET) is not set; JWT signing will throw.");
      return NextResponse.json(
        { error: "Server is missing SESSION_SECRET. Set it in Vercel and redeploy." },
        { status: 500 },
      );
    }

    // 1. Turso admins lookup
    let row: { id: string; email: string; password_hash: string } | null = null;
    try {
      const result = await turso.execute({
        sql: "SELECT id, email, password_hash FROM admins WHERE email = ? LIMIT 1",
        args: [email],
      });
      const r = result.rows[0];
      if (r) {
        row = {
          id: String(r.id),
          email: String(r.email),
          password_hash: String(r.password_hash),
        };
        console.log("[admin-login] turso row found");
      } else {
        console.log("[admin-login] turso miss");
      }
    } catch (dbErr) {
      console.error("[admin-login] turso lookup error:", dbErr);
    }

    // 2. Supabase fallback
    if (!row) {
      try {
        const { supabase, hasSupabase } = require("@/lib/supabase");
        if (hasSupabase) {
          const { data, error } = await supabase
            .from("admins")
            .select("id, email, password_hash")
            .eq("email", email)
            .maybeSingle();
          if (data && !error) {
            row = {
              id: String(data.id),
              email: String(data.email),
              password_hash: String(data.password_hash),
            };
            console.log("[admin-login] supabase row found");
          }
        }
      } catch (sbErr) {
        console.error("[admin-login] supabase fallback error:", sbErr);
      }
    }

    let ok = false;
    let viaPath: "db-bcrypt" | "env-bcrypt" | "env-plaintext" | "none" = "none";
    let adminId = "env-admin";

    if (row) {
      try {
        ok = await bcrypt.compare(password, row.password_hash);
      } catch (e) {
        console.error("[admin-login] db bcrypt error:", e);
      }
      if (ok) {
        viaPath = "db-bcrypt";
        adminId = row.id;
      } else {
        console.log("[admin-login] db row password mismatch");
      }
    }

    // 3 + 4. Env fallback (only if email matches the env)
    if (!ok && envEmail && email === envEmail) {
      if (envPassHash) {
        try {
          ok = await bcrypt.compare(password, envPassHash);
          if (ok) viaPath = "env-bcrypt";
        } catch (e) {
          console.error("[admin-login] env hash bcrypt error:", e);
        }
      }
      if (!ok && envPassPlain) {
        // Constant-time compare to avoid leaking password length/contents via
        // response timing. Falls back to false on length mismatch.
        const a = Buffer.from(password.trim());
        const b = Buffer.from(envPassPlain.trim());
        ok = a.length === b.length && timingSafeEqual(a, b);
        if (ok) viaPath = "env-plaintext";
      }
    }

    console.log("[admin-login] result", { ok, viaPath });

    if (!ok) {
      // Small fixed delay on failure to blunt rapid credential-stuffing and
      // reduce timing signal between "no such user" and "wrong password".
      await new Promise((r) => setTimeout(r, 600));
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // If env path succeeded but there's no DB row, ensure an admins row exists
    // so subsequent calls have something to find (also so /admin/settings'
    // change-password works against a real row).
    if (viaPath !== "db-bcrypt" && !row && envEmail && (envPassPlain || envPassHash)) {
      try {
        const seedHash = envPassHash || (await bcrypt.hash(envPassPlain || "", 12));
        const newId = uuid();
        await turso.execute({
          sql: "INSERT OR IGNORE INTO admins (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
          args: [newId, envEmail, seedHash, Date.now()],
        });
        adminId = newId;
        console.log("[admin-login] seeded admins row from env on first successful env-login");
      } catch (seedErr) {
        console.error("[admin-login] admin-row seed error (non-fatal):", seedErr);
      }
    }

    let token: string;
    try {
      token = await signToken({ id: adminId, email, role: "admin" });
    } catch (signErr) {
      console.error("[admin-login] JWT sign error:", signErr);
      return NextResponse.json(
        { error: "Server could not sign session. Check SESSION_SECRET (must be 32+ chars)." },
        { status: 500 },
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      // strict: the admin console is never reached via a cross-site link, so
      // this fully neutralises CSRF on admin actions.
      sameSite: "strict",
      path: "/",
      // Shorter admin session (12h) than player sessions — re-auth twice daily.
      maxAge: ADMIN_SESSION_MAX_AGE,
      secure: process.env.NODE_ENV === "production",
    });

    return NextResponse.json({ ok: true, viaPath });
  } catch (err: unknown) {
    console.error("[admin-login] uncaught error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
