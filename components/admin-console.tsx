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
import { NotificationBell } from "@/components/notification-bell";
import { getAdminCache, setAdminCache } from "@/lib/admin-cache";
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
  HandCoins,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Phone,
  IndianRupee,
} from "lucide-react";

/** Shift a YYYY-MM-DD date string by N days using LOCAL components (no UTC
 *  drift, which would otherwise shift the day for IST users). */
function shiftDate(d: string, delta: number): string {
  const [y, m, dd] = d.split("-").map(Number);
  const dt = new Date(y, m - 1, dd + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/** Add minutes to an HH:MM time, wrapping at 24h. */
function addMins(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const t = h * 60 + m + mins;
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** Pretty 12-hour label, e.g. "5:00 PM". */
function label12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

type Tab = "overview" | "bookings" | "courts" | "users" | "dues" | "expenses" | "tournaments" | "email";
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
  total_amount: number; // amount paid online (the ₹200 advance)
  total?: number; // full court bill
  duration_min?: number;
  source?: string;
  status: string;
  sport?: string;
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
  slots: { court: number; time: string; status: "open" | "booked" | "blocked" | "past"; price: number }[];
};

function money(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

/* ---- Shared console styles (dark-first, consistent across every tab) ---- */
const TH =
  "px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50";
const TH_RIGHT =
  "px-3 py-3 text-right text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50";
const TR_HOVER =
  "border-b border-ink/5 transition-colors hover:bg-brand/[0.03] dark:border-white/5 dark:hover:bg-white/[0.03]";
const INPUT =
  "rounded-xl border-2 border-ink/10 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand dark:border-white/10 dark:bg-[#0b1530] dark:text-white";
const DANGER_BTN =
  "inline-flex items-center gap-1 rounded-lg border-2 border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10";

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "confirmed" || status === "open" || status === "active"
      ? "bg-lime/20 text-lime-dark dark:bg-lime/15 dark:text-lime"
      : status === "cancelled"
        ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
        : "bg-ink/5 text-ink/60 dark:bg-white/10 dark:text-white/60";
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${tone}`}>
      {status}
    </span>
  );
}

/** Uniform header for every tab panel: eyebrow + title + subtitle left, controls right. */
function PanelHeader({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink/10 pb-4 dark:border-white/10">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h3 className="mt-1 font-display text-lg font-extrabold tracking-tight text-ink dark:text-white">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-ink/50 dark:text-white/50">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-ink/10 p-8 text-center text-sm text-ink/40 dark:border-white/10 dark:text-white/40">
      {children}
    </div>
  );
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
  { key: "dues", label: "Pending dues", icon: HandCoins },
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
          <div className="mr-auto">
            <NotificationBell />
          </div>
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

        {/* Tabs — horizontally scrollable, labels always visible for clear nav */}
        <div className="no-scrollbar flex flex-nowrap gap-0 overflow-x-auto border-b-2 border-ink/10 dark:border-white/10">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-3 text-xs font-extrabold uppercase tracking-wide transition-colors ${
                tab === key
                  ? "text-brand dark:text-brand-300"
                  : "text-ink/50 hover:text-ink dark:text-white/50 dark:hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{label}</span>
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
          {tab === "dues" && <DuesTab />}
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

type DueRow = {
  id: string;
  user_id: string | null;
  user_name: string;
  user_email: string;
  slot_date: string;
  slot_time: string;
  duration_min: number;
  court_number: number | null;
  sport?: string;
  total: number;
  amount_paid: number;
  due: number;
};

/**
 * Pending-dues panel: every confirmed booking whose balance isn't fully paid.
 * Dues are collected at the club; the admin marks them cleared here, which
 * settles the booking and emails + notifies the player.
 */
function DuesTab() {
  const toast = useToast();
  const [rows, setRows] = useState<DueRow[]>(() => getAdminCache<DueRow[]>("dues:") ?? []);
  const [loading, setLoading] = useState(() => getAdminCache<DueRow[]>("dues:") === undefined);
  const [busy, setBusy] = useState<string | null>(null);

  function reload() {
    const cached = getAdminCache<DueRow[]>("dues:");
    if (cached) {
      setRows(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    fetch("/api/admin/bookings/dues")
      .then((r) => (r.ok ? r.json() : { bookings: [] }))
      .then((data) => {
        setRows(data.bookings ?? []);
        setAdminCache("dues:", data.bookings ?? []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(reload, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time: quietly re-fetch every 45s + on focus so newly-incurred dues
  // appear and cleared ones drop off without a manual refresh.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/admin/bookings/dues")
        .then((r) => (r.ok ? r.json() : { bookings: [] }))
        .then((data) => {
          setRows(data.bookings ?? []);
          setAdminCache("dues:", data.bookings ?? []);
        })
        .catch(() => {});
    };
    const id = setInterval(tick, 45000);
    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const totalOutstanding = useMemo(() => rows.reduce((a, r) => a + (Number(r.due) || 0), 0), [rows]);

  async function clearDues(r: DueRow) {
    if (!confirm(`Mark dues of ${money(r.due)} for ${r.user_name} as cleared? This emails the customer and settles the booking.`)) return;
    setBusy(r.id);
    const res = await fetch("/api/admin/bookings/dues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: r.id }),
    });
    setBusy(null);
    if (res.ok) {
      toast.show("Dues cleared — the customer has been notified.", "success");
      // Drop it from the list immediately, then revalidate.
      setRows((prev) => prev.filter((x) => x.id !== r.id));
      setAdminCache("dues:", rows.filter((x) => x.id !== r.id));
    } else {
      toast.show("Could not clear those dues.", "error");
    }
    reload();
  }

  return (
    <div className="card-sport p-5">
      <PanelHeader
        eyebrow="Pending dues"
        title="Outstanding balances"
        subtitle={`${rows.length} booking${rows.length === 1 ? "" : "s"} awaiting payment · ${money(totalOutstanding)} outstanding`}
      >
        <button type="button" onClick={reload} className="btn-outline px-2.5 py-2 text-xs">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </PanelHeader>

      {loading ? (
        <LoadingCard />
      ) : rows.length === 0 ? (
        <EmptyState>No pending dues — every booking is fully settled. 🎉</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-ink/10 dark:border-white/10">
                <th className={TH}>User</th>
                <th className={TH}>Sport</th>
                <th className={TH}>Date</th>
                <th className={TH}>Time</th>
                <th className={TH_RIGHT}>Total</th>
                <th className={TH_RIGHT}>Paid</th>
                <th className={TH_RIGHT}>Due</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={TR_HOVER}>
                  <td className="p-3">
                    <div className="font-bold text-ink dark:text-white">{r.user_name}</div>
                    <div className="text-[11px] text-ink/50 dark:text-white/50">{r.user_email}</div>
                  </td>
                  <td className="p-3 capitalize text-ink dark:text-white">{r.sport ?? "pickleball"}</td>
                  <td className="p-3 text-ink dark:text-white">{r.slot_date}</td>
                  <td className="p-3 text-ink dark:text-white">{String(r.slot_time).slice(0, 5)}</td>
                  <td className="p-3 text-right font-semibold text-ink dark:text-white">{money(r.total)}</td>
                  <td className="p-3 text-right text-lime-dark dark:text-lime">{money(r.amount_paid)}</td>
                  <td className="p-3 text-right font-extrabold text-red-600 dark:text-red-400">{money(r.due)}</td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => clearDues(r)}
                      disabled={busy === r.id}
                      className="inline-flex items-center gap-1 rounded-lg border-2 border-lime/40 bg-lime/10 px-2.5 py-1.5 text-xs font-bold text-lime-dark transition hover:bg-lime/20 disabled:opacity-60 dark:text-lime"
                    >
                      {busy === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Mark cleared
                    </button>
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

/**
 * All bookings = a LIVE court-slot board (mirrors Court management) showing,
 * for the chosen day, every slot across the 3 courts as Booked / Open / Missed
 * / Closed. Date-navigable (calendar) to review past days. Tapping a booked
 * slot opens a detail popup (customer, advance paid, dues cleared/remaining,
 * with a one-tap "mark dues cleared"). Auto-refreshes so it tracks real time.
 */
function BookingsTab() {
  const [date, setDate] = useState<string>(todayIST());
  const [data, setData] = useState<SlotResp | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Booking | null>(null);

  function load(opts?: { quiet?: boolean }) {
    const ck = `allbookings:${date}`;
    const cached = getAdminCache<{ slots: SlotResp; bookings: Booking[] }>(ck);
    if (cached) {
      setData(cached.slots);
      setBookings(cached.bookings);
      setLoading(false);
    } else if (!opts?.quiet) {
      setLoading(true);
    }
    Promise.all([
      fetch(`/api/slots?date=${date}`).then((r) => r.json()),
      fetch(`/api/admin/bookings?date=${date}`).then((r) => r.json()),
    ])
      .then(([slots, bks]) => {
        setData(slots);
        setBookings(bks.bookings ?? []);
        setAdminCache(ck, { slots, bookings: bks.bookings ?? [] });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time: quietly re-fetch every 45s + on focus so the board reflects new
  // bookings / walk-ins / dues changes without a manual refresh.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") load({ quiet: true });
    };
    const id = setInterval(tick, 45000);
    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const byCourt = useMemo(() => {
    const map: Record<number, SlotResp["slots"]> = { 1: [], 2: [], 3: [] };
    if (data) for (const s of data.slots) (map[s.court] ?? (map[s.court] = [])).push(s);
    return map;
  }, [data]);

  const bookingForSlot = (court: number, time: string) =>
    bookings.find((b) => b.court_number === court && b.slot_time === time && b.status === "confirmed");

  const counts = useMemo(() => {
    let booked = 0, open = 0, missed = 0;
    if (data)
      for (const s of data.slots) {
        if (bookingForSlot(s.court, s.time)) booked++;
        else if (s.status === "past") missed++;
        else if (s.status === "open") open++;
      }
    return { booked, open, missed };
  }, [data, bookings]); // eslint-disable-line react-hooks/exhaustive-deps

  const isToday = date === todayIST();
  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="card-sport p-5">
      <PanelHeader
        eyebrow="All bookings"
        title="Live slot board"
        subtitle={`${dateLabel}${isToday ? " · today" : ""} — ${counts.booked} booked · ${counts.open} open · ${counts.missed} missed`}
      >
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous day"
            onClick={() => setDate(shiftDate(date, -1))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink/10 text-ink/70 transition hover:border-brand/40 hover:text-brand dark:border-white/10 dark:text-white/70"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value || todayIST())}
            className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand dark:border-white/10 dark:bg-[#111c38] dark:text-white"
          />
          <button
            type="button"
            aria-label="Next day"
            onClick={() => setDate(shiftDate(date, 1))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink/10 text-ink/70 transition hover:border-brand/40 hover:text-brand dark:border-white/10 dark:text-white/70"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {!isToday && (
            <button type="button" onClick={() => setDate(todayIST())} className="btn-outline px-2.5 py-2 text-xs">
              Today
            </button>
          )}
          <button type="button" onClick={() => load()} className="btn-outline px-2.5 py-2 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </PanelHeader>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-semibold text-ink/60 dark:text-white/55">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand" /> Booked</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-ink/25 dark:border-white/25" /> Open</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-dashed border-ink/25 dark:border-white/25" /> Missed</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ink/25 dark:bg-white/20" /> Closed</span>
        <span className="ml-auto text-ink/40 dark:text-white/40">Tap a booked slot for details</span>
      </div>

      {loading || !data ? (
        <LoadingCard />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((court) => (
            <div key={court} className="rounded-2xl border border-ink/[0.08] bg-ink/[0.02] p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
              <div className="mb-3 flex items-center justify-between border-b border-ink/10 pb-2 dark:border-white/10">
                <span className="font-display text-sm font-extrabold tracking-tight text-ink dark:text-white">Court {court}</span>
                <span className="tag-sport">
                  {(byCourt[court] ?? []).filter((s) => bookingForSlot(court, s.time)).length} booked
                </span>
              </div>
              <ul className="grid max-h-[460px] grid-cols-1 gap-1.5 overflow-y-auto pr-1">
                {(byCourt[court] ?? []).map((s) => {
                  const bk = bookingForSlot(court, s.time);
                  let cls = "border border-ink/10 bg-white text-ink/70 dark:border-white/10 dark:bg-[#111c38] dark:text-white/60";
                  let badge = "Open";
                  if (bk) {
                    cls = "cursor-pointer border border-brand/30 bg-brand/5 text-ink hover:border-brand hover:bg-brand/10 dark:border-brand-300/40 dark:bg-brand/10 dark:text-white";
                    badge = "Booked";
                  } else if (s.status === "blocked") {
                    cls = "border border-ink/15 bg-ink/10 text-ink/45 dark:border-white/10 dark:bg-white/5 dark:text-white/35";
                    badge = "Closed";
                  } else if (s.status === "past") {
                    cls = "border border-dashed border-ink/15 bg-transparent text-ink/30 dark:border-white/10 dark:text-white/25";
                    badge = "Missed";
                  }
                  return (
                    <li key={s.time}>
                      <button
                        type="button"
                        disabled={!bk}
                        onClick={() => bk && setSelected(bk)}
                        title={bk ? `${bk.user_name} (${bk.user_email})` : badge}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[11px] font-bold transition ${cls}`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Clock3 className="h-3 w-3 opacity-60" /> {label12(s.time)}
                        </span>
                        {bk ? (
                          <span className="max-w-[110px] truncate font-semibold">{bk.user_name}</span>
                        ) : (
                          <span className="text-[9px] font-extrabold uppercase tracking-wide opacity-70">{badge}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <BookingDetailModal
          booking={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
}

/** Miniature detail popup for a booked slot, with one-tap dues clearance. */
function BookingDetailModal({
  booking,
  onClose,
  onChanged,
}: {
  booking: Booking;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const courtBill = booking.total ?? booking.total_amount;
  const advance = booking.total_amount;
  const due = Math.max(0, courtBill - advance);
  const cleared = due <= 0;
  const dur = booking.duration_min ?? 60;
  const timeRange = `${label12(booking.slot_time)} – ${label12(addMins(booking.slot_time, dur))}`;

  async function clearDues() {
    setBusy(true);
    const res = await fetch("/api/admin/bookings/dues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: booking.id }),
    });
    setBusy(false);
    if (res.ok) {
      toast.show("Dues cleared — the customer has been notified.", "success");
      onChanged();
    } else {
      toast.show("Could not clear those dues.", "error");
    }
  }

  const Row = ({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) => (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs text-ink/50 dark:text-white/50">{label}</span>
      <span className={`text-sm font-semibold ${tone ?? "text-ink dark:text-white"}`}>{value}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-card dark:border-white/10 dark:bg-[#111c38]">
        <div className="flex items-start justify-between gap-3 border-b border-ink/10 p-5 dark:border-white/10">
          <div>
            <div className="font-display text-lg font-extrabold tracking-tight text-ink dark:text-white">{booking.user_name}</div>
            <div className="mt-0.5 text-xs text-ink/50 dark:text-white/50">{booking.user_email}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink/10 text-ink/60 transition hover:text-ink dark:border-white/10 dark:text-white/60 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-3">
          {booking.user_phone && booking.user_phone !== "—" && (
            <Row label="Phone" value={<span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {booking.user_phone}</span>} />
          )}
          <Row label="Sport" value={<span className="capitalize">{booking.sport ?? "pickleball"}</span>} />
          <Row label="Court" value={`Court ${booking.court_number}`} />
          <Row label="Date" value={new Date(booking.slot_date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} />
          <Row label="Time" value={timeRange} />
          <Row label="Source" value={<span className="capitalize">{booking.source ?? "online"}</span>} />
          <div className="my-2 border-t border-ink/10 dark:border-white/10" />
          <Row label="Total court bill" value={money(courtBill)} />
          <Row label="Advance paid" value={money(advance)} tone="text-lime-dark dark:text-lime" />
          <Row
            label="Balance due"
            value={cleared ? "Cleared ✓" : money(due)}
            tone={cleared ? "text-lime-dark dark:text-lime" : "text-red-600 dark:text-red-400"}
          />
        </div>

        {!cleared && (
          <div className="border-t border-ink/10 p-4 dark:border-white/10">
            <button
              type="button"
              onClick={clearDues}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-lime/40 bg-lime/10 px-4 py-2.5 text-sm font-bold text-lime-dark transition hover:bg-lime/20 disabled:opacity-60 dark:text-lime"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <IndianRupee className="h-4 w-4" />}
              Mark dues cleared ({money(due)})
            </button>
            <p className="mt-2 text-center text-[11px] text-ink/40 dark:text-white/40">
              Settles the booking & emails the customer a receipt.
            </p>
          </div>
        )}
      </div>
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
    const ck = `courts:${date}`;
    const cached = getAdminCache<{ slots: SlotResp; bookings: Booking[] }>(ck);
    if (cached) {
      setData(cached.slots);
      setBookings(cached.bookings);
      setLoading(false);
    } else {
      setLoading(true);
    }
    Promise.all([
      fetch(`/api/slots?date=${date}`).then((r) => r.json()),
      fetch(`/api/admin/bookings?date=${date}`).then((r) => r.json()),
    ])
      .then(([slots, bks]) => {
        setData(slots);
        setBookings(bks.bookings ?? []);
        setAdminCache(ck, { slots, bookings: bks.bookings ?? [] });
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [date]); // eslint-disable-line react-hooks/exhaustive-deps

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
                  // Past (today IST): time has gone by — inert, dimmed, no action.
                  if (s.status === "past") cls = "border border-dashed border-ink/10 bg-transparent text-ink/25 dark:border-white/10 dark:text-white/20";
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        disabled={s.status === "booked" || s.status === "past" || isBusy}
                        onClick={() => (s.status === "blocked" ? unblock(court, s.time) : block(court, s.time))}
                        title={booking ? `${booking.user_name} (${booking.user_email})` : s.status}
                        className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-bold transition ${cls} ${
                          isBusy ? "opacity-50" : ""
                        }`}
                      >
                        <span>{s.time}</span>
                        <span className="text-[9px] font-extrabold uppercase tracking-wide">
                          {s.status === "booked" ? "Booked" : s.status === "blocked" ? "Closed" : s.status === "past" ? "Ended" : "Open"}
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
  const [users, setUsers] = useState<AdminUser[]>(() => getAdminCache<AdminUser[]>("users") ?? []);
  const [loading, setLoading] = useState(() => getAdminCache<AdminUser[]>("users") === undefined);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [userBookings, setUserBookings] = useState<Record<string, Booking[]>>({});
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  function load() {
    if (getAdminCache<AdminUser[]>("users")) setLoading(false);
    else setLoading(true);
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users ?? []);
        setAdminCache("users", data.users ?? []);
      })
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
    const ck = `expenses:${range.from}:${range.to}`;
    const cached = getAdminCache<{ expenses: Expense[]; total: number; byCategory: Record<string, number> }>(ck);
    if (cached) {
      setExpenses(cached.expenses);
      setTotal(cached.total);
      setByCat(cached.byCategory);
      setLoading(false);
    } else {
      setLoading(true);
    }
    fetch(`/api/admin/expenses?from=${range.from}&to=${range.to}`)
      .then((r) => r.json())
      .then((d) => {
        setExpenses(d.expenses ?? []);
        setTotal(d.total ?? 0);
        setByCat(d.byCategory ?? {});
        setAdminCache(ck, { expenses: d.expenses ?? [], total: d.total ?? 0, byCategory: d.byCategory ?? {} });
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
  const [items, setItems] = useState<Tournament[]>(() => getAdminCache<Tournament[]>("tournaments") ?? []);
  const [loading, setLoading] = useState(() => getAdminCache<Tournament[]>("tournaments") === undefined);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", event_date: "", format: "Open Doubles", prize: "", fee: "", description: "", status: "upcoming" });

  function load() {
    if (getAdminCache<Tournament[]>("tournaments")) setLoading(false);
    else setLoading(true);
    fetch("/api/admin/tournaments")
      .then((r) => r.json())
      .then((d) => {
        setItems(d.tournaments ?? []);
        setAdminCache("tournaments", d.tournaments ?? []);
      })
      .finally(() => setLoading(false));
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
