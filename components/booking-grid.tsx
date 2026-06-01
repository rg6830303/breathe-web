"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarDays, Check, Gift, Loader2, Lock, LogIn, ReceiptText } from "lucide-react";
import { calculateTotals } from "@/lib/pricing";

type Slot = { court: number; time: string; status: "open" | "booked" | "blocked"; price: number };
type Account = { id: string; email: string; name: string; role: "user" | "admin" } | null;
type Addon = { id: string; label: string; price: number; qty: number; on: boolean };

const COURTS = [1, 2, 3] as const;

type Band = "morning" | "afternoon" | "evening";
const BANDS: { key: Band; label: string }[] = [
  { key: "morning", label: "Morning · 6–12" },
  { key: "afternoon", label: "Afternoon · 12–5" },
  { key: "evening", label: "Evening · 5–11" },
];

function bandFor(time: string): Band {
  const h = Number(time.slice(0, 2));
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function todayIST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function timeLabel(t: string) {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(d);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    const w = window as unknown as { Razorpay?: unknown };
    if (w.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// Paddles and balls are complimentary at the club, so there are no paid add-ons.
const ADDONS: Addon[] = [];

export function BookingGrid() {
  const router = useRouter();
  const [date, setDate] = useState<string>(todayIST());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<Account>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [addons] = useState(ADDONS);
  const [mobileCourt, setMobileCourt] = useState<number>(1);
  const [band, setBand] = useState<Band>("evening");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [emailed, setEmailed] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setAccount(d.user ?? null))
      .catch(() => setAccount(null))
      .finally(() => setAuthLoaded(true));
  }, []);

  function refreshSlots() {
    setLoading(true);
    setSelected([]);
    setError(null);
    setConfirmed(false);
    fetch(`/api/slots?date=${date}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(refreshSlots, [date]);

  const minDate = todayIST();

  const filtered = useMemo(() => slots.filter((s) => bandFor(s.time) === band), [slots, band]);
  const times = useMemo(() => Array.from(new Set(filtered.map((s) => s.time))).sort(), [filtered]);

  function findSlot(court: number, time: string) {
    return filtered.find((s) => s.court === court && s.time === time);
  }
  function isSelected(s: Slot) {
    return selected.some((x) => x.court === s.court && x.time === s.time);
  }
  function toggle(s: Slot) {
    if (s.status !== "open") return;
    setError(null);
    setConfirmed(false);
    setSelected((cur) =>
      isSelected(s) ? cur.filter((x) => !(x.court === s.court && x.time === s.time)) : [...cur, s],
    );
  }

  const equipmentTotal = addons.filter((a) => a.on).reduce((sum, a) => sum + a.price * a.qty, 0);
  const base = selected.reduce((sum, s) => sum + s.price, 0);
  const totals = calculateTotals(base, equipmentTotal);

  async function payNow() {
    if (selected.length === 0) return;
    if (!account || account.role !== "user") {
      router.push("/login?next=/book");
      return;
    }
    setPaying(true);
    setError(null);
    try {
      const slotsPayload = selected.map((s) => ({ date, court: s.court, time: s.time }));
      const addonsPayload = addons.filter((a) => a.on).map(({ id, label, price, qty }) => ({ id, label, price, qty }));

      const orderRes = await fetch("/api/bookings/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: slotsPayload, addons: addonsPayload }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error ?? "Could not create order");

      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Could not load Razorpay checkout.");

      // Razorpay global injected by checkout.js
      const Razorpay = (window as unknown as { Razorpay: new (opts: unknown) => { open: () => void } }).Razorpay;
      const rzp = new Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Breathe Pickleball",
        description: `Court booking · ${selected.length} slot${selected.length > 1 ? "s" : ""}`,
        order_id: order.orderId,
        prefill: { name: account.name, email: account.email },
        theme: { color: "#2F5BFF" },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const verifyRes = await fetch("/api/bookings/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                slots: slotsPayload,
                addons: addonsPayload,
              }),
            });
            const verify = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verify.error ?? "Payment verification failed");
            setEmailed(verify.emailed !== false);
            setConfirmed(true);
            setSelected([]);
            fetch(`/api/slots?date=${date}`).then((r) => r.json()).then((d) => setSlots(d.slots ?? []));
            setTimeout(() => router.push("/dashboard"), 2600);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Verification failed");
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      });
      rzp.open();
    } catch (e) {
      setPaying(false);
      setError(e instanceof Error ? e.message : "Could not start payment");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="overflow-hidden rounded-3xl border border-brand/10 bg-white shadow-soft">
        {authLoaded && !account && (
          <div className="flex items-center justify-between gap-3 border-b border-brand/10 bg-brand/5 px-4 py-3 text-xs sm:text-sm">
            <span className="font-semibold text-ink">Log in to confirm a booking. You can still browse availability.</span>
            <Link
              href="/login?next=/book"
              className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white"
            >
              <LogIn className="h-3.5 w-3.5" /> Log in
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-4 border-b border-brand/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="hidden items-center gap-3 sm:flex">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-xl font-extrabold text-ink">Book a court</h2>
              <p className="text-sm text-slatey">30-minute slots · 3 courts</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="flex items-center gap-2 text-sm font-bold text-ink sm:hidden">
              <CalendarDays className="h-4 w-4 text-brand" /> Date:
            </span>
            <input
              type="date"
              min={minDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-brand/15 bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-brand"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 px-5 py-3 text-xs text-slatey sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold text-ink">{dateLabel(date)}</span>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-lime/30 ring-1 ring-lime" /> Open</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-brand" /> Selected</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-[#E24B4A]" /> Booked</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-[#888780]" /> Blocked</span>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto border-y border-brand/10 bg-brand/[0.03] px-5 py-3">
          {BANDS.map((b) => {
            const isActive = band === b.key;
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => setBand(b.key)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  isActive ? "bg-brand text-white shadow-soft" : "border border-brand/15 bg-white text-ink/70 hover:text-brand"
                }`}
                aria-pressed={isActive}
              >
                {b.label}
              </button>
            );
          })}
        </div>

        {/* Mobile view */}
        <div className="lg:hidden">
          <div className="flex gap-1 border-b border-brand/10 bg-white px-3 py-2">
            {COURTS.map((c) => {
              const isActive = mobileCourt === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setMobileCourt(c)}
                  className={`flex-1 rounded-full px-3 py-2 text-xs font-bold transition ${
                    isActive ? "bg-brand text-white shadow-soft" : "text-ink/70 hover:bg-brand/5"
                  }`}
                >
                  Court {c}
                </button>
              );
            })}
          </div>
          {loading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {times.map((t) => {
                const cell = findSlot(mobileCourt, t);
                if (!cell) return null;
                return <MobileRow key={t} slot={cell} selected={isSelected(cell)} onToggle={() => toggle(cell)} />;
              })}
            </ul>
          )}
        </div>

        {/* Desktop grid */}
        <div className="hidden lg:block">
          <div className="grid border-y border-brand/10 bg-brand/5 text-center text-xs font-bold uppercase tracking-wide text-ink" style={{ gridTemplateColumns: `72px repeat(${COURTS.length}, minmax(0, 1fr))` }}>
            <div className="p-3 text-slatey">Time</div>
            {COURTS.map((c) => (
              <div key={c} className="border-l border-brand/10 p-3 text-brand">Court {c}</div>
            ))}
          </div>
          <div className="relative max-h-[640px] overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
                ))}
              </div>
            ) : (
              times.map((t) => (
                <div key={t} className="grid border-b border-brand/5" style={{ gridTemplateColumns: `72px repeat(${COURTS.length}, minmax(0, 1fr))` }}>
                  <div className="sticky left-0 z-10 flex items-center justify-center bg-brand/[0.03] p-2 text-center text-xs font-bold text-slatey">
                    {timeLabel(t)}
                  </div>
                  {COURTS.map((c) => {
                    const cell = findSlot(c, t);
                    if (!cell) return <div key={c} className="border-l border-brand/5" />;
                    const sel = isSelected(cell);
                    return (
                      <div key={`${c}-${t}`} className="m-1">
                        <SlotButton slot={cell} selected={sel} onClick={() => toggle(cell)} />
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Summary */}
      <aside className="h-fit rounded-3xl border border-brand/10 bg-white p-5 shadow-card lg:sticky lg:top-28">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
          <ReceiptText className="h-5 w-5 text-brand" /> Reservation summary
        </h2>

        <div className="mt-4 space-y-2">
          {selected.length === 0 && (
            <p className="rounded-2xl border border-dashed border-brand/20 bg-brand/[0.03] p-4 text-sm text-slatey">
              Tap open slots in the grid to build your booking.
            </p>
          )}
          {selected.map((s) => (
            <div key={`${s.court}-${s.time}`} className="rounded-2xl border border-brand/10 bg-brand/[0.03] p-3">
              <div className="flex justify-between text-sm font-bold text-ink">
                <span>Court {s.court}</span>
                <span>₹{s.price}</span>
              </div>
              <p className="text-xs text-slatey">{timeLabel(s.time)} · 30 min</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-lime/40 bg-lime/10 px-3 py-2.5 text-xs text-ink">
          <Gift className="mt-0.5 h-4 w-4 shrink-0 text-lime-dark" />
          <span>
            <strong>Paddles &amp; balls are complimentary</strong> — they&apos;re included free with every court booking.
          </span>
        </div>

        <div className="mt-4 space-y-2 border-t border-brand/10 pt-4 text-sm">
          <div className="flex justify-between text-slatey">
            <span>Subtotal</span>
            <span className="font-semibold text-ink">₹{totals.subtotal}</span>
          </div>
          <div className="flex justify-between text-slatey">
            <span>GST & fees (18%)</span>
            <span className="font-semibold text-ink">₹{totals.taxes}</span>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-2xl brand-gradient px-4 py-3 text-lg font-extrabold text-white">
            <span>Total</span>
            <span>₹{totals.total}</span>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
        )}
        {confirmed && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-lime/40 bg-lime/10 px-3 py-2 text-xs text-lime-dark">
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Booking confirmed! 🎉{" "}
              {emailed
                ? "A confirmation email is on its way."
                : "Your booking is safe and shows on your dashboard — the confirmation email couldn't be sent just now."}{" "}
              Redirecting…
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={payNow}
          disabled={selected.length === 0 || paying}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {selected.length === 0
            ? "Select a slot to continue"
            : !account || account.role !== "user"
              ? "Log in to Confirm & Pay"
              : `Confirm & Pay ₹${totals.total}`}
        </button>

        <p className="mt-3 text-[0.7rem] leading-5 text-slatey">
          Secure payment by Razorpay. Slots are confirmed instantly once payment succeeds.
        </p>
      </aside>
    </div>
  );
}

function SlotButton({ slot, selected, onClick }: { slot: Slot; selected: boolean; onClick: () => void }) {
  const state = selected ? "selected" : slot.status;
  let cls = "border-lime/40 bg-lime/15 text-lime-dark hover:border-lime hover:bg-lime/25";
  if (state === "selected") cls = "border-brand bg-brand text-white shadow-glow";
  if (state === "booked") cls = "cursor-not-allowed border-red-200 bg-[#FEEAEA] text-[#E24B4A]";
  if (state === "blocked") cls = "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-500";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={slot.status !== "open"}
      animate={state === "open" ? { opacity: [0.85, 1, 0.85] } : { opacity: 1 }}
      transition={state === "open" ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : undefined}
      className={`flex min-h-[48px] w-full flex-col items-start rounded-xl border p-2 text-left text-xs font-bold transition ${cls}`}
    >
      <span className="flex w-full items-center justify-between">
        <span className="capitalize">{state}</span>
        {state === "booked" ? <Lock className="h-3.5 w-3.5" /> : state === "selected" ? <Check className="h-3.5 w-3.5" /> : null}
      </span>
      {slot.status !== "blocked" && (
        <span className={`mt-1 text-[11px] font-semibold ${state === "selected" ? "text-white/90" : ""}`}>
          ₹{slot.price}
        </span>
      )}
    </motion.button>
  );
}

function MobileRow({ slot, selected, onToggle }: { slot: Slot; selected: boolean; onToggle: () => void }) {
  const state = selected ? "selected" : slot.status;
  const disabled = slot.status !== "open";
  let pill = "border border-lime bg-lime/15 text-lime-dark";
  if (state === "selected") pill = "bg-brand text-white";
  if (state === "booked") pill = "bg-[#FEEAEA] text-[#E24B4A]";
  if (state === "blocked") pill = "bg-gray-100 text-gray-500";
  return (
    <li
      className={`flex min-h-[52px] items-center justify-between border-b border-gray-100 px-4 py-3 ${disabled ? "cursor-default" : "cursor-pointer"}`}
      onClick={() => !disabled && onToggle()}
    >
      <div>
        <div className="text-sm font-bold text-ink">{timeLabel(slot.time)}</div>
        <div className="text-xs text-slatey">Court {slot.court} · ₹{slot.price}</div>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${pill}`}>{state}</span>
    </li>
  );
}
