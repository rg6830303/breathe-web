"use client";

import { Bar, BarChart, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AnalyticsHourBucket } from "@/lib/admin-data";

/** Off-peak / standard / prime / late bands, coloured against the brand
 *  palette. Keys must cover every hour the buckets return (6–22). */
function bandColor(hour: number) {
  if (hour >= 18 && hour <= 21) return "#2348E0"; // prime evening
  if (hour >= 22) return "#162EB3"; // late
  if (hour >= 12 && hour < 17) return "#6B8DFF"; // afternoon standard
  return "#9DB6FF"; // morning off-peak
}

function formatHour(hour: number) {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}${hour >= 12 ? "p" : "a"}`;
}

export function BookingHeatmap({ data }: { data: AnalyticsHourBucket[] }) {
  const chartData = data.map((b) => ({ ...b, label: formatHour(b.hour), fill: bandColor(b.hour) }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 16, right: 8, bottom: 8, left: -16 }}>
          <CartesianGrid stroke="rgba(15,23,42,0.06)" vertical={false} />
          <XAxis dataKey="label" stroke="#475569" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} stroke="#475569" tick={{ fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: "rgba(47,91,255,0.06)" }}
            contentStyle={{ borderRadius: 12, border: "1px solid rgba(47,91,255,0.2)", fontSize: 12 }}
            labelFormatter={(label) => `Hour: ${label}`}
            formatter={(value) => [String(value ?? 0), "Bookings"]}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.hour} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
