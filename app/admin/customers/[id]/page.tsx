import { redirect, notFound } from "next/navigation";
import { CalendarDays, Clock, IndianRupee, ListChecks, Mail, Phone, User, UserCircle } from "lucide-react";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { EditCustomer } from "./edit-customer";
import { AdminSubHeader } from "@/components/admin/admin-sub-header";

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

type Stats = { sessions: number; hours: number; spent: number; due: number };

async function loadCustomer(id: string): Promise<{ customer: Customer; bookings: Booking[]; stats: Stats } | null> {
  // 1. Fetch the user from Turso, then Supabase. A genuine "not found in EITHER
  //    backend" is the ONLY reason to 404 — fixes the profile-404 for users
  //    that only exist in the Supabase mirror.
  let u: Record<string, unknown> | undefined;
  try {
    const userRes = await turso.execute({
      sql: "SELECT id, full_name, email, phone, created_at FROM users WHERE id = ? LIMIT 1",
      args: [id],
    });
    u = userRes.rows[0] as unknown as Record<string, unknown> | undefined;
  } catch (err) {
    console.error("[admin customer turso lookup error]", err);
  }
  if (!u) {
    try {
      const { supabase, hasSupabase } = require("@/lib/supabase");
      if (hasSupabase) {
        const { data } = await supabase
          .from("users")
          .select("id, full_name, email, phone, created_at")
          .eq("id", id)
          .maybeSingle();
        if (data) u = data as Record<string, unknown>;
      }
    } catch (sbErr) {
      console.error("[admin customer supabase lookup error]", sbErr);
    }
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
  let stats: Stats = { sessions: 0, hours: 0, spent: 0, due: 0 };

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
              COALESCE(SUM(CASE WHEN status='confirmed' THEN amount_paid ELSE 0 END), 0) as spent,
              COALESCE(SUM(CASE WHEN status='confirmed' THEN (total - amount_paid) ELSE 0 END), 0) as due
            FROM bookings WHERE user_id = ?`,
      args: [id],
    });
    const s = statsRes.rows[0];
    stats = {
      sessions: Number(s?.sessions ?? 0),
      hours: Math.round((Number(s?.minutes ?? 0) / 60) * 10) / 10,
      spent: Number(s?.spent ?? 0),
      due: Number(s?.due ?? 0),
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
    <main className="app-surface min-h-screen bg-brand-50/30 px-4 py-8 dark:bg-ink sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">

        <AdminSubHeader
          title={customer.full_name}
          subtitle="Customer profile, lifetime stats, and booking history."
          icon={<UserCircle className="h-5 w-5 text-lime" />}
        />

        {/* Account actions */}
        <EditCustomer id={customer.id} initial={{ full_name: customer.full_name, email: customer.email, phone: customer.phone }} />

        {/* Contact + Stats row */}
        <section className="grid gap-4 md:grid-cols-2">
          {/* Contact card */}
          <div className="card-sport p-6">
            <span className="eyebrow">Contact</span>
            <h2 className="mt-1 mb-4 font-display text-base font-extrabold tracking-tight text-ink dark:text-white">
              Profile details
            </h2>
            <dl className="grid gap-3 text-sm">
              <div className="flex items-center gap-2 border-b border-ink/5 pb-3 dark:border-white/5">
                <User className="h-4 w-4 text-brand" aria-hidden />
                <span className="text-ink/50 dark:text-white/50">Joined</span>
                <span className="ml-auto font-bold text-ink dark:text-white">
                  {new Date(customer.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric", day: "numeric" })}
                </span>
              </div>
              <div className="flex items-center gap-2 border-b border-ink/5 pb-3 dark:border-white/5">
                <Mail className="h-4 w-4 text-brand" aria-hidden />
                <span className="text-ink/50 dark:text-white/50">Email</span>
                <span className="ml-auto font-bold text-ink dark:text-white break-all">{customer.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-brand" aria-hidden />
                <span className="text-ink/50 dark:text-white/50">Phone</span>
                <span className="ml-auto font-bold text-ink dark:text-white">{customer.phone ?? "—"}</span>
              </div>
            </dl>
          </div>

          {/* Stats card */}
          <div className="card-sport p-6">
            <span className="eyebrow">Activity</span>
            <h2 className="mt-1 mb-4 font-display text-base font-extrabold tracking-tight text-ink dark:text-white">
              Performance stats
            </h2>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-2xl border-2 border-ink/10 p-3 dark:border-white/10">
                <ListChecks className="mx-auto h-4 w-4 text-brand" aria-hidden />
                <div className="mt-2 font-display text-lg font-extrabold tracking-tight text-ink dark:text-white sm:text-2xl">
                  {stats.sessions}
                </div>
                <div className="mt-1 text-[8px] font-extrabold uppercase tracking-[0.12em] text-ink/40 dark:text-white/40 sm:text-[10px] sm:tracking-[0.15em]">
                  Sessions
                </div>
              </div>
              <div className="rounded-2xl border-2 border-ink/10 p-3 dark:border-white/10">
                <Clock className="mx-auto h-4 w-4 text-brand" aria-hidden />
                <div className="mt-2 font-display text-lg font-extrabold tracking-tight text-ink dark:text-white sm:text-2xl">
                  {stats.hours}
                </div>
                <div className="mt-1 text-[8px] font-extrabold uppercase tracking-[0.12em] text-ink/40 dark:text-white/40 sm:text-[10px] sm:tracking-[0.15em]">
                  Hours
                </div>
              </div>
              <div className="rounded-2xl border-2 border-ink/10 p-3 dark:border-white/10">
                <IndianRupee className="mx-auto h-4 w-4 text-brand" aria-hidden />
                <div className="mt-2 font-display text-lg font-extrabold tracking-tight text-ink dark:text-white sm:text-2xl">
                  {stats.spent.toLocaleString("en-IN")}
                </div>
                <div className="mt-1 text-[8px] font-extrabold uppercase tracking-[0.12em] text-ink/40 dark:text-white/40 sm:text-[10px] sm:tracking-[0.15em]">
                  Spent
                </div>
              </div>
              <div className={`rounded-2xl border-2 p-3 ${stats.due > 0 ? "border-red-500/30 bg-red-50/10 dark:border-red-500/20" : "border-ink/10 dark:border-white/10"}`}>
                <IndianRupee className={`mx-auto h-4 w-4 ${stats.due > 0 ? "text-red-500" : "text-ink/40 dark:text-white/40"}`} aria-hidden />
                <div className={`mt-2 font-display text-lg font-extrabold tracking-tight sm:text-2xl ${stats.due > 0 ? "text-red-500" : "text-ink/60 dark:text-white/60"}`}>
                  {stats.due.toLocaleString("en-IN")}
                </div>
                <div className={`mt-1 text-[8px] font-extrabold uppercase tracking-[0.12em] sm:text-[10px] sm:tracking-[0.15em] ${stats.due > 0 ? "text-red-500/80" : "text-ink/40 dark:text-white/40"}`}>
                  Due
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bookings table */}
        <section className="card-sport p-0 overflow-hidden">
          <div className="flex items-center gap-3 border-b-2 border-ink/10 px-6 py-4 dark:border-white/10">
            <CalendarDays className="h-5 w-5 text-brand" aria-hidden />
            <div>
              <span className="eyebrow">History</span>
              <h2 className="mt-0.5 font-display text-base font-extrabold tracking-tight text-ink dark:text-white">
                All bookings
              </h2>
            </div>
          </div>

          <div className="p-6">
            {bookings.length === 0 ? (
              <p className="rounded-2xl border-2 border-dashed border-ink/10 p-6 text-center text-sm text-ink/40 dark:border-white/10 dark:text-white/40">
                No bookings on record.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-ink/10 dark:border-white/10">
                      <th className="p-3 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Date</th>
                      <th className="p-3 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Time</th>
                      <th className="p-3 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Court</th>
                      <th className="p-3 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Duration</th>
                      <th className="p-3 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Amount</th>
                      <th className="p-3 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-b border-ink/5 transition-colors hover:bg-brand/[0.03] dark:border-white/5 dark:hover:bg-white/[0.03]">
                        <td className="p-3 font-semibold text-ink dark:text-white">{formatDate(b.slot_date)}</td>
                        <td className="p-3 text-ink/60 dark:text-white/60">{formatTime(b.slot_time)}</td>
                        <td className="p-3 text-ink/60 dark:text-white/60">Court {b.court_number}</td>
                        <td className="p-3 text-ink/60 dark:text-white/60">{b.duration_min} min</td>
                        <td className="p-3 font-extrabold text-brand">₹{b.total.toLocaleString("en-IN")}</td>
                        <td className="p-3">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${statusBadge(b.status)}`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}
