"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudLightning, CloudRain, CloudSun, Compass, Droplets, Sun, Thermometer, Wind } from "lucide-react";

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
    if (code === 0) return { label: "Clear Skies", icon: Sun, color: "text-[#D4FC34]" };
    if ([1, 2, 3].includes(code)) return { label: "Partly Cloudy", icon: CloudSun, color: "text-blue-300" };
    if ([45, 48].includes(code)) return { label: "Foggy Conditions", icon: Cloud, color: "text-slate-400" };
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { label: "Rainy Weather", icon: CloudRain, color: "text-blue-400" };
    if ([95, 96, 99].includes(code)) return { label: "Thunderstorm", icon: CloudLightning, color: "text-amber-500" };
    return { label: "Overcast", icon: Cloud, color: "text-slate-300" };
  }

  function getRecommendation(temp: number, code: number) {
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code)) {
      return {
        badge: "🔴 Wet Courts",
        text: "Damp conditions. Check court status or fetch a paddle cover!",
        color: "bg-red-500/10 text-red-400 border border-red-500/20",
      };
    }
    if (temp > 33) {
      return {
        badge: "🟡 Hot & Intense",
        text: "High temperature. Hydrate well between rallies! 💧",
        color: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
      };
    }
    if (temp < 18) {
      return {
        badge: "🟢 Brisk & Fresh",
        text: "Perfect playing temp. Great speed for rallies! 🏓",
        color: "bg-[#D4FC34]/10 text-[#D4FC34] border border-[#D4FC34]/20",
      };
    }
    return {
      badge: "🟢 Prime Play Time",
      text: "Ideal outdoor conditions for a peak match. Serve it up! 🎾",
      color: "bg-[#D4FC34]/10 text-[#D4FC34] border border-[#D4FC34]/20",
    };
  }

  if (loading) {
    return (
      <div className="flex animate-pulse items-center justify-between rounded-2xl border border-white/10 bg-[#0B0F19] p-4 text-xs text-white/60">
        <span>Syncing live weather details...</span>
        <div className="h-4 w-4 rounded-full border border-t-transparent border-white/60 animate-spin" />
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0B0F19] p-4 text-xs text-white/60">
        <span>🌤️ Kaikhali, Kolkata · 28°C · Perfect for play</span>
        <span className="text-[10px] uppercase font-bold text-[#D4FC34]">Live</span>
      </div>
    );
  }

  const { label, icon: Icon, color } = getWeatherDetails(weather.code, weather.isDay);
  const rec = getRecommendation(weather.temp, weather.code);

  // Compact single-line bar for tight layouts (e.g., calendar page)
  if (compact) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0B0F19] px-4 py-2.5 text-white">
        <div className="flex items-center gap-2 text-xs">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="font-semibold">{weather.temp}°C · {label}</span>
          <span className="text-white/40">Kaikhali</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/60">
          <span>💧 {weather.humidity}%</span>
          <span>💨 {weather.windSpeed} km/h</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${rec.color}`}>{rec.badge}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0B0F19] p-5 text-white shadow-soft transition hover:border-[#D4FC34]/30 sm:p-6">
      {/* Background net effect */}
      <div className="court-lines absolute inset-0 opacity-5 pointer-events-none" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left column - Location & main temp */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
            <Icon className={`h-8 w-8 ${color}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-display text-sm font-extrabold tracking-wide uppercase text-[#D4FC34]">Kaikhali, Kolkata</h4>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" /> Live
              </span>
            </div>
            <p className="text-xs text-white/60 mt-0.5">{label} · Outdoor Court Check</p>
          </div>
        </div>

        {/* Middle column - Mini weather stats */}
        <div className="grid grid-cols-3 gap-4 border-y border-white/5 py-3 sm:border-y-0 sm:py-0 sm:flex sm:items-center sm:gap-6">
          <div className="flex items-center gap-1.5">
            <Thermometer className="h-4 w-4 text-[#D4FC34]" />
            <div>
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-wide">Temp</p>
              <p className="text-sm font-extrabold font-display">{weather.temp}°C</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Droplets className="h-4 w-4 text-blue-400" />
            <div>
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-wide">Humidity</p>
              <p className="text-sm font-extrabold font-display">{weather.humidity}%</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Wind className="h-4 w-4 text-teal-400" />
            <div>
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-wide">Wind</p>
              <p className="text-sm font-extrabold font-display">{weather.windSpeed} km/h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Recommendation Banner */}
      <div className={`mt-4 flex flex-col gap-2 rounded-xl p-3 text-xs sm:flex-row sm:items-center sm:gap-3 ${rec.color}`}>
        <span className="inline-block shrink-0 rounded px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-white/10">
          {rec.badge}
        </span>
        <span className="leading-relaxed">{rec.text}</span>
      </div>
    </div>
  );
}
