"use client";

import { useState } from "react";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { InstagramIcon, FacebookIcon, WhatsAppIcon } from "@/components/ui/social-icons";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { Container } from "@/components/ui";
import { PageHero } from "@/components/ui/page-hero";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { CourtPatternBg } from "@/components/ui/court-pattern-bg";
import { SmartImage } from "@/components/ui/smart-image";
import { photos } from "@/lib/photos";
import { motion } from "framer-motion";
import { site } from "@/lib/site";

type CardProps = {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  href: string;
  delay: number;
};

function ContactMethodCard({ icon: Icon, label, value, href, delay }: CardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <ScrollReveal delay={delay} direction="up" className="h-full">
      <TiltCard maxTilt={6} className="h-full">
        <a
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="block h-full"
        >
          <div className="card-sport h-full p-6 flex flex-col justify-between">
            <div>
              <motion.div
                animate={hovered ? { rotate: 10, scale: 1.2 } : { rotate: 0, scale: 1 }}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-300 ${
                  hovered ? "bg-lime text-ink" : "bg-brand/10 text-brand dark:bg-white/10 dark:text-lime"
                }`}
              >
                <Icon className="h-6 w-6" />
              </motion.div>
              <div className="mt-5 text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-slatey dark:text-white/50">{label}</div>
              <div className="mt-1 font-display text-base font-extrabold text-ink leading-tight dark:text-white">{value}</div>
            </div>

            <div className="mt-4 text-xs font-extrabold uppercase tracking-wide text-brand dark:text-lime">
              {label === "Visit" ? "View Map →" : "Get in Touch →"}
            </div>
          </div>
        </a>
      </TiltCard>
    </ScrollReveal>
  );
}

export default function ContactPage() {
  const contactCards = [
    { icon: Phone, label: "Call us", value: site.phoneDisplay, href: site.phoneHref },
    { icon: WhatsAppIcon, label: "WhatsApp", value: "Chat now", href: site.whatsappHref },
    { icon: Mail, label: "Email", value: site.email, href: site.emailHref },
    { icon: MapPin, label: "Visit", value: "Get directions", href: site.mapsLink },
  ];

  return (
    <>
      <Nav />
      <main className="overflow-x-hidden">
        {/* Page Hero */}
        <PageHero
          dark={false}
          label="Contact"
          title="Come play with us in Kaikhali"
          subtitle="Questions about booking or tournaments? Reach out any way you like — or just drop by. We're open every day."
        />

        {/* ── CONTACT CARDS — light section ── */}
        <section className="bg-white px-4 py-16 dark:bg-[#111c38] sm:px-6 lg:px-8">
          <Container className="!px-0">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {contactCards.map((card, i) => (
                <ContactMethodCard
                  key={card.label}
                  icon={card.icon}
                  label={card.label}
                  value={card.value}
                  href={card.href}
                  delay={i * 0.08}
                />
              ))}
            </div>
          </Container>
        </section>

        {/* ── PHOTO STRIP ── */}
        <section className="bg-white px-4 pb-4 dark:bg-[#111c38] sm:px-6 lg:px-8">
          <Container className="!px-0">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[photos.communityWomen, photos.kitchen, photos.playersAction].map((photo, i) => (
                <ScrollReveal key={photo.src} direction="up" delay={i * 0.08} className={i === 2 ? "col-span-2 sm:col-span-1" : ""}>
                  <div className="photo-frame aspect-[4/3] w-full">
                    <span className="photo-frame__tick" />
                    <SmartImage photo={photo} sizes="(max-width:640px) 50vw, 33vw" />
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </Container>
        </section>

        {/* ── ADDRESS + MAP — light / ink (dark) ── */}
        <section className="bg-white px-4 py-16 dark:bg-ink sm:px-6 lg:px-8">
          <Container className="!px-0">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              {/* Info panel */}
              <ScrollReveal direction="left" className="h-full">
                <div className="card-sport p-8 h-full flex flex-col justify-between">
                  <div>
                    <span className="eyebrow text-brand dark:text-lime">Find us</span>
                    <h2 className="heading-lg mt-4 text-ink dark:text-white" style={{ fontSize: "clamp(1.6rem,3vw,2.2rem)" }}>
                      Address &{" "}
                      <span className="mark-lime">hours</span>
                    </h2>

                    <div className="mt-8 space-y-6 text-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime/15">
                          <MapPin className="h-5 w-5 text-lime" />
                        </div>
                        <div>
                          <div className="font-extrabold uppercase tracking-wide text-ink/70 dark:text-white/80 text-xs">Address</div>
                          <p className="mt-1 text-xs text-slatey dark:text-white/55 leading-relaxed">{site.address}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime/15">
                          <Clock className="h-5 w-5 text-lime" />
                        </div>
                        <div>
                          <div className="font-extrabold uppercase tracking-wide text-ink/70 dark:text-white/80 text-xs">Opening hours</div>
                          <p className="mt-1 text-xs text-slatey dark:text-white/55 leading-relaxed">{site.hoursShort}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime/15">
                          <Phone className="h-5 w-5 text-lime" />
                        </div>
                        <div>
                          <div className="font-extrabold uppercase tracking-wide text-ink/70 dark:text-white/80 text-xs">Phone</div>
                          <a
                            href={site.phoneHref}
                            className="mt-1 block text-xs font-bold text-brand dark:text-lime hover:underline"
                          >
                            {site.phoneDisplay}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Social handles */}
                  <div className="mt-8 flex items-center gap-3 border-t border-ink/10 dark:border-white/10 pt-6">
                    <motion.a
                      whileHover={{ y: -3, scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      href={site.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink/15 text-ink dark:border-white/15 dark:text-white transition hover:border-lime hover:text-lime"
                    >
                      <InstagramIcon className="h-4 w-4" colored />
                    </motion.a>
                    <motion.a
                      whileHover={{ y: -3, scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      href={site.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Facebook"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink/15 text-ink dark:border-white/15 dark:text-white transition hover:border-lime hover:text-lime"
                    >
                      <FacebookIcon className="h-4 w-4" colored />
                    </motion.a>
                  </div>
                </div>
              </ScrollReveal>

              {/* Map */}
              <ScrollReveal direction="right" className="h-full">
                <div className="overflow-hidden rounded-3xl border-2 border-ink/10 dark:border-white/10 h-full min-h-[380px] relative">
                  <iframe
                    title="Breathe Pickleball location"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3682.0!2d88.4347!3d22.6548!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sBreathe+Pickleball!5e0!3m2!1sen!2sin!4v1234"
                    width="100%"
                    height="100%"
                    className="absolute inset-0 w-full h-full border-0 min-h-[380px]"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </ScrollReveal>
            </div>
          </Container>
        </section>

        {/* ── SOCIAL COMMUNITY — light section ── */}
        <section className="bg-white px-4 py-16 dark:bg-[#111c38] sm:px-6 lg:px-8">
          <Container className="!px-0">
            <ScrollReveal direction="up">
              <div className="relative overflow-hidden rounded-3xl bg-ink p-8 text-white">
                <div aria-hidden className="tape-stripe absolute left-0 top-0 h-1.5 w-full opacity-90" />
                <CourtPatternBg className="absolute inset-0 opacity-[0.07] w-full h-full object-cover" />
                <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 max-w-4xl mx-auto pt-2">
                  <div className="text-center md:text-left">
                    <span className="eyebrow text-lime">Social</span>
                    <h3 className="heading-lg mt-3 text-white" style={{ fontSize: "clamp(1.5rem,3vw,2rem)" }}>
                      Join the{" "}
                      <span className="mark-lime">community</span>
                    </h3>
                    <p className="mt-2 text-sm text-white/60">Get updates on court bookings, tournaments, and social events</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <motion.a
                      whileHover={{ y: -4, scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      href={site.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/20 text-white transition hover:border-lime hover:text-lime"
                      aria-label="Follow us on Instagram"
                    >
                      <InstagramIcon className="w-5 h-5" colored />
                    </motion.a>
                    <motion.a
                      whileHover={{ y: -4, scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      href={site.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/20 text-white transition hover:border-lime hover:text-lime"
                      aria-label="Follow us on Facebook"
                    >
                      <FacebookIcon className="w-5 h-5" colored />
                    </motion.a>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </Container>
        </section>

        {/* ── WHATSAPP COMMUNITY — light / ink (dark) ── */}
        <section className="bg-white px-4 pb-20 pt-8 dark:bg-ink sm:px-6 lg:px-8">
          <Container className="!px-0">
            <ScrollReveal direction="up">
              <div className="relative overflow-hidden rounded-3xl bg-lime p-8 text-ink sm:p-10">
                <CourtPatternBg className="absolute inset-0 h-full w-full object-cover opacity-[0.08]" />
                <div className="relative flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ink/10">
                      <WhatsAppIcon className="h-7 w-7 text-ink" />
                    </span>
                    <div>
                      <h2 className="font-display text-2xl font-extrabold leading-tight text-ink">
                        Join the Breathe community
                      </h2>
                      <p className="mt-1.5 max-w-md text-sm text-ink/70">
                        Game invites, open-play sessions, tournament alerts, and the friendliest pickleball crew in Kolkata — all on WhatsApp.
                      </p>
                    </div>
                  </div>
                  <motion.a
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    href={site.whatsappCommunity}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-dark shrink-0"
                  >
                    <WhatsAppIcon className="h-4 w-4" /> Join the group
                  </motion.a>
                </div>
              </div>
            </ScrollReveal>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
