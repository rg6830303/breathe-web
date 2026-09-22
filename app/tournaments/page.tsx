"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, Crown, Medal, Trophy, Users, Check } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { CTABand, Container, SectionDivider } from "@/components/ui";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { StatCounter } from "@/components/motion/stat-counter";
import { TiltCard } from "@/components/motion/tilt-card";
import { TournamentBracket } from "@/components/ui/tournament-bracket";
import { SmartImage } from "@/components/ui/smart-image";
import { photos } from "@/lib/photos";
import { motion } from "framer-motion";
import { site } from "@/lib/site";

const formats = [
  { icon: Crown, title: "Open Doubles", text: "Our flagship bracket for competitive players chasing prizes and ranking points." },
  { icon: Users, title: "Beginner Brackets", text: "A friendly, lower-pressure draw so new players can taste competition." },
  { icon: Medal, title: "Mixed Doubles", text: "Pair up and play in one of the most fun and fast-growing formats." },
  { icon: Award, title: "Social Ladders", text: "Ongoing weekly ladders that keep the competition alive all month." },
];

type OpenTournament = {
  id: string;
  name: string;
  event_date: string | null;
  format: string | null;
  prize: string | null;
  fee: number;
  description: string | null;
  poster_url: string | null;
};

function formatDate(d: string | null) {
  if (!d) return "Date to be announced";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/**
 * The events currently taking entries, poster and all. Rendered from the live
 * `/api/tournaments` list, so adding or closing an event in the admin console
 * is all it takes to change this band — nothing here is hard-coded.
 */
function OpenTournaments() {
  const [items, setItems] = useState<OpenTournament[]>([]);
  const [captainItem, setCaptainItem] = useState<OpenTournament | null>(null);

  useEffect(() => {
    fetch("/api/tournaments")
      .then((r) => (r.ok ? r.json() : { tournaments: [] }))
      .then((d) => setItems(d.tournaments ?? []))
      .catch(() => {});

    fetch("/api/tournaments/captain")
      .then((r) => (r.ok ? r.json() : { tournaments: [] }))
      .then((d) => {
        if (d.tournaments && d.tournaments.length > 0) {
          setCaptainItem(d.tournaments[0]);
        }
      })
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-white px-4 pt-10 pb-16 text-ink dark:bg-ink dark:text-white sm:px-6 sm:pt-14 sm:pb-20 lg:px-8">
      {/* Court-tape accent at top edge */}
      <div aria-hidden className="tape-stripe absolute left-0 top-0 h-1.5 w-full opacity-90" />

      {/* Subtle corner glow */}
      <div aria-hidden className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-lime/10 blur-3xl" />

      <Container className="!px-0">
        <ScrollReveal direction="up">
          <div className="mb-8 sm:mb-12 text-center">
            <span className="eyebrow justify-center text-brand dark:text-lime">Registrations open</span>
            <h1 className="heading-xl mt-3 text-ink dark:text-white">
              Enter the <span className="mark-lime">next event</span>
            </h1>
          </div>
        </ScrollReveal>

        <div className="grid gap-8">
          {items.map((t, i) => (
            <ScrollReveal key={t.id} delay={i * 0.1} direction="up">
              <div className="card-sport relative overflow-hidden rounded-3xl border-2 border-brand/20 bg-white p-6 dark:border-lime/30 dark:bg-[#111c38] shadow-[0_12px_40px_-12px_rgba(198,244,50,0.18)] grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
                {t.poster_url && (
                  /* Poster artwork is uploaded per event, so it is rendered as a
                     plain <img> rather than through the curated photo set. */
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.poster_url}
                    alt={`${t.name} poster`}
                    className="w-full rounded-2xl border border-ink/10 object-cover shadow-md dark:border-white/10"
                  />
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="tag-sport">Upcoming Tournament</span>
                    <span className="rounded-full bg-lime/20 px-2.5 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-wide text-lime-dark dark:text-lime">
                      Live for Entries
                    </span>
                  </div>
                  <h2 className="font-display text-2xl font-extrabold text-ink dark:text-white sm:text-3xl lg:text-4xl">{t.name}</h2>
                  <p className="mt-2 text-sm font-bold text-brand dark:text-lime">{formatDate(t.event_date)}</p>
                  {t.description && (
                    <p className="mt-4 text-sm leading-relaxed text-slatey dark:text-white/65">{t.description}</p>
                  )}
                  <ul className="mt-6 grid gap-2.5 text-sm">
                    {t.format && (
                      <li className="flex items-start gap-2 text-ink dark:text-white/80">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime" /> {t.format}
                      </li>
                    )}
                    {t.prize && (
                      <li className="flex items-start gap-2 text-ink dark:text-white/80">
                        <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-lime" /> {t.prize}
                      </li>
                    )}
                    <li className="flex items-start gap-2 text-ink dark:text-white/80">
                      <Medal className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
                      <span>
                        <strong className="font-extrabold text-ink dark:text-white">₹{t.fee.toLocaleString("en-IN")}</strong> per player (individual entry)
                      </span>
                    </li>
                    {captainItem && (
                      <li className="flex items-start gap-2 text-ink dark:text-white/80">
                        <Crown className="mt-0.5 h-4 w-4 shrink-0 text-brand dark:text-brand-300" />
                        <span>
                          <strong className="font-extrabold text-ink dark:text-white">₹{captainItem.fee.toLocaleString("en-IN")}</strong> team captain entry (leads 5 players)
                        </span>
                      </li>
                    )}
                  </ul>
                  <div className="mt-8 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3.5">
                    <Link
                      href="/tournaments/register"
                      className="btn-accent inline-flex items-center justify-center gap-2"
                    >
                      <span>Register as Player</span>
                      <span className="opacity-70 font-normal">·</span>
                      <span>₹{t.fee.toLocaleString("en-IN")}</span>
                    </Link>
                    <Link
                      href="/tournaments/captain"
                      className="btn-outline border-2 border-ink/20 dark:border-lime/40 text-ink dark:text-white hover:border-brand dark:hover:border-lime inline-flex items-center justify-center gap-2 font-extrabold"
                    >
                      <Crown className="h-4 w-4 text-brand dark:text-lime" />
                      <span>Register as Captain</span>
                      <span className="opacity-60 font-normal">·</span>
                      <span>₹{captainItem ? captainItem.fee.toLocaleString("en-IN") : "3,000"}</span>
                    </Link>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

export default function TournamentsPage() {
  return (
    <>
      <Nav />
      <main className="overflow-x-hidden">
        <OpenTournaments />

        {/* ── TOURNAMENT FORMATS — light / ink (dark) ── */}
        <section className="bg-white px-4 py-20 text-ink dark:bg-ink dark:text-white sm:px-6 lg:px-8">
          <Container className="!px-0">
            <ScrollReveal direction="up">
              <div className="mb-12 text-center">
                <span className="eyebrow text-brand dark:text-lime">Event formats</span>
                <h2 className="heading-lg mt-4 text-ink dark:text-white">
                  A bracket for{" "}
                  <span className="mark-lime">every kind</span> of player
                </h2>
              </div>
            </ScrollReveal>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {formats.map(({ icon: Icon, title, text }, i) => (
                <ScrollReveal key={title} delay={i * 0.1} direction="up">
                  <TiltCard maxTilt={5} className="h-full">
                    <div className="card-sport h-full p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime/15">
                        <Icon className="h-6 w-6 text-lime" />
                      </div>
                      <h3 className="mt-5 font-display text-base font-extrabold text-ink dark:text-white">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slatey dark:text-white/60">{text}</p>
                    </div>
                  </TiltCard>
                </ScrollReveal>
              ))}
            </div>
          </Container>
        </section>

        {/* ── PRIZE / STATS STRIP — lime bar ── */}
        <section className="bg-lime py-12 px-4 sm:px-6 lg:px-8">
          <Container className="!px-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              {[
                { label: "Cash prizes", value: "₹₹₹", isText: true },
                { label: "Categories", value: 4, suffix: " divisions" },
                { label: "Events", value: 1, prefix: "Monthly " },
                { label: "Full Venue", value: 3, suffix: " courts" },
              ].map((stat, i) => (
                <ScrollReveal key={stat.label} delay={i * 0.1} direction="up" className="flex flex-col items-center">
                  <div className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
                    {stat.isText ? (
                      <motion.span
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                      >
                        {stat.value}
                      </motion.span>
                    ) : (
                      <>
                        {stat.prefix}
                        <StatCounter end={stat.value as number} suffix={stat.suffix} />
                      </>
                    )}
                  </div>
                  <div className="mt-2 text-[0.65rem] font-extrabold uppercase tracking-wider text-ink/60">
                    {stat.label}
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </Container>
        </section>

        {/* ── CHAMPIONS PHOTO BAND ── */}
        <section className="bg-white px-4 py-20 dark:bg-ink sm:px-6 lg:px-8">
          <Container className="!px-0">
            <ScrollReveal direction="up">
              <div className="mb-8 max-w-2xl">
                <span className="eyebrow text-brand dark:text-lime">From the arena</span>
                <h2 className="heading-lg mt-4 text-ink dark:text-white" style={{ fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>
                  Where champions are{" "}
                  <span className="mark-lime">crowned</span>
                </h2>
              </div>
            </ScrollReveal>
            <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
              <ScrollReveal direction="left" className="h-full">
                <div className="photo-frame aspect-[4/3] h-full w-full">
                  <span className="photo-frame__tick" />
                  <SmartImage photo={photos.tournamentWinners} sizes="(max-width:1024px) 100vw, 55vw" imgClassName="object-[center_22%]" />
                  <div className="absolute bottom-0 left-0 z-[2] p-6">
                    <span className="eyebrow text-lime">Breathe Battle 1.0</span>
                    <p className="mt-2 font-display text-lg font-extrabold text-white">Trophies, medals, and a finals atmosphere under the lights.</p>
                  </div>
                </div>
              </ScrollReveal>
              <ScrollReveal direction="right" className="h-full">
                <div className="photo-frame aspect-[4/3] h-full w-full">
                  <span className="photo-frame__tick" />
                  <SmartImage photo={photos.communityWomen} sizes="(max-width:1024px) 100vw, 35vw" />
                </div>
              </ScrollReveal>
            </div>
          </Container>
        </section>

        {/* ── EXPERIENCE + BRACKET — light section ── */}
        <section className="bg-white px-4 py-20 dark:bg-[#111c38] sm:px-6 lg:px-8">
          <Container className="!px-0 grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <ScrollReveal direction="left">
              <div>
                <span className="eyebrow">The Breathe experience</span>
                <h2 className="heading-lg mt-4 text-ink dark:text-white">
                  Run well, played hard,{" "}
                  <span className="mark-lime">celebrated together</span>
                </h2>
                <p className="mt-4 text-sm text-slatey leading-relaxed dark:text-white/65">
                  Our events are organised end-to-end so you can focus on your game — clear draws, on-time matches, referees where it counts, and a courtside kitchen to keep you fuelled.
                </p>

                <ul className="mt-8 grid gap-3">
                  {[
                    "Cash prizes for winning categories",
                    "Professionally managed brackets and scheduling",
                    "Multiple skill divisions so matches stay competitive",
                    "Live scoreboard and finals atmosphere under the lights",
                    "Refreshments and seating for players and spectators",
                  ].map((item) => (
                    <li key={item} className="card-sport flex items-start gap-3 p-4 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
                      <span className="text-ink dark:text-white/80">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>

            {/* Bracket draw visualization */}
            <ScrollReveal direction="right">
              <div className="flex flex-col gap-4">
                <div className="mb-2 text-center md:text-left">
                  <h3 className="font-display text-lg font-extrabold text-ink dark:text-white flex items-center justify-center md:justify-start gap-2">
                    <Trophy className="h-5 w-5 text-lime" /> Interactive Tournament Bracket
                  </h3>
                  <p className="text-xs text-slatey dark:text-white/50 mt-1">Watch how the bracket resolves under the lights</p>
                </div>
                <TournamentBracket />
              </div>
            </ScrollReveal>
          </Container>
        </section>

        {/* ── NEXT EVENT CTA — dark ink section ── */}
        <section className="bg-ink px-4 py-16 sm:px-6 lg:px-8">
          <Container className="!px-0">
            <ScrollReveal direction="up">
              <div className="relative overflow-hidden rounded-3xl border-2 border-lime/20 p-8 text-center text-white sm:p-12">
                <div aria-hidden className="tape-stripe absolute left-0 top-0 h-1.5 w-full opacity-90" />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-[0.05]"
                  style={{
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                    backgroundSize: "44px 44px",
                  }}
                />
                <div className="relative">
                  <span className="eyebrow text-lime justify-center">Next event</span>
                  <h2 className="heading-lg mx-auto mt-4 max-w-2xl text-white" style={{ fontSize: "clamp(1.75rem,4vw,2.5rem)" }}>
                    Want in on the next{" "}
                    <span className="mark-lime">Breathe Open?</span>
                  </h2>
                  <p className="mx-auto mt-4 max-w-xl text-white/60 text-sm leading-relaxed">
                    Registrations open ahead of each event. Follow us on Instagram or reach out and we'll make sure you don't miss the next one.
                  </p>

                  <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="w-full sm:w-auto">
                      <a
                        href={site.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-accent w-full sm:w-auto"
                      >
                        Follow for updates
                      </a>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="w-full sm:w-auto">
                      <Link href="/tournaments/register" className="btn-outline w-full sm:w-auto">
                        Register now
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </Container>
        </section>

        <SectionDivider />

        <CTABand />
      </main>
      <Footer />
    </>
  );
}
