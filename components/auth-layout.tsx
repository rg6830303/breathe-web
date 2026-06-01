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
 * Split-screen auth layout: animated brand panel (real logo + court pattern +
 * floating particles + perk list) on the left, the form on the right. The
 * brand panel collapses on mobile so the form is front and centre.
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-140px)] lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-gray-950 via-brand-900 to-brand-700 lg:block">
        <CourtPatternBg className="absolute inset-0 h-full w-full object-cover opacity-[0.13]" />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-lime/20 blur-3xl"
          animate={{ scale: [1, 1.18, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -left-16 bottom-10 h-64 w-64 rounded-full bg-brand-500/30 blur-3xl"
          animate={{ scale: [1, 1.22, 1], opacity: [0.3, 0.55, 0.3] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />

        <div className="relative flex h-full flex-col justify-between p-12">
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
            <h2 className="font-serif-hero text-4xl italic leading-tight text-white xl:text-5xl">
              North Kolkata&apos;s home of pickleball
            </h2>
            <p className="mt-3 max-w-md text-sm text-white/70">
              Three pro courts in Kaikhali. Complimentary equipment. Tournaments with real prizes.
            </p>

            <ul className="mt-8 grid gap-3">
              {PERKS.map(({ icon: Icon, text }, i) => (
                <motion.li
                  key={text}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.45, delay: 0.2 + i * 0.08 }}
                  className="flex items-center gap-3 text-sm text-white/90"
                >
                  <span className="liquid-glass flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lime">
                    <Icon className="h-4 w-4" />
                  </span>
                  {text}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <p className="text-xs text-white/40">© {new Date().getFullYear()} Breathe Pickleball · Kaikhali, Kolkata</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-brand-50/40 px-4 py-12 sm:px-6 sm:py-16">
        {children}
      </div>
    </div>
  );
}
