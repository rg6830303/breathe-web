import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Baby, Check, Dumbbell, Trophy, Users } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { CTABand, Container, Eyebrow, SectionHeading } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Coaching",
  description:
    "Pickleball coaching for all ages at Breathe Pickleball, Kaikhali — junior clinics, adult beginner courses, and advanced performance training.",
};

const programs = [
  {
    icon: Baby,
    name: "Junior Academy",
    audience: "Ages 7–15",
    desc: "Fun, structured sessions that build coordination, footwork, and a lifelong love of the game.",
    points: ["Small coach-to-player ratios", "Equipment provided", "Weekend & after-school batches"],
  },
  {
    icon: Users,
    name: "Adult Beginners",
    audience: "New to pickleball",
    desc: "Go from never-played to confident rallies in a few weeks. Learn serves, dinks, and scoring the right way.",
    points: ["No experience needed", "Paddles & balls included", "Friendly group format"],
  },
  {
    icon: Dumbbell,
    name: "Intermediate Drilling",
    audience: "Know the basics",
    desc: "Sharpen the third-shot drop, resets, and net play with focused drills and live-ball reps.",
    points: ["Shot-specific drilling", "Strategy & positioning", "Match-play feedback"],
  },
  {
    icon: Trophy,
    name: "Performance / Competitive",
    audience: "Tournament players",
    desc: "High-intensity training to compete at the next level — fitness, tactics, and pressure situations.",
    points: ["Advanced tactics", "Video & match analysis", "Tournament prep"],
  },
];

export default function CoachingPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="brand-gradient brand-mesh relative overflow-hidden text-white">
          <div className="court-lines absolute inset-0 opacity-25" />
          <Container className="relative py-16 sm:py-20">
            <Eyebrow light>Coaching</Eyebrow>
            <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">
              Coaching for <span className="text-ball">every age and level</span>
            </h1>
            <p className="mt-5 max-w-2xl text-white/85 sm:text-lg">
              Whether you've never held a paddle or you're chasing a podium, our certified coaches meet you where you are
              and take you further. Small groups, real feedback, and a whole lot of fun.
            </p>
            <Link
              href="/contact"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-brand shadow-soft transition hover:bg-ball hover:text-ink"
            >
              Enquire about a batch <ArrowRight className="h-4 w-4" />
            </Link>
          </Container>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <Container className="!px-0">
            <SectionHeading center eyebrow="Programs" title="Find the right program for you" />
            <div className="mt-12 grid gap-5 sm:grid-cols-2">
              {programs.map(({ icon: Icon, name, audience, desc, points }) => (
                <div key={name} className="flex flex-col rounded-3xl border border-brand/10 bg-white p-7 shadow-soft transition hover:-translate-y-1 hover:shadow-card">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand">
                      {audience}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-xl font-extrabold text-ink">{name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slatey">{desc}</p>
                  <ul className="mt-5 space-y-2">
                    {points.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-sm text-ink">
                        <Check className="h-4 w-4 text-brand" /> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* How sessions run */}
        <section className="section-light px-4 py-20 sm:px-6 lg:px-8">
          <Container className="!px-0 grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
            <SectionHeading
              eyebrow="What to expect"
              title="Coaching that's structured, not stiff"
              description="Every session balances real technique with the joy of playing. You'll warm up, drill with purpose, and finish with live points so the learning sticks."
            />
            <div className="grid gap-4">
              {[
                ["Assessment", "We start by understanding your current level and goals."],
                ["Skill blocks", "Focused drills on the shots that move your game forward."],
                ["Live play", "Apply it under real conditions with coached match-play."],
                ["Progress tracking", "Clear milestones so you can see how far you've come."],
              ].map(([title, text], i) => (
                <div key={title} className="flex items-start gap-4 rounded-3xl border border-brand/10 bg-white p-5 shadow-soft">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl brand-gradient font-display text-sm font-extrabold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-base font-bold text-ink">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slatey">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        <section className="px-4 pb-4 sm:px-6 lg:px-8">
          <Container className="!px-0">
            <div className="rounded-3xl border border-brand/10 bg-brand/5 p-8 text-center sm:p-10">
              <h2 className="font-display text-2xl font-extrabold text-ink">Want a custom or private session?</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-slatey">
                We offer one-on-one coaching and private group bookings. Call us and we'll tailor a plan to your goals.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a href={site.phoneHref} className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-bold text-white shadow-glow transition hover:bg-brand-600">
                  Call {site.phoneDisplay}
                </a>
                <a href={site.whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-brand/30 px-6 py-3 text-sm font-bold text-brand transition hover:bg-brand/5">
                  Message on WhatsApp
                </a>
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
