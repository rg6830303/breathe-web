"use client";

import { motion } from "framer-motion";
import { CourtPatternBg } from "@/components/ui/court-pattern-bg";

const PARTICLES = [
  { top: "18%", left: "12%", size: 5, duration: 7, delay: 0 },
  { top: "55%", left: "82%", size: 4, duration: 8.5, delay: 1.2 },
  { top: "72%", left: "26%", size: 6, duration: 6.5, delay: 0.6 },
  { top: "28%", left: "68%", size: 3, duration: 9, delay: 2 },
  { top: "40%", left: "45%", size: 4, duration: 7.5, delay: 0.9 },
  { top: "82%", left: "60%", size: 5, duration: 6, delay: 1.6 },
];

/**
 * Cinematic portal header used by the player dashboard and admin console.
 * Brand-gradient base + court pattern + floating lime particles + a soft
 * animated glow orb, matching the public site's 3D/motion language.
 */
export function PortalHero({
  eyebrow,
  title,
  subtitle,
  right,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-brand-900 to-brand-700 text-white">
      <CourtPatternBg className="absolute inset-0 h-full w-full object-cover opacity-[0.12]" />

      {/* Animated glow orbs */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-lime/20 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {PARTICLES.map((p, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-lime"
            style={{ top: p.top, left: p.left, width: p.size, height: p.size, opacity: 0.25 }}
            animate={{ y: [0, -28, 0], x: [0, 12, -12, 0] }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Sports-themed 3D paddle accent */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 lg:block"
        style={{ perspective: 700 }}
        animate={{ rotateY: [-16, 16, -16], y: [0, -10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg viewBox="0 0 100 100" className="h-24 w-24 fill-white/15 drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)]">
          <ellipse cx="50" cy="40" rx="22" ry="27" />
          <rect x="46" y="66" width="8" height="22" rx="3" />
        </svg>
      </motion.div>

      <div className="relative mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-lime">
              <span className="h-1.5 w-1.5 rounded-full bg-lime" /> {eyebrow}
            </span>
            <div className="mt-3">{title}</div>
            {subtitle && <div className="mt-2 max-w-2xl text-sm text-white/75">{subtitle}</div>}
          </motion.div>
          {right && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              {right}
            </motion.div>
          )}
        </div>
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
