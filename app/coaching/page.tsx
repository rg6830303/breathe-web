import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, MessageCircle, Phone } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { CTABand, Container } from "@/components/ui";
import { PageHero } from "@/components/ui/page-hero";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Coaching",
  description:
    "Coaching at Breathe Pickleball, Kaikhali. Sessions for juniors, beginners, intermediate, and competitive players. Call to enquire.",
};

export default function CoachingPage() {
  return (
    <>
      <Nav />
      <main className="overflow-x-hidden">
        <PageHero
          dark={false}
          label="Coaching"
          title="Coaching at Breathe"
          subtitle="Certified coaches. Small groups. Real progress."
        />

        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
          <Container className="!px-0">
            <div className="mx-auto max-w-2xl text-center">
              <p className="font-display text-lg leading-relaxed text-ink sm:text-xl">
                We offer coaching for all ages and levels — juniors, beginners, intermediate,
                and competitive players. Sessions run as private 1-on-1 lessons or in small
                groups, on three professional courts with certified coaches.
              </p>
              <p className="mt-4 text-sm text-slatey">
                Drop us a call or message and we&apos;ll match you to the right batch, weekday
                or weekend, indoors or under floodlights.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href={site.phoneHref}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-7 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand-600 sm:w-auto"
                >
                  <Phone className="h-4 w-4" /> Call {site.phoneDisplay}
                </Link>
                <Link
                  href={site.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-lime px-7 py-3.5 text-sm font-bold text-gray-900 shadow-soft transition hover:bg-lime-dark sm:w-auto"
                >
                  <MessageCircle className="h-4 w-4" /> Message on WhatsApp
                </Link>
              </div>

              <p className="mt-8 text-xs text-slatey">
                Prefer email?{" "}
                <a href={site.emailHref} className="font-semibold text-brand hover:underline">
                  {site.email}
                </a>
              </p>

              <div className="mt-12">
                <Link
                  href="/book"
                  className="inline-flex items-center gap-2 text-sm font-bold text-brand hover:underline"
                >
                  Or just book a court and try us out <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </Container>
        </section>

        <CTABand />
      </main>
      <Footer />
    </>
  );
}
