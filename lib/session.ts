import "server-only";
import { cookies } from "next/headers";
import crypto from "crypto";

export type Role = "player" | "admin";
export type SessionUser = { email: string; name: string; role: Role };

const COOKIE = "breathe_session";
const SECRET = process.env.AUTH_SECRET || "breathe-pickleball-dev-secret-change-me";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function sign(payload: string) {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

function encode(data: SessionUser) {
  const body = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(token?: string): SessionUser | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  // constant-time compare to avoid timing leaks
  const expected = sign(body);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString()) as SessionUser;
  } catch {
    return null;
  }
}

export async function createSession(user: SessionUser) {
  const store = await cookies();
  store.set(COOKIE, encode(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  return decode(store.get(COOKIE)?.value);
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}
