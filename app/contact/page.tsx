"use client";

import { useState } from "react";
import { Clock, Facebook, Instagram, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { Container } from "@/components/ui";
import { PageHero } from "@/components/ui/page-hero";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { GlowCard } from "@/components/ui/glow-card";
import { TiltCard } from "@/components/motion/tilt-card";
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
          <GlowCard className="h-full border border-brand/5 p-6 flex flex-col justify-between hover:shadow-card transition-all">
            <div>
              <motion.div
                animate={hovered ? { rotate: 10, scale: 1.2 } : { rotate: 0, scale: 1 }}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-300 ${
                  hovered ? "bg-brand text-lime" : "bg-brand/10 text-brand"
                }`}
              >
                <Icon className="h-6 w-6" />
              </motion.div>
              <div className="mt-5 text-xs font-bold uppercase tracking-wide text-slatey">{label}</div>
              <div className="mt-1 font-display text-base font-extrabold text-ink leading-tight">{value}</div>
            </div>
            
            <div className="mt-4 text-xs font-bold text-brand-600 group-hover:text-brand-800 transition-colors flex items-center gap-1">
              {label === "Visit" ? "View Map →" : "Get in Touch →"}
            </div>
          </GlowCard>
        </a>
      </TiltCard>
    </ScrollReveal>
  );
}

export default function ContactPage() {
  const contactCards = [
    { icon: Phone, label: "Call us", value: site.phoneDisplay, href: site.phoneHref },
    { icon: MessageCircle, label: "WhatsApp", value: "Chat now", href: site.whatsappHref },
    { icon: Mail, label: "Email", value: site.email, href: site.emailHref },
    { icon: MapPin, label: "Visit", value: "Get directions", href: site.mapsLink },
  ];

  return (
    <>
      <Nav />
      <main className="overflow-x-hidden">
        {/* Light Hero */}
        <PageHero
          dark={false}
          label="Contact"
          title="Come play with us in Kaikhali"
          subtitle="Questions about booking, coaching, or tournaments? Reach out any way you like — or just drop by. We're open every day."
        />

        {/* Contact Method Cards Grid */}
        <section className="px-4 py-16 sm:px-6 lg:px-8 bg-white">
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

            {/* Split Info Card + Google Map Section */}
            <div className="mt-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <ScrollReveal direction="left" className="h-full">
                <div className="rounded-3xl bg-brand-50 border border-brand/5 p-8 shadow-soft h-full flex flex-col justify-between">
                  <div>
                    <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase text-brand-600 mb-6">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-600" /> FIND US
                    </span>
                    <h2 className="font-display text-2xl font-extrabold text-ink leading-tight">Address & hours</h2>
                    
                    <div className="mt-8 space-y-6 text-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-ink text-sm">Address</div>
                          <p className="mt-1 text-xs text-slatey leading-relaxed">{site.address}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-ink text-sm">Opening hours</div>
                          <p className="mt-1 text-xs text-slatey leading-relaxed">{site.hoursShort}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                          <Phone className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-ink text-sm">Phone</div>
                          <a href={site.phoneHref} className="mt-1 block text-xs font-semibold text-brand hover:underline">{site.phoneDisplay}</a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Social Handles */}
                  <div className="mt-8 pt-6 border-t border-brand/10 flex items-center gap-3">
                    <motion.a
                      whileHover={{ y: -3, scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      href={site.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand transition-colors hover:bg-brand hover:text-white"
                    >
                      <Instagram className="h-5 w-5" />
                    </motion.a>
                    <motion.a
                      whileHover={{ y: -3, scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      href={site.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Facebook"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand transition-colors hover:bg-brand hover:text-white"
                    >
                      <Facebook className="h-5 w-5" />
                    </motion.a>
                  </div>
                </div>
              </ScrollReveal>

              {/* Resolved Google Map Embed */}
              <ScrollReveal direction="right" className="h-full">
                <div className="overflow-hidden rounded-3xl border border-brand/5 shadow-soft h-full min-h-[380px] relative">
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

            {/* Social Strip */}
            <ScrollReveal direction="up" className="mt-12">
              <div className="bg-brand-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-glow">
                <CourtPatternBg className="absolute inset-0 opacity-5 w-full h-full object-cover" />
                <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 max-w-4xl mx-auto">
                  <div className="text-center md:text-left">
                    <h3 className="font-display text-xl md:text-2xl font-extrabold text-white leading-tight">Join the community</h3>
                    <p className="text-xs text-white/70 mt-1">Get updates on court bookings, tournaments, and social events</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <motion.a
                      whileHover={{ y: -4, scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      href={site.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                      aria-label="Follow us on Instagram"
                    >
                      <Instagram className="w-5 h-5" />
                    </motion.a>
                    <motion.a
                      whileHover={{ y: -4, scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      href={site.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                      aria-label="Follow us on Facebook"
                    >
                      <Facebook className="w-5 h-5" />
                    </motion.a>
                  </div>
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
