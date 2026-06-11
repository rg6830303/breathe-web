"use client";

import { motion } from "framer-motion";
import { PaddleScene } from "@/components/ui/paddle-scene";
import { ArenaBackdrop } from "@/components/ui/arena-backdrop";

/**
 * Portal header for the player dashboard and admin console. Bold ink/brand
 * block with court lines, a lime court-tape stripe and the signature 3D paddle
 * scene — matching the public site's redesigned motion language.
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
    <section className="relative overflow-hidden bg-ink text-white">
      <ArenaBackdrop />
      <div aria-hidden className="tape-stripe absolute left-0 top-0 h-1.5 w-full opacity-90 z-10" />

      {/* Signature paddle accent */}
      <div className="pointer-events-none absolute right-4 top-1/2 z-[1] hidden -translate-y-1/2 opacity-90 xl:block">
        <PaddleScene size={240} />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="eyebrow text-lime">{eyebrow}</span>
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
