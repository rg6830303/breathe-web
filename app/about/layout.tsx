import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Breathe Pickleball is North Kolkata's community-first pickleball club in Kaikhali — three professional floodlit courts, complimentary equipment, and a welcoming crowd. Learn our story.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Breathe Pickleball | Kaikhali, North Kolkata",
    description:
      "Our story: a community-first pickleball club in Kaikhali with three pro courts, complimentary equipment, and tournaments.",
    url: "/about",
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
