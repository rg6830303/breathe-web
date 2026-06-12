"use client";

import { priceForRange } from "@/lib/slots";

/** One line item in the cart — an effective booking range (incl. extensions). */
export type CartItem = {
  court: number;
  time: string; // effective start (HH:MM)
  durationMin: number;
  price: number;
};

export type Cart = {
  date: string;
  sport: "pickleball" | "cricket" | "badminton";
  items: CartItem[];
};

const KEY = "breathe-cart-v1";

export function saveCart(cart: Cart): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(cart));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

export function loadCart(): Cart | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Cart;
    if (!c || !Array.isArray(c.items)) return null;
    return c;
  } catch {
    return null;
  }
}

export function clearCart(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function cartTotal(cart: Cart | null): number {
  if (!cart) return 0;
  return cart.items.reduce((sum, i) => sum + priceForRange(i.time, i.durationMin, cart.date, cart.sport), 0);
}

export function cartMinutes(cart: Cart | null): number {
  if (!cart) return 0;
  return cart.items.reduce((sum, i) => sum + i.durationMin, 0);
}

export const SPORT_LABEL: Record<string, string> = {
  pickleball: "🎾 Pickleball",
  cricket: "🏏 Cricket",
  badminton: "🏸 Badminton",
};
