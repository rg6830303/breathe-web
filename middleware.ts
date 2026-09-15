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

/**
 * Standalone host for the 33 Showdown team-captain entry. Its root serves the
 * captain form directly, so the URL can be handed out on its own without the
 * rest of the site around it. Override with NEXT_PUBLIC_CAPTAIN_HOST.
 */
const CAPTAIN_HOST = (process.env.NEXT_PUBLIC_CAPTAIN_HOST ?? "33showdown.vercel.app").trim().toLowerCase();

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
      pathname !== "/robots.txt" &&
      !pathname.startsWith("/icons/") &&
      !pathname.startsWith("/photos/") &&
      !/\.(png|jpg|jpeg|gif|svg|json|ico)$/i.test(pathname)
    ) {
      const dest = req.nextUrl.clone();
      dest.pathname = "/admin";
      return NextResponse.redirect(dest);
    }
    // The entire admin host must never be indexed: app/robots.ts serves a
    // deny-all robots.txt for this host, and we tag every response noindex.
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    // Still apply the admin auth gate below by returning after gating. Skip
    // asset-like paths (e.g. /admin.webmanifest) so the installed admin app's
    // manifest/icons load without being bounced to login.
    if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login") && !pathname.includes(".")) {
      const token = req.cookies.get("breathe_admin_session")?.value;
      const payload = token ? await verifyToken(token) : null;
      if (!payload || payload.role !== "admin") {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
    }
    return res;
  } else if (isAdminPath && ADMIN_HOST) {
    // A dedicated admin host IS configured and this isn't it → admin is fully
    // removed from the public domain: 404 AND noindex so it never leaks into
    // search. (When ADMIN_HOST is unset we're single-domain, so admin works.)
    return new NextResponse(null, {
      status: 404,
      headers: { "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  // --- Captain host: this domain is the captain entry form and nothing else ---
  if (CAPTAIN_HOST && host === CAPTAIN_HOST) {
    // Every page path rewrites to the form, so the rest of the website is
    // simply not reachable here — /about, /pricing, /book and the player
    // registration all land on the captain form instead of exposing the site
    // behind this link. Rewrite, not redirect, so the URL stays put.
    //
    // Left alone: /api/* (the form's own fetches and the Razorpay round-trip),
    // Next internals and static assets, which the form needs to render.
    const passThrough =
      pathname.startsWith("/api/") ||
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/icons/") ||
      pathname.startsWith("/photos/") ||
      pathname === "/favicon.ico" ||
      pathname === "/robots.txt" ||
      /\.(png|jpg|jpeg|gif|svg|webp|ico|json|js|css|txt|xml|webmanifest)$/i.test(pathname);

    const res = passThrough
      ? NextResponse.next()
      : NextResponse.rewrite(new URL("/tournaments/captain", req.url));
    // A one-event link, not a page to index.
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|photos/|sw.js|manifest.json|robots.txt|sitemap.xml).*)"],
};
