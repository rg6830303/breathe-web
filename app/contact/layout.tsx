import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact & Location",
  description:
    "Visit Breathe Pickleball at Panchwati Complex, Kaikhali, Kolkata. Call +91 74390 10356 to book, get directions, or join our WhatsApp community. Open daily 6 AM – 11 PM.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Breathe Pickleball | Kaikhali, Kolkata",
    description:
      "Address, directions, phone, and WhatsApp community for Breathe Pickleball, Kaikhali. Open daily 6 AM – 11 PM.",
    url: "/contact",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
