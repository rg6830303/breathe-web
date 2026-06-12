import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { buildAuthUrl, googleConfigured, originFromRequest } from "@/lib/google-oauth";

export const runtime = "nodejs";

/**
 * Start the Google sign-in flow: generate a CSRF `state`, stash it (plus the
 * post-login `next` path) in short-lived httpOnly cookies, and redirect to
 * Google's consent screen.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_unconfigured", url.origin));
  }

  const rawNext = url.searchParams.get("next") || "/dashboard";
  // Only allow same-site relative paths as the redirect target.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
  const state = crypto.randomBytes(16).toString("hex");

  const c = await cookies();
  const secure = process.env.NODE_ENV === "production";
  const opts = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 600, secure };
  c.set("g_oauth_state", state, opts);
  c.set("g_oauth_next", next, opts);

  return NextResponse.redirect(buildAuthUrl(state, originFromRequest(req)));
}
