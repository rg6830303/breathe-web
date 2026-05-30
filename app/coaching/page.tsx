"use client";

import Link from "next/link";
import { ArrowRight, Check, GraduationCap, Users, Target, Trophy } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { CTABand, Container, SectionDivider } from "@/components/ui";
import { PageHero } from "@/components/ui/page-hero";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { GlowCard } from "@/components/ui/glow-card";
import { TiltCard } from "@/components/motion/tilt-card";
import { CourtPatternBg } from "@/components/ui/court-pattern-bg";
import { motion } from "framer-motion";
import { site } from "@/lib/site";

const programs = [
  {
    icon: GraduationCap,
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
    icon: Target,
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

const steps = [
  { title: "Assessment", text: "We start by understanding your current level and goals." },
  { title: "Skill blocks", text: "Focused drills on the shots that move your game forward." },
  { title: "Live play", text: "Apply it under real conditions with coached match-play." },
  { title: "Progress tracking", text: "Clear milestones so you can see how far you've come." },
];

export default function CoachingPage() {
  return (
    <>
      <Nav />
      <main className="overflow-x-hidden">
        {/* Light Hero */}
        <PageHero
          dark={false}
          label="Coaching"
          title="Coaching for every age and level"
          subtitle="Certified coaches. Small groups. Real progress."
        />

        {/* Program Cards section */}
        <section className="px-4 py-20 sm:px-6 lg:px-8 bg-brand-50/20">
          <Container className="!px-0">
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase text-brand-600">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-600" /> PROGRAMS
              </span>
              <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl text-ink">
                Find the right program for you
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
              {programs.map(({ icon: Icon, name, audience, desc, points }, i) => (
                <ScrollReveal key={name} delay={i * 0.12} direction="up">
                  <TiltCard maxTilt={4} className="h-full">
                    <GlowCard className="h-full border border-brand/5 p-7 flex flex-col justify-between hover:shadow-card transition-all">
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                            <Icon className="h-6 w-6" />
                          </div>
                          <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-700">
                            {audience}
                          </span>
                        </div>
                        <h3 className="mt-5 font-display text-xl font-extrabold text-ink">{name}</h3>
                        <p className="mt-2 text-sm leading-6 text-slatey">{desc}</p>
                        
                        <ul className="mt-5 space-y-2">
                          {points.map((p) => (
                            <li key={p} className="flex items-center gap-2 text-sm text-ink font-medium">
                              <Check className="h-4 w-4 text-emerald-500 shrink-0" /> {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center">
                        <Link href="/contact" className="text-sm font-bold text-brand-600 hover:text-brand-800 transition-colors flex items-center gap-1 group">
                          Enquire <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </div>
                    </GlowCard>
                  </TiltCard>
                </ScrollReveal>
              ))}
            </div>
          </Container>
        </section>

        <SectionDivider />

        {/* 4-step process */}
        <section className="section-light px-4 py-20 sm:px-6 lg:px-8 bg-white">
          <Container className="!px-0">
            <div className="text-center mb-16">
              <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase text-brand-600">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-600" /> WHAT TO EXPECT
              </span>
              <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl text-ink">
                Coaching that's structured, not stiff
              </h2>
              <p className="mt-4 text-sm text-slatey max-w-lg mx-auto">
                Every session balances real technique with the joy of playing. You'll warm up, drill with purpose, and finish with live points so the learning sticks.
              </p>
            </div>

            {/* Horizontal / Vertical layout */}
            <div className="grid gap-8 md:grid-cols-4 relative">
              {steps.map(({ title, text }, i) => (
                <div key={title} className="relative flex flex-col items-center text-center">
                  
                  {/* Pulse ring animation */}
                  <ScrollReveal direction="up" delay={i * 0.1} className="relative flex items-center justify-center">
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white font-display text-lg font-bold shadow-soft z-10">
                      {i + 1}
                      {/* Active step pulsing effect */}
                      <motion.div
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut", delay: i * 0.5 }}
                        className="absolute inset-0 rounded-full border-2 border-brand-500 -z-10"
                      />
                    </div>
                  </ScrollReveal>

                  <ScrollReveal direction="up" delay={i * 0.1 + 0.05}>
                    <h3 className="mt-5 font-display text-base font-bold text-ink">{title}</h3>
                    <p className="mt-2 text-xs leading-5 text-slatey px-4">{text}</p>
                  </ScrollReveal>

                  {/* Desktop connector arrows */}
                  {i < 3 && (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.2 + 0.3, duration: 0.5 }}
                      className="absolute top-7 -right-4 translate-x-1/2 w-8 h-0.5 border-t-2 border-dashed border-brand-300 hidden md:block"
                    />
                  )}
                </div>
              ))}
            </div>
          </Container>
        </section>

        <SectionDivider />

        {/* Private Sessions CTA block */}
        <section className="px-4 py-16 sm:px-6 lg:px-8 bg-brand-50/20">
          <Container className="!px-0">
            <ScrollReveal direction="up">
              <div className="bg-brand-700 text-white rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-glow">
                <CourtPatternBg className="absolute inset-0 opacity-5 w-full h-full object-cover" />
                <div className="relative text-center max-w-2xl mx-auto">
                  <h2 className="font-display text-2xl md:text-3xl font-extrabold">Want a custom or private session?</h2>
                  <p className="mt-3 text-sm text-white/80 leading-relaxed">
                    We offer one-on-one coaching and private group bookings. Call us and we'll tailor a plan to your goals.
                  </p>
                  
                  <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="w-full sm:w-auto">
                      <a href={site.phoneHref} className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-bold text-brand shadow-soft hover:bg-gray-50 transition-colors">
                        Call {site.phoneDisplay}
                      </a>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="w-full sm:w-auto">
                      <a href={site.whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-lime text-gray-900 px-7 py-3 text-sm font-bold shadow-soft hover:bg-lime-dark transition-colors">
                        Message on WhatsApp
                      </a>
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
