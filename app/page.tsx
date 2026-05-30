import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Coffee,
  GraduationCap,
  MapPin,
  ShieldCheck,
  ShowerHead,
  Sparkles,
  Sun,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { Footer } from "@/components/footer";
import { LiveAvailability } from "@/components/live-availability";
import { Nav } from "@/components/nav";
import { NoticeBoard } from "@/components/notice-board";
import { Reveal } from "@/components/reveal";
import { PaddleMark } from "@/components/logo";
import { CTABand, Container, SectionHeading } from "@/components/ui";
import { getSupabaseService, hasSupabaseEnv } from "@/lib/supabase";
import { site } from "@/lib/site";
import type { Notice } from "@/lib/types";

async function getNotices(): Promise<Notice[]> {
  const fallback: Notice[] = [
    { id: 1, title: "Tonight: prime-time courts filling fast", content: "7–9 PM slots on Courts 1 & 2 are nearly gone — lock yours in now.", type: "daily", created_at: "", updated_at: "" },
    { id: 2, title: "Weekend Doubles Ladder", content: "Saturday social ladder, all levels welcome. Registration closes Friday 6 PM.", type: "weekly", created_at: "", updated_at: "" },
    { id: 3, title: "Breathe Monthly Open", content: "Open & beginner brackets with cash prizes. Early-bird passes now available.", type: "monthly", created_at: "", updated_at: "" },
  ];
  if (!hasSupabaseEnv()) return fallback;
  try {
    const { data, error } = await getSupabaseService().from("notice_board").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data?.length ? data : fallback;
  } catch {
    return fallback;
  }
}

const features = [
  { icon: Sun, title: "3 pro outdoor courts", text: "Tournament-grade surfaces with proper net systems and floodlights for evening play." },
  { icon: GraduationCap, title: "Coaching for all ages", text: "Structured programs from first-timers to competitive players, led by certified coaches." },
  { icon: Trophy, title: "Tournaments & cash prizes", text: "Regular open and beginner brackets that bring the city's pickleball community together." },
  { icon: Coffee, title: "In-house kitchen", text: "Refuel courtside with snacks and beverages between games." },
  { icon: ShowerHead, title: "Changing facilities", text: "Clean changing rooms and washrooms so you arrive and leave fresh." },
  { icon: CalendarCheck, title: "Instant online booking", text: "Live slot availability and confirmed reservations in seconds — no calls needed." },
];

const steps = [
  { icon: CalendarCheck, title: "Pick your slot", text: "Choose a date and tap an open 30-minute slot on any court." },
  { icon: Zap, title: "Review & confirm", text: "See transparent pricing with GST, add paddles or balls, and confirm." },
  { icon: Sparkles, title: "Show up & play", text: "Get a confirmation, walk in, and we'll have your court ready." },
];

const testimonials = [
  { name: "Ananya Roy", role: "Weekend regular", memberType: "Member since 2024", quote: "Booking used to mean five phone calls. Now it's three taps on my phone and I'm on court the same evening." },
  { name: "Sourav Mukherjee", role: "Intermediate player", memberType: "Coaching student", quote: "The coaching transformed my third-shot drop. Genuinely the best pickleball community in North Kolkata." },
  { name: "Priya & Karan", role: "Doubles pair", memberType: "Tournament regulars", quote: "The monthly open is so well run — great vibe, real competition, and the courtside kitchen is a bonus." },
];

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** Inline SVG of two parallel sidelines + a centre net line. Sits over the
 *  hero gradient at 6% opacity for a faint pickleball-court suggestion. */
function CourtLinesSVG() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1200 800"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ opacity: 0.06 }}
    >
      {/* Outer sidelines */}
      <line x1="120" y1="80" x2="120" y2="720" stroke="white" strokeWidth="2" />
      <line x1="1080" y1="80" x2="1080" y2="720" stroke="white" strokeWidth="2" />
      {/* Baselines */}
      <line x1="120" y1="80" x2="1080" y2="80" stroke="white" strokeWidth="2" />
      <line x1="120" y1="720" x2="1080" y2="720" stroke="white" strokeWidth="2" />
      {/* Centre net line */}
      <line x1="120" y1="400" x2="1080" y2="400" stroke="white" strokeWidth="3" />
      {/* Non-volley zone (kitchen) lines */}
      <line x1="120" y1="310" x2="1080" y2="310" stroke="white" strokeWidth="1.5" strokeDasharray="6 6" />
      <line x1="120" y1="490" x2="1080" y2="490" stroke="white" strokeWidth="1.5" strokeDasharray="6 6" />
      {/* Centre service line */}
      <line x1="600" y1="80" x2="600" y2="310" stroke="white" strokeWidth="1.5" />
      <line x1="600" y1="490" x2="600" y2="720" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}

export default async function Home() {
  const notices = await getNotices();

  return (
    <>
      <Nav />
      <main>
        {/* Hero — brand-700 → brand-800 gradient with SVG court overlay */}
        <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 to-brand-800 text-white">
          <CourtLinesSVG />
          <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-lime/10 blur-3xl animate-blob" />
          <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-blob [animation-delay:3s]" />
          <div className="scene pointer-events-none absolute right-6 top-24 hidden xl:block">
            <PaddleMark className="paddle-3d h-24 w-24 text-white/80 drop-shadow-[0_18px_30px_rgba(0,0,0,0.25)]" />
          </div>
          <Container className="relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white">
                <MapPin className="h-3.5 w-3.5 text-lime" /> Kaikhali · North Kolkata
              </span>
              <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Welcome to <br />
                <span className="text-lime">Breathe Pickleball</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/85 sm:text-lg">
                Three professional courts, coaching for every age, and a thriving community — all bookable in seconds from your phone.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/book"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-lime px-7 py-3.5 text-sm font-bold text-gray-900 shadow-soft transition hover:bg-lime-dark active:scale-[0.98]"
                >
                  Book Slot Now <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/coaching"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white text-white px-7 py-3.5 text-sm font-bold transition hover:bg-white/10"
                >
                  Explore Coaching
                </Link>
              </div>
              <div className="mt-10 grid max-w-md grid-cols-3 gap-4">
                {[
                  ["3", "Pro courts"],
                  ["6AM–11PM", "Open daily"],
                  ["All", "Skill levels"],
                ].map(([v, l]) => (
                  <div key={l}>
                    <div className="font-display text-2xl font-extrabold text-lime sm:text-3xl">{v}</div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/70">{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live availability — next 6 half-hour slots, demo data fine */}
            <div className="animate-fade-up [animation-delay:120ms]">
              <LiveAvailability />
            </div>
          </Container>
        </section>

        {/* Trust strip — white */}
        <section className="border-b border-brand/10 bg-white">
          <Container className="grid grid-cols-2 gap-6 py-8 text-center sm:grid-cols-4">
            {[
              [Users, "All skill levels"],
              [ShieldCheck, "Certified coaches"],
              [Trophy, "Tournaments hosted"],
              [Sparkles, "Open every day"],
            ].map(([Icon, label]) => {
              const I = Icon as typeof Users;
              return (
                <div key={label as string} className="flex flex-col items-center gap-2">
                  <I className="h-6 w-6 text-brand" />
                  <span className="text-sm font-semibold text-ink">{label as string}</span>
                </div>
              );
            })}
          </Container>
        </section>

        {/* Features — brand-50 */}
        <section className="bg-brand-50 px-4 py-20 sm:px-6 lg:px-8">
          <Container className="!px-0">
            <SectionHeading
              center
              eyebrow="Why Breathe"
              title="Everything a great game needs, in one place"
              description="From the surface under your feet to the snacks after match point, every detail is built for players."
            />
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, text }, i) => (
                <Reveal key={title} delay={(i % 3) * 90}>
                  <div className="card-3d group h-full rounded-3xl border border-brand/10 bg-white p-6 shadow-soft hover:border-brand/30 hover:shadow-card">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 font-display text-lg font-bold text-ink">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slatey">{text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* How it works — white */}
        <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
          <Container className="!px-0">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <SectionHeading
                eyebrow="How it works"
                title="From phone to court in three steps"
                description="Most of our players book on their phone minutes before they leave home. Here's how simple it is."
              />
              <div className="grid gap-4">
                {steps.map(({ icon: Icon, title, text }, i) => (
                  <div key={title} className="flex items-start gap-4 rounded-3xl border border-brand/10 bg-white p-5 shadow-soft">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl brand-gradient font-display text-lg font-extrabold text-white">
                      {i + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-brand" />
                        <h3 className="font-display text-base font-bold text-ink">{title}</h3>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-slatey">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* Coaching + Tournaments split — brand-50 */}
        <section className="bg-brand-50 px-4 py-20 sm:px-6 lg:px-8">
          <Container className="!px-0 grid gap-5 lg:grid-cols-2">
            <div className="relative overflow-hidden rounded-3xl border border-brand/10 bg-white p-8 shadow-soft">
              <GraduationCap className="h-10 w-10 text-brand" />
              <h3 className="mt-4 font-display text-2xl font-extrabold text-ink">Coaching that levels you up</h3>
              <p className="mt-3 text-sm leading-6 text-slatey">
                Junior clinics, adult beginner courses, and advanced drilling. Build real fundamentals with coaches who play the game.
              </p>
              <Link href="/coaching" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-brand hover:gap-3 transition-all">
                View coaching programs <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-800 p-8 text-white shadow-glow">
              <CourtLinesSVG />
              <div className="relative">
                <Trophy className="h-10 w-10 text-lime" />
                <h3 className="mt-4 font-display text-2xl font-extrabold">Tournaments with real stakes</h3>
                <p className="mt-3 text-sm leading-6 text-white/85">
                  Monthly opens and beginner brackets with cash prizes, ranking points, and the best courtside atmosphere in the city.
                </p>
                <Link href="/tournaments" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-lime hover:gap-3 transition-all">
                  See the tournament calendar <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </Container>
        </section>

        {/* Notice board (component handles its own background) */}
        <NoticeBoard notices={notices} />

        {/* Testimonials — brand-50 */}
        <section className="bg-brand-50 px-4 py-20 sm:px-6 lg:px-8">
          <Container className="!px-0">
            <SectionHeading center eyebrow="From our community" title="Loved by players across Kolkata" />
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {testimonials.map((t) => (
                <div key={t.name} className="rounded-2xl bg-white shadow-md p-6 flex flex-col gap-4">
                  <div className="flex gap-1 text-amber">{"★".repeat(5)}</div>
                  <p className="text-gray-700 italic">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold text-sm">
                      {initialsFor(t.name)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{t.name}</div>
                      <div className="text-sm text-gray-500">{t.memberType}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        <CTABand />
      </main>
      <Footer />
    </>
  );
}
