import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

/**
 * Host-based separation between the public site and the admin console.
 *
 *   - ADMIN_HOST (e.g. breathe-web-six.vercel.app or admin.breathepickleball.in)
 *     is the ONLY host where /admin is reachable, AND on that host the root "/"
 *     (and any non-admin path) is sent straight to the admin login/console —
 *     visitors to the old Vercel URL never see the customer website.
 *   - The public/user site (www.breathepickleball.in) serves everything else
 *     and 404s /admin so the console is invisible to customers.
 *
 * Configure with NEXT_PUBLIC_ADMIN_HOST. If unset, behaves as a single domain.
 */
const ADMIN_HOST = process.env.NEXT_PUBLIC_ADMIN_HOST?.trim().toLowerCase();

function hostOf(req: NextRequest): string {
  return (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = hostOf(req);
  const onAdminHost = !!ADMIN_HOST && host === ADMIN_HOST;
  const isAdminPath = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  // --- Admin host: this deployment URL is the admin console only ---
  if (onAdminHost) {
    // Send the landing page (and any stray public path) to the admin area.
    // Allow: /admin*, /api/* (auth/session/etc.), and Next internals/assets.
    if (
      !isAdminPath &&
      !pathname.startsWith("/api/") &&
      !pathname.startsWith("/_next/") &&
      pathname !== "/favicon.ico" &&
      !pathname.startsWith("/icons/")
    ) {
      const dest = req.nextUrl.clone();
      dest.pathname = "/admin";
      return NextResponse.redirect(dest);
    }
  } else if (isAdminPath && ADMIN_HOST) {
    // Public host with a configured admin host → hide admin entirely.
    return new NextResponse(null, { status: 404 });
  }

  // --- Admin auth gate (login page itself stays open) ---
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = req.cookies.get("breathe_admin_session")?.value;
    const payload = token ? await verifyToken(token) : null;
    if (!payload || payload.role !== "admin") {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  // --- Player dashboard gate ---
  if (pathname.startsWith("/dashboard")) {
    const token = req.cookies.get("breathe_player_session")?.value;
    const payload = token ? await verifyToken(token) : null;
    if (!payload || payload.role !== "user") {
      return NextResponse.redirect(new URL(`/login?next=${pathname}`, req.url));
    }
  }

  return NextResponse.next();
}

// Run on everything except Next internals & static files so the admin-host
// root redirect works, while staying cheap.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|gallery/|sw.js|manifest.json|robots.txt|sitemap.xml).*)"],
};
