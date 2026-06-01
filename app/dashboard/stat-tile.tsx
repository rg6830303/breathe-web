"use client";

import { motion } from "framer-motion";
import { StatCounter } from "@/components/motion/stat-counter";

type Tile = {
  label: string;
  /** Numeric portion that counts up. */
  value: number;
  suffix?: string;
  tint: string;
};

/**
 * Animated dashboard stat tiles: staggered entrance, hover lift, and an
 * easing count-up via StatCounter — the gamified, professional feel that
 * matches the public site's StatCounter strip.
 */
export function StatTiles({ tiles, icons }: { tiles: Tile[]; icons: React.ReactNode[] }) {
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
      {tiles.map((t, i) => (
        <motion.div
          key={t.label}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: -5 }}
          className="group rounded-3xl border border-brand/10 bg-white p-5 shadow-soft transition hover:shadow-card"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slatey">{t.label}</span>
            <span className={`flex h-8 w-8 items-center justify-center rounded-full transition group-hover:scale-110 ${t.tint}`}>
              {icons[i]}
            </span>
          </div>
          <div className="mt-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">
            <StatCounter end={t.value} suffix={t.suffix} />
          </div>
        </motion.div>
      ))}
    </section>
  );
}
