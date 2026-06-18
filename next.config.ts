import type { NextConfig } from "next";
import path from "node:path";

// Content-Security-Policy: defence-in-depth against XSS/clickjacking. Allows the
// origins the app actually needs (Razorpay checkout, Google Maps embed, Google
// Fonts, https images for Instagram/Vercel-blob). Inline scripts/styles are
// permitted because the app ships a small no-FOUC theme script + JSON-LD.
//
// NOTE: `next dev` compiles client modules with eval()-based HMR, which a strict
// script-src blocks ("unsafe-eval" violation) — that silently kills hydration and
// leaves the page a blank dark shell locally. So we allow 'unsafe-eval' in
// development ONLY; production stays strict (no eval), keeping the deployed site
// hardened per the project security rules.
const isDev = process.env.NODE_ENV !== "production";

const scriptSrc = [
  "script-src 'self' 'unsafe-inline'",
  isDev ? "'unsafe-eval'" : "",
  "https://checkout.razorpay.com https://*.razorpay.com",
]
  .filter(Boolean)
  .join(" ");

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  scriptSrc,
  "connect-src 'self' https:",
  "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://*.razorpay.com https://www.google.com",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Don't leak the framework via X-Powered-By.
  poweredByHeader: false,
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdninstagram.com" },
      { protocol: "https", hostname: "*.cdninstagram.com" },
      { protocol: "https", hostname: "scontent.cdninstagram.com" },
      { protocol: "https", hostname: "scontent-*.cdninstagram.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
