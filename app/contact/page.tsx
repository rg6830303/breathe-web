import type { Metadata } from "next";
import { Clock, Facebook, Instagram, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { Container, Eyebrow, SectionHeading } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Visit, call, or message Breathe Pickleball in ${site.area}. ${site.hoursShort}. ${site.address}`,
};

export default function ContactPage() {
  const contactCards = [
    { icon: Phone, label: "Call us", value: site.phoneDisplay, href: site.phoneHref },
    { icon: MessageCircle, label: "WhatsApp", value: "Message us", href: site.whatsappHref },
    { icon: Mail, label: "Email", value: site.email, href: site.emailHref },
    { icon: MapPin, label: "Visit", value: "Get directions", href: site.mapsLink },
  ];

  return (
    <>
      <Nav />
      <main>
        <section className="brand-gradient brand-mesh relative overflow-hidden text-white">
          <div className="court-lines absolute inset-0 opacity-25" />
          <Container className="relative py-16 sm:py-20">
            <Eyebrow light>Contact</Eyebrow>
            <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">
              Come play with us in <span className="text-ball">Kaikhali</span>
            </h1>
            <p className="mt-5 max-w-2xl text-white/85 sm:text-lg">
              Questions about booking, coaching, or tournaments? Reach out any way you like — or just drop by. We're open every day.
            </p>
          </Container>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <Container className="!px-0">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {contactCards.map(({ icon: Icon, label, value, href }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="group rounded-3xl border border-brand/10 bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:border-brand/30 hover:shadow-card"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="mt-4 text-xs font-bold uppercase tracking-wide text-slatey">{label}</div>
                  <div className="mt-1 font-display text-base font-bold text-ink">{value}</div>
                </a>
              ))}
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
              {/* Details */}
              <div className="rounded-3xl border border-brand/10 bg-white p-7 shadow-soft">
                <SectionHeading eyebrow="Find us" title="Address & hours" />
                <div className="mt-6 space-y-5 text-sm">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                    <div>
                      <div className="font-bold text-ink">Address</div>
                      <p className="mt-1 text-slatey">{site.address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                    <div>
                      <div className="font-bold text-ink">Opening hours</div>
                      <p className="mt-1 text-slatey">{site.hoursShort}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                    <div>
                      <div className="font-bold text-ink">Phone</div>
                      <a href={site.phoneHref} className="mt-1 block text-brand hover:underline">{site.phoneDisplay}</a>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <a href={site.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-brand transition hover:bg-brand hover:text-white">
                    <Instagram className="h-5 w-5" />
                  </a>
                  <a href={site.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-brand transition hover:bg-brand hover:text-white">
                    <Facebook className="h-5 w-5" />
                  </a>
                </div>
              </div>

              {/* Map */}
              <div className="overflow-hidden rounded-3xl border border-brand/10 shadow-soft">
                <iframe
                  title="Breathe Pickleball location"
                  src={site.mapsEmbed}
                  className="h-full min-h-[360px] w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
