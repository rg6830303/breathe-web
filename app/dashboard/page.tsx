import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, Clock, Flame, IndianRupee, ListChecks, MoonStar, Sun, Sunset } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { Container } from "@/components/ui";
import { PortalHero } from "@/components/ui/portal-hero";
import { getSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { WeatherWidget } from "@/components/weather-widget";
import { ActivityHeatmap } from "./activity-heatmap";
import { GameStats } from "./game-stats";
import { StatTiles } from "./stat-tile";
import { ProfileForm } from "./profile-form";
import { CancelBookingButton } from "./cancel-button";
import { NextSessionCard } from "./next-session-card";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { StatCounter } from "@/components/motion/stat-counter";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  court_number: number;
  slot_date: string;
  slot_time: string;
  duration_min: number;
  total_amount: number;
  amount_paid: number;
  sport: string;
  status: string;
  created_at: string;
};

type Profile = {
  full_name: string;
  email: string;
  phone: string | null;
  created_at: number;
};

async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const result = await turso.execute({
      sql: "SELECT email, full_name, phone, created_at FROM users WHERE id = ? LIMIT 1",
      args: [userId],
    });
    const r = result.rows[0];
    if (!r) return null;
    return {
      email: String(r.email),
      full_name: String(r.full_name),
      phone: r.phone ? String(r.phone) : null,
      created_at: Number(r.created_at),
    };
  } catch (err) {
    console.error("[dashboard getProfile error]", err);
    return null;
  }
}

async function getBookings(userId: string): Promise<Row[]> {
  try {
    const result = await turso.execute({
      sql: `SELECT id, court_number, slot_date, slot_time, duration_min,
                   total, amount_paid, notes, status, created_at
            FROM bookings
            WHERE user_id = ?
            ORDER BY slot_date DESC, slot_time DESC
            LIMIT 500`,
      args: [userId],
    });
    return result.rows.map((r) => {
      const notesStr = r.notes ? String(r.notes) : "";
      let notesObj: any = {};
      try {
        if (notesStr) notesObj = JSON.parse(notesStr);
      } catch {}
      const sport = notesObj.sport || "pickleball";

      return {
        id: String(r.id),
        court_number: Number(r.court_number) || 1,
        slot_date: String(r.slot_date),
        slot_time: String(r.slot_time).slice(0, 5),
        duration_min: Number(r.duration_min) || 60,
        total_amount: Number(r.total) || Number(r.amount_paid) || 0,
        amount_paid: Number(r.amount_paid) || 0,
        sport,
        status: String(r.status),
        created_at: String(r.created_at),
      };
    });
  } catch (err) {
    console.error("[dashboard getBookings error]", err);
    return [];
  }
}

function formatDate(d: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${d}T00:00:00`));
  } catch {
    return d;
  }
}

function format12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function endTime(hhmm: string, durMin: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + durMin;
  const eh = Math.floor(total / 60);
  const em = total % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

function courtColor(c: number) {
  return ["bg-brand text-white", "bg-lime text-gray-900", "bg-purple-600 text-white"][c - 1] ?? "bg-brand text-white";
}

function statusBadge(s: string) {
  if (s === "confirmed") return "border-2 border-lime/40 bg-lime/10 text-lime-dark";
  if (s === "cancelled") return "border-2 border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-400";
  return "border-2 border-ink/10 bg-ink/5 text-ink/60 dark:border-white/10 dark:bg-white/5 dark:text-white/50";
}

function bandFor(time: string): "morning" | "afternoon" | "evening" | "late" {
  const h = Number(time.slice(0, 2));
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "late";
}

function favouriteBand(bookings: Row[]): { label: string; icon: "sun" | "sunset" | "moon" } {
  const counts: Record<string, number> = { morning: 0, afternoon: 0, evening: 0, late: 0 };
  for (const b of bookings) {
    if (b.status !== "confirmed") continue;
    counts[bandFor(b.slot_time)]++;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] === 0) return { label: "Open to anything", icon: "sun" };
  switch (top[0]) {
    case "morning":
      return { label: "Morning player", icon: "sun" };
    case "afternoon":
      return { label: "Afternoon player", icon: "sun" };
    case "evening":
      return { label: "Evening player", icon: "sunset" };
    default:
      return { label: "Night owl", icon: "moon" };
  }
}

function computeStreak(bookings: Row[]): number {
  const dates = new Set<string>();
  for (const b of bookings) {
    if (b.status === "confirmed") dates.add(b.slot_date);
  }
  let streak = 0;
  const cur = new Date();
  cur.setHours(0, 0, 0, 0);
  while (true) {
    const key = cur.toISOString().slice(0, 10);
    if (dates.has(key)) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    } else if (streak === 0) {
      // Allow today to be empty without breaking the streak — check yesterday once.
      cur.setDate(cur.getDate() - 1);
      const key2 = cur.toISOString().slice(0, 10);
      if (dates.has(key2)) {
        streak++;
        cur.setDate(cur.getDate() - 1);
      } else {
        break;
      }
    } else {
      break;
    }
  }
  return streak;
}

function memberSince(ms: number): string {
  if (!ms) return "—";
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(new Date(ms));
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard");

  const [profile, bookings] = await Promise.all([getProfile(session.id), getBookings(session.id)]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter((b) => b.slot_date >= todayIso && b.status === "confirmed");
  const history = bookings.filter((b) => b.slot_date < todayIso || b.status !== "confirmed");

  const confirmedAll = bookings.filter((b) => b.status === "confirmed");
  const totalSessions = confirmedAll.length;
  const totalHours = Math.round((confirmedAll.reduce((s, b) => s + b.duration_min, 0) / 60) * 10) / 10;
  const thisMonthIso = todayIso.slice(0, 7);
  const thisMonth = confirmedAll.filter((b) => b.slot_date.slice(0, 7) === thisMonthIso).length;
  const streak = computeStreak(confirmedAll);
  const totalSpent = confirmedAll.reduce((s, b) => s + b.amount_paid, 0);
  const totalDue = confirmedAll.reduce((s, b) => s + (b.total_amount - b.amount_paid), 0);

  const countsByDate: Record<string, number> = {};
  for (const b of confirmedAll) countsByDate[b.slot_date] = (countsByDate[b.slot_date] ?? 0) + 1;

  const favBand = favouriteBand(bookings);
  const FavIcon = favBand.icon === "sun" ? Sun : favBand.icon === "sunset" ? Sunset : MoonStar;


  const nextUpcoming = upcoming[upcoming.length - 1]; // upcoming is desc, so last is the soonest

  const fullName = profile?.full_name ?? session.name;
  const email = profile?.email ?? session.email;
  const phone = profile?.phone ?? null;
  const memberSinceMs = profile?.created_at ?? 0;
  const initials = fullName
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <Nav />
      <main className="app-surface min-h-screen bg-white dark:bg-ink">
        {/* Bold portal hero with PortalHero */}
        <PortalHero
          eyebrow="Player dashboard"
          title={
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime font-display text-xl font-extrabold uppercase text-ink">
                {initials}
              </div>
              <div>
                <h1 className="heading-lg text-white">
                  Hi, <span className="mark-lime">{fullName.split(" ")[0]}</span>
                </h1>
                <p className="mt-1 text-sm text-white/65">{email} · Member since {memberSince(memberSinceMs)}</p>
              </div>
            </div>
          }
          right={
            <div className="flex flex-col items-start gap-3 md:items-end">
              <span className="tag-sport border-white/20 bg-white/10 text-white">
                <FavIcon className="h-3.5 w-3.5" /> {favBand.label}
              </span>
              <Link href="/book" className="btn-accent">
                Book another slot <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          }
        >
          {/* Inline quick-stat bar inside hero */}
          <div className="flex flex-wrap gap-4">
            {[
              { label: "Sessions", value: totalSessions },
              { label: "Hours played", value: totalHours },
              { label: "This month", value: thisMonth },
              { label: "Day streak", value: streak },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-center">
                <div className="font-display text-2xl font-extrabold text-white">
                  <StatCounter end={typeof s.value === "number" ? s.value : 0} />
                </div>
                <div className="text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-white/50">{s.label}</div>
              </div>
            ))}
          </div>
        </PortalHero>

        <Container className="py-8">
          {totalDue > 0 && (
            <ScrollReveal>
              <div className="mb-6 rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-900/10">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-amber-100 p-2 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                    <IndianRupee className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-extrabold text-amber-800 dark:text-amber-300">
                      Outstanding Balance due at Venue
                    </h3>
                    <p className="mt-1 text-sm text-amber-700/80 dark:text-amber-400/80">
                      You have an outstanding due amount of <strong>₹{totalDue.toLocaleString("en-IN")}</strong> for your sessions. Please pay this at the premises after your play.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* Game stats / achievements */}
          <ScrollReveal>
            <div className="mb-6">
              <GameStats
                bookings={confirmedAll.map((b) => ({ court_number: b.court_number, slot_time: b.slot_time, status: b.status }))}
                stats={{ totalSessions, totalSpent, currentStreak: streak, longestStreak: streak }}
              />
            </div>
          </ScrollReveal>

          {/* Next session card */}
          {nextUpcoming && (
            <ScrollReveal delay={0.05}>
              <div className="mb-6">
                <NextSessionCard
                  bookingId={nextUpcoming.id}
                  slotDate={nextUpcoming.slot_date}
                  slotTime={nextUpcoming.slot_time}
                  endTime={endTime(nextUpcoming.slot_time, nextUpcoming.duration_min)}
                  courtNumber={nextUpcoming.court_number}
                  total={nextUpcoming.total_amount}
                />
              </div>
            </ScrollReveal>
          )}

          {/* Weather */}
          <ScrollReveal delay={0.07}>
            <div className="mb-6">
              <WeatherWidget />
            </div>
          </ScrollReveal>

          {/* Stat tiles */}
          <ScrollReveal delay={0.09}>
            <StatTiles
              tiles={[
                { label: "Sessions", value: totalSessions, tint: "bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand-300" },
                { label: "Hours played", value: totalHours, tint: "bg-lime/20 text-lime-dark" },
                { label: "This month", value: thisMonth, tint: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" },
                { label: "Current streak", value: streak, suffix: "d", tint: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400" },
              ]}
              icons={[
                <ListChecks key="a" className="h-4 w-4" />,
                <Clock key="b" className="h-4 w-4" />,
                <CalendarDays key="c" className="h-4 w-4" />,
                <Flame key="d" className="h-4 w-4" />,
              ]}
            />
          </ScrollReveal>

          {/* Activity heatmap */}
          <ScrollReveal delay={0.1}>
            <section className="mt-6 overflow-hidden rounded-3xl border-2 border-ink/10 bg-white dark:border-white/10 dark:bg-[#111c38]">
              <div aria-hidden className="tape-stripe h-1 w-full" />
              <div className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-extrabold text-ink dark:text-white">
                    Activity — last 26 weeks
                  </h2>
                  <span className="text-xs font-semibold text-slatey dark:text-white/40">
                    Total spent:{" "}
                    <strong className="font-extrabold text-ink dark:text-white">
                      ₹{totalSpent.toLocaleString("en-IN")}
                    </strong>
                  </span>
                </div>
                <div className="mt-4">
                  <ActivityHeatmap countsByDate={countsByDate} />
                </div>
              </div>
            </section>
          </ScrollReveal>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {/* Bookings column */}
            <section className="lg:col-span-2">
              <ScrollReveal>
                <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-extrabold text-ink dark:text-white">
                  <CalendarDays className="h-5 w-5 text-brand dark:text-brand-300" /> Upcoming sessions
                </h2>
                {upcoming.length === 0 ? (
                  <div className="rounded-3xl border-2 border-dashed border-ink/10 bg-ink/[0.02] p-10 text-center dark:border-white/10 dark:bg-white/[0.02]">
                    <p className="text-sm text-slatey dark:text-white/40">No upcoming sessions — book your next slot.</p>
                    <Link
                      href="/book"
                      className="btn-primary mt-4"
                    >
                      Book a court <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
                    {upcoming.map((b) => {
                      const slotMs = new Date(`${b.slot_date}T${b.slot_time}:00+05:30`).getTime();
                      const canCancel = slotMs - Date.now() >= 4 * 60 * 60 * 1000;
                      return (
                        <div
                          key={b.id}
                          className="card-sport overflow-hidden bg-white dark:bg-[#111c38]"
                        >
                          <div aria-hidden className="tape-stripe h-0.5 w-full" />
                          <div className="p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <span
                                  className={`flex h-12 w-12 items-center justify-center rounded-2xl font-display text-base font-extrabold ${courtColor(b.court_number)}`}
                                >
                                  C{b.court_number}
                                </span>
                                <div>
                                  <div className="font-display text-base font-extrabold text-ink dark:text-white">
                                    {formatDate(b.slot_date)}
                                  </div>
                                  <div className="text-sm text-slatey dark:text-white/50">
                                    {format12h(b.slot_time)} – {format12h(endTime(b.slot_time, b.duration_min))}
                                  </div>
                                </div>
                              </div>
                              <span className={`rounded-full px-2.5 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.15em] ${statusBadge(b.status)}`}>
                                {b.status}
                              </span>
                            </div>
                            <div className="mt-3 text-xs space-y-1 text-slatey dark:text-white/50 border-t border-ink/5 pt-3 dark:border-white/5">
                              <div className="flex justify-between">
                                <span>Total court bill:</span>
                                <span className="font-bold text-ink dark:text-white">₹{b.total_amount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Paid online (Advance):</span>
                                <span className="font-bold text-lime-dark">₹{b.amount_paid}</span>
                              </div>
                              <div className="flex justify-between font-bold text-red-600 dark:text-red-400">
                                <span>Remaining due at venue:</span>
                                <span>₹{Math.max(0, b.total_amount - b.amount_paid)}</span>
                              </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between pt-2">
                              <CancelBookingButton
                                bookingId={b.id}
                                disabled={!canCancel}
                                disabledReason={!canCancel ? "Closes 4h before" : undefined}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollReveal>

              <ScrollReveal delay={0.05}>
                <h2 className="mb-4 mt-8 flex items-center gap-2 font-display text-xl font-extrabold text-ink dark:text-white">
                  <ListChecks className="h-5 w-5 text-brand dark:text-brand-300" /> Booking history
                </h2>
                {history.length === 0 ? (
                  <p className="rounded-3xl border-2 border-dashed border-ink/10 bg-ink/[0.02] p-10 text-center text-sm text-slatey dark:border-white/10 dark:bg-white/[0.02] dark:text-white/40">
                    No previous bookings yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-3xl border-2 border-ink/10 bg-white dark:border-white/10 dark:bg-[#111c38]">
                    <table className="w-full min-w-[560px] border-collapse text-sm">
                      <thead className="border-b-2 border-ink/10 dark:border-white/10">
                        <tr>
                          <th className="p-3.5 text-left text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-slatey dark:text-white/40">Date</th>
                          <th className="p-3.5 text-left text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-slatey dark:text-white/40">Time</th>
                          <th className="p-3.5 text-left text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-slatey dark:text-white/40">Court</th>
                          <th className="p-3.5 text-left text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-slatey dark:text-white/40">Amount</th>
                          <th className="p-3.5 text-left text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-slatey dark:text-white/40">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.slice(0, 30).map((b) => (
                          <tr key={b.id} className="border-t border-ink/5 transition hover:bg-ink/[0.015] dark:border-white/5 dark:hover:bg-white/[0.02]">
                            <td className="p-3.5 font-semibold text-ink dark:text-white">{formatDate(b.slot_date)}</td>
                            <td className="p-3.5 text-slatey dark:text-white/50">{format12h(b.slot_time)}</td>
                            <td className="p-3.5 text-slatey dark:text-white/50">Court {b.court_number}</td>
                            <td className="p-3.5 text-ink dark:text-white">
                              <div className="font-extrabold">₹{b.total_amount.toLocaleString("en-IN")}</div>
                              <div className="text-[10px] text-slatey dark:text-white/40">
                                Paid: ₹{b.amount_paid} · Due: ₹{Math.max(0, b.total_amount - b.amount_paid)}
                              </div>
                            </td>
                            <td className="p-3.5">
                              <span className={`inline-block rounded-full px-2.5 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.15em] ${statusBadge(b.status)}`}>
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ScrollReveal>
            </section>

            {/* Profile sidebar */}
            <aside>
              <ScrollReveal direction="right">
                <ProfileForm initialName={fullName} initialPhone={phone} email={email} />
              </ScrollReveal>
            </aside>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
