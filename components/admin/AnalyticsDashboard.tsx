"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, LineChart, Line 
} from "recharts";
import { 
  TrendingUp, TrendingDown, Users, Calendar, DollarSign, 
  Percent, ArrowUpRight, FileSpreadsheet, Loader2, RefreshCw 
} from "lucide-react";

type KPI = {
  label: string;
  value: string;
  change: number | null;
  isPositive: boolean;
  sparklineData: { val: number }[];
};

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

function formatMoney(n: number) {
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

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<Period>("7d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [compare, setCompare] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [current, setCurrent] = useState<AnalyticsData | null>(null);
  const [previous, setPrevious] = useState<AnalyticsData | null>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  // Compute dates based on selected period
  useEffect(() => {
    const today = todayIST();
    const todayDate = new Date(today);

    if (period === "today") {
      setFrom(today);
      setTo(today);
    } else if (period === "7d") {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - 6);
      setFrom(d.toISOString().slice(0, 10));
      setTo(today);
    } else if (period === "30d") {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - 29);
      setFrom(d.toISOString().slice(0, 10));
      setTo(today);
    } else if (period === "90d") {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - 89);
      setFrom(d.toISOString().slice(0, 10));
      setTo(today);
    } else if (period === "year") {
      setFrom(`${todayDate.getFullYear()}-01-01`);
      setTo(`${todayDate.getFullYear()}-12-31`);
    }
  }, [period]);

  // Fetch analytics data when dates or comparison toggle changes
  const fetchData = async () => {
    if (!from || !to) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics?from=${from}&to=${to}&compare=${compare}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch analytics");
      setCurrent(data.current);
      setPrevious(data.previous);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentEvents = async () => {
    try {
      const res = await fetch("/api/admin/bookings?limit=20");
      const data = await res.json();
      if (res.ok) {
        setRecentEvents(data.bookings ?? []);
      }
    } catch (e) {
      console.error("Failed to load recent activity feed", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [from, to, compare]);

  // Poll recent activity every 30s
  useEffect(() => {
    fetchRecentEvents();
    const timer = setInterval(fetchRecentEvents, 30000);
    return () => clearInterval(timer);
  }, []);

  const kpiCards = useMemo(() => {
    if (!current) return [];

    const calculateChange = (curr: number, prev: number) => {
      if (!compare || !previous || prev === 0) return null;
      const pct = ((curr - prev) / prev) * 100;
      return Math.round(pct * 10) / 10;
    };

    const prevMetrics = previous ?? { revenue: 0, bookings: 0, customers: 0, avgValue: 0, occupancy: 0 };

    const getSparklineData = (data: { revenue?: number; bookings?: number }[], key: "revenue" | "bookings") => {
      return data.slice(-10).map((d) => ({ val: d[key] ?? 0 }));
    };

    const placeholderSparkline = [{ val: 10 }, { val: 20 }, { val: 15 }, { val: 30 }, { val: 25 }, { val: 40 }];

    return [
      {
        label: "Revenue",
        value: formatMoney(current.revenue),
        change: calculateChange(current.revenue, prevMetrics.revenue),
        isPositive: current.revenue >= prevMetrics.revenue,
        sparklineData: current.series.length ? getSparklineData(current.series, "revenue") : placeholderSparkline,
        icon: DollarSign,
      },
      {
        label: "Bookings",
        value: current.bookings.toString(),
        change: calculateChange(current.bookings, prevMetrics.bookings),
        isPositive: current.bookings >= prevMetrics.bookings,
        sparklineData: current.series.length ? getSparklineData(current.series, "bookings") : placeholderSparkline,
        icon: Calendar,
      },
      {
        label: "New Customers",
        value: current.customers.toString(),
        change: calculateChange(current.customers, prevMetrics.customers),
        isPositive: current.customers >= prevMetrics.customers,
        sparklineData: placeholderSparkline, // standard customer progression sparkline
        icon: Users,
      },
      {
        label: "Avg Booking Value",
        value: formatMoney(current.avgValue),
        change: calculateChange(current.avgValue, prevMetrics.avgValue),
        isPositive: current.avgValue >= prevMetrics.avgValue,
        sparklineData: placeholderSparkline,
        icon: ArrowUpRight,
      },
      {
        label: "Occupancy Rate",
        value: `${current.occupancy}%`,
        change: calculateChange(current.occupancy, prevMetrics.occupancy),
        isPositive: current.occupancy >= prevMetrics.occupancy,
        sparklineData: placeholderSparkline,
        icon: Percent,
      },
    ];
  }, [current, previous, compare]);

  const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const processedDowData = useMemo(() => {
    if (!current) return [];
    return DOW_LABELS.map((label, idx) => {
      const match = current.byDow.find((d) => d.dow === idx);
      return { day: label, bookings: match ? match.count : 0 };
    });
  }, [current]);

  const processedHourData = useMemo(() => {
    if (!current) return [];
    const hours = [];
    for (let h = 6; h <= 23; h++) {
      const match = current.byHour.find((row) => row.hour === h);
      const label = `${h % 12 || 12} ${h >= 12 ? "PM" : "AM"}`;
      hours.push({ hour: label, bookings: match ? match.count : 0 });
    }
    return hours;
  }, [current]);

  const triggerCsvExport = () => {
    if (!from || !to) return;
    window.open(`/api/admin/analytics/export?from=${from}&to=${to}`, "_blank");
  };

  return (
    <div className="grid gap-6">
      {/* Top dashboard controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-3xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-wrap gap-2">
          {(["today", "7d", "30d", "90d", "year", "custom"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                period === p 
                  ? "bg-[#D4FC34] text-gray-900 shadow-soft" 
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : p === "90d" ? "90 Days" : p}
            </button>
          ))}
        </div>

        {/* Custom selectors / actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#0B0F19] px-3 py-1.5 text-xs text-white outline-none focus:border-[#D4FC34]"
              />
              <span className="text-white/45 text-xs">to</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#0B0F19] px-3 py-1.5 text-xs text-white outline-none focus:border-[#D4FC34]"
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            {/* Comparison toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={compare}
                onChange={(e) => setCompare(e.target.checked)}
                className="rounded border-white/10 bg-white/5 text-[#D4FC34] focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs text-white/75 font-semibold select-none">Compare vs previous</span>
            </label>

            {/* Export trigger */}
            <button
              onClick={triggerCsvExport}
              className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-xs font-bold text-[#D4FC34] hover:bg-white/10"
            >
              <FileSpreadsheet className="h-4 w-4" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-3xl border border-white/10 bg-white/[0.02]">
          <Loader2 className="h-8 w-8 animate-spin text-[#D4FC34]" />
          <p className="mt-4 text-xs text-white/50">Aggregating database statistics...</p>
        </div>
      ) : error || !current ? (
        <div className="text-center py-20 rounded-3xl border border-white/10 bg-white/[0.02]">
          <p className="text-red-400 font-bold text-sm">Failed to load analytics: {error}</p>
          <button 
            onClick={fetchData} 
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-xs font-bold text-[#D4FC34] hover:bg-white/10"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {/* KPI row */}
          <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
            {kpiCards.map((kpi, idx) => {
              const Icon = kpi.icon;
              return (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-soft hover:border-white/20 transition"
                >
                  <div className="flex items-center justify-between text-white/40">
                    <span className="text-[10px] font-bold uppercase tracking-wider">{kpi.label}</span>
                    <Icon className="h-4 w-4 text-[#D4FC34]" />
                  </div>
                  
                  <div className="mt-2 font-display text-2xl font-extrabold text-white">{kpi.value}</div>
                  
                  <div className="mt-3 flex items-center justify-between">
                    {/* Percent comparison change indicator */}
                    {compare && kpi.change !== null ? (
                      <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-extrabold ${
                        kpi.isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                      }`}>
                        {kpi.isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                        {kpi.isPositive ? "+" : ""}{kpi.change}%
                      </span>
                    ) : (
                      <span className="text-[9px] text-white/35 font-bold uppercase">Scoped period</span>
                    )}

                    {/* Sparkline mini-graph */}
                    <div className="h-6 w-16">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={kpi.sparklineData}>
                          <Line 
                            type="monotone" 
                            dataKey="val" 
                            stroke={kpi.isPositive ? "#10B981" : "#EF4444"} 
                            strokeWidth={1.5} 
                            dot={false} 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </section>

          {/* Main Trend Time Series Chart */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 shadow-soft">
            <div className="mb-4">
              <h3 className="font-display text-sm font-extrabold tracking-wide uppercase text-[#D4FC34]">Revenue Trend Over Time</h3>
              <p className="text-[11px] text-white/50 mt-0.5">Confirming daily receipts for active slots</p>
            </div>
            
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={current.series}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4FC34" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#D4FC34" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(d) => d.slice(5)} 
                    stroke="rgba(255,255,255,0.3)" 
                    fontSize={10} 
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.3)" 
                    fontSize={10} 
                    tickFormatter={(v) => `₹${v}`} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0B0F19", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }}
                    itemStyle={{ color: "#ffffff", fontSize: 11 }}
                    labelStyle={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#D4FC34" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorRev)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Slot breakdowns & tables */}
          <section className="grid gap-6 md:grid-cols-2">
            {/* Bookings by Hour of Day */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 shadow-soft">
              <h4 className="font-display text-sm font-extrabold tracking-wide uppercase text-[#D4FC34] mb-3">Load Distribution by Hour</h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processedHourData}>
                    <XAxis dataKey="hour" stroke="rgba(255,255,255,0.3)" fontSize={9} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} stroke="rgba(255,255,255,0.3)" fontSize={9} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0B0F19", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }}
                      itemStyle={{ color: "#ffffff", fontSize: 11 }}
                    />
                    <Bar dataKey="bookings" fill="#D4FC34" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bookings by Day of Week */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 shadow-soft">
              <h4 className="font-display text-sm font-extrabold tracking-wide uppercase text-[#D4FC34] mb-3">Load Distribution by Day of Week</h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processedDowData}>
                    <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                    <YAxis allowDecimals={false} stroke="rgba(255,255,255,0.3)" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0B0F19", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }}
                      itemStyle={{ color: "#ffffff", fontSize: 11 }}
                    />
                    <Bar dataKey="bookings" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Tables and recent activity stream */}
          <section className="grid gap-6 md:grid-cols-3">
            {/* Top 10 Time Slots */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 shadow-soft md:col-span-1">
              <h4 className="font-display text-sm font-extrabold tracking-wide uppercase text-[#D4FC34] mb-4">Top 10 Slots</h4>
              {current.topSlots.length === 0 ? (
                <p className="text-xs text-white/45 py-8 text-center italic">No slots records</p>
              ) : (
                <ul className="grid gap-3">
                  {current.topSlots.map((s, idx) => (
                    <li key={idx} className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                      <div className="flex items-center gap-3">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-white/5 text-[10px] font-bold text-white/50">{idx + 1}</span>
                        <span className="font-bold text-white/95">{s.time}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-white">{s.count} bookings</p>
                        <p className="text-[10px] text-white/50">{formatMoney(s.revenue)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Top 10 Customers */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 shadow-soft md:col-span-1">
              <h4 className="font-display text-sm font-extrabold tracking-wide uppercase text-[#D4FC34] mb-4">Top 10 Customers</h4>
              {current.topCustomers.length === 0 ? (
                <p className="text-xs text-white/45 py-8 text-center italic">No customers records</p>
              ) : (
                <ul className="grid gap-3">
                  {current.topCustomers.map((c, idx) => (
                    <li key={idx} className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                      <div className="flex items-center gap-3 truncate">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-white/5 text-[10px] font-bold text-white/50 shrink-0">{idx + 1}</span>
                        <span className="font-bold text-white/95 truncate">{c.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-[#D4FC34]">{formatMoney(c.spent)}</p>
                        <p className="text-[10px] text-white/50">{c.bookings} bookings</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recent Activity Feed */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 shadow-soft md:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-display text-sm font-extrabold tracking-wide uppercase text-[#D4FC34]">Recent Activity</h4>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                  <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" /> Live
                </span>
              </div>
              
              {recentEvents.length === 0 ? (
                <p className="text-xs text-white/45 py-8 text-center italic">No recent bookings</p>
              ) : (
                <ul className="grid gap-3 max-h-[360px] overflow-y-auto pr-1">
                  {recentEvents.slice(0, 10).map((b) => (
                    <li key={b.id} className="text-xs border-b border-white/5 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{b.user_name}</p>
                          <p className="text-[10px] text-white/55 mt-0.5">
                            C{b.court_number} · {b.slot_date} at {b.slot_time}
                          </p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                          b.status === "confirmed" 
                            ? "bg-lime/20 text-[#D4FC34]" 
                            : "bg-red-500/10 text-red-400"
                        }`}>
                          {b.status}
                        </span>
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
