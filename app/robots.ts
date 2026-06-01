import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * robots.txt — allow crawling of the public marketing/booking pages, but keep
 * the admin console, player dashboard, auth, and API routes out of the index.
 * Points crawlers at the sitemap. (Missing robots/sitemap was the main reason
 * Google showed "No information is available for this page".)
 */
export default function robots(): MetadataRoute.Robots {
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
