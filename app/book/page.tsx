import type { Metadata } from "next";
import { BookingGrid } from "@/components/booking-grid";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { Container, Eyebrow } from "@/components/ui";
import { getSlotsForDate } from "@/lib/slots";
import { fallbackPricingRules } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Book a Court",
  description: "Check live court availability and book your pickleball slot at Breathe Pickleball, Kaikhali in seconds.",
};

export default async function BookPage() {
  const date = new Date().toISOString().slice(0, 10);
  const slots = await getSlotsForDate(date);

  return (
    <>
      <Nav />
      <main>
        <section className="brand-gradient brand-mesh relative overflow-hidden text-white">
          <div className="court-lines absolute inset-0 opacity-25" />
          <Container className="relative py-12 sm:py-14">
            <Eyebrow light>Live booking</Eyebrow>
            <h1 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">Reserve your court</h1>
            <p className="mt-3 max-w-xl text-white/85">
              Pick a date, tap the open slots that suit you, and confirm. Availability updates in real time across all courts.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {fallbackPricingRules.map((rule) => (
                <span key={rule.id} className="rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold text-white">
                  {rule.label}: ₹{rule.price}
                </span>
              ))}
            </div>
          </Container>
        </section>

        <Container className="py-8 sm:py-10">
          <BookingGrid initialDate={date} initialSlots={slots} />
        </Container>
      </main>
      <Footer />
    </>
  );
}
