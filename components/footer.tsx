"use client";

import Link from "next/link";
import { Clock, Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/logo";
import { navLinks, site } from "@/lib/site";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

export function Footer() {
  return (
    <footer className="brand-gradient relative overflow-hidden text-white pb-[env(safe-area-inset-bottom,0px)]">
      <div className="court-lines absolute inset-0 opacity-20" />
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        
        {/* Staggered Grid Columns */}
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <ScrollReveal direction="up" delay={0.0}>
            <div>
              <Logo variant="light" />
              <p className="mt-4 max-w-xs text-sm leading-6 text-white/80">
                {site.tagline}. Three professional courts, complimentary equipment, and a community that plays hard and breathes easy.
              </p>
              
              {/* Social icons with hover scaling */}
              <div className="mt-5 flex gap-3">
                <motion.a
                  whileHover={{ y: -3, scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  href={site.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                >
                  <Instagram className="h-5 w-5" />
                </motion.a>
                <motion.a
                  whileHover={{ y: -3, scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  href={site.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                >
                  <Facebook className="h-5 w-5" />
                </motion.a>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.08}>
            <div>
              <h3 className="font-display text-xs font-bold uppercase tracking-[0.24em] text-white/70">Explore</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-white/85">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="transition hover:text-ball">
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/book" className="transition hover:text-ball">
                    Book a Slot
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="transition hover:text-ball">
                    Player Dashboard
                  </Link>
                </li>
              </ul>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.16}>
            <div>
              <h3 className="font-display text-xs font-bold uppercase tracking-[0.24em] text-white/70">Get in touch</h3>
              <ul className="mt-4 space-y-3 text-sm text-white/85">
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ball" />
                  <span>{site.address}</span>
                </li>
                <li>
                  <a href={site.phoneHref} className="flex items-center gap-3 transition hover:text-ball">
                    <Phone className="h-4 w-4 shrink-0 text-ball" /> {site.phoneDisplay}
                  </a>
                </li>
                <li>
                  <a href={site.emailHref} className="flex items-center gap-3 transition hover:text-ball">
                    <Mail className="h-4 w-4 shrink-0 text-ball" /> {site.email}
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <Clock className="h-4 w-4 shrink-0 text-ball" /> {site.hoursShort}
                </li>
              </ul>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.24}>
            <div>
              <h3 className="font-display text-xs font-bold uppercase tracking-[0.24em] text-white/70">Find us</h3>
              <motion.a
                whileHover={{ scale: 1.02 }}
                href={site.mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block overflow-hidden rounded-2xl border border-white/15"
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

        {/* Separator line drawing effect */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mt-12 border-t border-white/15 origin-left"
        />

        <div className="mt-6 flex flex-col gap-3 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          <p className="flex flex-wrap gap-4">
            <span>Kaikhali · North Kolkata</span>
            
            {/* Breathe tagline breathing pulse */}
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="font-semibold"
            >
              Designed for players.
            </motion.span>
          </p>
        </div>
      </div>
    </footer>
  );
}
