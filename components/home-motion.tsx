"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck,
  Coffee,
  MapPin,
  ShieldCheck,
  ShowerHead,
  Sparkles,
  Sun,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { LiveAvailability } from "@/components/live-availability";
import { NoticeBoard } from "@/components/notice-board";
import { Container } from "@/components/ui";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { StatCounter } from "@/components/motion/stat-counter";
import { TiltCard } from "@/components/motion/tilt-card";
import { TestimonialsCarousel } from "@/components/testimonials-carousel";
import { PaddleScene } from "@/components/ui/paddle-scene";
import type { Notice } from "@/lib/types";

const features = [
  { icon: Sun, title: "3 premium asphalt courts", text: "Professional asphalt surface with tournament-grade net systems, floodlit for evening play." },
  { icon: Trophy, title: "Tournaments & cash prizes", text: "Regular open and beginner brackets that bring the city's pickleball community together." },
  { icon: Sparkles, title: "Equipment included", text: "Pro paddles and balls are complimentary with every court booking — just show up and play." },
  { icon: Coffee, title: "In-house kitchen", text: "Refuel courtside with snacks and beverages between games." },
  { icon: ShowerHead, title: "Changing facilities", text: "Clean changing rooms and washrooms so you arrive and leave fresh." },
  { icon: CalendarCheck, title: "Instant online booking", text: "Live slot availability and confirmed reservations in seconds — no calls needed." },
];

const steps = [
  { icon: CalendarCheck, title: "Pick your slot", text: "Choose a date and tap an open 30-minute slot on any court." },
  { icon: Zap, title: "Review & confirm", text: "See transparent pricing with GST, add paddles or balls, and confirm." },
  { icon: Sparkles, title: "Show up & play", text: "Get a confirmation, walk in, and we'll have your court ready." },
];

const testimonials = [
  { name: "Ananya Roy", role: "Weekend regular", memberType: "Member since 2024", quote: "Booking used to mean five phone calls. Now it's three taps on my phone and I'm on court the same evening." },
  { name: "Sourav Mukherjee", role: "Intermediate player", memberType: "Weekend regular", quote: "Floodlit courts, paddles included, and booking takes seconds. Genuinely the best pickleball spot in North Kolkata." },
  { name: "Priya & Karan", role: "Doubles pair", memberType: "Tournament regulars", quote: "The monthly open is so well run — great vibe, real competition, and the courtside kitchen is a bonus." },
];

function CourtLinesSVG() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1200 800"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ opacity: 0.06 }}
    >
      <line x1="120" y1="80" x2="120" y2="720" stroke="white" strokeWidth="2" />
      <line x1="1080" y1="80" x2="1080" y2="720" stroke="white" strokeWidth="2" />
      <line x1="120" y1="80" x2="1080" y2="80" stroke="white" strokeWidth="2" />
      <line x1="120" y1="720" x2="1080" y2="720" stroke="white" strokeWidth="2" />
      <line x1="120" y1="400" x2="1080" y2="400" stroke="white" strokeWidth="3" />
      <line x1="120" y1="310" x2="1080" y2="310" stroke="white" strokeWidth="1.5" strokeDasharray="6 6" />
      <line x1="120" y1="490" x2="1080" y2="490" stroke="white" strokeWidth="1.5" strokeDasharray="6 6" />
      <line x1="600" y1="80" x2="600" y2="310" stroke="white" strokeWidth="1.5" />
      <line x1="600" y1="490" x2="600" y2="720" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}

export function HomeMotion({ notices }: { notices: Notice[] }) {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.12,
      },
    },
  };

  const spanVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <>
      {/* ── HERO — solid ink, court lines, PaddleScene ── */}
      <section className="relative min-h-[88svh] overflow-hidden bg-ink text-white">
        {/* Court-tape accent stripe */}
        <div aria-hidden className="tape-stripe absolute left-0 top-0 h-1.5 w-full opacity-90" />

        {/* Court grid */}
        <CourtLinesSVG />

        {/* Lime corner wash */}
        <div aria-hidden className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-lime/10 blur-3xl" />

        {/* PaddleScene — visible md+ */}
        <div className="pointer-events-none absolute right-0 top-1/2 hidden -translate-y-1/2 opacity-95 lg:block xl:right-8">
          <PaddleScene size={360} />
        </div>
        {/* PaddleScene mini — mobile accent */}
        <div className="pointer-events-none absolute right-3 top-20 opacity-30 sm:right-8 sm:top-16 lg:hidden">
          <PaddleScene size={120} />
        </div>

        {/* Bouncing pickleball accent */}
        <div
          aria-hidden
          className="animate-ball-bounce absolute bottom-10 left-4 z-0 h-7 w-7 rounded-full sm:left-10 sm:h-10 sm:w-10"
          style={{
            background: "radial-gradient(circle at 32% 28%, #f7ff8a, #c6f432 55%, #8fae12)",
            boxShadow: "0 8px 20px rgba(198,242,62,0.4)",
          }}
        />

        <Container className="relative z-10 grid items-center gap-10 py-20 sm:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:py-32">
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            {/* Location tag */}
            <motion.span
              variants={spanVariants}
              className="tag-sport"
            >
              <MapPin className="h-3 w-3" /> Kaikhali · North Kolkata
            </motion.span>

            {/* Athletic stacked wordmark */}
            <motion.h1 variants={containerVariants} className="mt-6">
              <motion.span
                variants={spanVariants}
                className="block text-[0.7rem] font-extrabold uppercase tracking-[0.32em] text-white/50"
              >
                Welcome to
              </motion.span>
              <motion.span variants={spanVariants} className="heading-xl mt-2 block text-lime">
                Breathe
              </motion.span>
              <motion.span variants={spanVariants} className="heading-xl block text-white">
                Pickleball
              </motion.span>
            </motion.h1>

            <motion.p variants={spanVariants} className="mt-6 max-w-md text-base leading-7 text-white/70 sm:text-lg">
              Three professional courts, complimentary equipment, and a thriving community — all bookable in seconds from your phone.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={spanVariants} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <motion.div whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
                <Link href="/book" className="btn-accent w-full sm:w-auto">
                  Book Slot Now <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
              <motion.div whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
                <Link
                  href="/gallery"
                  className="btn-outline w-full sm:w-auto"
                >
                  View the Courts
                </Link>
              </motion.div>
            </motion.div>

            {/* Stat counters */}
            <motion.div variants={spanVariants} className="mt-10 grid grid-cols-3 gap-3">
              {[
                { value: <StatCounter end={3} />, label: "Pro courts" },
                {
                  value: (
                    <span className="whitespace-nowrap">
                      5<span className="text-sm">AM</span>–11<span className="text-sm">PM</span>
                    </span>
                  ),
                  label: "Open daily",
                },
                { value: "All", label: "Skill levels" },
              ].map(({ value, label }) => (
                <div key={label} className="rounded-2xl border-2 border-white/10 bg-white/5 px-3 py-4 text-center">
                  <div className="font-display text-2xl font-extrabold text-lime sm:text-3xl">{value}</div>
                  <div className="mt-1 text-[0.6rem] font-extrabold uppercase tracking-wider text-white/50 sm:text-xs">{label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <div className="relative">
            <LiveAvailability />
          </div>
        </Container>
      </section>

      {/* ── TRUST STRIP — light section ── */}
      <section className="border-b-2 border-ink/8 bg-white dark:border-white/10 dark:bg-[#111c38]">
        <Container className="grid grid-cols-2 gap-6 py-8 text-center sm:grid-cols-4">
          {[
            [Users, "All skill levels"],
            [ShieldCheck, "Certified coaches"],
            [Trophy, "Tournaments hosted"],
            [Sparkles, "Open every day"],
          ].map(([Icon, label], idx) => {
            const I = Icon as typeof Users;
            return (
              <ScrollReveal key={label as string} delay={idx * 0.1} direction="up" className="flex flex-col items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
                  <I className="h-5 w-5 text-brand" />
                </div>
                <span className="text-sm font-extrabold uppercase tracking-wide text-ink dark:text-white">{label as string}</span>
              </ScrollReveal>
            );
          })}
        </Container>
      </section>

      {/* ── FEATURES — dark ink section ── */}
      <section className="bg-ink px-4 py-20 text-white sm:px-6 lg:px-8">
        <Container className="!px-0">
          {/* Section header */}
          <ScrollReveal direction="up">
            <div className="mb-12 text-center">
              <span className="eyebrow text-lime">Why Breathe</span>
              <h2 className="heading-lg mt-4 text-white">
                Everything a great game needs,{" "}
                <span className="mark-lime">in one place</span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-white/65">
                From the surface under your feet to the snacks after match point, every detail is built for players.
              </p>
            </div>
          </ScrollReveal>

          <div className="mt-2 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }, i) => (
              <ScrollReveal key={title} delay={i * 0.08} direction="up">
                <TiltCard maxTilt={4} className="h-full">
                  <div className="card-sport group h-full flex flex-col gap-4 p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime/15">
                      <motion.div whileHover={{ rotate: 15, scale: 1.2 }}>
                        <Icon className="h-6 w-6 text-lime" />
                      </motion.div>
                    </div>
                    <div>
                      <h3 className="font-display text-base font-extrabold text-ink dark:text-white">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slatey dark:text-white/60">{text}</p>
                    </div>
                  </div>
                </TiltCard>
              </ScrollReveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ── HOW IT WORKS — light section ── */}
      <section className="bg-white px-4 py-20 dark:bg-[#111c38] sm:px-6 lg:px-8">
        <Container className="!px-0">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <ScrollReveal direction="up">
              <div>
                <span className="eyebrow">How it works</span>
                <h2 className="heading-lg mt-4 text-ink dark:text-white">
                  From phone to court in{" "}
                  <span className="mark-lime">three steps</span>
                </h2>
                <p className="mt-4 text-base leading-7 text-slatey dark:text-white/65">
                  Most of our players book on their phone minutes before they leave home. Here's how simple it is.
                </p>
              </div>
            </ScrollReveal>

            <div className="relative">
              {/* Connector line */}
              <motion.div
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
                className="absolute left-7 top-10 bottom-10 hidden w-0.5 origin-top bg-lime/40 sm:block"
              />

              <div className="grid gap-5 relative">
                {steps.map(({ icon: Icon, title, text }, i) => (
                  <ScrollReveal key={title} delay={i * 0.15} direction="left">
                    <div className="card-sport flex items-start gap-4 p-5">
                      {/* Step number */}
                      <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-lime">
                        <span className="font-display text-lg font-extrabold text-ink">{i + 1}</span>
                      </div>
                      <div className="pt-1">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-brand dark:text-lime" />
                          <h3 className="font-display text-base font-extrabold text-ink dark:text-white">{title}</h3>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slatey dark:text-white/60">{text}</p>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── SPLIT PROMO — alternating ink/lime ── */}
      <section className="bg-ink px-4 py-20 sm:px-6 lg:px-8">
        <Container className="!px-0 grid gap-5 lg:grid-cols-2">
          {/* Court booking card — light */}
          <ScrollReveal direction="left" className="h-full">
            <TiltCard maxTilt={3} className="h-full">
              <div className="card-sport group relative h-full overflow-hidden p-8 flex flex-col justify-between">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10">
                    <CalendarCheck className="h-6 w-6 text-brand" />
                  </div>
                  <h3 className="heading-lg mt-5 text-ink dark:text-white" style={{ fontSize: "clamp(1.5rem,3vw,2rem)" }}>
                    Your court,{" "}
                    <span className="mark-lime">one tap away</span>
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slatey dark:text-white/60">
                    Live availability across all three courts, transparent pricing, and instant confirmation. Paddles and balls are on us.
                  </p>
                </div>
                <Link
                  href="/book"
                  className="btn-primary mt-8 self-start"
                >
                  Book a slot now <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </TiltCard>
          </ScrollReveal>

          {/* Tournament card — dark with lime */}
          <ScrollReveal direction="right" className="h-full">
            <TiltCard maxTilt={3} className="h-full">
              <div className="relative h-full overflow-hidden rounded-3xl bg-lime p-8 text-ink flex flex-col justify-between">
                <CourtLinesSVG />
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink/10">
                    <Trophy className="h-6 w-6 text-ink" />
                  </div>
                  <h3 className="heading-lg mt-5 text-ink" style={{ fontSize: "clamp(1.5rem,3vw,2rem)" }}>
                    Tournaments with{" "}
                    <span className="relative inline-block">
                      <span className="relative z-10">real stakes</span>
                      <span
                        aria-hidden
                        className="absolute inset-x-[-0.1em] bottom-[0.08em] -z-0 h-[0.38em] bg-ink/15"
                        style={{ transform: "skewX(-8deg)" }}
                      />
                    </span>
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-ink/70">
                    Monthly opens and beginner brackets with cash prizes, ranking points, and the best courtside atmosphere in the city.
                  </p>
                </div>
                <Link
                  href="/tournaments"
                  className="btn-dark relative mt-8 self-start"
                >
                  See tournament calendar <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </TiltCard>
          </ScrollReveal>
        </Container>
      </section>

      {/* ── NOTICE BOARD — light section ── */}
      <NoticeBoard notices={notices} />

      {/* ── TESTIMONIALS — dark ink section ── */}
      <section className="bg-ink px-4 py-20 sm:px-6 lg:px-8">
        <Container className="!px-0">
          <ScrollReveal direction="up">
            <div className="mb-2 text-center">
              <span className="eyebrow text-lime">From our community</span>
              <h2 className="heading-lg mt-4 text-white">
                Loved by players{" "}
                <span className="mark-lime">across Kolkata</span>
              </h2>
            </div>
          </ScrollReveal>
          <TestimonialsCarousel testimonials={testimonials} />
        </Container>
      </section>
    </>
  );
}
