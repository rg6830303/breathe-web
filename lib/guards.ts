import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "@/lib/session";

/** Require an authenticated admin; redirect to the admin login otherwise. */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    redirect("/admin/login");
  }
  return session;
}

/** Require any authenticated user; redirect to the player login otherwise. */
export async function requireUser(next = "/dashboard"): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  return session;
}
