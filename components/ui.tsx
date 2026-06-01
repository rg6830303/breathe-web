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
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  light?: boolean;
  center?: boolean;
}) {
  return (
    <div className={`${center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}`}>
      {eyebrow && <Eyebrow light={light}>{eyebrow}</Eyebrow>}
      <h2
        className={`mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl ${
          light ? "text-white" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p className={`mt-4 text-base leading-7 ${light ? "text-white/80" : "text-slatey"}`}>{description}</p>
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
    <section className="relative px-4 py-20 sm:px-6 lg:px-8 bg-[#070B14] overflow-hidden">
      {/* Asymmetric sport geometry/angled cut */}
      <div 
        className="absolute inset-0 bg-[#0B0F19] opacity-95 [clip-path:polygon(0_3%,100%_0,100%_97%,0_100%)] pointer-events-none"
      />
      
      {/* Net pattern overlay / Court lines */}
      <div className="court-lines absolute inset-0 opacity-10 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#D4FC34_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.03] pointer-events-none" />

      {/* Ambient neon radial glows */}
      <div className="pointer-events-none absolute -right-24 top-1/4 h-96 w-96 rounded-full bg-[#D4FC34]/5 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-1/4 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />

      <Container className="relative z-10 !px-0">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          
          {/* Left Block: Energetic CTA Content */}
          <div className="flex flex-col gap-6">
            
            {/* Live Court Status Widget */}
            <div className="inline-flex self-start items-center gap-2.5 rounded-full border border-[#D4FC34]/20 bg-[#D4FC34]/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#D4FC34] shadow-[0_0_15px_rgba(212,252,52,0.1)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4FC34] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4FC34]"></span>
              </span>
              🟢 2/3 Courts Available Now
            </div>

            <h2 className="font-display text-3xl font-extrabold leading-tight text-white sm:text-5xl tracking-tight">
              READY WHEN <br className="hidden sm:inline" />
              <span className="text-[#D4FC34]">YOU ARE</span>
            </h2>
            
            <p className="text-gray-400 text-sm sm:text-base leading-relaxed max-w-lg">
              Live availability across all three championship courts. Lock in your session under our professional floodlights instantly — no calls, no delays.
            </p>

            <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="w-full sm:w-auto"
              >
                <Link
                  href="/book"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#D4FC34] px-8 py-4 text-sm font-bold text-gray-950 shadow-[0_4px_20px_rgba(212,252,52,0.3)] transition hover:bg-[#c3ea2d] active:scale-[0.98]"
                >
                  Book a Court Slot <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="w-full sm:w-auto"
              >
                <a
                  href={site.phoneHref}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-4 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  <Phone className="h-4 w-4" /> {site.phoneDisplay}
                </a>
              </motion.div>
            </div>

            {/* Floating/Integrated Facility Badge */}
            <div className="mt-8 flex items-center gap-4 border-t border-white/5 pt-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-[#D4FC34]/30 bg-[#D4FC34]/5 text-[#D4FC34]"
              >
                <Sparkles className="h-6 w-6" />
              </motion.div>
              <div>
                <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">⚡ Breathe Certified Facility</h4>
                <p className="text-xs text-gray-400 mt-1">Tournament-grade court surfaces, floodlit play & courtside kitchen.</p>
              </div>
            </div>
          </div>

          {/* Right Block: Interactive FAQ Accordion */}
          <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-md shadow-card lg:p-8">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#D4FC34]">GOT QUESTIONS?</span>
            <h3 className="mt-1 font-display text-xl font-extrabold text-white">Frequently Asked Questions</h3>
            
            <div className="mt-6 space-y-3">
              {faqItems.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div 
                    key={idx} 
                    className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.01] transition-all hover:bg-white/[0.03]"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between p-4 text-left font-semibold text-white text-sm focus:outline-none"
                    >
                      <span>{item.q}</span>
                      <span className={`ml-4 text-[#D4FC34] transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}>
                        ＋
                      </span>
                    </button>
                    <motion.div
                      initial={false}
                      animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-4 text-xs leading-relaxed text-gray-400 border-t border-white/5 pt-3">
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
