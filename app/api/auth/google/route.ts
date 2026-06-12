import { NextResponse } from "next/server";
import crypto from "crypto";
import { buildAuthUrl, googleConfigured, originFromRequest } from "@/lib/google-oauth";

export const runtime = "nodejs";

/**
 * Start the Google sign-in flow: generate a CSRF `state`, stash it (plus the
 * post-login `next` path) in short-lived httpOnly cookies, and redirect to
 * Google's consent screen.
 *
 * IMPORTANT: cookies are set on the redirect *response* (res.cookies.set), NOT
 * via the next/headers cookies() store. In Next 15 route handlers the store's
 * mutations are NOT attached to a NextResponse.redirect(), so the state cookie
 * would silently never be sent — and the callback would then fail the CSRF check
 * and bounce the user back to /login.
 */
export async function GET(req: Request) {
  const origin = originFromRequest(req);
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_unconfigured", origin));
  }

  const rawNext = new URL(req.url).searchParams.get("next") || "/dashboard";
  // Only allow same-site relative paths as the redirect target.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
  const state = crypto.randomBytes(16).toString("hex");

  const secure = process.env.NODE_ENV === "production";
  const opts = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 600, secure };

  const res = NextResponse.redirect(buildAuthUrl(state, origin));
  res.cookies.set("g_oauth_state", state, opts);
  res.cookies.set("g_oauth_next", next, opts);
  return res;
}
