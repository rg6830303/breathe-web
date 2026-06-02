import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";
import { themeNoFlashScript } from "@/components/theme-provider";
import { site, SITE_URL } from "@/lib/site";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  // 400/600/700 per spec, plus 800 because the existing headings use
  // font-extrabold — without it the browser would synthesize fake-bold.
  weight: ["400", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

// Editorial serif used for hero headings — gives the homepage a more premium,
// appealing feel (paired with the bold display font for everything else).
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
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
      email: "play@breathepickleball.in",
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
          opens: "06:00",
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
    <html lang="en" className={`${display.variable} ${body.variable} ${serif.variable}`}>
      <head>
        {/* Set theme class before paint to avoid a flash of the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: themeNoFlashScript }} />
        <script
          type="application/ld+json"
          // JSON.stringify produces clean, escaped output — safe to inject.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          dangerouslySetInnerHTML={{
            // Register + actively check for SW updates on every load, and reload
            // once when a new SW takes control so fresh deploys appear immediately
            // (fixes stale UI on mobile / installed PWAs).
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').then(function(r){r.update();}).catch(function(){});var rl=false;navigator.serviceWorker.addEventListener('controllerchange',function(){if(rl)return;rl=true;window.location.reload();});});}`,
          }}
        />
      </head>
      <body className="bg-white font-sans antialiased transition-colors duration-300 dark:bg-ink dark:text-white/90">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
