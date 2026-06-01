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

export async function signToken(
  payload: UserPayload | AdminPayload,
  // Admin sessions are short-lived (24h); players get 7 days.
  expiresIn: string = (payload as { role?: string }).role === "admin" ? "24h" : "7d",
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
