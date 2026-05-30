import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, Clock, IndianRupee, ListChecks } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { Container, Eyebrow } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { WeatherWidget } from "@/components/weather-widget";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  court_number: number;
  slot_date: string;
  slot_time: string;
  total_amount: number;
  status: string;
  created_at: string;
};

async function getBookings(userId: string): Promise<Row[]> {
  try {
    const result = await turso.execute({
      sql: `SELECT id, slot_date, slot_time, amount_paid as total_amount, status, created_at,
                   COALESCE((
                     SELECT COUNT(*) FROM bookings b2 
                     WHERE b2.slot_date = b.slot_date 
                       AND b2.slot_time = b.slot_time 
                       AND b2.status = 'confirmed' 
                       AND b2.created_at <= b.created_at
                   ), 1) as court_number
            FROM bookings b WHERE user_id = ?
            ORDER BY slot_date DESC, slot_time DESC LIMIT 60`,
      args: [userId],
    });
    return result.rows.map((r) => ({
      id: String(r.id),
      court_number: Number(r.court_number) || 1,
      slot_date: String(r.slot_date),
      slot_time: String(r.slot_time).slice(0, 5),
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
    return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(
      new Date(`${d}T00:00:00`),
    );
  } catch {
    return d;
  }
}

function courtColor(c: number) {
  return ["bg-brand text-white", "bg-lime text-gray-900", "bg-purple-600 text-white"][c - 1] ?? "bg-brand text-white";
}

function statusBadge(s: string) {
  if (s === "confirmed") return "bg-lime/20 text-lime-dark border border-lime/40";
  if (s === "cancelled") return "bg-red-100 text-red-700 border border-red-200";
  return "bg-gray-100 text-gray-700 border border-gray-200";
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard");

  const bookings = await getBookings(session.id);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter((b) => b.slot_date >= today && b.status === "confirmed");
  const totalSpent = bookings
    .filter((b) => b.status === "confirmed")
    .reduce((sum, b) => sum + b.total_amount, 0);

  const stats = [
    { icon: ListChecks, label: "Total bookings", value: bookings.length.toString() },
    { icon: Clock, label: "Upcoming sessions", value: upcoming.length.toString() },
    { icon: IndianRupee, label: "Total spent", value: `₹${totalSpent.toLocaleString("en-IN")}` },
  ];

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
                  {session.name.charAt(0)}
                </div>
                <div>
                  <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Hi, {session.name.split(" ")[0]}</h1>
                  <p className="text-sm text-white/80">{session.email}</p>
                </div>
              </div>
            </div>
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-lime px-5 py-3 text-sm font-bold text-gray-900 shadow-soft transition hover:bg-lime-dark"
            >
              Book another slot <ArrowRight className="h-4 w-4" />
            </Link>
          </Container>
        </section>

        <Container className="py-8">
          {/* Live Weather Widget for Kaikhali, Kolkata */}
          <div className="mb-8">
            <WeatherWidget />
          </div>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-3xl border border-brand/10 bg-white p-6 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-slatey">{label}</span>
                  <Icon className="h-5 w-5 text-brand" />
                </div>
                <div className="mt-3 font-display text-3xl font-extrabold text-ink">{value}</div>
              </div>
            ))}
          </section>

          <section className="mt-8">
            <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-extrabold text-ink">
              <CalendarDays className="h-5 w-5 text-brand" /> Your bookings
            </h2>
            {bookings.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-brand/20 bg-brand/[0.03] p-10 text-center">
                <p className="text-sm text-slatey">No bookings yet — book your first court below.</p>
                <Link
                  href="/book"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand-600"
                >
                  Book a court <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
                {bookings.map((b) => (
                  <div key={b.id} className="rounded-2xl border border-brand/10 bg-white p-5 shadow-soft">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl font-display text-base font-extrabold ${courtColor(b.court_number)}`}>
                          C{b.court_number}
                        </span>
                        <div>
                          <div className="font-display text-base font-extrabold text-ink">{formatDate(b.slot_date)}</div>
                          <div className="text-sm text-slatey">{b.slot_time} · 60 min</div>
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusBadge(b.status)}`}>
                        {b.status}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-brand/10 pt-3 text-sm">
                      <span className="text-slatey">Amount</span>
                      <span className="font-display text-base font-extrabold text-brand">₹{b.total_amount.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </Container>
      </main>
      <Footer />
    </>
  );
}
