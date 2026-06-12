export type PricingRule = {
  id: number;
  label: string;
  price: number;
};

export const fallbackPricingRules: PricingRule[] = [
  { id: 1, label: "Pickleball/Badminton Weekday Day (5 AM - 5 PM)", price: 600 },
  { id: 2, label: "Pickleball/Badminton Weekday Night (5 PM - 11 PM)", price: 800 },
  { id: 3, label: "Pickleball/Badminton Weekend & Holidays", price: 1000 },
  { id: 4, label: "Cricket Weekday Day (5 AM - 5 PM)", price: 1500 },
  { id: 5, label: "Cricket Weekday Night (5 PM - 11 PM)", price: 2000 },
  { id: 6, label: "Cricket Weekend & Holidays", price: 2500 },
];

export function getSlotPrice(
  timeStr: string,
  dateStr?: string,
  sport: "pickleball" | "badminton" | "cricket" = "pickleball",
): number {
  const [h, m] = timeStr.split(":").map(Number);
  const minutes = h * 60 + m;

  // 1. Determine if it's weekend (Saturday or Sunday)
  let isWeekend = false;
  if (dateStr) {
    const d = new Date(`${dateStr}T00:00:00`);
    const day = d.getDay();
    isWeekend = day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
  }

  // 2. Return price based on sport and day type
  if (sport === "cricket") {
    if (isWeekend) {
      return 2500;
    } else {
      if (minutes >= 300 && minutes < 1020) { // 5 AM - 5 PM
        return 1500;
      } else { // 5 PM - 11 PM
        return 2000;
      }
    }
  } else {
    // Pickleball or Badminton
    if (isWeekend) {
      return 1000;
    } else {
      if (minutes >= 300 && minutes < 1020) { // 5 AM - 5 PM
        return 600;
      } else { // 5 PM - 11 PM
        return 800;
      }
    }
  }
}

export function calculateTotals(base: number, equipmentTotal = 0) {
  // The club does not currently charge GST, so taxes are 0 and total == subtotal.
  const subtotal = base + equipmentTotal;
  const taxes = 0;
  return { subtotal, taxes, total: subtotal };
}

