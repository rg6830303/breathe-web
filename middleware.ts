import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const token = req.cookies.get("breathe_player_session")?.value;
    const payload = token ? await verifyToken(token) : null;
    if (!payload || payload.role !== "user") {
      return NextResponse.redirect(new URL(`/login?next=${pathname}`, req.url));
    }
  }

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = req.cookies.get("breathe_admin_session")?.value;
    const payload = token ? await verifyToken(token) : null;
    if (!payload || payload.role !== "admin") {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/admin/:path*"] };
