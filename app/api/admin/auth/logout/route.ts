import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "", { maxAge: 0, path: "/" });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "", { maxAge: 0, path: "/" });
  return NextResponse.redirect(
    new URL("/admin/login", process.env.NEXT_PUBLIC_SITE_URL ?? "https://breathe-web-six.vercel.app")
  );
}
