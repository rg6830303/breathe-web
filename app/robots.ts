import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { SITE_URL } from "@/lib/site";

const ADMIN_HOST = process.env.NEXT_PUBLIC_ADMIN_HOST?.trim().toLowerCase();

/**
 * robots.txt.
 *  - On the public domain: allow the marketing/booking pages, disallow the
 *    admin console, dashboard, auth, and API routes. Points crawlers at the
 *    sitemap.
 *  - On the dedicated admin host: deny EVERYTHING so the console never indexes.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host")?.split(":")[0].toLowerCase() ?? "";
  const onAdminHost = !!ADMIN_HOST && host === ADMIN_HOST;

  if (onAdminHost) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/dashboard", "/api/", "/login", "/signup", "/reset-password", "/forgot-password", "/offline"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
