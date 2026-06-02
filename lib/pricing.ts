export type PricingRule = {
  id: number;
  label: string;
  start_time: string;
  end_time: string;
  price: number;
};

export const fallbackPricingRules: PricingRule[] = [
  { id: 1, label: "Off peak", start_time: "06:00", end_time: "16:00", price: 600 },
  { id: 2, label: "Standard", start_time: "16:00", end_time: "18:00", price: 750 },
  { id: 3, label: "Prime time", start_time: "18:00", end_time: "21:00", price: 900 },
  { id: 4, label: "Late play", start_time: "21:00", end_time: "23:00", price: 750 },
];

export function getSlotPrice(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  const minutes = h * 60 + m;
  if (minutes >= 360 && minutes < 960) return 600; // 06:00–16:00 off-peak
  if (minutes >= 960 && minutes < 1080) return 750; // 16:00–18:00 standard
  if (minutes >= 1080 && minutes < 1260) return 900; // 18:00–21:00 prime
  return 750; // 21:00–23:00 late
}

export function calculateTotals(base: number, equipmentTotal = 0) {
  // The club does not currently charge GST, so taxes are 0 and total == subtotal.
  const subtotal = base + equipmentTotal;
  const taxes = 0;
  return { subtotal, taxes, total: subtotal };
}
