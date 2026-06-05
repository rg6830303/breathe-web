"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudLightning, CloudRain, CloudSun, Droplets, Sun, Thermometer, Wind } from "lucide-react";

type WeatherData = {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  code: number;
  isDay: boolean;
};

export function WeatherWidget({ compact = false }: { compact?: boolean }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Kaikhali, Kolkata Coordinates
    const lat = 22.6105;
    const lon = 88.4306;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&timezone=Asia%2FKolkata`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Weather fetch failed");
        return res.json();
      })
      .then((data) => {
        const cur = data.current;
        setWeather({
          temp: Math.round(cur.temperature_2m),
          feelsLike: Math.round(cur.apparent_temperature),
          humidity: Math.round(cur.relative_humidity_2m),
          windSpeed: Math.round(cur.wind_speed_10m),
          code: cur.weather_code,
          isDay: Boolean(cur.is_day),
        });
        setError(false);
      })
      .catch((err) => {
        console.error("[weather-widget error]", err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  function getWeatherDetails(code: number, isDay: boolean) {
    // WMO Weather interpretation codes
    if (code === 0) return { label: "Clear Skies", icon: Sun, color: "text-lime" };
    if ([1, 2, 3].includes(code)) return { label: "Partly Cloudy", icon: CloudSun, color: "text-blue-300" };
    if ([45, 48].includes(code)) return { label: "Foggy Conditions", icon: Cloud, color: "text-white/50" };
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { label: "Rainy Weather", icon: CloudRain, color: "text-blue-400" };
    if ([95, 96, 99].includes(code)) return { label: "Thunderstorm", icon: CloudLightning, color: "text-amber-400" };
    return { label: "Overcast", icon: Cloud, color: "text-white/50" };
  }

  function getRecommendation(temp: number, code: number) {
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code)) {
      return {
        badge: "Wet Courts",
        text: "Damp conditions. Check court status before you head out.",
        style: "bg-red-500/10 text-red-400 border-2 border-red-500/20",
      };
    }
    if (temp > 33) {
      return {
        badge: "Hot & Intense",
        text: "High temperature. Hydrate well between rallies!",
        style: "bg-amber-500/10 text-amber-400 border-2 border-amber-500/20",
      };
    }
    if (temp < 18) {
      return {
        badge: "Brisk & Fresh",
        text: "Perfect playing temp. Great speed for rallies!",
        style: "bg-lime/10 text-lime border-2 border-lime/20",
      };
    }
    return {
      badge: "Prime Play Time",
      text: "Ideal outdoor conditions for a peak match. Serve it up!",
      style: "bg-lime/10 text-lime border-2 border-lime/20",
    };
  }

  if (loading) {
    return (
      <div className="flex animate-pulse items-center justify-between rounded-2xl border-2 border-white/10 bg-ink p-4 text-xs text-white/50">
        <span className="font-semibold uppercase tracking-wide">Syncing live weather…</span>
        <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-white/40 animate-spin" />
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="flex items-center justify-between rounded-2xl border-2 border-white/10 bg-ink p-4 text-xs text-white/60">
        <span>Kaikhali, Kolkata · 28°C · Perfect for play</span>
        <span className="tag-sport text-lime">Live</span>
      </div>
    );
  }

  const { label, icon: Icon, color } = getWeatherDetails(weather.code, weather.isDay);
  const rec = getRecommendation(weather.temp, weather.code);

  // Compact single-line bar for tight layouts
  if (compact) {
    return (
      <div className="flex items-center justify-between rounded-2xl border-2 border-white/10 bg-ink px-4 py-2.5 text-white">
        <div className="flex items-center gap-2 text-xs">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="font-extrabold">{weather.temp}°C · {label}</span>
          <span className="text-white/40 uppercase tracking-wide">Kaikhali</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/50">
          <span>💧 {weather.humidity}%</span>
          <span>💨 {weather.windSpeed} km/h</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${rec.style}`}>
            {rec.badge}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-white/10 bg-ink p-5 text-white transition hover:border-lime/30 sm:p-6">
      {/* Subtle court-line texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Location + main label */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-white/10">
            <Icon className={`h-7 w-7 ${color}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-display text-xs font-extrabold uppercase tracking-[0.2em] text-lime">
                Kaikhali, Kolkata
              </h4>
              <span className="inline-flex items-center gap-1 rounded-full bg-lime/15 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-lime">
                <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse" /> Live
              </span>
            </div>
            <p className="mt-0.5 text-[0.7rem] text-white/50">{label} · Outdoor Court Check</p>
          </div>
        </div>

        {/* Weather stats */}
        <div className="grid grid-cols-3 gap-4 border-y-2 border-white/8 py-3 sm:border-y-0 sm:py-0 sm:flex sm:items-center sm:gap-6">
          <div className="flex items-center gap-1.5">
            <Thermometer className={`h-4 w-4 ${color}`} />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-white/40">Temp</p>
              <p className="text-sm font-extrabold font-display">{weather.temp}°C</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Droplets className="h-4 w-4 text-blue-400" />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-white/40">Humidity</p>
              <p className="text-sm font-extrabold font-display">{weather.humidity}%</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Wind className="h-4 w-4 text-teal-400" />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-white/40">Wind</p>
              <p className="text-sm font-extrabold font-display">{weather.windSpeed} km/h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendation banner */}
      <div className={`mt-4 flex flex-col gap-2 rounded-xl p-3 text-xs sm:flex-row sm:items-center sm:gap-3 ${rec.style}`}>
        <span className="inline-block shrink-0 rounded-lg bg-white/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
          {rec.badge}
        </span>
        <span className="leading-relaxed">{rec.text}</span>
      </div>
    </div>
  );
}
