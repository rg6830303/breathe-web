"use client";

import { Users, Wind, TrendingUp, Star, MapPin } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { CTABand, Container, SectionDivider } from "@/components/ui";
import { PageHero } from "@/components/ui/page-hero";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { StatCounter } from "@/components/motion/stat-counter";
import { GlowCard } from "@/components/ui/glow-card";
import { TiltCard } from "@/components/motion/tilt-card";
import { CourtPatternBg } from "@/components/ui/court-pattern-bg";
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

        {/* Mission & Stats */}
        <section
          className="px-4 py-20 sm:px-6 lg:px-8 bg-white"
          style={{
            backgroundImage: "radial-gradient(circle, #2F5BFF11 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        >
          <Container className="!px-0 grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
            <ScrollReveal direction="up">
              <div>
                <span className="flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase text-brand-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-600" /> OUR MISSION
                </span>
                <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl text-ink">
                  Make pickleball easy to love in Kolkata
                </h2>
                <p className="mt-4 text-base leading-7 text-slatey">
                  Pickleball is the fastest-growing sport in the country, and we want everyone in the city to experience why. That means courts that are easy to reach, slots that are easy to book, equipment that's included, and a community that's easy to belong to.
                </p>

                {/* Stats grid */}
                <div className="mt-8 grid grid-cols-2 gap-4">
                  {[
                    { value: 3, label: "Professional courts", suffix: "" },
                    { value: 100, label: "Welcomed & coached", prefix: "All ages", isText: true },
                    { value: 6, label: "Open 6 AM – 11 PM", suffix: " AM", prefix: "", isTime: true },
                    { value: 12, label: "Tournaments hosted", suffix: "+", prefix: "Monthly", isText: true },
                  ].map((stat, i) => (
                    <TiltCard key={stat.label} maxTilt={6}>
                      <GlowCard className="p-5 shadow-soft border border-brand/5">
                        <div className="font-display text-3xl font-extrabold text-brand-600">
                          {stat.isTime ? (
                            <span className="whitespace-nowrap">
                              <StatCounter end={6} />AM–<StatCounter end={11} />PM
                            </span>
                          ) : stat.isText ? (
                            stat.prefix
                          ) : (
                            <StatCounter end={stat.value} suffix={stat.suffix} />
                          )}
                        </div>
                        <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slatey">
                          {stat.label}
                        </div>
                      </GlowCard>
                    </TiltCard>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* Values Grid */}
            <div className="grid gap-6 sm:grid-cols-2">
              {values.map(({ icon: Icon, title, text }, idx) => (
                <ScrollReveal key={title} delay={idx * 0.1} direction="right">
                  <TiltCard maxTilt={5} className="h-full">
                    <GlowCard className="h-full border border-brand/5 shadow-soft hover:shadow-card transition-all">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 font-display text-base font-bold text-ink">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slatey">{text}</p>
                    </GlowCard>
                  </TiltCard>
                </ScrollReveal>
              ))}
            </div>
          </Container>
        </section>

        <SectionDivider />

        {/* Timeline */}
        <section className="section-light px-4 py-20 sm:px-6 lg:px-8 bg-brand-50/20">
          <Container className="!px-0 max-w-3xl">
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase text-brand-600">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-600" /> OUR JOURNEY
              </span>
              <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl text-ink">
                How Breathe grew
              </h2>
            </div>

            <div className="relative pl-8 md:pl-12">
              {/* Vertical drawing line */}
              <motion.div
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
                className="absolute left-[15px] md:left-[23px] top-2 bottom-2 w-0.5 bg-brand-200 origin-top"
              />

              <div className="space-y-10">
                {timeline.map((item, idx) => (
                  <div key={item.year} className="relative">
                    {/* Node circle */}
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ type: "spring", stiffness: 300, damping: 15, delay: idx * 0.15 }}
                      className="absolute -left-[24px] md:-left-[32px] top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white z-10 shadow-soft"
                    >
                      {idx + 1}
                    </motion.div>

                    <ScrollReveal direction="left" delay={idx * 0.12}>
                      <div className="bg-white rounded-2xl border border-brand/5 p-6 shadow-soft hover:shadow-card transition-all">
                        <span className="text-xs font-bold text-brand-500 uppercase tracking-widest">{item.year}</span>
                        <p className="mt-2 text-sm leading-relaxed text-slatey">{item.text}</p>
                      </div>
                    </ScrollReveal>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </section>

        <SectionDivider />

        {/* Culture */}
        <section className="px-4 py-20 sm:px-6 lg:px-8 bg-white">
          <Container className="!px-0">
            <div className="brand-gradient brand-mesh relative overflow-hidden rounded-3xl p-8 text-white shadow-glow sm:p-12">
              <div className="court-lines absolute inset-0 opacity-20" />
              
              <div className="relative grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
                <ScrollReveal direction="left">
                  <div>
                    <Users className="h-10 w-10 text-lime" />
                    <h2 className="mt-4 font-display text-2xl font-extrabold sm:text-3xl">
                      A culture built on rallies, not egos
                    </h2>
                    <p className="mt-4 text-white/80 leading-relaxed">
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
                      <li className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 text-sm hover:bg-white/15 transition-all">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-lime" />
                        <span>{item}</span>
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
