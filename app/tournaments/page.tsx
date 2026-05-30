"use client";

import Link from "next/link";
import { Award, CalendarDays, Crown, IndianRupee, MapPin, Medal, Trophy, Users, Check } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { CTABand, Container } from "@/components/ui";
import { PageHero } from "@/components/ui/page-hero";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { StatCounter } from "@/components/motion/stat-counter";
import { GlowCard } from "@/components/ui/glow-card";
import { TiltCard } from "@/components/motion/tilt-card";
import { TournamentBracket } from "@/components/ui/tournament-bracket";
import { motion } from "framer-motion";
import { site } from "@/lib/site";

const formats = [
  { icon: Crown, title: "Open Doubles", text: "Our flagship bracket for competitive players chasing prizes and ranking points." },
  { icon: Users, title: "Beginner Brackets", text: "A friendly, lower-pressure draw so new players can taste competition." },
  { icon: Medal, title: "Mixed Doubles", text: "Pair up and play in one of the most fun and fast-growing formats." },
  { icon: Award, title: "Social Ladders", text: "Ongoing weekly ladders that keep the competition alive all month." },
];

const particles = [
  { top: "20%", left: "15%", size: 4, duration: 6, delay: 0 },
  { top: "45%", left: "80%", size: 3, duration: 8, delay: 1 },
  { top: "70%", left: "30%", size: 5, duration: 7, delay: 0.5 },
  { top: "30%", left: "65%", size: 2, duration: 9, delay: 2 },
  { top: "85%", left: "75%", size: 6, duration: 6.5, delay: 1.5 },
  { top: "15%", left: "45%", size: 4, duration: 7.5, delay: 0.2 },
  { top: "60%", left: "10%", size: 3, duration: 8.5, delay: 2.2 },
  { top: "50%", left: "50%", size: 5, duration: 5.5, delay: 0.7 },
];

export default function TournamentsPage() {
  return (
    <>
      <Nav />
      <main className="overflow-x-hidden">
        {/* Cinematic dark hero section */}
        <div className="relative">
          <PageHero
            dark={true}
            bgClassName="bg-gradient-to-br from-gray-950 via-brand-900 to-brand-700 text-white"
            label="Tournaments"
            title="Compete for real prizes at Breathe"
            subtitle="We regularly host open tournaments with cash prizes alongside beginner-friendly brackets — bringing together the best of Kolkata's pickleball community for a day of serious, joyful competition."
          />

          {/* Seeded particles to avoid hydration mismatches */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
            {particles.map((p, i) => (
              <motion.div
                key={i}
                style={{
                  position: "absolute",
                  top: p.top,
                  left: p.left,
                  width: p.size,
                  height: p.size,
                  borderRadius: "50%",
                  backgroundColor: "#C6F432",
                  opacity: 0.2,
                }}
                animate={{
                  y: [0, -30, 0],
                  x: [0, 15, -15, 0],
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </div>

        {/* Tournament Formats in a Dark Style GlowCard */}
        <section className="px-4 py-20 sm:px-6 lg:px-8 bg-gray-950 text-white relative">
          <Container className="!px-0">
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase text-lime">
                <span className="w-1.5 h-1.5 rounded-full bg-lime" /> EVENT FORMATS
              </span>
              <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl text-white">
                A bracket for every kind of player
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {formats.map(({ icon: Icon, title, text }, i) => (
                <ScrollReveal key={title} delay={i * 0.1} direction="up">
                  <TiltCard maxTilt={5} className="h-full">
                    <GlowCard
                      glow="0 0 40px rgba(255,201,60,0.2)"
                      className="h-full bg-gray-900 border border-white/10 text-white p-6 shadow-soft hover:shadow-card transition-all"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-lime">
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="mt-5 font-display text-lg font-bold text-white">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-gray-400">{text}</p>
                    </GlowCard>
                  </TiltCard>
                </ScrollReveal>
              ))}
            </div>
          </Container>
        </section>

        {/* Prize / Stats strip */}
        <section className="bg-brand-800 text-white py-12 px-4 sm:px-6 lg:px-8 shadow-inner relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_#ffffff_1px,_transparent_1px)] bg-[size:16px_16px]" />
          <Container className="!px-0 relative">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              {[
                { label: "Cash prizes", value: "₹₹₹", prefix: "Prize Pool: " },
                { label: "Categories", value: 4, suffix: " divisions" },
                { label: "Events", value: 1, prefix: "Monthly " },
                { label: "Full Venue", value: 3, suffix: " courts" },
              ].map((stat, i) => (
                <ScrollReveal key={stat.label} delay={i * 0.1} direction="up" className="flex flex-col items-center">
                  <div className="font-display text-2xl sm:text-3xl font-extrabold text-lime flex items-center justify-center gap-1">
                    {typeof stat.value === "number" ? (
                      <>
                        {stat.prefix}
                        <StatCounter end={stat.value} suffix={stat.suffix} />
                      </>
                    ) : (
                      <motion.span
                        animate={{ color: ["#FFC93C", "#C6F432", "#FFC93C"] }}
                        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                        className="font-bold"
                      >
                        {stat.value}
                      </motion.span>
                    )}
                  </div>
                  <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-white/70">
                    {stat.label}
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </Container>
        </section>

        {/* Experience & Bracket draw section */}
        <section className="px-4 py-20 sm:px-6 lg:px-8 bg-white">
          <Container className="!px-0 grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <ScrollReveal direction="left">
              <div>
                <span className="flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase text-brand-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-600" /> THE BREATHE EXPERIENCE
                </span>
                <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl text-ink">
                  Run well, played hard, celebrated together
                </h2>
                <p className="mt-4 text-sm text-slatey leading-relaxed">
                  Our events are organised end-to-end so you can focus on your game — clear draws, on-time matches, referees where it counts, and a courtside kitchen to keep you fuelled.
                </p>

                <ul className="mt-8 grid gap-3">
                  {[
                    "Cash prizes for winning categories",
                    "Professionally managed brackets and scheduling",
                    "Multiple skill divisions so matches stay competitive",
                    "Live scoreboard and finals atmosphere under the lights",
                    "Refreshments and seating for players and spectators",
                  ].map((item, idx) => (
                    <li key={item} className="flex items-start gap-3 rounded-2xl border border-brand/5 bg-gray-50 p-4 text-sm text-ink shadow-soft">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>

            {/* Bracket draw visualization */}
            <ScrollReveal direction="right">
              <div className="flex flex-col gap-4">
                <div className="text-center md:text-left mb-2">
                  <h3 className="font-display text-lg font-bold text-ink flex items-center justify-center md:justify-start gap-2">
                    <Trophy className="h-5 w-5 text-brand" /> Interactive Tournament Bracket
                  </h3>
                  <p className="text-xs text-slatey mt-1">Watch how the bracket resolves under the lights</p>
                </div>
                <TournamentBracket />
              </div>
            </ScrollReveal>
          </Container>
        </section>

        {/* Next event CTA */}
        <section className="px-4 pb-4 sm:px-6 lg:px-8 bg-white">
          <Container className="!px-0">
            <ScrollReveal direction="up">
              <div className="brand-gradient brand-mesh relative overflow-hidden rounded-3xl p-8 text-center text-white shadow-glow sm:p-12">
                <div className="court-lines absolute inset-0 opacity-20" />
                <div className="relative">
                  <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase text-lime">
                    <span className="w-1.5 h-1.5 rounded-full bg-lime" /> NEXT EVENT
                  </span>
                  <h2 className="mx-auto mt-4 max-w-2xl font-display text-2xl font-extrabold sm:text-3xl">
                    Want in on the next Breathe Open?
                  </h2>
                  <p className="mx-auto mt-3 max-w-xl text-white/85 text-sm leading-relaxed">
                    Registrations open ahead of each event. Follow us on Instagram or reach out and we'll make sure you don't miss the next one.
                  </p>
                  
                  <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="w-full sm:w-auto">
                      <a href={site.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-bold text-brand shadow-soft hover:bg-gray-50 transition-colors">
                        Follow for updates
                      </a>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="w-full sm:w-auto">
                      <Link href="/contact" className="inline-flex w-full sm:w-auto items-center justify-center rounded-full border border-white/40 px-7 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10">
                        Register interest
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </Container>
        </section>

        <CTABand />
      </main>
      <Footer />
    </>
  );
}
