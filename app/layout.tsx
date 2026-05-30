import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://breathe-web-six.vercel.app"),
  title: {
    default: "Breathe Pickleball | Court Booking in Kaikhali, Kolkata",
    template: "%s | Breathe Pickleball",
  },
  description:
    "Breathe Pickleball is North Kolkata's premier pickleball destination in Kaikhali — three professional courts, coaching for all ages, tournaments with cash prizes, and instant online slot booking.",
  keywords: [
    "pickleball Kolkata",
    "Breathe Pickleball",
    "pickleball court booking Kaikhali",
    "pickleball coaching Kolkata",
    "pickleball tournament Kolkata",
  ],
  openGraph: {
    title: "Breathe Pickleball | Kaikhali, Kolkata",
    description:
      "Book a court in seconds. Three professional courts, coaching for all ages, and tournaments with cash prizes in North Kolkata.",
    type: "website",
    locale: "en_IN",
    siteName: site.name,
  },
  icons: {
    icon: "/breathe-logo.jpg",
    apple: "/breathe-logo.jpg",
  },
};

export const viewport: Viewport = {
  themeColor: "#2F5BFF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
