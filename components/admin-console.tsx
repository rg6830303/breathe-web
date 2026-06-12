"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { useToast } from "@/components/ui/toast";
import { EmailPanel } from "@/components/admin/email-panel";
import { WalkInModal } from "@/components/admin/walk-in-modal";
import { BulkBlockModal } from "@/components/admin/bulk-block-modal";
import { AddUserModal } from "@/components/admin/add-user-modal";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Download,
  Grid3x3,
  Loader2,
  LogOut,
  Mail,
  RefreshCw,
  ShieldOff,
  UserPlus,
  Users,
  X,
  Wallet,
  Trophy,
  Trash2,
  Plus,
} from "lucide-react";

type Tab = "overview" | "bookings" | "courts" | "users" | "expenses" | "tournaments" | "email";
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
  total_due: number;
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
  { key: "expenses", label: "Expenses", icon: Wallet },
  { key: "tournaments", label: "Tournaments", icon: Trophy },
  { key: "email", label: "Email", icon: Mail },
];

export function AdminConsole() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [loggingOut, setLoggingOut] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [bulkBlockOpen, setBulkBlockOpen] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/admin/auth/logout", { method: "POST" });
    // Hard redirect ensures the cleared admin session cookie is visible
    // to the server-side middleware immediately, bypassing App Router cache.
    window.location.href = "/admin/login";
  }


  return (
    <div className="grid gap-5">
      {/* Tab bar */}
      <div className="card-sport overflow-hidden rounded-2xl p-0">
        {/* Top action bar */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-b-2 border-ink/10 bg-ink/[0.03] px-4 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
          <button
            type="button"
            onClick={() => setWalkInOpen(true)}
            className="btn-primary px-3 py-1.5 text-xs"
          >
            <UserPlus className="h-3.5 w-3.5" /> Walk-in
          </button>
          <button
            type="button"
            onClick={() => setBulkBlockOpen(true)}
            className="btn-dark px-3 py-1.5 text-xs"
          >
            <ShieldOff className="h-3.5 w-3.5" /> Close slots
          </button>
          <Link
            href="/admin/gallery"
            className="btn-outline px-3 py-1.5 text-xs"
          >
            Gallery
          </Link>
          <Link
            href="/admin/import"
            className="btn-outline px-3 py-1.5 text-xs"
          >
            Import
          </Link>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="btn-outline px-3 py-1.5 text-xs disabled:opacity-60"
          >
            {loggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />} Log out
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-0 border-b-2 border-ink/10 dark:border-white/10">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`relative inline-flex items-center gap-2 px-4 py-3 text-xs font-extrabold uppercase tracking-wide transition-colors ${
                tab === key
                  ? "text-brand dark:text-brand-300"
                  : "text-ink/50 hover:text-ink dark:text-white/50 dark:hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
              {tab === key && (
                <motion.span
                  layoutId="admin-tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand dark:bg-brand-300"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {tab === "overview" && <AnalyticsDashboard />}
          {tab === "bookings" && <BookingsTab />}
          {tab === "courts" && <CourtTab />}
          {tab === "users" && <UsersTab />}
          {tab === "expenses" && <ExpensesTab />}
          {tab === "tournaments" && <TournamentsTab />}
          {tab === "email" && <EmailPanel />}
        </motion.div>
      </AnimatePresence>

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
    <div className="grid gap-5">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="card-sport lift-3d p-5"
          >
            <p className="eyebrow text-xs">{c.label}</p>
            <div className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink dark:text-white">{c.value}</div>
          </motion.div>
        ))}
      </section>

      <section className="card-sport p-6">
        <h3 className="mb-1 font-display text-base font-extrabold uppercase tracking-tight text-ink dark:text-white">
          Bookings this week
        </h3>
        <p className="mb-4 text-xs text-ink/50 dark:text-white/50">Daily confirmed bookings across all courts</p>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.weekly}>
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(47,91,255,0.08)" }}
                contentStyle={{ background: "#fff", border: "2px solid #2f5bff22", borderRadius: 12 }}
              />
              <Bar dataKey="bookings" fill="#2F5BFF" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 border-t-2 border-ink/10 pt-3 text-xs text-ink/60 dark:border-white/10 dark:text-white/60">
          Total confirmed revenue: <strong className="text-ink dark:text-white">{money(stats.total_revenue)}</strong>
        </p>
      </section>
    </div>
  );
}

function BookingsTab() {
  const toast = useToast();
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
    const res = await fetch("/api/admin/slots/unblock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: id }),
    });
    setBusy(null);
    if (res.ok) toast.show("Booking cancelled — the slot is now open again", "success");
    else toast.show("Could not cancel that booking.", "error");
    reload();
  }

  return (
    <div className="card-sport p-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">All bookings</span>
          <h3 className="mt-1 font-display text-xl font-extrabold tracking-tight text-ink dark:text-white">Booking log</h3>
          <p className="text-xs text-ink/50 dark:text-white/50">Most recent first. Filter by slot date.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border-2 border-ink/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand dark:border-white/10 dark:bg-[#111c38] dark:text-white"
          />
          {date && (
            <button
              type="button"
              onClick={() => setDate("")}
              className="btn-outline px-2.5 py-2 text-xs"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
          <button
            type="button"
            onClick={reload}
            className="btn-outline px-2.5 py-2 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingCard />
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-ink/10 p-8 text-center text-sm text-ink/40 dark:border-white/10 dark:text-white/40">
          No bookings found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-ink/10 dark:border-white/10">
                <th className="p-3 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">User</th>
                <th className="p-3 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Court</th>
                <th className="p-3 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Date</th>
                <th className="p-3 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Time</th>
                <th className="p-3 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Amount</th>
                <th className="p-3 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Status</th>
                <th className="p-3 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Created</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-ink/5 transition-colors hover:bg-brand/[0.03] dark:border-white/5 dark:hover:bg-white/[0.03]">
                  <td className="p-3">
                    <div className="font-bold text-ink dark:text-white">{b.user_name}</div>
                    <div className="text-[11px] text-ink/50 dark:text-white/50">{b.user_email}</div>
                  </td>
                  <td className="p-3 font-semibold text-ink dark:text-white">Court {b.court_number}</td>
                  <td className="p-3 text-ink dark:text-white">{b.slot_date}</td>
                  <td className="p-3 text-ink dark:text-white">{b.slot_time}</td>
                  <td className="p-3 font-extrabold text-ink dark:text-white">{money(b.total_amount)}</td>
                  <td className="p-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                        b.status === "confirmed"
                          ? "bg-lime/20 text-lime-dark"
                          : b.status === "cancelled"
                            ? "bg-red-100 text-red-700"
                            : "bg-ink/5 text-ink/60 dark:bg-white/5 dark:text-white/60"
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="p-3 text-[11px] text-ink/50 dark:text-white/50">{new Date(b.created_at + "Z").toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right">
                    {b.status === "confirmed" && (
                      <button
                        type="button"
                        onClick={() => cancel(b.id)}
                        disabled={busy === b.id}
                        className="inline-flex items-center gap-1 rounded-lg border-2 border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
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
  const toast = useToast();
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
    const res = await fetch("/api/admin/slots/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ court_number: court, slot_date: date, slot_time: time }),
    });
    setBusy(null);
    if (res.ok) toast.show(`Court ${court} blocked at ${time} — now hidden from players`, "success");
    else toast.show("Could not block that slot. Please try again.", "error");
    load();
  }

  async function unblock(court: number, time: string) {
    const key = `${court}@${time}`;
    setBusy(key);
    const res = await fetch("/api/admin/slots/unblock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ court_number: court, slot_date: date, slot_time: time }),
    });
    setBusy(null);
    if (res.ok) toast.show(`Court ${court} reopened at ${time} — bookable again`, "success");
    else toast.show("Could not reopen that slot. Please try again.", "error");
    load();
  }

  return (
    <div className="card-sport p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="eyebrow">Court management</span>
          <h3 className="mt-1 font-display text-xl font-extrabold tracking-tight text-ink dark:text-white">Slot grid</h3>
          <p className="text-xs text-ink/50 dark:text-white/50">Block off slots manually for maintenance or events.</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border-2 border-ink/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand dark:border-white/10 dark:bg-[#111c38] dark:text-white"
        />
      </div>

      {loading || !data ? (
        <LoadingCard />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((court) => (
            <div key={court} className="rounded-2xl border-2 border-ink/10 bg-ink/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.02]">
              <div className="mb-3 flex items-center justify-between border-b-2 border-ink/10 pb-2 dark:border-white/10">
                <span className="font-display text-sm font-extrabold uppercase tracking-tight text-ink dark:text-white">
                  Court {court}
                </span>
                <span className="tag-sport">
                  {byCourt[court]?.filter((s) => s.status === "booked").length ?? 0} booked
                </span>
              </div>
              <ul className="grid max-h-[420px] grid-cols-2 gap-1.5 overflow-y-auto pr-1">
                {(byCourt[court] ?? []).map((s) => {
                  const key = `${court}@${s.time}`;
                  const booking = s.status === "booked" ? bookingForSlot(court, s.time) : null;
                  const isBusy = busy === key;
                  let cls = "border-2 border-ink/10 bg-white text-ink hover:border-brand dark:border-white/10 dark:bg-[#111c38] dark:text-white";
                  if (s.status === "booked") cls = "border-2 border-red-300 bg-red-50 text-red-700 dark:border-red-700/50 dark:bg-red-950/20 dark:text-red-300";
                  if (s.status === "blocked") cls = "border-2 border-ink/20 bg-ink/10 text-ink/50 dark:border-white/10 dark:bg-white/5 dark:text-white/40";
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        disabled={s.status === "booked" || isBusy}
                        onClick={() => (s.status === "blocked" ? unblock(court, s.time) : block(court, s.time))}
                        title={booking ? `${booking.user_name} (${booking.user_email})` : s.status}
                        className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-bold transition ${cls} ${
                          isBusy ? "opacity-50" : ""
                        }`}
                      >
                        <span>{s.time}</span>
                        <span className="text-[9px] font-extrabold uppercase tracking-wide">
                          {s.status === "booked" ? "Booked" : s.status === "blocked" ? "Closed" : "Open"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 flex items-center gap-1 text-[10px] text-ink/40 dark:text-white/40">
                <ShieldOff className="h-3 w-3" />
                Tap open slot to block · blocked to reopen
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
  const [addOpen, setAddOpen] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => setUsers(data.users ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function exportCsv() {
    const header = ["Name", "Email", "Phone", "Joined", "Bookings", "Total spent (INR)", "Outstanding Due (INR)"];
    const rows = filtered.map((u) => [
      u.name,
      u.email,
      u.phone ?? "",
      u.created_at.slice(0, 10),
      String(u.booking_count),
      String(u.total_spent),
      String(u.total_due),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `breathe-users-${todayIST()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
    <div className="card-sport p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="eyebrow">Registered users</span>
          <h3 className="mt-1 font-display text-xl font-extrabold tracking-tight text-ink dark:text-white">
            Members{" "}
            <span className="text-sm font-semibold text-ink/40 dark:text-white/40">
              ({filtered.length}/{users.length})
            </span>
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone…"
            className="w-full max-w-xs rounded-xl border-2 border-ink/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand dark:border-white/10 dark:bg-[#111c38] dark:text-white sm:w-64"
          />
          <button
            type="button"
            onClick={load}
            className="btn-outline px-2.5 py-2 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="btn-outline px-2.5 py-2 text-xs disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="btn-primary px-3 py-2 text-xs"
          >
            <UserPlus className="h-3.5 w-3.5" /> Add user
          </button>
        </div>
      </div>
      <AddUserModal open={addOpen} onClose={() => setAddOpen(false)} onAdded={load} />
      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-ink/10 p-8 text-center text-sm text-ink/40 dark:border-white/10 dark:text-white/40">
          {q ? `No users match "${search}".` : "No users yet."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-ink/10 dark:border-white/10">
                {["Name", "Email", "Phone", "Joined", "Bookings", "Spent", "Due", ""].map((h) => (
                  <th key={h} className="p-3 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <Fragment key={u.id}>
                  <tr className="border-b border-ink/5 transition-colors hover:bg-brand/[0.03] dark:border-white/5 dark:hover:bg-white/[0.03]">
                    <td className="p-3 font-bold text-ink dark:text-white">{u.name}</td>
                    <td className="p-3 text-ink/60 dark:text-white/60">{u.email}</td>
                    <td className="p-3 text-ink/60 dark:text-white/60">{u.phone ?? "—"}</td>
                    <td className="p-3 text-[11px] text-ink/50 dark:text-white/50">{u.created_at.slice(0, 10)}</td>
                    <td className="p-3 font-semibold text-ink dark:text-white">{u.booking_count}</td>
                    <td className="p-3 font-extrabold text-brand">{money(u.total_spent)}</td>
                    <td className={`p-3 font-extrabold ${u.total_due > 0 ? "text-red-500" : "text-ink/40 dark:text-white/40"}`}>{money(u.total_due)}</td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => toggle(u.id)}
                          className="btn-outline px-2.5 py-1.5 text-xs"
                        >
                          {expanded === u.id ? "Hide" : "View"}
                        </button>
                        <Link
                          href={`/admin/customers/${u.id}`}
                          className="btn-outline inline-flex items-center gap-1 px-2.5 py-1.5 text-xs"
                        >
                          Profile <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                  {expanded === u.id && (
                    <tr className="border-b border-ink/5 bg-brand/[0.02] dark:border-white/5 dark:bg-white/[0.02]">
                      <td colSpan={7} className="px-3 py-2">
                        <UserBookingsList rows={userBookings[u.id] ?? []} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UserBookingsList({ rows }: { rows: Booking[] }) {
  if (rows.length === 0) return <p className="text-xs text-ink/50 dark:text-white/50">No bookings.</p>;
  return (
    <ul className="grid gap-1.5 py-1 sm:grid-cols-2">
      {rows.map((b) => (
        <li key={b.id} className="rounded-xl border-2 border-ink/10 bg-white px-3 py-2 text-xs dark:border-white/10 dark:bg-[#111c38]">
          <span className="font-bold text-ink dark:text-white">Court {b.court_number}</span>
          {" · "}
          {b.slot_date} {b.slot_time}
          {" · "}
          <span className="font-extrabold text-brand">{money(b.total_amount)}</span>
          {" · "}
          <span className="font-bold uppercase tracking-wide text-ink/50 dark:text-white/50">{b.status}</span>
        </li>
      ))}
    </ul>
  );
}

// ---------------- Expenses ----------------

type Expense = {
  id: string;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: string;
};

const EXPENSE_CATS = ["food", "maintenance", "staff", "utilities", "equipment", "marketing", "rent", "other"];

function ExpensesTab() {
  const toast = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [byCat, setByCat] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const today = todayIST();
  const [range, setRange] = useState({ from: `${today.slice(0, 7)}-01`, to: today });
  const [form, setForm] = useState({ expense_date: today, category: "food", description: "", amount: "", payment_method: "Cash" });

  function load() {
    setLoading(true);
    fetch(`/api/admin/expenses?from=${range.from}&to=${range.to}`)
      .then((r) => r.json())
      .then((d) => {
        setExpenses(d.expenses ?? []);
        setTotal(d.total ?? 0);
        setByCat(d.byCategory ?? {});
      })
      .finally(() => setLoading(false));
  }
  useEffect(load, [range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Math.round(Number(form.amount)) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save.");
      toast.show("Expense added", "success");
      setForm({ ...form, description: "", amount: "" });
      load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not save.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this expense?")) return;
    const res = await fetch(`/api/admin/expenses?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast.show("Expense deleted", "success"); load(); }
    else toast.show("Could not delete.", "error");
  }

  function exportCsv() {
    const rows = [["Date", "Category", "Description", "Amount", "Method"], ...expenses.map((e) => [e.expense_date, e.category, e.description, String(e.amount), e.payment_method])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `breathe-expenses-${range.from}-to-${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const inputCls = "w-full rounded-xl border-2 border-ink/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand dark:border-white/10 dark:bg-[#111c38] dark:text-white";

  return (
    <div className="grid gap-5">
      {/* Summary + add form */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <div className="card-sport p-5">
          <span className="eyebrow">Log expense</span>
          <h3 className="mt-1 mb-4 font-display text-base font-extrabold tracking-tight text-ink dark:text-white">Add daily expense</h3>
          <form onSubmit={add} className="grid gap-2.5">
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} className={inputCls} />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
                {EXPENSE_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <input placeholder="Description (e.g. Lunch for staff)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" min="0" placeholder="Amount ₹" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} />
              <input placeholder="Paid via (Cash/UPI…)" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className={inputCls} />
            </div>
            <button type="submit" disabled={busy} className="btn-primary mt-1 w-full justify-center disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add expense
            </button>
          </form>
        </div>

        <div className="card-sport p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <span className="eyebrow">Period summary</span>
              <h3 className="mt-1 font-display text-base font-extrabold tracking-tight text-ink dark:text-white">This period</h3>
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} className="rounded-lg border-2 border-ink/10 px-2 py-1 text-xs outline-none focus:border-brand dark:border-white/10 dark:bg-[#111c38] dark:text-white" />
              <span className="text-xs text-ink/40 dark:text-white/40">to</span>
              <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} className="rounded-lg border-2 border-ink/10 px-2 py-1 text-xs outline-none focus:border-brand dark:border-white/10 dark:bg-[#111c38] dark:text-white" />
            </div>
          </div>
          <div className="mt-4 font-display text-4xl font-extrabold tracking-tight text-brand">{money(total)}</div>
          <div className="mt-1 text-xs text-ink/50 dark:text-white/50">Total spend across {expenses.length} entries</div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => (
              <div key={c} className="rounded-xl border-2 border-ink/10 p-2.5 dark:border-white/10">
                <div className="text-[10px] font-extrabold uppercase tracking-wide text-ink/40 dark:text-white/40">{c}</div>
                <div className="mt-1 font-display text-sm font-extrabold text-ink dark:text-white">{money(v)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="card-sport p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-extrabold tracking-tight text-ink dark:text-white">Expense log</h3>
          <button type="button" onClick={exportCsv} disabled={expenses.length === 0} className="btn-outline px-2.5 py-1.5 text-xs disabled:opacity-50">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
        {loading ? <LoadingCard /> : expenses.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-ink/10 p-8 text-center text-sm text-ink/40 dark:border-white/10 dark:text-white/40">No expenses in this period.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-ink/10 dark:border-white/10">
                  {["Date", "Category", "Description", "Method", "Amount", ""].map((h) => (
                    <th key={h} className="p-3 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b border-ink/5 hover:bg-brand/[0.02] dark:border-white/5 dark:hover:bg-white/[0.02]">
                    <td className="p-3 text-ink dark:text-white">{e.expense_date}</td>
                    <td className="p-3">
                      <span className="tag-sport capitalize">{e.category}</span>
                    </td>
                    <td className="p-3 text-ink/60 dark:text-white/60">{e.description || "—"}</td>
                    <td className="p-3 text-ink/60 dark:text-white/60">{e.payment_method || "—"}</td>
                    <td className="p-3 font-extrabold text-ink dark:text-white">{money(e.amount)}</td>
                    <td className="p-3 text-right">
                      <button onClick={() => remove(e.id)} className="inline-flex items-center gap-1 rounded-lg border-2 border-red-200 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Tournaments ----------------

type Tournament = {
  id: string;
  name: string;
  event_date: string;
  format: string;
  prize: string;
  fee: number;
  description: string;
  status: string;
  active: boolean;
};

function TournamentsTab() {
  const toast = useToast();
  const [items, setItems] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", event_date: "", format: "Open Doubles", prize: "", fee: "", description: "", status: "upcoming" });

  function load() {
    setLoading(true);
    fetch("/api/admin/tournaments").then((r) => r.json()).then((d) => setItems(d.tournaments ?? [])).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, fee: Math.round(Number(form.fee) || 0), active: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save.");
      toast.show("Tournament added", "success");
      setForm({ name: "", event_date: "", format: "Open Doubles", prize: "", fee: "", description: "", status: "upcoming" });
      load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not save.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this tournament?")) return;
    const res = await fetch(`/api/admin/tournaments?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast.show("Tournament deleted", "success"); load(); }
    else toast.show("Could not delete.", "error");
  }

  const inputCls = "w-full rounded-xl border-2 border-ink/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand dark:border-white/10 dark:bg-[#111c38] dark:text-white";

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
      <div className="card-sport h-fit p-5">
        <span className="eyebrow">Host event</span>
        <h3 className="mt-1 mb-4 font-display text-base font-extrabold tracking-tight text-ink dark:text-white">New tournament</h3>
        <form onSubmit={add} className="grid gap-2.5">
          <input placeholder="Tournament name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className={inputCls} />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
              {["upcoming", "open", "completed", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <input placeholder="Format (e.g. Open Doubles)" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} className={inputCls} />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Prize (e.g. ₹10,000)" value={form.prize} onChange={(e) => setForm({ ...form, prize: e.target.value })} className={inputCls} />
            <input type="number" min="0" placeholder="Entry fee ₹" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} className={inputCls} />
          </div>
          <textarea placeholder="Details" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
          <button type="submit" disabled={busy} className="btn-primary mt-1 w-full justify-center disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add tournament
          </button>
        </form>
      </div>

      <div className="card-sport p-5">
        <span className="eyebrow">Events</span>
        <h3 className="mt-1 mb-4 font-display text-base font-extrabold tracking-tight text-ink dark:text-white">Scheduled tournaments</h3>
        {loading ? <LoadingCard /> : items.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-ink/10 p-8 text-center text-sm text-ink/40 dark:border-white/10 dark:text-white/40">No tournaments yet.</div>
        ) : (
          <ul className="grid gap-3">
            {items.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-3 rounded-2xl border-2 border-ink/10 p-4 dark:border-white/10">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-ink dark:text-white">{t.name}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${t.status === "open" ? "bg-lime/20 text-lime-dark" : t.status === "cancelled" ? "bg-red-100 text-red-700" : "tag-sport"}`}>{t.status}</span>
                  </div>
                  <div className="mt-1 text-xs text-ink/50 dark:text-white/50">
                    {t.event_date || "TBD"} · {t.format || "—"}{t.prize ? ` · 🏆 ${t.prize}` : ""}{t.fee ? ` · ₹${t.fee} entry` : ""}
                  </div>
                  {t.description && <p className="mt-1 text-xs text-ink/50 dark:text-white/50">{t.description}</p>}
                </div>
                <button onClick={() => remove(t.id)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border-2 border-red-200 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50">
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="flex items-center justify-center rounded-2xl border-2 border-ink/10 p-10 text-sm text-ink/40 dark:border-white/10 dark:text-white/40">
      <Loader2 className="mr-2 h-4 w-4 animate-spin text-brand" /> Loading…
    </div>
  );
}
