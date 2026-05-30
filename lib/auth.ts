import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "breathe-pickleball-dev-secret-change-me");
const COOKIE_NAME = "bp_session";
const ADMIN_COOKIE = "bp_admin_session";

export type UserPayload = { id: string; email: string; name: string; role: "user" };
export type AdminPayload = { id: string; email: string; role: "admin" };

export async function signToken(payload: UserPayload | AdminPayload) {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<UserPayload | AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
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
