"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ShoppingCart, Trash2, CalendarDays } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Container } from "@/components/ui";
import { loadCart, saveCart, cartTotal, SPORT_LABEL, type Cart } from "@/lib/cart";
import { priceForRange } from "@/lib/slots";

function fmt(t: string) {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(d);
}
function addMin(t: string, mins: number) {
  const [h, m] = t.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
function dateLabel(v: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${v}T00:00:00`));
  } catch {
    return v;
  }
}

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCart(loadCart());
    setReady(true);
  }, []);

  function removeItem(idx: number) {
    if (!cart) return;
    const next = { ...cart, items: cart.items.filter((_, i) => i !== idx) };
    setCart(next);
    saveCart(next);
  }

  const empty = !cart || cart.items.length === 0;

  return (
    <>
      <Nav />
      <main className="app-surface min-h-screen-safe bg-brand-50/30 dark:bg-ink">
        <Container className="py-10 sm:py-14">
          <div className="mx-auto max-w-2xl">
            <span className="eyebrow"><ShoppingCart className="h-3.5 w-3.5" /> Your cart</span>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink dark:text-white sm:text-4xl">
              Review your booking
            </h1>

            {!ready ? null : empty ? (
              <div className="card-sport mt-6 p-8 text-center">
                <p className="text-sm text-slatey dark:text-white/60">Your cart is empty.</p>
                <Link href="/book" className="btn-primary mt-5 inline-flex">Book a slot <ArrowRight className="h-4 w-4" /></Link>
              </div>
            ) : (
              <>
                <div className="card-sport mt-6 p-5 sm:p-6">
                  <div className="mb-4 flex items-center justify-between border-b-2 border-ink/10 pb-3 dark:border-white/10">
                    <span className="flex items-center gap-2 text-sm font-extrabold text-ink dark:text-white">
                      <CalendarDays className="h-4 w-4 text-brand" /> {dateLabel(cart!.date)}
                    </span>
                    <span className="tag-sport">{SPORT_LABEL[cart!.sport] ?? cart!.sport}</span>
                  </div>

                  <ul className="space-y-2">
                    {cart!.items.map((it, idx) => (
                      <li key={`${it.court}-${it.time}-${idx}`} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-ink/8 bg-ink/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.02]">
                        <div>
                          <div className="text-sm font-extrabold text-ink dark:text-white">Court {it.court}</div>
                          <div className="text-xs text-slatey dark:text-white/50">
                            {fmt(it.time)} – {fmt(addMin(it.time, it.durationMin))} · {it.durationMin} min
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-display text-base font-extrabold text-brand dark:text-brand-300">
                            ₹{priceForRange(cart!.sport, cart!.date, it.time, it.durationMin)}
                          </span>
                          <button type="button" onClick={() => removeItem(idx)} aria-label="Remove" className="rounded-lg p-1.5 text-slatey transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex items-center justify-between rounded-2xl bg-ink px-4 py-3 text-lg font-extrabold text-white dark:bg-white dark:text-ink">
                    <span>Total</span>
                    <span>₹{cartTotal(cart)}</span>
                  </div>
                  <p className="mt-2 text-[0.7rem] text-slatey dark:text-white/40">Paddles &amp; balls are complimentary. Extensions are charged at half the hourly rate.</p>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Link href="/book" className="btn-outline w-full justify-center sm:w-auto">Add more slots</Link>
                  <button type="button" onClick={() => router.push("/payment")} className="btn-primary w-full justify-center sm:flex-1">
                    Proceed to payment <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
