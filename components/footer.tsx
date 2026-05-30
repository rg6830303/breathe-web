import Link from "next/link";
import { Clock, Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/logo";
import { navLinks, site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="brand-gradient relative overflow-hidden text-white">
      <div className="court-lines absolute inset-0 opacity-20" />
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo variant="light" />
            <p className="mt-4 max-w-xs text-sm leading-6 text-white/80">
              {site.tagline}. Three professional courts, coaching for every age, and a community that plays hard and breathes easy.
            </p>
            <div className="mt-5 flex gap-3">
              <a
                href={site.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href={site.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
              >
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>

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

          <div>
            <h3 className="font-display text-xs font-bold uppercase tracking-[0.24em] text-white/70">Find us</h3>
            <a
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
            </a>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/15 pt-6 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          <p className="flex flex-wrap gap-4">
            <span>Kaikhali · North Kolkata</span>
            <span>Designed for players.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
