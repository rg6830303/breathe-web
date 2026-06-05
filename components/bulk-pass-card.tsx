"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Loader2, Sparkles, Zap } from "lucide-react";
import { useToast } from "@/components/ui/toast";

type Account = { id: string; email: string; name: string; role: "user" | "admin" } | null;

// ── TEMPORARY: ₹1 hosted payment-link test mode ──────────────────────────────
// Set TEST_PAYMENT_LINK = "" to restore the normal in-app Razorpay checkout.
const TEST_PAYMENT_LINK = "https://rzp.io/rzp/fPpPufB";

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
      // TEMP ₹1 test: open the hosted payment link, then grant the bulk credit
      // (test bypass) so the prepaid balance updates as in a real purchase.
      if (TEST_PAYMENT_LINK) {
        window.open(TEST_PAYMENT_LINK, "_blank", "noopener,noreferrer");
        const vr = await fetch("/api/bookings/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ test: true, purchase: "bulk-12h" }),
        });
        const v = await vr.json();
        if (!vr.ok) throw new Error(v.error ?? "Could not add credit");
        setBalanceMin(Number(v.balanceMin) || 0);
        toast.show("12 hours added! Book any open slot instantly — no payment needed.", "success");
        setBusy(false);
        return;
      }

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
    <div className="relative overflow-hidden rounded-3xl bg-ink">
      {/* Tape stripe top */}
      <div aria-hidden className="tape-stripe h-1.5 w-full" />

      {/* Court-line pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Brand block left accent */}
      <div aria-hidden className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-brand/25" />

      <div className="relative flex flex-col gap-5 p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6 lg:p-7">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="eyebrow text-lime">
              <Sparkles className="h-3 w-3" /> Best value
            </span>
          </div>

          <h3 className="heading-lg mt-3 text-white">
            12-Hour{" "}
            <span className="mark-lime">Bulk Pass</span>
          </h3>

          <div className="mt-1 font-display text-3xl font-extrabold text-lime">
            ₹8,000
          </div>

          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
            Prepay 12 hours of court time, then book any open slot{" "}
            <strong className="font-extrabold text-white">instantly with no further payment</strong>.
            Works out to ~₹667/hour.
          </p>

          {balanceMin > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border-2 border-lime/40 bg-lime/15 px-4 py-1.5 text-sm font-extrabold text-lime">
              <Clock className="h-4 w-4" />
              You have {Math.round((balanceMin / 60) * 10) / 10}h prepaid
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={buy}
          disabled={busy}
          className="btn-accent shrink-0 self-start sm:self-center"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {balanceMin > 0 ? "Top up 12 hours" : "Buy 12-Hour Pass"}
        </button>
      </div>
    </div>
  );
}
