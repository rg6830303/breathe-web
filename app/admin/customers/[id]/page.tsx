import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, IndianRupee, ListChecks, Mail, Phone, User } from "lucide-react";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";

export const dynamic = "force-dynamic";

type Booking = {
  id: string;
  slot_date: string;
  slot_time: string;
  court_number: number;
  duration_min: number;
  total: number;
  status: string;
};

type Customer = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: number;
};

type Stats = { sessions: number; hours: number; spent: number };

async function loadCustomer(id: string): Promise<{ customer: Customer; bookings: Booking[]; stats: Stats } | null> {
  // 1. Fetch the user first. A genuine "not found" is the ONLY reason to 404.
  let u;
  try {
    const userRes = await turso.execute({
      sql: "SELECT id, full_name, email, phone, created_at FROM users WHERE id = ? LIMIT 1",
      args: [id],
    });
    u = userRes.rows[0];
  } catch (err) {
    console.error("[admin customer user lookup error]", err);
    return null;
  }
  if (!u) return null;

  const customer: Customer = {
    id: String(u.id),
    full_name: String(u.full_name),
    email: String(u.email),
    phone: u.phone ? String(u.phone) : null,
    created_at: Number(u.created_at),
  };

  // 2. Bookings + stats are best-effort — a query hiccup must NOT turn a real
  //    customer into a 404. Degrade to an empty list instead.
  let bookings: Booking[] = [];
  let stats: Stats = { sessions: 0, hours: 0, spent: 0 };

  try {
    const bookingsRes = await turso.execute({
      sql: `SELECT id, slot_date, slot_time, court_number, duration_min,
                   total, amount_paid, status
            FROM bookings WHERE user_id = ?
            ORDER BY slot_date DESC, slot_time DESC LIMIT 500`,
      args: [id],
    });
    bookings = bookingsRes.rows.map((row) => ({
      id: String(row.id),
      slot_date: String(row.slot_date),
      slot_time: String(row.slot_time).slice(0, 5),
      court_number: Number(row.court_number) || 1,
      duration_min: Number(row.duration_min) || 60,
      total: Number(row.total) || Number(row.amount_paid) || 0,
      status: String(row.status),
    }));
  } catch (err) {
    console.error("[admin customer bookings error]", err);
  }

  try {
    const statsRes = await turso.execute({
      sql: `SELECT
              COUNT(CASE WHEN status='confirmed' THEN 1 END) as sessions,
              COALESCE(SUM(CASE WHEN status='confirmed' THEN duration_min ELSE 0 END), 0) as minutes,
              COALESCE(SUM(CASE WHEN status='confirmed' THEN amount_paid ELSE 0 END), 0) as spent
            FROM bookings WHERE user_id = ?`,
      args: [id],
    });
    const s = statsRes.rows[0];
    stats = {
      sessions: Number(s?.sessions ?? 0),
      hours: Math.round((Number(s?.minutes ?? 0) / 60) * 10) / 10,
      spent: Number(s?.spent ?? 0),
    };
  } catch (err) {
    console.error("[admin customer stats error]", err);
  }

  return { customer, bookings, stats };
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

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function statusBadge(s: string) {
  if (s === "confirmed") return "bg-lime/20 text-lime-dark border border-lime/40";
  if (s === "cancelled") return "bg-red-100 text-red-700 border border-red-200";
  return "bg-gray-100 text-gray-700 border border-gray-200";
}

export default async function AdminCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const { id } = await params;
  const data = await loadCustomer(id);
  if (!data) notFound();

  const { customer, bookings, stats } = data;

  return (
    <main className="min-h-screen bg-brand-50/30 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/admin"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand/15 bg-white text-ink hover:bg-brand/5"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand">Customer</p>
            <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{customer.full_name}</h1>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-brand/10 bg-white p-6 shadow-soft">
            <h2 className="font-display text-base font-extrabold text-ink">Contact</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-brand" />
                <span className="text-slatey">Joined</span>
                <span className="ml-auto font-semibold text-ink">
                  {new Date(customer.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric", day: "numeric" })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-brand" />
                <span className="ml-auto font-semibold text-ink">{customer.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-brand" />
                <span className="ml-auto font-semibold text-ink">{customer.phone ?? "—"}</span>
              </div>
            </dl>
          </div>

          <div className="rounded-3xl border border-brand/10 bg-white p-6 shadow-soft">
            <h2 className="font-display text-base font-extrabold text-ink">Stats</h2>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <ListChecks className="mx-auto h-4 w-4 text-brand" />
                <div className="mt-2 font-display text-xl font-extrabold text-ink">{stats.sessions}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slatey">Sessions</div>
              </div>
              <div>
                <Clock className="mx-auto h-4 w-4 text-brand" />
                <div className="mt-2 font-display text-xl font-extrabold text-ink">{stats.hours}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slatey">Hours</div>
              </div>
              <div>
                <IndianRupee className="mx-auto h-4 w-4 text-brand" />
                <div className="mt-2 font-display text-xl font-extrabold text-ink">
                  {stats.spent.toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slatey">Spent</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-brand/10 bg-white p-6 shadow-soft">
          <h2 className="font-display text-lg font-extrabold text-ink">
            <CalendarDays className="mr-2 inline h-5 w-5 text-brand" />
            All bookings
          </h2>
          {bookings.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-brand/20 bg-brand/[0.03] p-6 text-center text-sm text-slatey">
              No bookings.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead className="bg-brand/5 text-left text-xs uppercase tracking-wide text-slatey">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Time</th>
                    <th className="p-3">Court</th>
                    <th className="p-3">Duration</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-t border-brand/10">
                      <td className="p-3 text-ink">{formatDate(b.slot_date)}</td>
                      <td className="p-3 text-slatey">{formatTime(b.slot_time)}</td>
                      <td className="p-3 text-slatey">Court {b.court_number}</td>
                      <td className="p-3 text-slatey">{b.duration_min} min</td>
                      <td className="p-3 font-semibold text-ink">₹{b.total.toLocaleString("en-IN")}</td>
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
      </div>
    </main>
  );
}
