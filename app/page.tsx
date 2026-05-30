import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { CTABand } from "@/components/ui";
import type { Notice } from "@/lib/types";
import { HomeMotion } from "@/components/home-motion";

const notices: Notice[] = [
  {
    id: 1,
    title: "Tonight: prime-time courts filling fast",
    content: "7–9 PM slots on Courts 1 & 2 are nearly gone — lock yours in now.",
    type: "daily",
    created_at: "",
    updated_at: "",
  },
  {
    id: 2,
    title: "Weekend Doubles Ladder",
    content: "Saturday social ladder, all levels welcome. Registration closes Friday 6 PM.",
    type: "weekly",
    created_at: "",
    updated_at: "",
  },
  {
    id: 3,
    title: "Breathe Monthly Open",
    content: "Open & beginner brackets with cash prizes. Early-bird passes now available.",
    type: "monthly",
    created_at: "",
    updated_at: "",
  },
];

export default function Home() {
  return (
    <>
      <Nav />
      <main className="overflow-x-hidden">
        <HomeMotion notices={notices} />
        <CTABand />
      </main>
      <Footer />
    </>
  );
}
