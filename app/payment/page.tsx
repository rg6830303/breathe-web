"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Container } from "@/components/ui";
import { loadCart, clearCart, cartTotal, cartMinutes, SPORT_LABEL, type Cart } from "@/lib/cart";
import { priceForRange } from "@/lib/slots";

type Account = { id: string; email: string; name: string; role: "user" | "admin" } | null;

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
function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    const w = window as unknown as { Razorpay?: unknown };
    if (w.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function PaymentPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [account, setAccount] = useState<Account>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [creditMin, setCreditMin] = useState(0);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCart(loadCart());
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setAccount(d.user ?? null)).catch(() => {}).finally(() => setAuthLoaded(true));
    fetch("/api/player/credits").then((r) => (r.ok ? r.json() : null)).then((d) => d && setCreditMin(Number(d.balanceMin) || 0)).catch(() => {});
  }, []);

  const total = cartTotal(cart);
  const neededMin = cartMinutes(cart);
  const hasCredit = creditMin >= neededMin && (cart?.items.length ?? 0) > 0;
  const slotsPayload = (cart?.items ?? []).map((i) => ({ date: cart!.date, court: i.court, time: i.time, durationMin: i.durationMin }));

  function done() {
    clearCart();
    router.push("/booking/confirmed");
  }

  async function payWithCredit() {
    if (!cart) return;
    setPaying(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: slotsPayload, sport: cart.sport }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not book with credit.");
      done();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not book with credit.");
      setPaying(false);
    }
  }

  async function payNow() {
    if (!cart) return;
    if (!account || account.role !== "user") {
      router.push("/login?next=/payment");
      return;
    }
    setPaying(true);
    setError(null);
    try {
      const orderRes = await fetch("/api/bookings/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: slotsPayload, sport: cart.sport, addons: [] }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error ?? "Could not create order");
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Could not load Razorpay checkout.");
      const Razorpay = (window as unknown as {
        Razorpay: new (o: unknown) => { open: () => void; on: (e: string, cb: (r: { error?: { description?: string } }) => void) => void };
      }).Razorpay;
      const rzp = new Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Breathe Pickleball",
        description: `Court booking · ${slotsPayload.length} slot${slotsPayload.length > 1 ? "s" : ""}`,
        order_id: order.orderId,
        prefill: { name: account.name, email: account.email },
        theme: { color: "#2F5BFF" },
        handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const vr = await fetch("/api/bookings/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: resp.razorpay_order_id,
                paymentId: resp.razorpay_payment_id,
                signature: resp.razorpay_signature,
                slots: slotsPayload,
                sport: cart.sport,
                addons: [],
              }),
            });
            const v = await vr.json();
            if (!vr.ok) throw new Error(v.error ?? "Payment verification failed");
            done();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Verification failed");
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.on("payment.failed", (r) => {
        setPaying(false);
        setError(
          r?.error?.description
            ? `Payment failed: ${r.error.description}. You have not been charged — please try again.`
            : "Payment failed or was cancelled. You have not been charged — please try again.",
        );
      });
      rzp.open();
    } catch (e) {
      setPaying(false);
      setError(e instanceof Error ? e.message : "Could not start payment");
    }
  }

  const empty = !cart || cart.items.length === 0;

  return (
    <>
      <Nav />
      <main className="app-surface min-h-screen-safe bg-brand-50/30 dark:bg-ink">
        <Container className="py-10 sm:py-14">
          <div className="mx-auto max-w-lg">
            <span className="eyebrow"><Lock className="h-3.5 w-3.5" /> Secure checkout</span>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink dark:text-white sm:text-4xl">Payment</h1>

            {empty ? (
              <div className="card-sport mt-6 p-8 text-center">
                <p className="text-sm text-slatey dark:text-white/60">Your cart is empty.</p>
                <Link href="/book" className="btn-primary mt-5 inline-flex">Book a slot</Link>
              </div>
            ) : (
              <div className="card-sport mt-6 p-5 sm:p-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-extrabold text-ink dark:text-white">{SPORT_LABEL[cart!.sport] ?? cart!.sport}</span>
                  <Link href="/cart" className="text-xs font-bold text-brand hover:underline">Edit cart</Link>
                </div>
                <ul className="space-y-1.5 text-sm">
                  {cart!.items.map((it, idx) => (
                    <li key={idx} className="flex justify-between text-slatey dark:text-white/60">
                      <span>Court {it.court} · {fmt(it.time)}–{fmt(addMin(it.time, it.durationMin))}</span>
                      <span className="font-bold text-ink dark:text-white">₹{priceForRange(it.time, it.durationMin)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-ink px-4 py-3 text-lg font-extrabold text-white dark:bg-white dark:text-ink">
                  <span>Total</span>
                  <span>₹{total}</span>
                </div>

                {error && (
                  <div className="mt-3 rounded-xl border-2 border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">{error}</div>
                )}

                {authLoaded && (!account || account.role !== "user") ? (
                  <Link href="/login?next=/payment" className="btn-primary mt-5 w-full justify-center">Log in to pay</Link>
                ) : (
                  <div className="mt-5 space-y-2">
                    {hasCredit && (
                      <button type="button" onClick={payWithCredit} disabled={paying} className="btn-accent w-full justify-center">
                        {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Use prepaid hours
                      </button>
                    )}
                    <button type="button" onClick={payNow} disabled={paying} className={`${hasCredit ? "btn-outline" : "btn-primary"} w-full justify-center`}>
                      {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Pay ₹{total} with Razorpay
                    </button>
                  </div>
                )}
                <p className="mt-3 text-[0.7rem] leading-5 text-slatey dark:text-white/40">Slots are confirmed instantly once payment succeeds. Free cancellation up to 4 hours before your slot.</p>
              </div>
            )}
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
