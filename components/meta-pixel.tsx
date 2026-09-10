"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { META_PIXEL_ID } from "@/lib/analytics";

/**
 * Meta Pixel — client-side half.
 *
 * The BASE snippet (fbq init + first PageView) is NOT here: it lives as a plain
 * inline <script> in the document <head> (app/layout.tsx). That matters —
 * injecting it via next/script only runs it after hydration, which delays the
 * first PageView and, more importantly, means the pixel is absent from the
 * server HTML so tools like Meta Pixel Helper report "No Pixels found".
 *
 * This component owns the two things that must run in React-land:
 *   1. re-firing PageView on client-side route changes, and
 *   2. the <noscript> beacon.
 */
export function MetaPixel() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  // The head snippet fires the FIRST PageView. But this is an App Router SPA:
  // home → /book → /cart → /payment never reloads the document, so without this
  // Meta would only ever see one PageView per session and ad reporting would
  // badly undercount the funnel. Skip the initial render so it isn't counted twice.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const w = window as unknown as { fbq?: (...args: unknown[]) => void };
    w.fbq?.("track", "PageView");
  }, [pathname]);

  return (
    <noscript>
      {/* Tracking pixel must be a raw <img> (no JS, no next/image). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        height="1"
        width="1"
        alt=""
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
      />
    </noscript>
  );
}
