import type { Metadata } from "next";

/**
 * Admin-area metadata: a DISTINCT PWA identity from the public site so the
 * installed owner app has its own name ("Breathe Admin") and its own dark/lime
 * icon — no longer identical to the customer app on the home screen.
 */
export const metadata: Metadata = {
  title: "Breathe Admin",
  manifest: "/admin.webmanifest",
  applicationName: "Breathe Admin",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Breathe Admin",
  },
  icons: {
    icon: [
      { url: "/icons/admin-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/admin-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/admin-apple-touch-icon.png",
  },
  // The console must never be indexed.
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
