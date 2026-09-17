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

/** The retired captain host, kept only so links already shared still land. */
const CAPTAIN_HOST = (process.env.NEXT_PUBLIC_CAPTAIN_HOST ?? "33showdown.vercel.app").trim().toLowerCase();

/**
 * The captain entry lives on the registered domain, because Razorpay refuses a
 * checkout opened from a domain that is not registered on the account. The old
 * captain host only forwards there now.
 */
const CAPTAIN_CANONICAL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.breathepickleball.in").replace(/\/$/, "");

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

  // --- Short link for the captain entry ---
  // /33showdown is the link that gets handed out. It rewrites (not redirects)
  // to the captain form, so the address stays short and the page served is the
  // standalone form — no site chrome, nothing that leads into the website.
  if (pathname === "/33showdown" || pathname === "/33showdown/") {
    const res = NextResponse.rewrite(new URL("/tournaments/captain", req.url));
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  // --- Retired captain host ---
  // 33showdown.vercel.app is no longer used to serve the form: Razorpay will
  // not process a payment from a domain that is not registered on the account.
  // Any link already shared is sent to the captain page on the registered
  // domain, so an old link still works and that host never exposes the site.
  if (CAPTAIN_HOST && host === CAPTAIN_HOST) {
    const isAsset =
      pathname.startsWith("/api/") ||
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/icons/") ||
      pathname.startsWith("/photos/") ||
      /\.(png|jpg|jpeg|gif|svg|webp|ico|json|js|css|txt|xml|webmanifest)$/i.test(pathname);
    if (!isAsset) {
      const keepPath = pathname.startsWith("/tournaments/confirmation");
      const dest = new URL(`${CAPTAIN_CANONICAL}${keepPath ? pathname : "/tournaments/captain"}`);
      if (keepPath) dest.search = req.nextUrl.search;
      const res = NextResponse.redirect(dest, 307);
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      return res;
    }
  }

  // The captain entry and its confirmation are link-only pages: never indexed,
  // never linked from the site, unlike the player registration.
  if (pathname.startsWith("/tournaments/captain") || pathname.startsWith("/tournaments/confirmation")) {
    const res = NextResponse.next();
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
