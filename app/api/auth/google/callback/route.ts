import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { turso } from "@/lib/turso";
import { ensureSchema } from "@/lib/db/ensure";
import { signToken, COOKIE_NAME } from "@/lib/auth";
import { exchangeCode, fetchProfile, googleConfigured, originFromRequest } from "@/lib/google-oauth";

export const runtime = "nodejs";

/**
 * Google OAuth callback. Verifies the CSRF state, exchanges the code for a
 * profile, upserts the user into the existing `users` table, and issues the
 * standard player session cookie — so a Google user is indistinguishable from a
 * password user everywhere downstream.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  // Use the real public origin (forwarded host) for redirect_uri + redirects so
  // the OAuth round-trip stays on the user's actual domain.
  const origin = originFromRequest(req);
  const fail = (e: string) => NextResponse.redirect(new URL(`/login?error=${e}`, origin));

  try {
    if (!googleConfigured()) return fail("google_unconfigured");

    if (url.searchParams.get("error")) return fail("google_denied");
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) return fail("google_invalid");

    const c = await cookies();
    const savedState = c.get("g_oauth_state")?.value;
    const rawNext = c.get("g_oauth_next")?.value || "/dashboard";
    const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
    // One-time use: clear the flow cookies regardless of outcome.
    c.set("g_oauth_state", "", { path: "/", maxAge: 0 });
    c.set("g_oauth_next", "", { path: "/", maxAge: 0 });
    if (!savedState || savedState !== state) return fail("google_state");

    const tokens = await exchangeCode(code, origin);
    const profile = await fetchProfile(tokens.access_token);
    if (!profile.email) return fail("google_noemail");
    if (profile.verified_email === false) return fail("google_unverified");

    const email = profile.email.toLowerCase();
    const picture = profile.picture ?? null;
    let name = profile.name?.trim() || email.split("@")[0];

    await ensureSchema();

    // Look up an existing account by email (links password + Google logins).
    let userId: string | undefined;
    try {
      const r = await turso.execute({
        sql: "SELECT id, full_name FROM users WHERE email = ? LIMIT 1",
        args: [email],
      });
      const existing = r.rows[0] as unknown as { id: string; full_name: string } | undefined;
      if (existing) {
        userId = String(existing.id);
        if (existing.full_name) name = String(existing.full_name);
        // Backfill the Google linkage + avatar without overwriting a set name.
        await turso
          .execute({
            sql: "UPDATE users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?",
            args: [profile.id, picture, userId],
          })
          .catch((e) => console.error("[google link update]", e));
      }
    } catch (e) {
      console.error("[google lookup error]", e);
    }

    if (!userId) {
      const newId = uuid();
      const now = Date.now();
      let createdNew = false;
      // OAuth users have no password. Store a random unusable bcrypt hash to
      // satisfy the NOT NULL column; they can set a real one via "forgot
      // password" later if they ever want to log in with email + password.
      const placeholder = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 12);
      try {
        await turso.execute({
          sql: "INSERT INTO users (id, email, password_hash, full_name, phone, created_at, google_id, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          args: [newId, email, placeholder, name, null, now, profile.id, picture],
        });
        userId = newId;
        createdNew = true;
      } catch (e) {
        // Most likely a UNIQUE(email) race: the row appeared between our lookup
        // and this insert (concurrent Google logins, or a signup landing at the
        // same instant). Recover by linking the existing row instead of failing
        // the sign-in — so account-linking is bulletproof under concurrency.
        console.error("[google insert error — attempting recover]", e);
        try {
          const r2 = await turso.execute({
            sql: "SELECT id, full_name FROM users WHERE email = ? LIMIT 1",
            args: [email],
          });
          const existing = r2.rows[0] as unknown as { id: string; full_name: string } | undefined;
          if (existing) {
            userId = String(existing.id);
            if (existing.full_name) name = String(existing.full_name);
            await turso
              .execute({
                sql: "UPDATE users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?",
                args: [profile.id, picture, userId],
              })
              .catch((e2) => console.error("[google recover link update]", e2));
          }
        } catch (e2) {
          console.error("[google recover lookup error]", e2);
        }
        if (!userId) return fail("google_dberror");
      }
      // Best-effort mirror to Supabase — only for a genuinely new row, and only
      // in libsql mode (hasSupabase is false when POSTGRES_URL is the primary DB).
      if (createdNew) {
        try {
          const { supabase, hasSupabase } = require("@/lib/supabase");
          if (hasSupabase) {
            await supabase.from("users").insert({
              id: userId,
              email,
              password_hash: placeholder,
              full_name: name,
              phone: null,
              created_at: now,
            });
          }
        } catch (e) {
          console.error("[google supabase mirror error]", e);
        }
      }
    }

    const token = await signToken({ id: userId, email, name, role: "user" });
    c.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
    });

    return NextResponse.redirect(new URL(next, origin));
  } catch (e) {
    console.error("[google callback error]", e);
    return fail("google_failed");
  }
}
