import type { Metadata } from "next";
import { BookingGrid } from "@/components/booking-grid";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { Container, Eyebrow } from "@/components/ui";
import { fallbackPricingRules } from "@/lib/pricing";
import { WeatherWidget } from "@/components/weather-widget";

export const metadata: Metadata = {
  title: "Book a Court",
  description:
    "Check live court availability and book your pickleball slot at Breathe Pickleball, Kaikhali in seconds.",
};

export default function BookPage() {
  return (
    <>
      <Nav />
      <main className="bg-brand-50/30">
        <section className="brand-gradient brand-mesh relative overflow-hidden pb-16 pt-8 text-white sm:py-16">
          <div className="court-lines absolute inset-0 opacity-25" />
          <Container className="relative">
            <Eyebrow light>Live booking</Eyebrow>
            <h1 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">Reserve your court</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
              Pick a date, tap the open slots that suit you, and pay securely. 3 premium asphalt courts, professional
              asphalt surface with tournament-grade net systems and LED floodlights.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {fallbackPricingRules.map((rule) => (
                <span
                  key={rule.id}
                  className="rounded-full bg-white/12 px-3 py-1.5 text-[10px] font-semibold text-white sm:text-xs"
                >
                  {rule.label}: ₹{rule.price}
                </span>
              ))}
              <a
                href="/calendar"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/30 px-3 py-1.5 text-[10px] font-semibold text-white/80 hover:bg-white/10 transition sm:text-xs"
              >
                📅 See 7-day calendar →
              </a>
            </div>
          </Container>
        </section>

        <Container className="relative z-10 -mt-10 pb-8 pt-0 sm:-mt-14 sm:pb-12">
          {/* Live Weather Widget for Kaikhali, Kolkata */}
          <div className="mb-6">
            <WeatherWidget />
          </div>
          <BookingGrid />
        </Container>
      </main>
      <Footer />
    </>
  );
}
