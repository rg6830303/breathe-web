"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { CalendarCheck, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { CourtPatternBg } from "@/components/ui/court-pattern-bg";

const PERKS = [
  { icon: CalendarCheck, text: "Book any court in seconds" },
  { icon: Trophy, text: "Join tournaments & climb the ladder" },
  { icon: Sparkles, text: "Track sessions, streaks & achievements" },
  { icon: ShieldCheck, text: "Complimentary paddles & balls, always" },
];

/**
 * Split-screen auth layout — bold & sporty. A solid ink/brand brand panel with
 * a lime court-tape stripe and a big athletic headline on the left; the form on
 * the right. The brand panel collapses on mobile so the form leads.
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-surface grid min-h-[calc(100vh-140px)] lg:grid-cols-[1.05fr_0.95fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-brand-800 via-ink to-ink" />
        <CourtPatternBg className="absolute inset-0 h-full w-full object-cover opacity-[0.10]" />
        {/* Court-tape accent stripe down the trailing edge. */}
        <div aria-hidden className="tape-stripe absolute right-0 top-0 h-full w-3" />
        {/* One restrained accent block instead of layered blurred blobs. */}
        <div aria-hidden className="pointer-events-none absolute -left-10 bottom-24 h-40 w-40 rotate-12 rounded-3xl bg-lime/15" />

        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src="/breathe-logo-nav.png"
              alt="Breathe Pickleball"
              width={220}
              height={72}
              className="h-14 w-auto object-contain"
              priority
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="eyebrow text-lime">Members club</span>
            <h2 className="heading-lg mt-4 text-white">
              North Kolkata&apos;s home of{" "}
              <span className="mark-lime">pickleball</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/65">
              Three pro courts in Kaikhali. Complimentary equipment. Tournaments with real prizes.
            </p>

            <ul className="mt-8 grid gap-2.5">
              {PERKS.map(({ icon: Icon, text }, i) => (
                <motion.li
                  key={text}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.45, delay: 0.2 + i * 0.08 }}
                  className="flex items-center gap-3 text-sm font-semibold text-white/90"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime text-ink">
                    <Icon className="h-4 w-4" />
                  </span>
                  {text}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <p className="text-xs font-medium text-white/40">
            © {new Date().getFullYear()} Breathe Pickleball · Kaikhali, Kolkata
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-brand-50/40 px-4 py-12 dark:bg-ink/60 sm:px-6 sm:py-16">
        {children}
      </div>
    </div>
  );
}
