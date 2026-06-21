"use client";

import Link from "next/link";
import { Award, Crown, Medal, Trophy, Users, Check } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { CTABand, Container, SectionDivider } from "@/components/ui";
import { PageHero } from "@/components/ui/page-hero";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { StatCounter } from "@/components/motion/stat-counter";
import { TiltCard } from "@/components/motion/tilt-card";
import { TournamentBracket } from "@/components/ui/tournament-bracket";
import { SmartImage } from "@/components/ui/smart-image";
import { photos } from "@/lib/photos";
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
        {/* Page Hero with floating lime particles */}
        <div className="relative">
          <PageHero
            dark={true}
            label="Tournaments"
            title="Compete for real prizes at Breathe"
            subtitle="We regularly host open tournaments with cash prizes alongside beginner-friendly brackets — bringing together the best of Kolkata's pickleball community for a day of serious, joyful competition."
          />

          {/* Seeded particles */}
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
                  opacity: 0.25,
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

        {/* ── TOURNAMENT FORMATS — light / ink (dark) ── */}
        <section className="bg-white px-4 py-20 text-ink dark:bg-ink dark:text-white sm:px-6 lg:px-8">
          <Container className="!px-0">
            <ScrollReveal direction="up">
              <div className="mb-12 text-center">
                <span className="eyebrow text-brand dark:text-lime">Event formats</span>
                <h2 className="heading-lg mt-4 text-ink dark:text-white">
                  A bracket for{" "}
                  <span className="mark-lime">every kind</span> of player
                </h2>
              </div>
            </ScrollReveal>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {formats.map(({ icon: Icon, title, text }, i) => (
                <ScrollReveal key={title} delay={i * 0.1} direction="up">
                  <TiltCard maxTilt={5} className="h-full">
                    <div className="card-sport h-full p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime/15">
                        <Icon className="h-6 w-6 text-lime" />
                      </div>
                      <h3 className="mt-5 font-display text-base font-extrabold text-ink dark:text-white">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slatey dark:text-white/60">{text}</p>
                    </div>
                  </TiltCard>
                </ScrollReveal>
              ))}
            </div>
          </Container>
        </section>

        {/* ── PRIZE / STATS STRIP — lime bar ── */}
        <section className="bg-lime py-12 px-4 sm:px-6 lg:px-8">
          <Container className="!px-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              {[
                { label: "Cash prizes", value: "₹₹₹", isText: true },
                { label: "Categories", value: 4, suffix: " divisions" },
                { label: "Events", value: 1, prefix: "Monthly " },
                { label: "Full Venue", value: 3, suffix: " courts" },
              ].map((stat, i) => (
                <ScrollReveal key={stat.label} delay={i * 0.1} direction="up" className="flex flex-col items-center">
                  <div className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
                    {stat.isText ? (
                      <motion.span
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                      >
                        {stat.value}
                      </motion.span>
                    ) : (
                      <>
                        {stat.prefix}
                        <StatCounter end={stat.value as number} suffix={stat.suffix} />
                      </>
                    )}
                  </div>
                  <div className="mt-2 text-[0.65rem] font-extrabold uppercase tracking-wider text-ink/60">
                    {stat.label}
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </Container>
        </section>

        {/* ── CHAMPIONS PHOTO BAND ── */}
        <section className="bg-white px-4 py-20 dark:bg-ink sm:px-6 lg:px-8">
          <Container className="!px-0">
            <ScrollReveal direction="up">
              <div className="mb-8 max-w-2xl">
                <span className="eyebrow text-brand dark:text-lime">From the arena</span>
                <h2 className="heading-lg mt-4 text-ink dark:text-white" style={{ fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>
                  Where champions are{" "}
                  <span className="mark-lime">crowned</span>
                </h2>
              </div>
            </ScrollReveal>
            <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
              <ScrollReveal direction="left" className="h-full">
                <div className="photo-frame aspect-[4/3] h-full w-full">
                  <span className="photo-frame__tick" />
                  <SmartImage photo={photos.tournamentWinners} sizes="(max-width:1024px) 100vw, 55vw" imgClassName="object-[center_22%]" />
                  <div className="absolute bottom-0 left-0 z-[2] p-6">
                    <span className="eyebrow text-lime">Breathe Battle 1.0</span>
                    <p className="mt-2 font-display text-lg font-extrabold text-white">Trophies, medals, and a finals atmosphere under the lights.</p>
                  </div>
                </div>
              </ScrollReveal>
              <ScrollReveal direction="right" className="h-full">
                <div className="photo-frame aspect-[4/3] h-full w-full">
                  <span className="photo-frame__tick" />
                  <SmartImage photo={photos.communityWomen} sizes="(max-width:1024px) 100vw, 35vw" />
                </div>
              </ScrollReveal>
            </div>
          </Container>
        </section>

        {/* ── EXPERIENCE + BRACKET — light section ── */}
        <section className="bg-white px-4 py-20 dark:bg-[#111c38] sm:px-6 lg:px-8">
          <Container className="!px-0 grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <ScrollReveal direction="left">
              <div>
                <span className="eyebrow">The Breathe experience</span>
                <h2 className="heading-lg mt-4 text-ink dark:text-white">
                  Run well, played hard,{" "}
                  <span className="mark-lime">celebrated together</span>
                </h2>
                <p className="mt-4 text-sm text-slatey leading-relaxed dark:text-white/65">
                  Our events are organised end-to-end so you can focus on your game — clear draws, on-time matches, referees where it counts, and a courtside kitchen to keep you fuelled.
                </p>

                <ul className="mt-8 grid gap-3">
                  {[
                    "Cash prizes for winning categories",
                    "Professionally managed brackets and scheduling",
                    "Multiple skill divisions so matches stay competitive",
                    "Live scoreboard and finals atmosphere under the lights",
                    "Refreshments and seating for players and spectators",
                  ].map((item) => (
                    <li key={item} className="card-sport flex items-start gap-3 p-4 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
                      <span className="text-ink dark:text-white/80">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>

            {/* Bracket draw visualization */}
            <ScrollReveal direction="right">
              <div className="flex flex-col gap-4">
                <div className="mb-2 text-center md:text-left">
                  <h3 className="font-display text-lg font-extrabold text-ink dark:text-white flex items-center justify-center md:justify-start gap-2">
                    <Trophy className="h-5 w-5 text-lime" /> Interactive Tournament Bracket
                  </h3>
                  <p className="text-xs text-slatey dark:text-white/50 mt-1">Watch how the bracket resolves under the lights</p>
                </div>
                <TournamentBracket />
              </div>
            </ScrollReveal>
          </Container>
        </section>

        {/* ── NEXT EVENT CTA — dark ink section ── */}
        <section className="bg-ink px-4 py-16 sm:px-6 lg:px-8">
          <Container className="!px-0">
            <ScrollReveal direction="up">
              <div className="relative overflow-hidden rounded-3xl border-2 border-lime/20 p-8 text-center text-white sm:p-12">
                <div aria-hidden className="tape-stripe absolute left-0 top-0 h-1.5 w-full opacity-90" />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-[0.05]"
                  style={{
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                    backgroundSize: "44px 44px",
                  }}
                />
                <div className="relative">
                  <span className="eyebrow text-lime justify-center">Next event</span>
                  <h2 className="heading-lg mx-auto mt-4 max-w-2xl text-white" style={{ fontSize: "clamp(1.75rem,4vw,2.5rem)" }}>
                    Want in on the next{" "}
                    <span className="mark-lime">Breathe Open?</span>
                  </h2>
                  <p className="mx-auto mt-4 max-w-xl text-white/60 text-sm leading-relaxed">
                    Registrations open ahead of each event. Follow us on Instagram or reach out and we'll make sure you don't miss the next one.
                  </p>

                  <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="w-full sm:w-auto">
                      <a
                        href={site.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-accent w-full sm:w-auto"
                      >
                        Follow for updates
                      </a>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="w-full sm:w-auto">
                      <Link href="/contact" className="btn-outline w-full sm:w-auto">
                        Register interest
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </Container>
        </section>

        <SectionDivider />

        <CTABand />
      </main>
      <Footer />
    </>
  );
}
