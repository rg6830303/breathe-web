"use client";

import { motion } from "framer-motion";
import { CourtPatternBg } from "@/components/ui/court-pattern-bg";

type Props = {
  label: string;
  title: string;
  subtitle?: string;
  dark?: boolean;
  bgClassName?: string;
};

export function PageHero({ label, title, subtitle, dark = false, bgClassName }: Props) {
  const words = title.split(" ");

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const wordVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  const defaultBg = dark
    ? "bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white"
    : "bg-gradient-to-br from-brand-50 via-white to-brand-100 text-gray-900";

  return (
    <section
      className={`relative overflow-hidden ${bgClassName ?? defaultBg}`}
    >
      {/* Court line SVG overlay */}
      <CourtPatternBg
        className="absolute inset-0 h-full w-full opacity-5 object-cover"
        stroke={dark ? "white" : "#2F5BFF"}
      />

      <div className="relative mx-auto max-w-4xl px-6 pb-14 pt-24 sm:pb-16 sm:pt-28 md:pb-20 md:pt-32">
        {/* Label */}
        <span
          className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] ${
            dark ? "text-brand-300" : "text-brand-600"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${dark ? "bg-brand-300" : "bg-brand-600"}`} />
          {label}
        </span>

        {/* Title with stagger animation */}
        <motion.h1
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={`mt-4 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl ${
            dark ? "text-white" : "text-gray-900"
          }`}
        >
          {words.map((word, i) => (
            <motion.span key={i} variants={wordVariants} className="inline-block mr-[0.25em]">
              {word}
            </motion.span>
          ))}
        </motion.h1>

        {/* Subtitle */}
        {subtitle && (
          <p
            className={`mt-4 text-base sm:text-lg md:text-xl leading-relaxed ${
              dark ? "text-white/70" : "text-gray-600"
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
