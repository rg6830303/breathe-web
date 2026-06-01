"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { CourtPatternBg } from "@/components/ui/court-pattern-bg";

/**
 * Compact branded header for admin sub-pages (settings, notices, gallery,
 * import). Same brand-gradient + court-pattern language as PortalHero, sized
 * down for inner pages. Client-safe so the existing client sub-pages can use
 * it directly.
 */
export function AdminSubHeader({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-950 via-brand-900 to-brand-700 text-white shadow-glow">
      <CourtPatternBg className="absolute inset-0 h-full w-full object-cover opacity-[0.12]" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-lime/20 blur-3xl"
        animate={{ scale: [1, 1.18, 1], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="liquid-glass flex h-10 w-10 items-center justify-center rounded-xl text-white transition hover:opacity-90"
            aria-label="Back to admin"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold sm:text-3xl">
              {icon}
              {title}
            </h1>
            {subtitle && <p className="mt-0.5 text-xs text-white/70">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
