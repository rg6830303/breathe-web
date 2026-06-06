"use client";

import { motion } from "framer-motion";
import { CourtPatternBg } from "@/components/ui/court-pattern-bg";
import { PaddleScene } from "@/components/ui/paddle-scene";

type Props = {
  label: string;
  title: string;
  subtitle?: string;
  /** Kept for API compatibility — the hero is always the bold dark treatment now. */
  dark?: boolean;
  bgClassName?: string;
  /** Optional CTA / content slot rendered under the subtitle. */
  children?: React.ReactNode;
};

/**
 * Bold & sporty marketing page header. Solid ink/brand block, court-line
 * pattern, a lime court-tape stripe, big athletic stacked heading, and the
 * signature 3D paddle scene floating on the right. Used across all secondary
 * marketing pages (about, contact, tournaments, gallery).
 */
export function PageHero({ label, title, subtitle, bgClassName, children }: Props) {
  const words = title.split(" ");

  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
  };
  const word = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <section className={`relative overflow-hidden bg-brand-800 text-white dark:bg-ink ${bgClassName ?? ""}`}>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-800 to-brand-900 dark:from-brand-800 dark:via-ink dark:to-ink" />
      <CourtPatternBg className="absolute inset-0 h-full w-full object-cover opacity-[0.1]" stroke="white" />
      {/* Court-tape accent stripe */}
      <div aria-hidden className="tape-stripe absolute left-0 top-0 h-1.5 w-full opacity-90" />
      <div aria-hidden className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rotate-12 rounded-[2.5rem] bg-lime/10" />

      {/* Signature paddle, right side on large screens */}
      <div className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 opacity-90 lg:block xl:right-12">
        <PaddleScene size={340} />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-24 sm:pb-20 sm:pt-28 md:pt-32 lg:px-8">
        <div className="max-w-2xl">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="eyebrow text-lime"
          >
            {label}
          </motion.span>

          <motion.h1
            variants={container}
            initial="hidden"
            animate="visible"
            className="heading-xl mt-4 text-white"
          >
            {words.map((w, i) => (
              <motion.span key={i} variants={word} className="mr-[0.22em] inline-block">
                {w}
              </motion.span>
            ))}
          </motion.h1>

          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mt-5 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg"
            >
              {subtitle}
            </motion.p>
          )}

          {children && <div className="mt-7">{children}</div>}
        </div>
      </div>
    </section>
  );
}
