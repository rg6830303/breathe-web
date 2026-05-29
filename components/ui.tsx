import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import { site } from "@/lib/site";

export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

export function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] ${
        light ? "text-ball" : "text-brand"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${light ? "bg-ball" : "bg-brand"}`} />
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  light = false,
  center = false,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  light?: boolean;
  center?: boolean;
}) {
  return (
    <div className={`${center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}`}>
      {eyebrow && <Eyebrow light={light}>{eyebrow}</Eyebrow>}
      <h2
        className={`mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl ${
          light ? "text-white" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p className={`mt-4 text-base leading-7 ${light ? "text-white/80" : "text-slatey"}`}>{description}</p>
      )}
    </div>
  );
}

export function PrimaryButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-bold text-white shadow-glow transition hover:bg-brand-600 active:scale-[0.98] ${className}`}
    >
      {children}
    </Link>
  );
}

export function GhostButton({
  href,
  children,
  light = false,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  light?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-6 py-3 text-sm font-bold transition active:scale-[0.98] ${
        light
          ? "border-white/40 text-white hover:bg-white/10"
          : "border-brand/30 text-brand hover:bg-brand/5"
      } ${className}`}
    >
      {children}
    </Link>
  );
}

/** Reusable conversion band placed near the bottom of most pages. */
export function CTABand() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <Container className="!px-0">
        <div className="brand-gradient brand-mesh relative overflow-hidden rounded-3xl px-6 py-12 text-center shadow-glow sm:px-12 sm:py-16">
          <div className="court-lines absolute inset-0 opacity-40" />
          <div className="relative">
            <Eyebrow light>Ready when you are</Eyebrow>
            <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl">
              Grab your court and play tonight
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/85">
              Live availability across all courts, transparent pricing, and instant confirmation — straight from your phone.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/book"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-brand shadow-soft transition hover:bg-ball hover:text-ink active:scale-[0.98]"
              >
                Book a Slot <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={site.phoneHref}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                <Phone className="h-4 w-4" /> {site.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
