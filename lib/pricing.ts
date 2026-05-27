import type { PricingRule } from "@/lib/types";

export const fallbackPricingRules: PricingRule[] = [
  { id: 1, label: "Off peak", court_id: null, start_time: "06:00", end_time: "16:00", price: 600, active: true },
  { id: 2, label: "Standard", court_id: null, start_time: "16:00", end_time: "18:00", price: 750, active: true },
  { id: 3, label: "Prime time", court_id: null, start_time: "18:00", end_time: "21:00", price: 900, active: true },
  { id: 4, label: "Late play", court_id: null, start_time: "21:00", end_time: "23:00", price: 750, active: true },
];

function minutes(value: string) {
  const [hour, minute] = value.slice(0, 5).split(":").map(Number);
  return hour * 60 + minute;
}

export function priceForSlot(date: Date, rules: PricingRule[] = fallbackPricingRules, courtId?: number) {
  const slotMinutes = date.getHours() * 60 + date.getMinutes();
  const match = rules
    .filter((rule) => rule.active && (rule.court_id === null || rule.court_id === courtId))
    .sort((a, b) => (b.court_id ?? 0) - (a.court_id ?? 0))
    .find((rule) => slotMinutes >= minutes(rule.start_time) && slotMinutes < minutes(rule.end_time));

  if (match) return Number(match.price);

  const hour = date.getHours();
  if (hour >= 18 && hour < 21) return 900;
  if (hour >= 6 && hour < 16) return 600;
  return 750;
}

export function calculateTotals(base: number, equipmentTotal = 0) {
  const subtotal = base + equipmentTotal;
  const taxes = Math.round(subtotal * 0.18);
  return { subtotal, taxes, total: subtotal + taxes };
}
