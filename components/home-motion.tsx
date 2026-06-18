"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowRightCircle,
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
import { CourtScene } from "@/components/ui/court-scene";
import { SmartImage } from "@/components/ui/smart-image";
import { photos, communityPhotos } from "@/lib/photos";
import type { Notice } from "@/lib/types";

const features = [
  { icon: Sun, title: "3 premium courts", text: "Tournament-grade asphalt surface and net systems, floodlit for crisp evening play." },
  { icon: Trophy, title: "Tournaments & prizes", text: "Regular open and beginner brackets that bring the city's pickleball community together." },
  { icon: Sparkles, title: "Equipment included", text: "Pro paddles and balls are complimentary with every booking — just show up and play." },
  { icon: Coffee, title: "Courtside kitchen", text: "Refuel between games at Breathe Kitchen with snacks and cold drinks." },
  { icon: ShowerHead, title: "Changing facilities", text: "Clean changing rooms and washrooms so you arrive and leave fresh." },
  { icon: CalendarCheck, title: "Instant booking", text: "Live slot availability and confirmed reservations in seconds — no calls needed." },
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

// Heading inline-icon + fade-up stagger, adapted from the brief's hero spec.
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function HomeMotion({ notices }: { notices: Notice[] }) {
  return (
    <>
      {/* ══ HERO — fullscreen cinematic pickleball-in-action scene ══ */}
      <section className="relative flex min-h-[92svh] items-center overflow-hidden bg-ink text-white">
        <CourtScene />
        {/* a single flying serve across the whole hero for extra life */}
        <span aria-hidden className="hero-ball hidden sm:block" />
        {/* legibility wash — strongest on the left where the copy sits */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/25" />
        <div aria-hidden className="tape-stripe absolute left-0 top-0 z-10 h-1 w-full opacity-80" />

        <Container className="relative z-10 grid items-center gap-12 py-24 sm:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:py-32">
          <motion.div initial="hidden" animate="visible">
            <motion.span variants={fadeUp} custom={0} className="chip">
              <span className="chip__dot" /> <MapPin className="h-3.5 w-3.5 text-lime" /> Kaikhali · North Kolkata
            </motion.span>

            <motion.h1 variants={fadeUp} custom={1} className="mt-6">
              <span className="block text-sm font-bold uppercase tracking-[0.24em] text-white/45">
                Welcome to
              </span>
              <span className="heading-xl mt-3 block text-white">
                Breathe <span className="text-lime">Pickleball</span>
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} custom={2} className="mt-6 max-w-md text-base leading-7 text-white/65 sm:text-lg">
              Three professional courts, complimentary equipment, and a thriving community —
              all bookable in seconds from your phone.
            </motion.p>

            {/* inline-icon benefit pills (the brief's inline-icon energy) */}
            <motion.div variants={fadeUp} custom={3} className="mt-6 flex flex-wrap gap-2.5">
              {[
                [Zap, "Instant booking"],
                [Sparkles, "Gear included"],
                [Trophy, "Tournaments"],
              ].map(([Icon, label]) => {
                const I = Icon as typeof Zap;
                return (
                  <span key={label as string} className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white/75">
                    <I className="h-3.5 w-3.5 text-lime" /> {label as string}
                  </span>
                );
              })}
            </motion.div>

            <motion.div variants={fadeUp} custom={4} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
                <Link href="/book" className="btn-accent w-full justify-between sm:w-auto sm:justify-center">
                  Book a Slot Now <ArrowRightCircle className="h-5 w-5" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
                <Link
                  href="/about"
                  className="btn-outline w-full border-white/35 text-white hover:border-white hover:bg-white/5 hover:text-white dark:border-white/35 dark:text-white dark:hover:border-white dark:hover:text-white sm:w-auto"
                >
                  Explore the club
                </Link>
              </motion.div>
            </motion.div>

            <motion.div variants={fadeUp} custom={5} className="mt-10 grid grid-cols-3 gap-3">
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
                <div key={label} className="flex flex-col items-center rounded-xl border border-white/10 bg-white/[0.04] px-2 py-4 text-center">
                  <div className="flex h-9 items-center justify-center font-display text-xl font-bold leading-none text-white sm:h-10 sm:text-2xl">
                    {value}
                  </div>
                  <div className="mt-1.5 flex min-h-[2.1em] items-center text-[0.6rem] font-semibold uppercase leading-tight tracking-wider text-white/45">
                    {label}
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Live availability — floating glass card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <LiveAvailability />
          </motion.div>
        </Container>

        {/* scroll cue */}
        <div aria-hidden className="absolute inset-x-0 bottom-5 z-10 hidden justify-center lg:flex">
          <motion.span
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="text-[0.6rem] font-bold uppercase tracking-[0.3em] text-white/35"
          >
            Scroll
          </motion.span>
        </div>
      </section>

      {/* ══ TRUST STRIP ══ */}
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
                  <I className="h-5 w-5 text-brand dark:text-lime" />
                </div>
                <span className="text-sm font-extrabold uppercase tracking-wide text-ink dark:text-white">{label as string}</span>
              </ScrollReveal>
            );
          })}
        </Container>
      </section>

      {/* ══ SHOWCASE — big photo split (replaces gallery's role) ══ */}
      <section className="bg-white px-4 py-20 dark:bg-ink sm:px-6 lg:px-8">
        <Container className="!px-0">
          <ScrollReveal direction="up">
            <div className="mb-10 max-w-2xl">
              <span className="eyebrow text-brand dark:text-lime">Life at Breathe</span>
              <h2 className="heading-lg mt-4 text-ink dark:text-white">
                Real courts, real{" "}
                <span className="mark-lime">community</span>
              </h2>
              <p className="mt-4 text-base text-slatey dark:text-white/65">
                Floodlit evenings, friendly rallies, and a crowd that feels like a club.
                Here's a glimpse of the energy on our courts.
              </p>
            </div>
          </ScrollReveal>

          {/* asymmetric photo grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
            <ScrollReveal direction="up" className="lg:col-span-2 lg:row-span-2">
              <div className="photo-frame aspect-[4/5] h-full w-full sm:aspect-square lg:aspect-auto">
                <span className="photo-frame__tick" />
                <SmartImage photo={photos.playersAction} sizes="(max-width:1024px) 100vw, 50vw" priority imgClassName="object-[center_30%]" />
                <div className="absolute bottom-0 left-0 z-[2] p-5">
                  <span className="text-sm font-bold text-white">Game on, every evening</span>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.06}>
              <div className="photo-frame aspect-[4/5] sm:aspect-square">
                <span className="photo-frame__tick" />
                <SmartImage photo={photos.communityWomen} sizes="(max-width:1024px) 50vw, 25vw" />
              </div>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.12}>
              <div className="photo-frame aspect-[4/5] sm:aspect-square">
                <span className="photo-frame__tick" />
                <SmartImage photo={photos.tournamentWinners} sizes="(max-width:1024px) 50vw, 25vw" />
              </div>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.18}>
              <div className="photo-frame aspect-[4/5] sm:aspect-square">
                <span className="photo-frame__tick" />
                <SmartImage photo={photos.communityCourt} sizes="(max-width:1024px) 50vw, 25vw" />
              </div>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.24}>
              <div className="photo-frame aspect-[4/5] sm:aspect-square">
                <span className="photo-frame__tick" />
                <SmartImage photo={photos.kitchen} sizes="(max-width:1024px) 50vw, 25vw" />
                <div className="absolute bottom-0 left-0 z-[2] p-4">
                  <span className="text-xs font-bold text-white">Breathe Kitchen</span>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </Container>
      </section>

      {/* ══ FEATURES ══ */}
      <section className="bg-white px-4 py-20 text-ink dark:bg-[#111c38] dark:text-white sm:px-6 lg:px-8">
        <Container className="!px-0">
          <ScrollReveal direction="up">
            <div className="mb-12 text-center">
              <span className="eyebrow text-brand dark:text-lime">Why Breathe</span>
              <h2 className="heading-lg mt-4 text-ink dark:text-white">
                Everything a great game needs,{" "}
                <span className="mark-lime">in one place</span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-slatey dark:text-white/65">
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

      {/* ══ HOW IT WORKS ══ */}
      <section className="bg-white px-4 py-20 dark:bg-ink sm:px-6 lg:px-8">
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
                {/* a real court photo to anchor the copy */}
                <div className="photo-frame mt-7 aspect-[16/10] hidden lg:block">
                  <SmartImage photo={photos.courtNight} sizes="(max-width:1024px) 0px, 40vw" />
                </div>
              </div>
            </ScrollReveal>

            <div className="relative">
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

      {/* ══ SPLIT PROMO — court booking + tournaments (with photo) ══ */}
      <section className="bg-white px-4 py-20 dark:bg-[#111c38] sm:px-6 lg:px-8">
        <Container className="!px-0 grid gap-5 lg:grid-cols-2">
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
                <Link href="/book" className="btn-primary mt-8 self-start">
                  Book a slot now <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </TiltCard>
          </ScrollReveal>

          {/* Tournament card — photo background with lime tape */}
          <ScrollReveal direction="right" className="h-full">
            <TiltCard maxTilt={3} className="h-full">
              <div className="relative h-full min-h-[20rem] overflow-hidden rounded-3xl text-white flex flex-col justify-end">
                <SmartImage photo={photos.tournamentWinners} sizes="(max-width:1024px) 100vw, 50vw" className="!absolute inset-0" imgClassName="object-[center_25%]" />
                <div aria-hidden className="absolute inset-0 z-[1] bg-gradient-to-t from-ink via-ink/70 to-ink/20" />
                <div aria-hidden className="tape-stripe absolute left-0 top-0 z-[2] h-1.5 w-full opacity-90" />
                <div className="relative z-[2] p-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime">
                    <Trophy className="h-6 w-6 text-ink" />
                  </div>
                  <h3 className="heading-lg mt-5 text-white" style={{ fontSize: "clamp(1.5rem,3vw,2rem)" }}>
                    Tournaments with{" "}
                    <span className="mark-lime">real stakes</span>
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-7 text-white/75">
                    Monthly opens and beginner brackets with cash prizes, ranking points, and the best courtside atmosphere in the city.
                  </p>
                  <Link href="/tournaments" className="btn-accent relative mt-7 self-start">
                    See tournament calendar <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </TiltCard>
          </ScrollReveal>
        </Container>
      </section>

      {/* ══ COMMUNITY MARQUEE — edge-to-edge auto-scroll ══ */}
      <section className="relative overflow-hidden bg-ink py-16">
        <div aria-hidden className="tape-stripe absolute left-0 top-0 h-1 w-full opacity-60" />
        <Container className="!px-4 sm:!px-6 lg:!px-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <span className="eyebrow text-lime">On the courts</span>
              <h2 className="heading-lg mt-3 text-white" style={{ fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>
                Moments from the club
              </h2>
            </div>
            <Link href="/book" className="hidden shrink-0 text-sm font-bold text-lime hover:underline sm:inline-flex sm:items-center sm:gap-1">
              Join a session <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Container>
        <div className="relative">
          <div className="marquee gap-4 pl-4">
            {[...communityPhotos, ...communityPhotos].map((photo, i) => (
              <div key={i} className="photo-frame photo-frame--plain aspect-[3/4] w-[230px] shrink-0 sm:w-[280px]">
                <SmartImage photo={photo} sizes="280px" />
              </div>
            ))}
          </div>
          {/* edge fades */}
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-ink to-transparent" />
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ink to-transparent" />
        </div>
      </section>

      {/* ══ NOTICE BOARD ══ */}
      <NoticeBoard notices={notices} />

      {/* ══ TESTIMONIALS ══ */}
      <section className="bg-white px-4 py-20 dark:bg-ink sm:px-6 lg:px-8">
        <Container className="!px-0">
          <ScrollReveal direction="up">
            <div className="mb-2 text-center">
              <span className="eyebrow text-brand dark:text-lime">From our community</span>
              <h2 className="heading-lg mt-4 text-ink dark:text-white">
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
