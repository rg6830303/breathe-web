import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pickleball Tournaments in Kolkata",
  description:
    "Compete in pickleball tournaments at Breathe Pickleball, Kaikhali — open doubles, beginner brackets, and mixed doubles with cash prizes. Join North Kolkata's pickleball community.",
  alternates: { canonical: "/tournaments" },
  openGraph: {
    title: "Pickleball Tournaments | Breathe Pickleball, Kolkata",
    description:
      "Open doubles, beginner brackets, and mixed doubles with cash prizes at Breathe Pickleball, Kaikhali.",
    url: "/tournaments",
  },
};

export default function TournamentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
