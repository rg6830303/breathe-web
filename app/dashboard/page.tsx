import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, Clock, Flame, IndianRupee, ListChecks, MoonStar, Sun, Sunset } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { Container, Eyebrow } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { WeatherWidget } from "@/components/weather-widget";
import { ActivityHeatmap } from "./activity-heatmap";
import { ProfileForm } from "./profile-form";
import { CancelBookingButton } from "./cancel-button";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  court_number: number;
  slot_date: string;
  slot_time: string;
  duration_min: number;
  total_amount: number;
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
                   amount_paid as total_amount, status, created_at
            FROM bookings
            WHERE user_id = ?
            ORDER BY slot_date DESC, slot_time DESC
            LIMIT 500`,
      args: [userId],
    });
    return result.rows.map((r) => ({
      id: String(r.id),
      court_number: Number(r.court_number) || 1,
      slot_date: String(r.slot_date),
      slot_time: String(r.slot_time).slice(0, 5),
      duration_min: Number(r.duration_min) || 60,
      total_amount: Number(r.total_amount),
      status: String(r.status),
      created_at: String(r.created_at),
    }));
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
  if (s === "confirmed") return "bg-lime/20 text-lime-dark border border-lime/40";
  if (s === "cancelled") return "bg-red-100 text-red-700 border border-red-200";
  return "bg-gray-100 text-gray-700 border border-gray-200";
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
  const totalSpent = confirmedAll.reduce((s, b) => s + b.total_amount, 0);

  const countsByDate: Record<string, number> = {};
  for (const b of confirmedAll) countsByDate[b.slot_date] = (countsByDate[b.slot_date] ?? 0) + 1;

  const favBand = favouriteBand(bookings);
  const FavIcon = favBand.icon === "sun" ? Sun : favBand.icon === "sunset" ? Sunset : MoonStar;

  const stats = [
    { icon: ListChecks, label: "Sessions", value: String(totalSessions) },
    { icon: Clock, label: "Hours played", value: String(totalHours) },
    { icon: CalendarDays, label: "This month", value: String(thisMonth) },
    { icon: Flame, label: "Current streak", value: `${streak}d` },
  ];

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
      <main className="min-h-screen bg-brand-50/20">
        <section className="brand-gradient brand-mesh relative overflow-hidden text-white">
          <Container className="relative flex flex-col gap-4 py-12 sm:py-14 md:flex-row md:items-center md:justify-between">
            <div>
              <Eyebrow light>Player dashboard</Eyebrow>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 font-display text-xl font-extrabold uppercase">
                  {initials}
                </div>
                <div>
                  <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Hi, {fullName.split(" ")[0]}</h1>
                  <p className="text-sm text-white/80">
                    {email} · Member since {memberSince(memberSinceMs)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
                <FavIcon className="h-3.5 w-3.5" /> {favBand.label}
              </span>
              <Link
                href="/book"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-lime px-5 py-3 text-sm font-bold text-gray-900 shadow-soft transition hover:bg-lime-dark"
              >
                Book another slot <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Container>
        </section>

        <Container className="py-8">
          <div className="mb-6">
            <WeatherWidget />
          </div>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-3xl border border-brand/10 bg-white p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slatey">{label}</span>
                  <Icon className="h-4 w-4 text-brand" />
                </div>
                <div className="mt-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">{value}</div>
              </div>
            ))}
          </section>

          <section className="mt-6 rounded-3xl border border-brand/10 bg-white p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-extrabold text-ink">Activity over the last 26 weeks</h2>
              <span className="text-xs text-slatey">
                Total spent so far: <strong className="text-ink">₹{totalSpent.toLocaleString("en-IN")}</strong>
              </span>
            </div>
            <div className="mt-4">
              <ActivityHeatmap countsByDate={countsByDate} />
            </div>
          </section>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <section className="lg:col-span-2">
              <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-extrabold text-ink">
                <CalendarDays className="h-5 w-5 text-brand" /> Upcoming sessions
              </h2>
              {upcoming.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-brand/20 bg-brand/[0.03] p-10 text-center">
                  <p className="text-sm text-slatey">No upcoming sessions — book your next slot.</p>
                  <Link
                    href="/book"
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand-600"
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
                      <div key={b.id} className="rounded-2xl border border-brand/10 bg-white p-5 shadow-soft">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl font-display text-base font-extrabold ${courtColor(b.court_number)}`}>
                              C{b.court_number}
                            </span>
                            <div>
                              <div className="font-display text-base font-extrabold text-ink">{formatDate(b.slot_date)}</div>
                              <div className="text-sm text-slatey">
                                {format12h(b.slot_time)} – {format12h(endTime(b.slot_time, b.duration_min))}
                              </div>
                            </div>
                          </div>
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusBadge(b.status)}`}>
                            {b.status}
                          </span>
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-brand/10 pt-3 text-sm">
                          <span className="font-display text-base font-extrabold text-brand">
                            ₹{b.total_amount.toLocaleString("en-IN")}
                          </span>
                          <CancelBookingButton
                            bookingId={b.id}
                            disabled={!canCancel}
                            disabledReason={!canCancel ? "Closes 4h before" : undefined}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <h2 className="mb-4 mt-8 flex items-center gap-2 font-display text-xl font-extrabold text-ink">
                <ListChecks className="h-5 w-5 text-brand" /> Booking history
              </h2>
              {history.length === 0 ? (
                <p className="rounded-3xl border border-dashed border-brand/20 bg-brand/[0.03] p-10 text-center text-sm text-slatey">
                  No previous bookings yet.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-brand/10 bg-white shadow-soft">
                  <table className="w-full min-w-[560px] border-collapse text-sm">
                    <thead className="bg-brand/5 text-left text-xs uppercase tracking-wide text-slatey">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Time</th>
                        <th className="p-3">Court</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 30).map((b) => (
                        <tr key={b.id} className="border-t border-brand/10">
                          <td className="p-3 text-ink">{formatDate(b.slot_date)}</td>
                          <td className="p-3 text-slatey">{format12h(b.slot_time)}</td>
                          <td className="p-3 text-slatey">Court {b.court_number}</td>
                          <td className="p-3 font-semibold text-ink">
                            <IndianRupee className="mr-0.5 inline h-3 w-3" />
                            {b.total_amount.toLocaleString("en-IN")}
                          </td>
                          <td className="p-3">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusBadge(b.status)}`}>
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <aside>
              <ProfileForm initialName={fullName} initialPhone={phone} email={email} />
            </aside>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
