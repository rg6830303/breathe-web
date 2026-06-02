"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Loader2, Sparkles, Zap } from "lucide-react";
import { useToast } from "@/components/ui/toast";

type Account = { id: string; email: string; name: string; role: "user" | "admin" } | null;

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

export function BulkPassCard() {
  const router = useRouter();
  const toast = useToast();
  const [account, setAccount] = useState<Account>(null);
  const [balanceMin, setBalanceMin] = useState(0);
  const [busy, setBusy] = useState(false);
  const PRICE = 8000;

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setAccount(d.user ?? null)).catch(() => {});
    fetch("/api/player/credits").then((r) => (r.ok ? r.json() : null)).then((d) => d && setBalanceMin(Number(d.balanceMin) || 0)).catch(() => {});
  }, []);

  async function buy() {
    if (!account || account.role !== "user") {
      router.push("/login?next=/book");
      return;
    }
    setBusy(true);
    try {
      const orderRes = await fetch("/api/bookings/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountOverride: PRICE, purchase: "bulk-12h" }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error ?? "Could not start purchase.");
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Could not load checkout.");
      const Razorpay = (window as unknown as { Razorpay: new (o: unknown) => { open: () => void } }).Razorpay;
      const rzp = new Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Breathe Pickleball",
        description: "12-Hour Bulk Pass",
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
                purchase: "bulk-12h",
              }),
            });
            const v = await vr.json();
            if (!vr.ok) throw new Error(v.error ?? "Verification failed");
            setBalanceMin(Number(v.balanceMin) || 0);
            toast.show("12 hours added! Book any open slot instantly — no payment needed.", "success");
          } catch (e) {
            toast.show(e instanceof Error ? e.message : "Verification failed", "error");
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.open();
    } catch (e) {
      setBusy(false);
      toast.show(e instanceof Error ? e.message : "Could not start purchase.", "error");
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-brand/10 bg-gradient-to-br from-brand-700 to-brand-900 p-5 text-white shadow-glow sm:p-6">
      <div className="court-lines absolute inset-0 opacity-15" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-lime">
            <Sparkles className="h-3 w-3" /> Best value
          </div>
          <h3 className="mt-2 font-display text-xl font-extrabold sm:text-2xl">12-Hour Bulk Pass · ₹8,000</h3>
          <p className="mt-1 max-w-md text-sm text-white/80">
            Prepay 12 hours of court time, then book any open slot <strong>instantly with no further payment</strong>. Works out to ~₹667/hour.
          </p>
          {balanceMin > 0 && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-lime/20 px-3 py-1 text-xs font-bold text-lime">
              <Clock className="h-3.5 w-3.5" /> You have {Math.round((balanceMin / 60) * 10) / 10}h prepaid
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={buy}
          disabled={busy}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-lime px-6 py-3.5 text-sm font-bold text-gray-900 shadow-soft transition hover:bg-lime-dark active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {balanceMin > 0 ? "Top up 12 hours" : "Buy 12-Hour Pass"}
        </button>
      </div>
    </div>
  );
}
