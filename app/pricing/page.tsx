"use client";

import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { CTABand, Container, SectionDivider } from "@/components/ui";
import { PageHero } from "@/components/ui/page-hero";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { Wallet, ShieldCheck, Clock, HelpCircle } from "lucide-react";

const sportsPricing = [
  {
    sport: "Pickleball Court",
    icon: "🎾",
    description: "Premium asphalt courts with professional net systems.",
    rates: [
      { day: "Monday - Friday (Weekday)", time: "5 AM - 5 PM", price: 600 },
      { day: "Monday - Friday (Weekday)", time: "5 PM - 11 PM", price: 800 },
      { day: "Saturday, Sunday & Holidays", time: "5 AM - 11 PM", price: 1000 },
    ],
  },
  {
    sport: "Badminton Court",
    icon: "🏸",
    description: "Indoor/outdoor court 1 setup with tournament-grade nets.",
    rates: [
      { day: "Monday - Friday (Weekday)", time: "5 AM - 5 PM", price: 600 },
      { day: "Monday - Friday (Weekday)", time: "5 PM - 11 PM", price: 800 },
      { day: "Saturday, Sunday & Holidays", time: "5 AM - 11 PM", price: 1000 },
    ],
  },
  {
    sport: "Cricket Turf",
    icon: "🏏",
    description: "Full arena booking taking up all 3 courts simultaneously.",
    rates: [
      { day: "Monday - Friday (Weekday)", time: "5 AM - 5 PM", price: 1500 },
      { day: "Monday - Friday (Weekday)", time: "5 PM - 11 PM", price: 2000 },
      { day: "Saturday, Sunday & Holidays", time: "5 AM - 11 PM", price: 2500 },
    ],
  },
];

const policies = [
  {
    icon: Wallet,
    title: "₹200 Slot Confirmation Advance",
    text: "Pay a flat ₹200 advance fee online via Razorpay to confirm any slot booking. The remaining balance of the total court bill is payable at the club premises after your play.",
  },
  {
    icon: ShieldCheck,
    title: "Complimentary Equipment Included",
    text: "Paddles, rackets, and balls are provided completely free of charge. No additional rental fees for gear.",
  },
  {
    icon: Clock,
    title: "4-Hour Cancellation Policy",
    text: "Cancel or reschedule your slot up to 4 hours before your game start time. Cancellations are free, and your advance payment is credited back.",
  },
];

const faqs = [
  {
    q: "How does the ₹200 advance payment work?",
    a: "When booking a court slot online, your checkout amount will always be exactly ₹200. This secures your reservation. The rest of the bill (determined by the rates above) is settled directly at the venue via UPI or cash after you finish playing.",
  },
  {
    q: "Do I need to pay extra for paddles or balls?",
    a: "No! All playing gear (pickleball paddles, badminton rackets, and balls) is included in the court booking rate at no additional cost.",
  },
  {
    q: "What if I book multiple hours or courts in a single order?",
    a: "Even if you select multiple slots or courts, you will still pay only a single ₹200 advance fee online to confirm the entire order. The total bill and remaining balance will be detailed on your booking invoice, and the balance is paid on the premises.",
  },
  {
    q: "How do I cancel or reschedule my booking?",
    a: "You can cancel your session directly from your player portal dashboard up to 4 hours before the booked start time.",
  },
];

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main className="overflow-x-hidden">
        {/* Page Hero */}
        <PageHero
          dark={true}
          label="Pricing & Rates"
          title="Court booking rates and guidelines"
          subtitle="Pay a flat ₹200 advance online to confirm any slot booking. Settle the remaining balance at the club premises after your play. Complimentary paddles and balls included."
        />

        {/* ── RATES SECTION ── */}
        <section className="bg-white px-4 py-20 dark:bg-ink sm:px-6 lg:px-8">
          <Container className="!px-0">
            <ScrollReveal direction="up">
              <div className="mb-12 text-center">
                <span className="eyebrow text-brand dark:text-lime">Hourly Rates</span>
                <h2 className="heading-lg mt-4 text-ink dark:text-white">
                  Court booking <span className="mark-lime">rate chart</span>
                </h2>
                <p className="mt-2 text-sm text-slatey dark:text-white/50">Rates listed below are per hour (equipment included)</p>
              </div>
            </ScrollReveal>

            <div className="grid gap-8 md:grid-cols-3">
              {sportsPricing.map((item, idx) => (
                <ScrollReveal key={item.sport} delay={idx * 0.1} direction="up">
                  <TiltCard maxTilt={4} className="h-full">
                    <div className="card-sport flex h-full flex-col p-6 border-2 border-ink/10 bg-white dark:border-white/10 dark:bg-[#111c38]">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{item.icon}</span>
                        <div>
                          <h3 className="font-display text-lg font-extrabold text-ink dark:text-white">{item.sport}</h3>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-slatey dark:text-white/50">{item.description}</p>
                      
                      <div className="mt-6 flex-1 space-y-4">
                        {item.rates.map((rate, rIdx) => (
                          <div key={rIdx} className="border-b border-ink/5 pb-3 last:border-0 last:pb-0 dark:border-white/5">
                            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slatey dark:text-white/40">
                              {rate.day}
                            </div>
                            <div className="mt-1 flex items-center justify-between">
                              <span className="text-sm font-semibold text-ink dark:text-white">{rate.time}</span>
                              <span className="font-display text-lg font-extrabold text-brand dark:text-brand-300">
                                ₹{rate.price}/-
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TiltCard>
                </ScrollReveal>
              ))}
            </div>
          </Container>
        </section>

        {/* ── POLICIES SECTION ── */}
        <section className="bg-brand-50/20 px-4 py-20 dark:bg-[#111c38] sm:px-6 lg:px-8">
          <Container className="!px-0">
            <ScrollReveal direction="up">
              <div className="mb-12 text-center">
                <span className="eyebrow text-brand dark:text-lime">Booking Policies</span>
                <h2 className="heading-lg mt-4 text-ink dark:text-white">
                  Guidelines and <span className="mark-lime">features</span>
                </h2>
              </div>
            </ScrollReveal>

            <div className="grid gap-6 md:grid-cols-3">
              {policies.map(({ icon: Icon, title, text }, idx) => (
                <ScrollReveal key={title} delay={idx * 0.1} direction="up">
                  <div className="card-sport p-6 bg-white dark:bg-ink">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 dark:bg-brand/20">
                      <Icon className="h-5 w-5 text-brand dark:text-lime" />
                    </div>
                    <h3 className="mt-4 font-display text-base font-extrabold text-ink dark:text-white">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slatey dark:text-white/60">{text}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </Container>
        </section>

        {/* ── FAQ SECTION ── */}
        <section className="bg-white px-4 py-20 dark:bg-ink sm:px-6 lg:px-8">
          <Container className="!px-0 max-w-3xl">
            <ScrollReveal direction="up">
              <div className="mb-12 text-center">
                <span className="eyebrow text-brand dark:text-lime">FAQ</span>
                <h2 className="heading-lg mt-4 text-ink dark:text-white">
                  Frequently asked <span className="mark-lime">questions</span>
                </h2>
              </div>
            </ScrollReveal>

            <div className="space-y-6">
              {faqs.map((faq, idx) => (
                <ScrollReveal key={idx} delay={idx * 0.08} direction="up">
                  <div className="card-sport p-5 border border-ink/5 dark:border-white/5">
                    <h4 className="flex items-start gap-2 font-display text-base font-extrabold text-ink dark:text-white">
                      <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand dark:text-lime" />
                      {faq.q}
                    </h4>
                    <p className="mt-2 pl-6 text-sm leading-relaxed text-slatey dark:text-white/65">{faq.a}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </Container>
        </section>

        <SectionDivider />
        <CTABand />
      </main>
      <Footer />
    </>
  );
}
