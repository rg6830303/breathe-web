// Open-Meteo forecast for Kaikhali (Breathe's outdoor courts). No API key,
// no rate-limit concerns at our traffic, and Open-Meteo's CC-BY license is
// fine for surfacing the values inline in our UI.

export type Forecast = {
  tempC: number;
  rainPct: number;
  code: number;
  icon: string;
  label: string;
};

const KAIKHALI_LAT = 22.6548;
const KAIKHALI_LON = 88.4347;
const BASE = "https://api.open-meteo.com/v1/forecast";

const cache = new Map<string, { at: number; value: Forecast | null }>();
const TTL_MS = 30 * 60 * 1000;

/** WMO weather codes → friendly label + emoji. Snow / sleet codes are listed
 *  for completeness but won't fire in Kolkata. */
function describe(code: number): { label: string; icon: string } {
  if (code === 0) return { label: "Clear", icon: "☀️" };
  if (code <= 3) return { label: "Partly cloudy", icon: "⛅" };
  if (code === 45 || code === 48) return { label: "Foggy", icon: "🌫️" };
  if (code >= 51 && code <= 67) return { label: "Rainy", icon: "🌧️" };
  if (code >= 71 && code <= 77) return { label: "Snowy", icon: "❄️" };
  if (code >= 80 && code <= 82) return { label: "Showers", icon: "🌦️" };
  if (code >= 95) return { label: "Thunderstorm", icon: "⛈️" };
  return { label: "Mixed", icon: "🌤️" };
}

export async function getWeatherForDate(dateISO: string): Promise<Forecast | null> {
  // Out-of-range fast-path: Open-Meteo only forecasts ~16 days ahead, the
  // spec asks us to return null past 7 to keep the UI honest.
  const target = new Date(`${dateISO}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const daysAhead = Math.round((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (Number.isNaN(daysAhead) || daysAhead < 0 || daysAhead > 7) return null;

  const cached = cache.get(dateISO);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

  const url =
    `${BASE}?latitude=${KAIKHALI_LAT}&longitude=${KAIKHALI_LON}` +
    `&daily=weathercode,precipitation_probability_max,temperature_2m_max` +
    `&timezone=Asia%2FKolkata&forecast_days=8`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 * 30 } });
    if (!res.ok) {
      cache.set(dateISO, { at: Date.now(), value: null });
      return null;
    }
    const json = (await res.json()) as {
      daily?: { time: string[]; weathercode: number[]; precipitation_probability_max: number[]; temperature_2m_max: number[] };
    };
    const idx = json.daily?.time.indexOf(dateISO) ?? -1;
    if (idx < 0 || !json.daily) {
      cache.set(dateISO, { at: Date.now(), value: null });
      return null;
    }
    const code = json.daily.weathercode[idx]!;
    const { label, icon } = describe(code);
    const forecast: Forecast = {
      tempC: Math.round(json.daily.temperature_2m_max[idx]!),
      rainPct: Math.round(json.daily.precipitation_probability_max[idx] ?? 0),
      code,
      icon,
      label,
    };
    cache.set(dateISO, { at: Date.now(), value: forecast });
    return forecast;
  } catch {
    cache.set(dateISO, { at: Date.now(), value: null });
    return null;
  }
}
