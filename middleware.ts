import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

/**
 * Host-based separation:
 *   - ADMIN_HOST (e.g. the Vercel URL or admin.breathepickleball.in) is the
 *     ONLY host where /admin is reachable. On the public business domain the
 *     admin console + its login are 404'd so they're invisible to visitors.
 *   - The public/user site (breathepickleball.in) serves everything else.
 *
 * Configure with NEXT_PUBLIC_ADMIN_HOST. If unset, admin is allowed on any
 * host (back-compat / single-domain dev).
 */
const ADMIN_HOST = process.env.NEXT_PUBLIC_ADMIN_HOST?.trim().toLowerCase();

function hostOf(req: NextRequest): string {
  return (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = hostOf(req);

  const isAdminPath = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  if (isAdminPath) {
    // If an admin host is configured and this isn't it, hide admin entirely.
    if (ADMIN_HOST && host && host !== ADMIN_HOST) {
      return new NextResponse(null, { status: 404 });
    }
    // Auth gate for the admin console pages (login page itself stays open).
    if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
      const token = req.cookies.get("breathe_admin_session")?.value;
      const payload = token ? await verifyToken(token) : null;
      if (!payload || payload.role !== "admin") {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard")) {
    const token = req.cookies.get("breathe_player_session")?.value;
    const payload = token ? await verifyToken(token) : null;
    if (!payload || payload.role !== "user") {
      return NextResponse.redirect(new URL(`/login?next=${pathname}`, req.url));
    }
  }

  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/admin/:path*", "/api/admin/:path*"] };
