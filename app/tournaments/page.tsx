import type { Metadata } from "next";
import Link from "next/link";
import { Award, CalendarDays, Crown, IndianRupee, MapPin, Medal, Trophy, Users } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { CTABand, Container, Eyebrow, SectionHeading } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Tournaments",
  description:
    "Pickleball tournaments at Breathe Pickleball, Kaikhali — monthly opens and beginner brackets with cash prizes, ranking points, and a great community atmosphere.",
};

const formats = [
  { icon: Crown, title: "Open Doubles", text: "Our flagship bracket for competitive players chasing prizes and ranking points." },
  { icon: Users, title: "Beginner Brackets", text: "A friendly, lower-pressure draw so new players can taste competition." },
  { icon: Medal, title: "Mixed Doubles", text: "Pair up and play in one of the most fun and fast-growing formats." },
  { icon: Award, title: "Social Ladders", text: "Ongoing weekly ladders that keep the competition alive all month." },
];

const highlights = [
  { icon: IndianRupee, label: "Cash prizes", value: "Real prize pools" },
  { icon: Trophy, label: "Multiple categories", value: "All levels" },
  { icon: CalendarDays, label: "Frequency", value: "Monthly events" },
  { icon: MapPin, label: "Venue", value: "Kaikhali, Kolkata" },
];

export default function TournamentsPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="brand-gradient brand-mesh relative overflow-hidden text-white">
          <div className="court-lines absolute inset-0 opacity-25" />
          <Container className="relative py-16 sm:py-20">
            <Eyebrow light>Tournaments</Eyebrow>
            <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">
              Compete for <span className="text-ball">real prizes</span> at Breathe
            </h1>
            <p className="mt-5 max-w-2xl text-white/85 sm:text-lg">
              We regularly host open tournaments with cash prizes alongside beginner-friendly brackets — bringing together
              the best of Kolkata's pickleball community for a day of serious, joyful competition.
            </p>
            <div className="mt-8 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
              {highlights.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-2xl bg-white/10 p-4">
                  <Icon className="h-5 w-5 text-ball" />
                  <div className="mt-2 font-display text-sm font-extrabold">{value}</div>
                  <div className="text-xs text-white/70">{label}</div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Formats */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <Container className="!px-0">
            <SectionHeading center eyebrow="Event formats" title="A bracket for every kind of player" />
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {formats.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-3xl border border-brand/10 bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-card">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 font-display text-lg font-bold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slatey">{text}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* What you get */}
        <section className="section-light px-4 py-20 sm:px-6 lg:px-8">
          <Container className="!px-0 grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
            <SectionHeading
              eyebrow="The Breathe experience"
              title="Run well, played hard, celebrated together"
              description="Our events are organised end-to-end so you can focus on your game — clear draws, on-time matches, referees where it counts, and a courtside kitchen to keep you fuelled."
            />
            <ul className="grid gap-3">
              {[
                "Cash prizes for winning categories",
                "Professionally managed brackets and scheduling",
                "Multiple skill divisions so matches stay competitive",
                "Live scoreboard and finals atmosphere under the lights",
                "Refreshments and seating for players and spectators",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 rounded-2xl border border-brand/10 bg-white p-4 text-sm text-ink shadow-soft">
                  <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {item}
                </li>
              ))}
            </ul>
          </Container>
        </section>

        {/* Next event CTA */}
        <section className="px-4 pb-4 sm:px-6 lg:px-8">
          <Container className="!px-0">
            <div className="brand-gradient brand-mesh relative overflow-hidden rounded-3xl p-8 text-center text-white shadow-glow sm:p-12">
              <div className="court-lines absolute inset-0 opacity-20" />
              <div className="relative">
                <Eyebrow light>Next event</Eyebrow>
                <h2 className="mx-auto mt-4 max-w-2xl font-display text-2xl font-extrabold sm:text-3xl">
                  Want in on the next Breathe Open?
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-white/85">
                  Registrations open ahead of each event. Follow us on Instagram or reach out and we'll make sure you don't miss the next one.
                </p>
                <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <a href={site.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-brand transition hover:bg-ball hover:text-ink">
                    Follow for updates
                  </a>
                  <Link href="/contact" className="inline-flex items-center gap-2 rounded-full border border-white/40 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">
                    Register interest
                  </Link>
                </div>
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
