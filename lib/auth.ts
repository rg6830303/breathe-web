import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const DEV_FALLBACK = "breathe-pickleball-dev-secret-change-me-64-chars-long-or-more";

function loadSecret(): Uint8Array {
  const raw = process.env.SESSION_SECRET ?? process.env.JWT_SECRET;
  if (raw && raw.length >= 32) return new TextEncoder().encode(raw);
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET (or JWT_SECRET) must be set to at least 32 chars in production. Generate one with: openssl rand -hex 32",
    );
  }
  return new TextEncoder().encode(DEV_FALLBACK);
}

const COOKIE_NAME = "breathe_player_session";
const ADMIN_COOKIE = "breathe_admin_session";

export type UserPayload = { id: string; email: string; name: string; role: "user" };
export type AdminPayload = { id: string; email: string; role: "admin" };

// Single source of truth for session lifetimes. The JWT `exp` (enforced by the
// middleware on every request) and the cookie `maxAge` MUST agree, so always
// reference these constants in the auth routes instead of hard-coding literals.
//
// User sessions differ by surface: a plain browser login expires in 24h, while
// an installed PWA ("add to home screen") login lasts ~5 days so the app stays
// signed in like a native app. Admin sessions are always short (12h).
export const USER_BROWSER_JWT_EXP = "24h";
export const USER_PWA_JWT_EXP = "5d";
export const USER_BROWSER_SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours, in seconds
export const USER_PWA_SESSION_MAX_AGE = 60 * 60 * 24 * 5; // 5 days, in seconds
export const ADMIN_JWT_EXP = "12h";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours, in seconds

/**
 * Pick the JWT expiry + cookie maxAge for a user session based on whether the
 * login happened inside the installed PWA. Keep the two in lockstep so the
 * cookie never outlives the token (or vice-versa).
 */
export function userSessionDurations(isPwa: boolean): { exp: string; maxAge: number } {
  return isPwa
    ? { exp: USER_PWA_JWT_EXP, maxAge: USER_PWA_SESSION_MAX_AGE }
    : { exp: USER_BROWSER_JWT_EXP, maxAge: USER_BROWSER_SESSION_MAX_AGE };
}

export async function signToken(
  payload: UserPayload | AdminPayload,
  expiresIn: string = (payload as { role?: string }).role === "admin" ? ADMIN_JWT_EXP : USER_BROWSER_JWT_EXP,
) {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(loadSecret());
}

export async function verifyToken(token: string): Promise<UserPayload | AdminPayload | null> {
  try {
    // Pin the algorithm to HS256 — without this, a token forged with alg:"none"
    // or a different scheme could otherwise be accepted (alg-confusion attack).
    const { payload } = await jwtVerify(token, loadSecret(), { algorithms: ["HS256"] });
    return payload as unknown as UserPayload | AdminPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<UserPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "user") return null;
  return payload as UserPayload;
}

export async function getAdminSession(): Promise<AdminPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "admin") return null;
  return payload as AdminPayload;
}

export { COOKIE_NAME, ADMIN_COOKIE };
