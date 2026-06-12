"use client";

import { priceForRange } from "@/lib/slots";

export type Sport = "pickleball" | "cricket" | "badminton";

/** One line item in the cart — an effective booking range (incl. extensions). */
export type CartItem = {
  court: number;
  time: string; // effective start (HH:MM)
  durationMin: number;
  price: number;
  /** Per-item sport so a single cart can mix sports. Older carts omit it and
   *  fall back to the cart-level `sport`. */
  sport?: Sport;
};

export type Cart = {
  date: string;
  /** Most-recent sport added (kept for back-compat / order-level fallback). */
  sport: Sport;
  items: CartItem[];
};

/** The effective sport for a line item (per-item, else the cart's). */
export function itemSport(cart: Cart, item: CartItem): Sport {
  return item.sport ?? cart.sport;
}

/** Distinct sports present in the cart, in first-seen order. */
export function cartSports(cart: Cart | null): Sport[] {
  if (!cart) return [];
  const seen: Sport[] = [];
  for (const it of cart.items) {
    const s = it.sport ?? cart.sport;
    if (!seen.includes(s)) seen.push(s);
  }
  return seen;
}

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
  return cart.items.reduce((sum, i) => sum + priceForRange(i.sport ?? cart.sport, cart.date, i.time, i.durationMin), 0);
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
