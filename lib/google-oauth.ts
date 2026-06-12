/**
 * Minimal Google OAuth 2.0 (Authorization Code) helper — no SDK dependency,
 * consistent with the rest of this codebase (custom JWT auth, Resend over REST,
 * etc.). It plugs Google sign-in into the EXISTING session system: the callback
 * upserts a row in `users` and issues the same `breathe_player_session` cookie
 * a password login would, so middleware, /api/auth/me and the dashboard need no
 * changes.
 *
 * Required env (set in Vercel):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 * Authorised redirect URI to register in the Google Cloud console:
 *   <NEXT_PUBLIC_SITE_URL>/api/auth/google/callback
 */

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO = "https://www.googleapis.com/oauth2/v2/userinfo";

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Derive the public origin (https://host) from the incoming request, so OAuth
 *  always uses the domain the user is actually on (e.g. breathepickleball.in)
 *  instead of a possibly-stale NEXT_PUBLIC_SITE_URL pointing at an old Vercel
 *  deployment. Falls back to the env var, then the canonical domain. */
export function originFromRequest(req: Request): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.breathepickleball.in").replace(/\/$/, "");
}

/** Canonical redirect URI. Must EXACTLY match an entry registered in Google
 *  Cloud → Credentials → OAuth client. Pass the request origin so the value is
 *  identical on the authorize and token-exchange calls and matches the live
 *  domain. */
export function getRedirectUri(origin?: string): string {
  const base = (origin || process.env.NEXT_PUBLIC_SITE_URL || "https://www.breathepickleball.in").replace(/\/$/, "");
  return `${base}/api/auth/google/callback`;
}

export function buildAuthUrl(state: string, origin?: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID as string,
    redirect_uri: getRedirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    include_granted_scopes: "true",
    // Always let the user choose which Google account to use.
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH}?${params.toString()}`;
}

export type GoogleTokens = { access_token: string; id_token?: string; expires_in?: number };

export async function exchangeCode(code: string, origin?: string): Promise<GoogleTokens> {
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID as string,
      client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
      redirect_uri: getRedirectUri(origin),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as GoogleTokens;
}

export type GoogleProfile = {
  id: string;
  email: string;
  verified_email?: boolean;
  name?: string;
  given_name?: string;
  picture?: string;
};

export async function fetchProfile(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch(GOOGLE_USERINFO, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Google userinfo failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as GoogleProfile;
}
