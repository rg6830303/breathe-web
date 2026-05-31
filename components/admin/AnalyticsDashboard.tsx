"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line, CartesianGrid,
} from "recharts";
import {
  TrendingUp, TrendingDown, Users, Calendar, IndianRupee,
  Percent, ArrowUpRight, FileSpreadsheet, Loader2, RefreshCw,
} from "lucide-react";

type AnalyticsData = {
  revenue: number;
  bookings: number;
  customers: number;
  avgValue: number;
  occupancy: number;
  byHour: { hour: number; count: number }[];
  byDow: { dow: number; count: number }[];
  series: { date: string; revenue: number; bookings: number }[];
  topSlots: { time: string; count: number; revenue: number }[];
  topCustomers: { id: string; name: string; bookings: number; spent: number; last_booking: string }[];
};

type Period = "today" | "7d" | "30d" | "90d" | "year" | "custom";

const BRAND = "#2F5BFF";
const BRAND_SOFT = "#9DB6FF";
const AXIS = "#94A3B8";

const tooltipStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid rgba(47,91,255,0.18)",
  borderRadius: "12px",
  boxShadow: "0 8px 24px -12px rgba(13,20,38,0.25)",
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function todayIST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

const PERIOD_LABELS: Record<Period, string> = {
  today: "Today", "7d": "7 Days", "30d": "30 Days", "90d": "90 Days", year: "Year", custom: "Custom",
};

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<Period>("7d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [compare, setCompare] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<AnalyticsData | null>(null);
  const [previous, setPrevious] = useState<AnalyticsData | null>(null);
  const [recentEvents, setRecentEvents] = useState<
    { id: string; user_name: string; court_number: number; slot_date: string; slot_time: string; status: string }[]
  >([]);

  useEffect(() => {
    const today = todayIST();
    const td = new Date(today);
    if (period === "today") { setFrom(today); setTo(today); }
    else if (period === "7d") { const d = new Date(td); d.setDate(d.getDate() - 6); setFrom(d.toISOString().slice(0, 10)); setTo(today); }
    else if (period === "30d") { const d = new Date(td); d.setDate(d.getDate() - 29); setFrom(d.toISOString().slice(0, 10)); setTo(today); }
    else if (period === "90d") { const d = new Date(td); d.setDate(d.getDate() - 89); setFrom(d.toISOString().slice(0, 10)); setTo(today); }
    else if (period === "year") { setFrom(`${td.getFullYear()}-01-01`); setTo(`${td.getFullYear()}-12-31`); }
  }, [period]);

  const fetchData = async () => {
    if (!from || !to) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/analytics?from=${from}&to=${to}&compare=${compare}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch analytics");
      setCurrent(data.current); setPrevious(data.previous);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load metrics");
    } finally { setLoading(false); }
  };

  const fetchRecentEvents = async () => {
    try {
      const res = await fetch("/api/admin/bookings?limit=20");
      const data = await res.json();
      if (res.ok) setRecentEvents(data.bookings ?? []);
    } catch (e) { console.error("Failed to load recent activity feed", e); }
  };

  useEffect(() => { fetchData(); }, [from, to, compare]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fetchRecentEvents(); const t = setInterval(fetchRecentEvents, 30000); return () => clearInterval(t); }, []);

  const kpiCards = useMemo(() => {
    if (!current) return [];
    const change = (curr: number, prev: number) => (!compare || !previous || prev === 0 ? null : Math.round(((curr - prev) / prev) * 1000) / 10);
    const pm = previous ?? { revenue: 0, bookings: 0, customers: 0, avgValue: 0, occupancy: 0 };
    const spark = (data: { revenue?: number; bookings?: number }[], key: "revenue" | "bookings") => data.slice(-10).map((d) => ({ val: d[key] ?? 0 }));
    const ph = [{ val: 4 }, { val: 9 }, { val: 6 }, { val: 12 }, { val: 8 }, { val: 14 }];
    return [
      { label: "Revenue", value: formatMoney(current.revenue), change: change(current.revenue, pm.revenue), isPositive: current.revenue >= pm.revenue, sparklineData: current.series.length ? spark(current.series, "revenue") : ph, icon: IndianRupee },
      { label: "Bookings", value: current.bookings.toString(), change: change(current.bookings, pm.bookings), isPositive: current.bookings >= pm.bookings, sparklineData: current.series.length ? spark(current.series, "bookings") : ph, icon: Calendar },
      { label: "New customers", value: current.customers.toString(), change: change(current.customers, pm.customers), isPositive: current.customers >= pm.customers, sparklineData: ph, icon: Users },
      { label: "Avg booking value", value: formatMoney(current.avgValue), change: change(current.avgValue, pm.avgValue), isPositive: current.avgValue >= pm.avgValue, sparklineData: ph, icon: ArrowUpRight },
      { label: "Occupancy rate", value: `${current.occupancy}%`, change: change(current.occupancy, pm.occupancy), isPositive: current.occupancy >= pm.occupancy, sparklineData: ph, icon: Percent },
    ];
  }, [current, previous, compare]);

  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dowData = useMemo(() => !current ? [] : DOW.map((label, idx) => ({ day: label, bookings: current.byDow.find((d) => d.dow === idx)?.count ?? 0 })), [current]);
  const hourData = useMemo(() => {
    if (!current) return [];
    const out = [];
    for (let h = 6; h <= 23; h++) out.push({ hour: `${h % 12 || 12}${h >= 12 ? "p" : "a"}`, bookings: current.byHour.find((r) => r.hour === h)?.count ?? 0 });
    return out;
  }, [current]);

  const exportCsv = () => { if (from && to) window.open(`/api/admin/analytics/export?from=${from}&to=${to}`, "_blank"); };
  const cardCls = "rounded-2xl border border-brand/10 bg-white p-5 shadow-soft";

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-brand/10 bg-white p-4 shadow-soft md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {(["today", "7d", "30d", "90d", "year", "custom"] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold uppercase tracking-wide transition ${period === p ? "bg-brand text-white shadow-soft" : "bg-brand/5 text-ink/60 hover:bg-brand/10 hover:text-brand"}`}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border border-brand/15 bg-white px-3 py-1.5 text-xs text-ink outline-none focus:border-brand" />
              <span className="text-xs text-slatey">to</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border border-brand/15 bg-white px-3 py-1.5 text-xs text-ink outline-none focus:border-brand" />
            </div>
          )}
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} className="h-4 w-4 accent-brand" />
              <span className="select-none text-xs font-semibold text-ink/70">Compare vs previous</span>
            </label>
            <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-brand/15 bg-brand/5 px-3.5 py-2 text-xs font-bold text-brand transition hover:bg-brand/10">
              <FileSpreadsheet className="h-4 w-4" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-brand/10 bg-white py-20 shadow-soft">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <p className="mt-4 text-xs text-slatey">Aggregating statistics…</p>
        </div>
      ) : error || !current ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 py-16 text-center">
          <p className="text-sm font-bold text-red-600">Failed to load analytics{error ? `: ${error}` : ""}</p>
          <button onClick={fetchData} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-brand shadow-soft hover:bg-brand/5">
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </button>
        </div>
      ) : (
        <div className="grid gap-5">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {kpiCards.map((kpi, idx) => {
              const Icon = kpi.icon;
              return (
                <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                  className="rounded-2xl border border-brand/10 bg-white p-4 shadow-soft transition hover:border-brand/25 hover:shadow-card">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slatey">{kpi.label}</span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand"><Icon className="h-4 w-4" /></span>
                  </div>
                  <div className="mt-2 font-display text-2xl font-extrabold text-ink">{kpi.value}</div>
                  <div className="mt-3 flex items-center justify-between">
                    {compare && kpi.change !== null ? (
                      <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${kpi.isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                        {kpi.isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                        {kpi.isPositive ? "+" : ""}{kpi.change}%
                      </span>
                    ) : (<span className="text-[10px] font-bold uppercase text-slatey/70">This period</span>)}
                    <div className="h-6 w-16">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={kpi.sparklineData}>
                          <Line type="monotone" dataKey="val" stroke={kpi.isPositive ? "#22C55E" : "#EF4444"} strokeWidth={1.75} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </section>

          <section className={cardCls}>
            <div className="mb-4">
              <h3 className="font-display text-base font-extrabold text-ink">Revenue trend over time</h3>
              <p className="mt-0.5 text-xs text-slatey">Confirmed daily receipts across all courts</p>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={current.series} margin={{ top: 6, right: 8, bottom: 0, left: -8 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BRAND} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} stroke={AXIS} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke={AXIS} fontSize={10} tickFormatter={(v) => `₹${v}`} tickLine={false} axisLine={false} width={56} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatMoney(Number(v)), "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke={BRAND} strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-2">
            <div className={cardCls}>
              <h4 className="mb-3 font-display text-sm font-extrabold text-ink">Bookings by hour</h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourData} margin={{ top: 6, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
                    <XAxis dataKey="hour" stroke={AXIS} fontSize={9} interval="preserveStartEnd" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} stroke={AXIS} fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(47,91,255,0.06)" }} />
                    <Bar dataKey="bookings" fill={BRAND} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={cardCls}>
              <h4 className="mb-3 font-display text-sm font-extrabold text-ink">Bookings by day of week</h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dowData} margin={{ top: 6, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
                    <XAxis dataKey="day" stroke={AXIS} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} stroke={AXIS} fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(47,91,255,0.06)" }} />
                    <Bar dataKey="bookings" fill={BRAND_SOFT} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-3">
            <div className={cardCls}>
              <h4 className="mb-4 font-display text-sm font-extrabold text-ink">Top time slots</h4>
              {current.topSlots.length === 0 ? <p className="py-8 text-center text-xs italic text-slatey">No records yet</p> : (
                <ul className="grid gap-2.5">
                  {current.topSlots.map((s, idx) => (
                    <li key={idx} className="flex items-center justify-between border-b border-brand/5 pb-2 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-brand/10 text-[10px] font-bold text-brand">{idx + 1}</span>
                        <span className="font-bold text-ink">{s.time}</span>
                      </div>
                      <div className="text-right"><p className="font-bold text-ink">{s.count} bookings</p><p className="text-[10px] text-slatey">{formatMoney(s.revenue)}</p></div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className={cardCls}>
              <h4 className="mb-4 font-display text-sm font-extrabold text-ink">Top customers</h4>
              {current.topCustomers.length === 0 ? <p className="py-8 text-center text-xs italic text-slatey">No records yet</p> : (
                <ul className="grid gap-2.5">
                  {current.topCustomers.map((c, idx) => (
                    <li key={idx} className="flex items-center justify-between border-b border-brand/5 pb-2 text-xs">
                      <div className="flex items-center gap-3 truncate">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-brand/10 text-[10px] font-bold text-brand">{idx + 1}</span>
                        <span className="truncate font-bold text-ink">{c.name}</span>
                      </div>
                      <div className="shrink-0 text-right"><p className="font-bold text-brand">{formatMoney(c.spent)}</p><p className="text-[10px] text-slatey">{c.bookings} bookings</p></div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className={cardCls}>
              <div className="mb-4 flex items-center justify-between">
                <h4 className="font-display text-sm font-extrabold text-ink">Recent activity</h4>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600">
                  <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-500" /> Live
                </span>
              </div>
              {recentEvents.length === 0 ? <p className="py-8 text-center text-xs italic text-slatey">No recent bookings</p> : (
                <ul className="grid max-h-[360px] gap-2.5 overflow-y-auto pr-1">
                  {recentEvents.slice(0, 10).map((b) => (
                    <li key={b.id} className="border-b border-brand/5 pb-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0"><p className="truncate font-bold text-ink">{b.user_name}</p><p className="mt-0.5 text-[10px] text-slatey">C{b.court_number} · {b.slot_date} at {b.slot_time}</p></div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${b.status === "confirmed" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>{b.status}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
