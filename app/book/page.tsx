import type { Metadata } from "next";
import { BookingGrid } from "@/components/booking-grid";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { Container } from "@/components/ui";
import { fallbackPricingRules } from "@/lib/pricing";
import { WeatherWidget } from "@/components/weather-widget";
import { BulkPassCard } from "@/components/bulk-pass-card";
import { PageHero } from "@/components/ui/page-hero";

export const metadata: Metadata = {
  title: "Book a Pickleball Court in Kaikhali",
  description:
    "Check live court availability and book your pickleball slot at Breathe Pickleball, Kaikhali in seconds. Three pro courts, equipment included, open daily 5 AM – 11 PM.",
  alternates: { canonical: "/book" },
  openGraph: {
    title: "Book a Court | Breathe Pickleball, Kaikhali",
    description: "Live availability across three pro courts. Book your pickleball slot in seconds.",
    url: "/book",
  },
};

export default function BookPage() {
  return (
    <>
      <Nav />
      <main className="app-surface bg-white dark:bg-ink">
        {/* Bold marketing hero */}
        <PageHero
          label="Live booking"
          title="Reserve your court"
          subtitle="Pick a date, tap the open slots that suit you, and pay securely. 3 premium asphalt courts with tournament-grade nets and LED floodlights."
        >
          {/* Pricing tags */}
          <div className="flex flex-wrap gap-2">
            {fallbackPricingRules.map((rule) => (
              <span key={rule.id} className="tag-sport">
                {rule.label}: ₹{rule.price}
              </span>
            ))}
            <a
              href="/calendar"
              className="btn-outline py-1.5 text-xs text-white border-white/30 hover:border-white hover:text-white dark:text-white dark:border-white/30 dark:hover:border-white dark:hover:text-white"
            >
              See 7-day calendar
            </a>
          </div>
        </PageHero>

        {/* Content area — lifted over the hero bottom edge */}
        <Container className="relative z-10 py-8 sm:py-10">
          {/* Live Weather Widget for Kaikhali, Kolkata */}
          <div className="mb-6">
            <WeatherWidget />
          </div>

          {/* Bulk-hours package offer */}
          <div className="mb-6">
            <BulkPassCard />
          </div>

          <BookingGrid />
        </Container>
      </main>
      <Footer />
    </>
  );
}
