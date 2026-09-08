"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Phone, Sparkles } from "lucide-react";
import { site } from "@/lib/site";
import { motion } from "framer-motion";

export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

export function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] ${
        light ? "text-ball" : "text-brand"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${light ? "bg-ball" : "bg-brand"}`} />
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  light = false,
  center = false,
  gradient = false,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  light?: boolean;
  center?: boolean;
  /** Render the title with the animated brand-gradient type treatment. */
  gradient?: boolean;
}) {
  return (
    <div className={`${center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}`}>
      {eyebrow && <Eyebrow light={light}>{eyebrow}</Eyebrow>}
      <h2
        className={`mt-3 text-balance font-display text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-[2.6rem] ${
          gradient ? "text-gradient-brand" : light ? "text-white" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p className={`mt-4 text-pretty text-base leading-7 ${light ? "text-white/80" : "text-slatey"}`}>
          {description}
        </p>
      )}
    </div>
  );
}

export function PrimaryButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className="inline-block"
    >
      <Link
        href={href}
        className={`inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-bold text-white shadow-glow transition hover:bg-brand-600 active:scale-[0.98] ${className}`}
      >
        {children}
      </Link>
    </motion.div>
  );
}

export function GhostButton({
  href,
  children,
  light = false,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  light?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-6 py-3 text-sm font-bold transition active:scale-[0.98] ${
        light
          ? "border-white/40 text-white hover:bg-white/10"
          : "border-brand/30 text-brand hover:bg-brand/5"
      } ${className}`}
    >
      {children}
    </Link>
  );
}

const faqItems = [
  {
    q: "How do I book a court?",
    a: "Select your preferred date and time slots on our Live Booking page, fill in your details, and confirm. Your booking is validated and locked in instantly."
  },
  {
    q: "What is your cancellation policy?",
    a: "Bookings can be cancelled up to 12 hours before your slot for a full refund or rescheduling credit. Cancellations within 12 hours are non-refundable."
  },
  {
    q: "Do you provide paddles and balls?",
    a: "Yes! High-quality rental paddles and professional pickleballs are available at our reception desk for a nominal fee, or you can bring your own gear."
  },
  {
    q: "Are the courts indoor or outdoor?",
    a: "We feature three state-of-the-art professional outdoor courts with championship-grade floodlights, premium fencing, and a comfortable courtside kitchen area."
  }
];

/** Reusable sporty conversion band placed near the bottom of most pages. */
export function CTABand() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section className="relative overflow-hidden bg-[#070d20] px-4 py-20 sm:px-6 lg:px-8">
      {/* Court-line texture + faint ball-dot grid */}
      <div className="court-lines pointer-events-none absolute inset-0 opacity-10" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(theme(colors.lime.DEFAULT)_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.03]" />
      <div aria-hidden className="grain" />

      {/* Ambient brand + lime glows */}
      <div className="pointer-events-none absolute -right-24 top-1/4 h-96 w-96 rounded-full bg-lime/5 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-1/4 h-96 w-96 rounded-full bg-brand/10 blur-3xl" />
      <div aria-hidden className="tape-stripe absolute left-0 top-0 h-1 w-full opacity-70" />

      <Container className="relative z-10 !px-0">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">

          {/* Left: conversion content */}
          <div className="flex flex-col gap-6">
            <div className="chip self-start text-lime">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-lime" />
              </span>
              Courts open today · 5 AM – 11 PM
            </div>

            <h2 className="heading-lg text-white" style={{ fontSize: "clamp(2rem,5vw,3.25rem)" }}>
              Ready when{" "}
              <span className="mark-lime">you are</span>
            </h2>

            <p className="max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
              Live availability across all three championship courts. Lock in your session under our professional floodlights instantly — no calls, no delays.
            </p>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
                <Link href="/book" className="btn-accent w-full justify-between sm:w-auto sm:justify-center">
                  Book a court slot <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
                <a
                  href={site.phoneHref}
                  className="btn-outline w-full border-white/25 text-white hover:border-white hover:bg-white/5 hover:text-white dark:border-white/25 dark:text-white dark:hover:border-white dark:hover:text-white sm:w-auto"
                >
                  <Phone className="h-4 w-4" /> {site.phoneDisplay}
                </a>
              </motion.div>
            </div>

            {/* Certified facility badge */}
            <div className="mt-8 flex items-center gap-4 border-t border-white/10 pt-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-lime/30 bg-lime/5 text-lime"
              >
                <Sparkles className="h-6 w-6" />
              </motion.div>
              <div>
                <h4 className="text-sm font-extrabold uppercase tracking-wider text-white">Breathe certified facility</h4>
                <p className="mt-1 text-xs text-white/55">Tournament-grade surfaces, floodlit play &amp; a courtside kitchen.</p>
              </div>
            </div>
          </div>

          {/* Right: FAQ accordion */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-card backdrop-blur-md lg:p-8">
            <span className="eyebrow text-lime">Got questions?</span>
            <h3 className="mt-2 font-display text-xl font-extrabold text-white">Frequently asked</h3>

            <div className="mt-6 space-y-3">
              {faqItems.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition-colors hover:bg-white/[0.04]"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between gap-4 p-4 text-left text-sm font-semibold text-white focus:outline-none"
                    >
                      <span>{item.q}</span>
                      <span className={`text-lime transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}>＋</span>
                    </button>
                    <motion.div
                      initial={false}
                      animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="border-t border-white/10 px-4 pb-4 pt-3 text-xs leading-relaxed text-white/60">
                        {item.a}
                      </p>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </Container>
    </section>
  );
}

export function SectionDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 py-10 ${className}`}>
      <span className="h-px w-8 bg-brand-200 dark:bg-white/15" />
      <svg className="h-5 w-5 animate-spin-slow text-brand-300 dark:text-lime/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="9" />
        <circle cx="9" cy="9" r="0.75" fill="currentColor" />
        <circle cx="12" cy="9" r="0.75" fill="currentColor" />
        <circle cx="15" cy="9" r="0.75" fill="currentColor" />
        <circle cx="9" cy="12" r="0.75" fill="currentColor" />
        <circle cx="15" cy="12" r="0.75" fill="currentColor" />
        <circle cx="9" cy="15" r="0.75" fill="currentColor" />
        <circle cx="12" cy="15" r="0.75" fill="currentColor" />
        <circle cx="15" cy="15" r="0.75" fill="currentColor" />
      </svg>
      <span className="h-px w-8 bg-brand-200 dark:bg-white/15" />
    </div>
  );
}
