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
  Star,
  Sun,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { NoticeBoard } from "@/components/notice-board";
import { CTABand, Container, Eyebrow, SectionHeading } from "@/components/ui";
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
  { icon: Star, title: "Show up & play", text: "Get a confirmation, walk in, and we'll have your court ready." },
];

const testimonials = [
  { name: "Ananya R.", role: "Weekend regular", quote: "Booking used to mean five phone calls. Now it's three taps on my phone and I'm on court the same evening." },
  { name: "Sourav M.", role: "Intermediate player", quote: "The coaching transformed my third-shot drop. Genuinely the best pickleball community in North Kolkata." },
  { name: "Priya & Karan", role: "Doubles pair", quote: "The monthly open is so well run — great vibe, real competition, and the courtside kitchen is a bonus." },
];

export default async function Home() {
  const notices = await getNotices();

  return (
    <>
      <Nav />
      <main>
        {/* Hero */}
        <section className="brand-gradient brand-mesh relative overflow-hidden text-white">
          <div className="court-lines absolute inset-0 opacity-30" />
          <Container className="relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white">
                <MapPin className="h-3.5 w-3.5 text-ball" /> Kaikhali · North Kolkata
              </span>
              <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Welcome to <br />
                <span className="text-ball">Breathe Pickleball</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/85 sm:text-lg">
                Three professional courts, coaching for every age, and a thriving community — all bookable in seconds from your phone.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/book"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-brand shadow-soft transition hover:bg-ball hover:text-ink active:scale-[0.98]"
                >
                  Book Slot Now <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/coaching"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
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
                    <div className="font-display text-2xl font-extrabold text-ball sm:text-3xl">{v}</div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/70">{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live availability card */}
            <div className="animate-fade-up [animation-delay:120ms]">
              <div className="relative mx-auto max-w-md rounded-3xl border border-white/20 bg-white/10 p-5 shadow-glow backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-ball">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ball opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-ball" />
                    </span>
                    Live availability
                  </span>
                  <span className="text-xs font-semibold text-white/70">Today</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[0.7rem] font-bold">
                  {Array.from({ length: 18 }).map((_, i) => {
                    const booked = [2, 5, 8, 11, 14].includes(i);
                    const prime = [6, 7, 12].includes(i);
                    return (
                      <div
                        key={i}
                        className={`rounded-lg border py-3 ${
                          booked
                            ? "border-white/10 bg-white/5 text-white/40"
                            : prime
                              ? "border-ball/60 bg-ball/20 text-white"
                              : "border-white/25 bg-white/10 text-white"
                        }`}
                      >
                        {booked ? "—" : "Open"}
                      </div>
                    );
                  })}
                </div>
                <Link
                  href="/book"
                  className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-brand transition hover:bg-ball hover:text-ink"
                >
                  See all open slots <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </Container>
        </section>

        {/* Trust strip */}
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

        {/* Features */}
        <section className="section-light px-4 py-20 sm:px-6 lg:px-8">
          <Container className="!px-0">
            <SectionHeading
              center
              eyebrow="Why Breathe"
              title="Everything a great game needs, in one place"
              description="From the surface under your feet to the snacks after match point, every detail is built for players."
            />
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="group rounded-3xl border border-brand/10 bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:border-brand/30 hover:shadow-card"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 font-display text-lg font-bold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slatey">{text}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* How it works */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
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

        {/* Coaching + Tournaments split */}
        <section className="px-4 pb-4 sm:px-6 lg:px-8">
          <Container className="!px-0 grid gap-5 lg:grid-cols-2">
            <div className="relative overflow-hidden rounded-3xl border border-brand/10 bg-brand/5 p-8">
              <GraduationCap className="h-10 w-10 text-brand" />
              <h3 className="mt-4 font-display text-2xl font-extrabold text-ink">Coaching that levels you up</h3>
              <p className="mt-3 text-sm leading-6 text-slatey">
                Junior clinics, adult beginner courses, and advanced drilling. Build real fundamentals with coaches who play the game.
              </p>
              <Link href="/coaching" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-brand hover:gap-3 transition-all">
                View coaching programs <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="brand-gradient brand-mesh relative overflow-hidden rounded-3xl p-8 text-white shadow-glow">
              <div className="court-lines absolute inset-0 opacity-25" />
              <div className="relative">
                <Trophy className="h-10 w-10 text-ball" />
                <h3 className="mt-4 font-display text-2xl font-extrabold">Tournaments with real stakes</h3>
                <p className="mt-3 text-sm leading-6 text-white/85">
                  Monthly opens and beginner brackets with cash prizes, ranking points, and the best courtside atmosphere in the city.
                </p>
                <Link href="/tournaments" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-ball hover:gap-3 transition-all">
                  See the tournament calendar <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </Container>
        </section>

        {/* Notice board */}
        <NoticeBoard notices={notices} />

        {/* Testimonials */}
        <section className="section-light px-4 py-20 sm:px-6 lg:px-8">
          <Container className="!px-0">
            <SectionHeading center eyebrow="From our community" title="Loved by players across Kolkata" />
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {testimonials.map((t) => (
                <figure key={t.name} className="rounded-3xl border border-brand/10 bg-white p-6 shadow-soft">
                  <div className="flex gap-1 text-ball">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <blockquote className="mt-4 text-sm leading-6 text-ink">“{t.quote}”</blockquote>
                  <figcaption className="mt-5 text-sm">
                    <span className="font-bold text-ink">{t.name}</span>
                    <span className="block text-slatey">{t.role}</span>
                  </figcaption>
                </figure>
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
