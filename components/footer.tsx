"use client";

import Link from "next/link";
import { Clock, Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/logo";
import { navLinks, site } from "@/lib/site";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-ink text-white pb-[env(safe-area-inset-bottom,0px)]">
      {/* Court tape top accent */}
      <div aria-hidden className="tape-stripe h-1.5 w-full opacity-90" />

      {/* Subtle court-line grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Lime corner accent */}
      <div aria-hidden className="pointer-events-none absolute -left-10 bottom-0 h-48 w-48 rotate-12 rounded-[2.5rem] bg-lime/8" />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">

        {/* 4-column grid */}
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">

          {/* Brand col */}
          <ScrollReveal direction="up" delay={0.0}>
            <div>
              <Logo variant="light" />
              <p className="mt-4 max-w-xs text-sm leading-6 text-white/65">
                {site.tagline}. Three professional courts, complimentary equipment, and a community that plays hard and breathes easy.
              </p>

              <div className="mt-6 flex gap-3">
                <motion.a
                  whileHover={{ y: -3, scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  href={site.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/15 text-white transition-colors hover:border-lime hover:text-lime"
                >
                  <Instagram className="h-4 w-4" />
                </motion.a>
                <motion.a
                  whileHover={{ y: -3, scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  href={site.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/15 text-white transition-colors hover:border-lime hover:text-lime"
                >
                  <Facebook className="h-4 w-4" />
                </motion.a>
              </div>
            </div>
          </ScrollReveal>

          {/* Explore links */}
          <ScrollReveal direction="up" delay={0.08}>
            <div>
              <h3 className="eyebrow text-lime">Explore</h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="font-semibold text-white/65 transition hover:text-lime"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/book" className="font-semibold text-white/65 transition hover:text-lime">
                    Book a Slot
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="font-semibold text-white/65 transition hover:text-lime">
                    Player Dashboard
                  </Link>
                </li>
              </ul>
            </div>
          </ScrollReveal>

          {/* Contact */}
          <ScrollReveal direction="up" delay={0.16}>
            <div>
              <h3 className="eyebrow text-lime">Get in touch</h3>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
                  <span className="text-white/65">{site.address}</span>
                </li>
                <li>
                  <a
                    href={site.phoneHref}
                    className="flex items-center gap-3 font-semibold text-white/65 transition hover:text-lime"
                  >
                    <Phone className="h-4 w-4 shrink-0 text-lime" /> {site.phoneDisplay}
                  </a>
                </li>
                <li>
                  <a
                    href={site.emailHref}
                    className="flex items-center gap-3 font-semibold text-white/65 transition hover:text-lime"
                  >
                    <Mail className="h-4 w-4 shrink-0 text-lime" /> {site.email}
                  </a>
                </li>
                <li className="flex items-center gap-3 text-white/65">
                  <Clock className="h-4 w-4 shrink-0 text-lime" /> {site.hoursShort}
                </li>
              </ul>
            </div>
          </ScrollReveal>

          {/* Map */}
          <ScrollReveal direction="up" delay={0.24}>
            <div>
              <h3 className="eyebrow text-lime">Find us</h3>
              <motion.a
                whileHover={{ scale: 1.02 }}
                href={site.mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block overflow-hidden rounded-2xl border-2 border-white/15 transition hover:border-lime/50"
              >
                <iframe
                  title="Breathe Pickleball location map"
                  src={site.mapsEmbed}
                  className="h-40 w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </motion.a>
            </div>
          </ScrollReveal>
        </div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mt-12 h-px origin-left bg-white/15"
        />

        {/* Bottom bar */}
        <div className="mt-6 flex flex-col gap-3 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold">
            © {new Date().getFullYear()}{" "}
            <span className="text-white/80">{site.name}</span>. All rights reserved.
          </p>
          <p className="flex flex-wrap gap-4 font-semibold uppercase tracking-wide">
            <span>Kaikhali · North Kolkata</span>
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="text-lime"
            >
              Designed for players.
            </motion.span>
          </p>
        </div>
      </div>
    </footer>
  );
}
