"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { WalkInModal } from "@/components/admin/walk-in-modal";
import { BulkBlockModal } from "@/components/admin/bulk-block-modal";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Grid3x3,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldOff,
  UserPlus,
  Users,
  X,
} from "lucide-react";

type Tab = "overview" | "bookings" | "courts" | "users";
type Stats = {
  total_users: number;
  total_bookings: number;
  confirmed_bookings: number;
  total_revenue: number;
  today_bookings: number;
  this_week_revenue: number;
  weekly: { date: string; bookings: number; revenue: number }[];
};
type Booking = {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  court_number: number;
  slot_date: string;
  slot_time: string;
  price: number;
  total_amount: number;
  status: string;
  created_at: string;
};
type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  booking_count: number;
  total_spent: number;
};
type SlotResp = {
  date: string;
  slots: { court: number; time: string; status: "open" | "booked" | "blocked"; price: number }[];
};

function money(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function todayIST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "bookings", label: "All bookings", icon: Calendar },
  { key: "courts", label: "Court management", icon: Grid3x3 },
  { key: "users", label: "Users", icon: Users },
];

export function AdminConsole() {

  const [tab, setTab] = useState<Tab>("overview");
  const [loggingOut, setLoggingOut] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [bulkBlockOpen, setBulkBlockOpen] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/admin/auth/logout", { method: "POST" });
    // Hard redirect ensures the cleared admin session cookie is visible to
    // the server-side middleware immediately, bypassing Next.js App Router cache.
    window.location.href = "/admin/login";
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/10 bg-white p-2 shadow-soft">
        <div className="flex flex-wrap gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition ${
                tab === key ? "bg-brand text-white shadow-soft" : "text-ink/70 hover:bg-brand/5"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setWalkInOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-3 py-2 text-sm font-bold text-white shadow-glow transition hover:bg-brand-600"
          >
            <UserPlus className="h-4 w-4" /> Walk-in
          </button>
          <button
            type="button"
            onClick={() => setBulkBlockOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-brand/15 px-3 py-2 text-sm font-bold text-ink/80 transition hover:bg-brand/5"
          >
            <ShieldOff className="h-4 w-4" /> Close slots
          </button>
          <Link
            href="/admin/gallery"
            className="inline-flex items-center gap-2 rounded-xl border border-brand/15 px-3 py-2 text-sm font-bold text-brand transition hover:bg-brand/5"
          >
            Gallery
          </Link>
          <Link
            href="/admin/import"
            className="inline-flex items-center gap-2 rounded-xl border border-brand/15 px-3 py-2 text-sm font-bold text-brand transition hover:bg-brand/5"
          >
            Import
          </Link>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="inline-flex items-center gap-2 rounded-xl border border-brand/15 px-3 py-2 text-sm font-bold text-ink/70 transition hover:bg-brand/5 disabled:opacity-60"
          >
            {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Log out
          </button>
        </div>
      </div>

      {tab === "overview" && <AnalyticsDashboard />}
      {tab === "bookings" && <BookingsTab />}
      {tab === "courts" && <CourtTab />}
      {tab === "users" && <UsersTab />}

      <WalkInModal open={walkInOpen} onClose={() => setWalkInOpen(false)} />
      <BulkBlockModal open={bulkBlockOpen} onClose={() => setBulkBlockOpen(false)} />
    </div>
  );
}

function OverviewTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) return <LoadingCard />;

  const cards = [
    { label: "Total users", value: stats.total_users.toString() },
    { label: "Total bookings", value: stats.total_bookings.toString() },
    { label: "Revenue this week", value: money(stats.this_week_revenue) },
    { label: "Today's bookings", value: stats.today_bookings.toString() },
  ];

  return (
    <div className="grid gap-4">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-brand/10 bg-white p-4 shadow-soft">
            <p className="text-xs font-bold uppercase tracking-wide text-slatey">{c.label}</p>
            <div className="mt-2 font-display text-2xl font-extrabold text-brand">{c.value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-brand/10 bg-white p-5 shadow-soft">
        <h3 className="mb-3 font-display text-base font-extrabold text-ink">Bookings this week</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.weekly}>
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} stroke="#888780" fontSize={11} />
              <YAxis allowDecimals={false} stroke="#888780" fontSize={11} />
              <Tooltip cursor={{ fill: "rgba(47,91,255,0.06)" }} />
              <Bar dataKey="bookings" fill="#2F5BFF" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-slatey">
          Total revenue (confirmed): <strong className="text-ink">{money(stats.total_revenue)}</strong>
        </p>
      </section>
    </div>
  );
}

function BookingsTab() {
  const [date, setDate] = useState<string>("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    const url = date ? `/api/admin/bookings?date=${date}` : "/api/admin/bookings";
    fetch(url)
      .then((r) => r.json())
      .then((data) => setBookings(data.bookings ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(reload, [date]);

  async function cancel(id: string) {
    if (!confirm("Cancel this booking? The slot will reopen.")) return;
    setBusy(id);
    await fetch("/api/admin/slots/unblock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: id }),
    });
    setBusy(null);
    reload();
  }

  return (
    <div className="rounded-2xl border border-brand/10 bg-white p-5 shadow-soft">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-extrabold text-ink">All bookings</h3>
          <p className="text-xs text-slatey">Most recent first. Filter by slot date.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-brand/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
          {date && (
            <button
              type="button"
              onClick={() => setDate("")}
              className="inline-flex items-center gap-1 rounded-xl border border-brand/15 px-2.5 py-2 text-xs font-bold text-ink/70 hover:bg-brand/5"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-1 rounded-xl border border-brand/15 px-2.5 py-2 text-xs font-bold text-ink/70 hover:bg-brand/5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingCard />
      ) : bookings.length === 0 ? (
        <p className="rounded-xl border border-dashed border-brand/20 bg-brand/[0.03] p-6 text-center text-sm text-slatey">
          No bookings.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead className="bg-brand/5 text-left text-xs uppercase tracking-wide text-slatey">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Court</th>
                <th className="p-3">Date</th>
                <th className="p-3">Time</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-t border-brand/10">
                  <td className="p-3">
                    <div className="font-bold text-ink">{b.user_name}</div>
                    <div className="text-xs text-slatey">{b.user_email}</div>
                  </td>
                  <td className="p-3 text-ink">Court {b.court_number}</td>
                  <td className="p-3 text-ink">{b.slot_date}</td>
                  <td className="p-3 text-ink">{b.slot_time}</td>
                  <td className="p-3 font-semibold text-ink">{money(b.total_amount)}</td>
                  <td className="p-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        b.status === "confirmed"
                          ? "bg-lime/20 text-lime-dark"
                          : b.status === "cancelled"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slatey">{new Date(b.created_at + "Z").toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right">
                    {b.status === "confirmed" && (
                      <button
                        type="button"
                        onClick={() => cancel(b.id)}
                        disabled={busy === b.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        {busy === b.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />} Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CourtTab() {
  const [date, setDate] = useState(todayIST());
  const [data, setData] = useState<SlotResp | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      fetch(`/api/slots?date=${date}`).then((r) => r.json()),
      fetch(`/api/admin/bookings?date=${date}`).then((r) => r.json()),
    ])
      .then(([slots, bks]) => {
        setData(slots);
        setBookings(bks.bookings ?? []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [date]);

  const byCourt = useMemo(() => {
    if (!data) return {} as Record<number, SlotResp["slots"]>;
    const map: Record<number, SlotResp["slots"]> = { 1: [], 2: [], 3: [] };
    for (const s of data.slots) (map[s.court] ?? (map[s.court] = [])).push(s);
    return map;
  }, [data]);

  function bookingForSlot(court: number, time: string) {
    return bookings.find(
      (b) => b.court_number === court && b.slot_time === time && b.status === "confirmed",
    );
  }

  async function block(court: number, time: string) {
    const key = `${court}@${time}`;
    setBusy(key);
    await fetch("/api/admin/slots/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ court_number: court, slot_date: date, slot_time: time }),
    });
    setBusy(null);
    load();
  }

  async function unblock(court: number, time: string) {
    const key = `${court}@${time}`;
    setBusy(key);
    await fetch("/api/admin/slots/unblock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ court_number: court, slot_date: date, slot_time: time }),
    });
    setBusy(null);
    load();
  }

  return (
    <div className="rounded-2xl border border-brand/10 bg-white p-5 shadow-soft">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-extrabold text-ink">Court management</h3>
          <p className="text-xs text-slatey">Block off slots manually for maintenance or events.</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-brand/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
        />
      </div>

      {loading || !data ? (
        <LoadingCard />
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((court) => (
            <div key={court} className="rounded-2xl border border-brand/10 bg-brand/[0.03] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-display text-sm font-extrabold text-ink">Court {court}</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-slatey">
                  {byCourt[court]?.filter((s) => s.status === "booked").length ?? 0} booked
                </span>
              </div>
              <ul className="grid max-h-[420px] grid-cols-2 gap-1.5 overflow-y-auto pr-1">
                {(byCourt[court] ?? []).map((s) => {
                  const key = `${court}@${s.time}`;
                  const booking = s.status === "booked" ? bookingForSlot(court, s.time) : null;
                  const isBusy = busy === key;
                  let cls = "border-brand/15 bg-white text-ink hover:border-brand";
                  if (s.status === "booked") cls = "border-red-200 bg-red-50 text-red-700";
                  if (s.status === "blocked") cls = "border-gray-300 bg-gray-100 text-gray-600";
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        disabled={s.status === "booked" || isBusy}
                        onClick={() => (s.status === "blocked" ? unblock(court, s.time) : block(court, s.time))}
                        title={booking ? `${booking.user_name} (${booking.user_email})` : s.status}
                        className={`flex w-full items-center justify-between rounded-lg border px-2 py-1.5 text-[11px] font-bold transition ${cls} ${
                          isBusy ? "opacity-50" : ""
                        }`}
                      >
                        <span>{s.time}</span>
                        <span className="text-[9px] uppercase">
                          {s.status === "booked" ? "Booked" : s.status === "blocked" ? "Blocked" : "Open"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-[10px] text-slatey">
                <ShieldOff className="mr-1 inline h-3 w-3" />
                Click open → block · click blocked → unblock
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [userBookings, setUserBookings] = useState<Record<string, Booking[]>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => setUsers(data.users ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function toggle(id: string) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!userBookings[id]) {
      const data = await fetch(`/api/admin/bookings?user_id=${id}`).then((r) => r.json());
      setUserBookings((m) => ({ ...m, [id]: data.bookings ?? [] }));
    }
  }

  if (loading) return <LoadingCard />;

  const q = search.trim().toLowerCase();
  const filtered = q
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.phone ?? "").toLowerCase().includes(q),
      )
    : users;

  return (
    <div className="rounded-2xl border border-brand/10 bg-white p-5 shadow-soft">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg font-extrabold text-ink">
          Registered users <span className="text-xs font-semibold text-slatey">({filtered.length} of {users.length})</span>
        </h3>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone…"
          className="w-full max-w-xs rounded-xl border border-brand/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand sm:w-72"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-brand/20 bg-brand/[0.03] p-6 text-center text-sm text-slatey">
          {q ? `No users match "${search}".` : "No users yet."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="bg-brand/5 text-left text-xs uppercase tracking-wide text-slatey">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Joined</th>
                <th className="p-3">Bookings</th>
                <th className="p-3">Spent</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <>
                  <tr key={u.id} className="border-t border-brand/10">
                    <td className="p-3 font-bold text-ink">{u.name}</td>
                    <td className="p-3 text-slatey">{u.email}</td>
                    <td className="p-3 text-slatey">{u.phone ?? "—"}</td>
                    <td className="p-3 text-xs text-slatey">{u.created_at.slice(0, 10)}</td>
                    <td className="p-3 text-ink">{u.booking_count}</td>
                    <td className="p-3 font-semibold text-ink">{money(u.total_spent)}</td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => toggle(u.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-brand/15 px-2.5 py-1.5 text-xs font-bold text-brand hover:bg-brand/5"
                        >
                          {expanded === u.id ? "Hide" : "View"}
                        </button>
                        <Link
                          href={`/admin/customers/${u.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-brand/15 px-2.5 py-1.5 text-xs font-bold text-ink/70 hover:bg-brand/5"
                        >
                          Profile <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                  {expanded === u.id && (
                    <tr className="border-t border-brand/5 bg-brand/[0.03]">
                      <td colSpan={7} className="p-3">
                        <UserBookingsList rows={userBookings[u.id] ?? []} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UserBookingsList({ rows }: { rows: Booking[] }) {
  if (rows.length === 0) return <p className="text-xs text-slatey">No bookings.</p>;
  return (
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {rows.map((b) => (
        <li key={b.id} className="rounded-lg border border-brand/10 bg-white px-3 py-1.5 text-xs">
          <span className="font-bold text-ink">Court {b.court_number}</span> · {b.slot_date} {b.slot_time} ·{" "}
          <span className="text-brand">{money(b.total_amount)}</span> ·{" "}
          <span className="uppercase text-slatey">{b.status}</span>
        </li>
      ))}
    </ul>
  );
}

function LoadingCard() {
  return (
    <div className="flex items-center justify-center rounded-2xl border border-brand/10 bg-white p-10 text-sm text-slatey">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
    </div>
  );
}
