export type PricingRule = {
  id: number;
  label: string;
  start_time: string;
  end_time: string;
  price: number;
};

export const fallbackPricingRules: PricingRule[] = [
  { id: 1, label: "Off peak (5 AM - 5 PM)", start_time: "05:00", end_time: "17:00", price: 600 },
  { id: 2, label: "Peak (5 PM - 11 PM)", start_time: "17:00", end_time: "23:00", price: 800 },
  { id: 3, label: "Weekend & Holidays", start_time: "05:00", end_time: "23:00", price: 1000 },
];

export function isWeekendOrHoliday(dateStr: string): boolean {
  if (!dateStr) return false;
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3) return false;
  const year = parts[0];
  const month = parts[1] - 1; // 0-indexed
  const day = parts[2];
  const date = new Date(year, month, day);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const shortDate = `${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const holidays = [
    "01-26", // Republic Day
    "08-15", // Independence Day
    "10-02", // Gandhi Jayanti
    "12-25", // Christmas
  ];
  return isWeekend || holidays.includes(shortDate);
}

export function getSlotPrice(sportOrTime: string, date?: string, timeStr?: string): number {
  if (!date || !timeStr) {
    const time = sportOrTime;
    const [h, m] = time.split(":").map(Number);
    const minutes = h * 60 + m;
    if (minutes >= 300 && minutes < 1020) return 600; // 5 AM - 5 PM
    return 800; // 5 PM - 11 PM
  }

  const sport = sportOrTime;
  const [h, m] = timeStr.split(":").map(Number);
  const minutes = h * 60 + m;
  const isWeekend = isWeekendOrHoliday(date);

  if (sport === "cricket") {
    if (isWeekend) return 2500;
    if (minutes >= 300 && minutes < 1020) return 1500;
    return 2000;
  } else {
    if (isWeekend) return 1000;
    if (minutes >= 300 && minutes < 1020) return 600;
    return 800;
  }
}

export function calculateTotals(base: number, equipmentTotal = 0) {
  const subtotal = base + equipmentTotal;
  const taxes = 0;
  return { subtotal, taxes, total: subtotal };
}
