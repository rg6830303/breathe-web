export function priceForSlot(date: Date) {
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
