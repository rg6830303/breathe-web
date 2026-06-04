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
    <div className="relative overflow-hidden rounded-3xl bg-ink text-white">
      {/* Court line texture */}
      <CourtPatternBg className="absolute inset-0 h-full w-full object-cover opacity-[0.1]" stroke="white" />
      {/* Tape stripe accent */}
      <div aria-hidden className="tape-stripe absolute left-0 top-0 h-1.5 w-full opacity-90" />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-6"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-white/20 text-white transition hover:border-lime hover:bg-white/10"
            aria-label="Back to admin"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <span className="eyebrow text-lime">{icon ? <span className="inline-flex items-center gap-1.5">{icon} Sub-page</span> : "Admin"}</span>
            <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-0.5 text-xs text-white/60">{subtitle}</p>}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </motion.div>
    </div>
  );
}
