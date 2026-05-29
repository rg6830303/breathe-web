import type { Metadata } from "next";
import { Heart, Leaf, MapPin, Target, TrendingUp, Users } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { CTABand, Container, Eyebrow, SectionHeading } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "The story of Breathe Pickleball — North Kolkata's community-first pickleball club in Kaikhali, built around culture, coaching, and growth.",
};

const values = [
  { icon: Heart, title: "Community first", text: "We're a place where regulars know each other's names and first-timers feel at home from rally one." },
  { icon: Leaf, title: "Breathe & play", text: "Sport as a way to switch off, move, and reset. Good rallies, good people, fresh air." },
  { icon: TrendingUp, title: "Always growing", text: "From casual evenings to competitive ladders, we help players find their next level." },
  { icon: Target, title: "Quality courts", text: "Tournament-grade surfaces and proper equipment so every game feels the part." },
];

const timeline = [
  { year: "The spark", text: "A handful of friends fell for pickleball and wanted a real home for the game in North Kolkata." },
  { year: "The courts", text: "Breathe opened in Kaikhali with professional courts, floodlights, and a courtside kitchen." },
  { year: "The community", text: "Coaching, social ladders, and open tournaments turned a venue into a thriving club." },
  { year: "Today", text: "One of Kolkata's go-to pickleball destinations — and now bookable instantly online." },
];

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="brand-gradient brand-mesh relative overflow-hidden text-white">
          <div className="court-lines absolute inset-0 opacity-25" />
          <Container className="relative py-16 sm:py-20">
            <Eyebrow light>About Breathe</Eyebrow>
            <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">
              More than a court — a place to <span className="text-ball">breathe and play</span>
            </h1>
            <p className="mt-5 max-w-2xl text-white/85 sm:text-lg">
              Breathe Pickleball is North Kolkata's community-first pickleball club in Kaikhali. We bring together
              great courts, real coaching, and a welcoming crowd so that everyone — from total beginners to seasoned
              competitors — has somewhere to play their best game.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-sm font-semibold">
              <MapPin className="h-4 w-4 text-ball" /> {site.address}
            </div>
          </Container>
        </section>

        {/* Mission */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <Container className="!px-0 grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <SectionHeading
                eyebrow="Our mission"
                title="Make pickleball easy to love in Kolkata"
                description="Pickleball is the fastest-growing sport in the country, and we want everyone in the city to experience why. That means courts that are easy to reach, slots that are easy to book, coaching that's easy to start, and a community that's easy to belong to."
              />
              <div className="mt-6 grid grid-cols-2 gap-4">
                {[
                  ["3", "Professional courts"],
                  ["All ages", "Welcomed & coached"],
                  ["Daily", "Open 6 AM – 11 PM"],
                  ["Monthly", "Tournaments hosted"],
                ].map(([v, l]) => (
                  <div key={l} className="rounded-2xl border border-brand/10 bg-white p-4 shadow-soft">
                    <div className="font-display text-xl font-extrabold text-brand">{v}</div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slatey">{l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {values.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-3xl border border-brand/10 bg-white p-6 shadow-soft">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slatey">{text}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Timeline */}
        <section className="section-light px-4 py-20 sm:px-6 lg:px-8">
          <Container className="!px-0">
            <SectionHeading center eyebrow="Our journey" title="How Breathe grew" />
            <div className="mt-12 grid gap-5 md:grid-cols-4">
              {timeline.map((t, i) => (
                <div key={t.year} className="relative rounded-3xl border border-brand/10 bg-white p-6 shadow-soft">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full brand-gradient font-display text-sm font-extrabold text-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 font-display text-base font-bold text-ink">{t.year}</h3>
                  <p className="mt-2 text-sm leading-6 text-slatey">{t.text}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Culture */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <Container className="!px-0">
            <div className="brand-gradient brand-mesh relative overflow-hidden rounded-3xl p-8 text-white shadow-glow sm:p-12">
              <div className="court-lines absolute inset-0 opacity-20" />
              <div className="relative grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
                <div>
                  <Users className="h-10 w-10 text-ball" />
                  <h2 className="mt-4 font-display text-2xl font-extrabold sm:text-3xl">A culture built on rallies, not egos</h2>
                  <p className="mt-4 text-white/85">
                    Whether you came to compete or just to unwind after work, you'll find a court and a partner here.
                    We mix up doubles, run friendly ladders, celebrate beginners' first wins, and keep the energy warm
                    and welcoming — on and off the court.
                  </p>
                </div>
                <ul className="grid gap-3">
                  {[
                    "Open play sessions where you can rotate in and meet new partners",
                    "Beginner-friendly coaching with zero judgement",
                    "Social ladders and leagues for friendly competition",
                    "Courtside kitchen and changing rooms for the full experience",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 text-sm">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-ball" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Container>
        </section>

        <CTABand />
      </main>
      <Footer />
    </>
  );
}
