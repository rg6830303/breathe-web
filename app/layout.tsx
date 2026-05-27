import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Breathe Pickleball",
  description: "Cyber-athletic pickleball court booking, player dashboard, and owner admin system.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
