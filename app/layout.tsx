import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";
import { ScrollPaddle } from "@/components/motion/scroll-paddle";
import { PresenceBeacon } from "@/components/presence-beacon";
import { site, SITE_URL } from "@/lib/site";

// Space Grotesk — a modern, geometric grotesk with an athletic, techy edge.
// Drives every heading (heading-xl / heading-lg / .font-display). It caps at
// weight 700, so the display-heading utilities are pinned to 700 in globals.css
// to stay crisp (no browser-synthesized fake-bold).
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

// Inter — clean, contemporary, highly legible at small sizes. Drives all body +
// UI text. Includes 800 so `font-extrabold` on body text renders as real weight.
const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  title: {
    default: "Breathe Pickleball | Court Booking in Kaikhali, Kolkata",
    template: "%s | Breathe Pickleball",
  },
  description:
    "Breathe Pickleball is North Kolkata's premier pickleball destination in Kaikhali — three professional courts, complimentary equipment, tournaments with cash prizes, and instant online slot booking.",
  keywords: [
    "pickleball Kolkata",
    "Breathe Pickleball",
    "pickleball court booking Kaikhali",
    "pickleball tournament Kolkata",
  ],
  // Google Search Console HTML-tag verification. Set GOOGLE_SITE_VERIFICATION
  // in Vercel to the token Google gives you, then "Verify" → request indexing.
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
  openGraph: {
    title: "Breathe Pickleball | Kaikhali, Kolkata",
    description:
      "Book a court in seconds. Three professional courts, complimentary equipment, and tournaments with cash prizes in North Kolkata.",
    type: "website",
    locale: "en_IN",
    siteName: site.name,
    url: SITE_URL,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Breathe Pickleball — North Kolkata, Kaikhali",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Breathe Pickleball | Kaikhali, Kolkata",
    description:
      "Book a pickleball court in seconds. Three pro courts, equipment included, open daily in North Kolkata.",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: [
      { url: "/icons/icon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Breathe Pickleball",
  },
};

export const viewport: Viewport = {
  themeColor: "#2F5BFF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** Schema.org LocalBusiness + SportsActivityLocation. Helps Google understand
 *  hours, location, sport, amenities — surfaces a richer SERP card and is the
 *  baseline for Knowledge Panel eligibility. Generated once at import time. */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["SportsActivityLocation", "LocalBusiness"],
      name: "Breathe Pickleball",
      url: SITE_URL,
      telephone: "+917439010356",
      email: "breathepickleball@gmail.com",
      image: `${SITE_URL}/icons/icon-512.png`,
      address: {
        "@type": "PostalAddress",
        streetAddress: "Panchawati Complex, Plot 2, near Shyam Baba Mandir, Biman Nagar",
        addressLocality: "Kaikhali, Kolkata",
        postalCode: "700052",
        addressCountry: "IN",
      },
      geo: { "@type": "GeoCoordinates", latitude: 22.6548, longitude: 88.4347 },
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          opens: "05:00",
          closes: "23:00",
        },
      ],
      priceRange: "₹₹",
      sport: "Pickleball",
      numberOfRooms: 3,
      amenityFeature: [
        { "@type": "LocationFeatureSpecification", name: "Floodlit courts", value: true },
        { "@type": "LocationFeatureSpecification", name: "Complimentary equipment", value: true },
        { "@type": "LocationFeatureSpecification", name: "In-house kitchen", value: true },
      ],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // DARK-ONLY: the `dark` class is permanent so every dark: variant always
    // applies — the app ships a single dark theme (no toggle, no flash).
    <html
      lang="en"
      className={`dark ${display.variable} ${body.variable}`}
      style={{ colorScheme: "dark" }}
    >
      <head>
        <script
          type="application/ld+json"
          // JSON.stringify produces clean, escaped output — safe to inject.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          dangerouslySetInnerHTML={{
            // PRODUCTION: register + actively check for SW updates on every load,
            // and reload once when a NEW sw replaces an existing one so fresh
            // deploys appear immediately. We capture whether a controller already
            // existed so the first-install claim() does NOT trigger a spurious
            // reload — that reload-on-first-launch is what made the installed PWA
            // feel broken.
            //
            // DEVELOPMENT: never register the SW. Next regenerates /_next/static
            // chunks on every dev run, but sw.js serves them cache-first — a stale
            // chunk + fresh HTML silently breaks hydration (the page renders as a
            // blank dark shell). So in dev we instead UNREGISTER any SW left over
            // from a previous prod/dev session and purge its caches, reloading once
            // to drop the stale interception.
            __html:
              process.env.NODE_ENV === "production"
                ? `if('serviceWorker' in navigator){window.addEventListener('load',function(){var hadController=!!navigator.serviceWorker.controller;navigator.serviceWorker.register('/sw.js').then(function(r){r.update();}).catch(function(){});var rl=false;navigator.serviceWorker.addEventListener('controllerchange',function(){if(rl||!hadController)return;rl=true;window.location.reload();});});}`
                : `if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){var had=rs.length>0;rs.forEach(function(r){r.unregister();});var done=function(){if(had)window.location.reload();};if(window.caches){caches.keys().then(function(ks){return Promise.all(ks.map(function(k){return caches.delete(k);}));}).then(done).catch(done);}else{done();}});}`,
          }}
        />
      </head>
      <body className="bg-ink font-sans text-white/90 antialiased">
        <Providers>{children}</Providers>
        <ScrollPaddle />
        <PresenceBeacon />
      </body>
    </html>
  );
}
