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
import { Container, SectionHeading } from "@/components/ui";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { StatCounter } from "@/components/motion/stat-counter";
import { GlowCard } from "@/components/ui/glow-card";
import { TiltCard } from "@/components/motion/tilt-card";
import { TestimonialsCarousel } from "@/components/testimonials-carousel";
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
        staggerChildren: 0.15,
      },
    },
  };

  const spanVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 to-brand-800 text-white">
        <CourtLinesSVG />
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-lime/10 blur-3xl animate-blob" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-blob [animation-delay:3s]" />
        
        {/* Animated Floating Paddle (Desktop Only) */}
        {/* Floating 3D paddle (perspective tilt) */}
        <motion.div
          className="hidden md:block absolute right-12 top-1/4 z-10 w-32 h-32 opacity-20 pointer-events-none"
          style={{ perspective: 800 }}
          animate={{ y: [0, -14, 0], rotateY: [-18, 18, -18], rotateX: [6, -6, 6] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current drop-shadow-[0_12px_24px_rgba(0,0,0,0.3)]">
            <ellipse cx="50" cy="40" rx="22" ry="27" />
            <rect x="46" y="66" width="8" height="22" rx="3" />
            <g fill="#2F5BFF">
              <circle cx="44" cy="32" r="2" /><circle cx="50" cy="32" r="2" /><circle cx="56" cy="32" r="2" />
              <circle cx="44" cy="40" r="2" /><circle cx="50" cy="40" r="2" /><circle cx="56" cy="40" r="2" />
              <circle cx="47" cy="48" r="2" /><circle cx="53" cy="48" r="2" />
            </g>
          </svg>
        </motion.div>

        {/* Bouncing pickleball accent */}
        <div className="hidden lg:block absolute left-10 bottom-16 z-10 pointer-events-none">
          <div className="h-10 w-10 rounded-full bg-lime/80 shadow-[0_0_24px_rgba(198,242,62,0.5)] animate-ball-bounce" style={{ backgroundImage: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.6), transparent 40%)" }} />
        </div>

        <Container className="relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            <motion.span
              variants={spanVariants}
              className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white"
            >
              <MapPin className="h-3.5 w-3.5 text-lime" /> Kaikhali · North Kolkata
            </motion.span>
            
            {/* Split stagger heading — editorial serif + bold display mix */}
            <motion.h1
              variants={containerVariants}
              className="mt-5 leading-[1.02] tracking-tight"
            >
              <motion.span
                variants={spanVariants}
                className="block font-serif-hero text-4xl italic text-white/90 sm:text-5xl lg:text-[3.5rem]"
              >
                Welcome to
              </motion.span>
              <motion.span
                variants={spanVariants}
                className="block bg-gradient-to-r from-lime via-white to-lime bg-clip-text font-display text-5xl font-extrabold text-transparent animate-shimmer sm:text-6xl lg:text-7xl"
              >
                Breathe
              </motion.span>
              <motion.span
                variants={spanVariants}
                className="block font-serif-hero text-4xl italic text-white sm:text-5xl lg:text-[3.5rem]"
              >
                Pickleball
              </motion.span>
            </motion.h1>

            <motion.p variants={spanVariants} className="mt-5 max-w-xl text-base leading-7 text-white/85 sm:text-lg">
              Three professional courts, complimentary equipment, and a thriving community — all bookable in seconds from your phone.
            </motion.p>
            
            {/* Primary & Secondary CTA Buttons */}
            <motion.div variants={spanVariants} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="inline-block">
                <Link
                  href="/book"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-lime px-7 py-3.5 text-sm font-bold text-gray-900 shadow-soft transition hover:bg-lime-dark"
                >
                  Book Slot Now <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="inline-block">
                <Link
                  href="/gallery"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white text-white px-7 py-3.5 text-sm font-bold transition hover:bg-white/10"
                >
                  View the Courts
                </Link>
              </motion.div>
            </motion.div>
            
            {/* Stat Counters */}
            <motion.div variants={spanVariants} className="mt-10 flex flex-wrap gap-x-8 gap-y-4 max-w-md sm:grid sm:grid-cols-3 sm:gap-4">
              <div>
                <div className="font-display text-2xl font-extrabold text-lime sm:text-3xl">
                  <StatCounter end={3} />
                </div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/70">Pro courts</div>
              </div>
              <div>
                <div className="font-display text-2xl font-extrabold text-lime sm:text-3xl whitespace-nowrap">
                  <StatCounter end={6} suffix="AM" />–<StatCounter end={11} suffix="PM" />
                </div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/70">Open daily</div>
              </div>
              <div>
                <div className="font-display text-2xl font-extrabold text-lime sm:text-3xl">All</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/70">Skill levels</div>
              </div>
            </motion.div>
          </motion.div>

          <div className="relative">
            <LiveAvailability />
          </div>
        </Container>
      </section>

      {/* Trust strip */}
      <section className="border-b border-brand/10 bg-white">
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
                <I className="h-6 w-6 text-brand" />
                <span className="text-sm font-semibold text-ink">{label as string}</span>
              </ScrollReveal>
            );
          })}
        </Container>
      </section>

      {/* Features with Tilt Card */}
      <section className="bg-brand-50 px-4 py-20 sm:px-6 lg:px-8">
        <Container className="!px-0">
          <SectionHeading
            center
            eyebrow="Why Breathe"
            title="Everything a great game needs, in one place"
            description="From the surface under your feet to the snacks after match point, every detail is built for players."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }, i) => (
              <ScrollReveal key={title} delay={i * 0.08} direction="up">
                <TiltCard maxTilt={4} className="h-full">
                  <GlowCard className="group h-full flex flex-col justify-between">
                    <div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                        <motion.div whileHover={{ rotate: 15, scale: 1.2 }}>
                          <Icon className="h-6 w-6" />
                        </motion.div>
                      </div>
                      <h3 className="mt-5 font-display text-lg font-bold text-ink">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slatey">{text}</p>
                    </div>
                  </GlowCard>
                </TiltCard>
              </ScrollReveal>
            ))}
          </div>
        </Container>
      </section>

      {/* How it works with Drawing Connectors */}
      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <Container className="!px-0">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <SectionHeading
              eyebrow="How it works"
              title="From phone to court in three steps"
              description="Most of our players book on their phone minutes before they leave home. Here's how simple it is."
            />
            
            <div className="relative">
              {/* Animated vertical connector line */}
              <motion.div
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
                className="absolute left-6 top-10 bottom-10 w-0.5 bg-brand-200 origin-top hidden sm:block"
              />

              <div className="grid gap-6 relative">
                {steps.map(({ icon: Icon, title, text }, i) => (
                  <ScrollReveal key={title} delay={i * 0.15} direction="left">
                    <div className="flex items-start gap-4 rounded-3xl border border-brand/10 bg-white p-5 shadow-soft hover:shadow-card transition-all">
                      {/* SVG circle filling animation */}
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center z-10 bg-white rounded-full">
                        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
                          <circle
                            cx="18"
                            cy="18"
                            r="16"
                            fill="none"
                            stroke="rgba(47,91,255,0.08)"
                            strokeWidth="2.5"
                          />
                          <motion.circle
                            cx="18"
                            cy="18"
                            r="16"
                            fill="none"
                            stroke="#2F5BFF"
                            strokeWidth="2.5"
                            strokeDasharray="100"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: i * 0.15, ease: "easeOut" }}
                          />
                        </svg>
                        <span className="font-display text-sm font-extrabold text-brand">{i + 1}</span>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-brand" />
                          <h3 className="font-display text-base font-bold text-ink">{title}</h3>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slatey">{text}</p>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Split Section */}
      <section className="bg-brand-50 px-4 py-20 sm:px-6 lg:px-8">
        <Container className="!px-0 grid gap-5 lg:grid-cols-2">
          <ScrollReveal direction="left" className="h-full">
            <TiltCard maxTilt={3} className="h-full">
              <div className="relative overflow-hidden rounded-3xl border border-brand/10 bg-white p-8 shadow-soft h-full flex flex-col justify-between">
                <div>
                  <CalendarCheck className="h-10 w-10 text-brand" />
                  <h3 className="mt-4 font-display text-2xl font-extrabold text-ink">Your court, one tap away</h3>
                  <p className="mt-3 text-sm leading-6 text-slatey">
                    Live availability across all three courts, transparent pricing, and instant confirmation. Paddles and balls are on us.
                  </p>
                </div>
                <Link href="/book" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-brand hover:gap-3 transition-all">
                  Book a slot now <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </TiltCard>
          </ScrollReveal>

          <ScrollReveal direction="right" className="h-full">
            <TiltCard maxTilt={3} className="h-full">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-800 p-8 text-white shadow-glow h-full flex flex-col justify-between">
                <CourtLinesSVG />
                <div className="relative">
                  <Trophy className="h-10 w-10 text-lime" />
                  <h3 className="mt-4 font-display text-2xl font-extrabold">Tournaments with real stakes</h3>
                  <p className="mt-3 text-sm leading-6 text-white/85">
                    Monthly opens and beginner brackets with cash prizes, ranking points, and the best courtside atmosphere in the city.
                  </p>
                </div>
                <Link href="/tournaments" className="relative mt-6 inline-flex items-center gap-2 text-sm font-bold text-lime hover:gap-3 transition-all">
                  See the tournament calendar <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </TiltCard>
          </ScrollReveal>
        </Container>
      </section>

      {/* Notice Board */}
      <NoticeBoard notices={notices} />

      {/* Testimonials */}
      <section className="bg-brand-50 px-4 py-20 sm:px-6 lg:px-8">
        <Container className="!px-0">
          <SectionHeading center eyebrow="From our community" title="Loved by players across Kolkata" />
          <TestimonialsCarousel testimonials={testimonials} />
        </Container>
      </section>
    </>
  );
}
