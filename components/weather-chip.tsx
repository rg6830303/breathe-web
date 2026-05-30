"use client";

import { useEffect, useState } from "react";
import type { Forecast } from "@/lib/weather";

/** Inline weather chip rendered above the slot grid. Silent on fetch error,
 *  out-of-range dates, and pre-mount — never shows an error to the user. */
export function WeatherChip({ date }: { date: string }) {
  const [forecast, setForecast] = useState<Forecast | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/weather?date=${date}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((payload) => {
        if (!cancelled) setForecast(payload.forecast ?? null);
      })
      .catch(() => {
        if (!cancelled) setForecast(null);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  if (!forecast) return null;
  const wet = forecast.rainPct > 50;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 bg-brand-50 rounded-lg px-4 py-2">
      <span aria-hidden="true">{forecast.icon}</span>
      <span>
        {forecast.tempC}°C · {forecast.label} · {forecast.rainPct}% chance of rain
      </span>
      {wet && (
        <span className="text-amber font-medium ml-2">
          ⚠ Outdoor courts — check before you head out
        </span>
      )}
    </div>
  );
}
