"use client";

import { Users, Wind, TrendingUp, Star } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { CTABand, Container, SectionDivider } from "@/components/ui";
import { PageHero } from "@/components/ui/page-hero";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { StatCounter } from "@/components/motion/stat-counter";
import { TiltCard } from "@/components/motion/tilt-card";
import { CourtPatternBg } from "@/components/ui/court-pattern-bg";
import { PaddleScene } from "@/components/ui/paddle-scene";
import { motion } from "framer-motion";
import { site } from "@/lib/site";

const values = [
  { icon: Users, title: "Community first", text: "We're a place where regulars know each other's names and first-timers feel at home from rally one." },
  { icon: Wind, title: "Breathe & play", text: "Sport as a way to switch off, move, and reset. Good rallies, good people, fresh air." },
  { icon: TrendingUp, title: "Always growing", text: "From casual evenings to competitive ladders, we help players find their next level." },
  { icon: Star, title: "Premium asphalt courts", text: "Professional asphalt surface with tournament-grade net systems, floodlit for evening play." },
];

const timeline = [
  { year: "The spark", text: "A handful of friends fell for pickleball and wanted a real home for the game in North Kolkata." },
  { year: "The courts", text: "Breathe opened in Kaikhali with professional courts, floodlights, and a courtside kitchen." },
  { year: "The community", text: "Social ladders and open tournaments turned a venue into a thriving club." },
  { year: "Today", text: "One of Kolkata's go-to pickleball destinations — and now bookable instantly online." },
];

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main className="overflow-x-hidden">
        {/* Page Hero */}
        <PageHero
          dark={true}
          label="About Breathe"
          title="More than a court — a place to breathe and play"
          subtitle="North Kolkata's community-first pickleball club. Great courts, complimentary equipment, and a welcoming crowd."
        />

        {/* ── MISSION & STATS — light section ── */}
        <section className="bg-white px-4 py-20 dark:bg-[#111c38] sm:px-6 lg:px-8">
          <Container className="!px-0 grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
            <ScrollReveal direction="up">
              <div>
                <span className="eyebrow">Our mission</span>
                <h2 className="heading-lg mt-4 text-ink dark:text-white">
                  Make pickleball easy to{" "}
                  <span className="mark-lime">love in Kolkata</span>
                </h2>
                <p className="mt-4 text-base leading-7 text-slatey dark:text-white/65">
                  Pickleball is the fastest-growing sport in the country, and we want everyone in the city to experience why. That means courts that are easy to reach, slots that are easy to book, equipment that's included, and a community that's easy to belong to.
                </p>

                {/* Stats grid */}
                <div className="mt-8 grid grid-cols-2 gap-4">
                  {[
                    { display: <><StatCounter end={3} /></>, label: "Professional courts" },
                    { display: "All ages", label: "Welcomed & coached" },
                    {
                      display: (
                        <span className="whitespace-nowrap text-2xl">
                          <StatCounter end={6} />AM–<StatCounter end={11} />PM
                        </span>
                      ),
                      label: "Open daily",
                    },
                    { display: <>Monthly+</>, label: "Tournaments hosted" },
                  ].map((stat, i) => (
                    <TiltCard key={stat.label} maxTilt={6}>
                      <div className="card-sport p-5">
                        <div className="font-display text-3xl font-extrabold text-brand dark:text-lime">
                          {stat.display}
                        </div>
                        <div className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-slatey dark:text-white/50">
                          {stat.label}
                        </div>
                      </div>
                    </TiltCard>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* Values Grid */}
            <div className="grid gap-5 sm:grid-cols-2">
              {values.map(({ icon: Icon, title, text }, idx) => (
                <ScrollReveal key={title} delay={idx * 0.1} direction="right">
                  <TiltCard maxTilt={5} className="h-full">
                    <div className="card-sport h-full p-6">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10">
                        <Icon className="h-5 w-5 text-brand dark:text-lime" />
                      </div>
                      <h3 className="mt-4 font-display text-base font-extrabold text-ink dark:text-white">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slatey dark:text-white/60">{text}</p>
                    </div>
                  </TiltCard>
                </ScrollReveal>
              ))}
            </div>
          </Container>
        </section>

        {/* ── TIMELINE — dark ink section ── */}
        <section className="bg-ink px-4 py-20 sm:px-6 lg:px-8">
          <Container className="!px-0 max-w-3xl">
            <ScrollReveal direction="up">
              <div className="mb-12 text-center">
                <span className="eyebrow text-lime">Our journey</span>
                <h2 className="heading-lg mt-4 text-white">
                  How <span className="mark-lime">Breathe</span> grew
                </h2>
              </div>
            </ScrollReveal>

            <div className="relative pl-8 md:pl-12">
              {/* Vertical drawing line */}
              <motion.div
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
                className="absolute left-[15px] top-2 bottom-2 w-0.5 origin-top bg-lime/40 md:left-[23px]"
              />

              <div className="space-y-8">
                {timeline.map((item, idx) => (
                  <div key={item.year} className="relative">
                    {/* Node circle */}
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ type: "spring", stiffness: 300, damping: 15, delay: idx * 0.15 }}
                      className="absolute -left-[24px] top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-lime text-[10px] font-extrabold text-ink shadow-soft md:-left-[32px]"
                    >
                      {idx + 1}
                    </motion.div>

                    <ScrollReveal direction="left" delay={idx * 0.12}>
                      <div className="card-sport p-5">
                        <span className="tag-sport">{item.year}</span>
                        <p className="mt-3 text-sm leading-relaxed text-slatey dark:text-white/60">{item.text}</p>
                      </div>
                    </ScrollReveal>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* ── CULTURE — light section with PaddleScene accent ── */}
        <section className="bg-white px-4 py-20 dark:bg-[#111c38] sm:px-6 lg:px-8">
          <Container className="!px-0">
            <div className="relative overflow-hidden rounded-3xl bg-ink p-8 text-white sm:p-12">
              <div aria-hidden className="tape-stripe absolute left-0 top-0 h-1.5 w-full opacity-90" />
              <CourtPatternBg className="absolute inset-0 h-full w-full object-cover opacity-[0.08]" />

              {/* PaddleScene accent */}
              <div className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 opacity-60 xl:block">
                <PaddleScene size={220} faceFrom="#c6f432" faceTo="#9bbd18" />
              </div>

              <div className="relative grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
                <ScrollReveal direction="left">
                  <div>
                    <span className="eyebrow text-lime">Culture</span>
                    <h2 className="heading-lg mt-4 text-white">
                      A culture built on{" "}
                      <span className="mark-lime">rallies, not egos</span>
                    </h2>
                    <p className="mt-4 leading-relaxed text-white/70">
                      Whether you came to compete or just to unwind after work, you'll find a court and a partner here. We mix up doubles, run friendly ladders, celebrate beginners' first wins, and keep the energy warm and welcoming — on and off the court.
                    </p>
                  </div>
                </ScrollReveal>

                <ul className="grid gap-3">
                  {[
                    "Open play sessions where you can rotate in and meet new partners",
                    "Beginner-friendly community with zero judgement",
                    "Social ladders and leagues for friendly competition",
                    "Courtside kitchen and changing rooms for the full experience",
                  ].map((item, idx) => (
                    <ScrollReveal key={item} direction="right" delay={idx * 0.1}>
                      <li className="flex items-start gap-3 rounded-2xl border-2 border-white/10 p-4 text-sm transition hover:border-lime/40">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-lime" />
                        <span className="text-white/80">{item}</span>
                      </li>
                    </ScrollReveal>
                  ))}
                </ul>
              </div>
            </div>
          </Container>
        </section>

        <SectionDivider />

        <CTABand />
      </main>
      <Footer />
    </>
  );
}
