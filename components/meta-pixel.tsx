"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

/**
 * Meta (Facebook) Pixel — traffic + ad-attribution tracking.
 *
 * The Pixel ID is PUBLIC by design (it ships in the page source and in every
 * request to Meta), so it is safe as a NEXT_PUBLIC_* value / literal — it is not
 * a secret. It is overridable via env so the ID can be swapped without a code
 * change, and falls back to the live ID so tracking works with zero env config.
 */
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "1083171524398058";

export function MetaPixel() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  // The base snippet below fires the FIRST PageView. But this is an App Router
  // SPA: navigating home → /book → /cart → /payment never reloads the document,
  // so without this effect Meta would only ever see one PageView per session and
  // ad reporting would badly undercount the funnel. Re-fire on every route change
  // (skipping the initial render so the first view isn't counted twice).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const w = window as unknown as { fbq?: (...args: unknown[]) => void };
    w.fbq?.("track", "PageView");
  }, [pathname]);

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PIXEL_ID}');
fbq('track', 'PageView');`}
      </Script>
      <noscript>
        {/* Tracking pixel must be a raw <img> (no JS, no next/image). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          alt=""
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
