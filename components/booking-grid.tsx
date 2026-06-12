"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarDays, Check, Gift, Loader2, Lock, LogIn, Plus, ReceiptText } from "lucide-react";
import { calculateTotals, getSlotPrice } from "@/lib/pricing";
import { priceForRange } from "@/lib/slots";
import { saveCart, loadCart } from "@/lib/cart";

type Ext = { before: boolean; after: boolean };

type Slot = { court: number; time: string; status: "open" | "booked" | "blocked" | "past"; price: number };
type Account = { id: string; email: string; name: string; role: "user" | "admin" } | null;
type Addon = { id: string; label: string; price: number; qty: number; on: boolean };

const COURTS = [1, 2, 3] as const;



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

function addMinutes(t: string, mins: number) {
  const [h, m] = t.split(":").map(Number);
  const total = h * 60 + m + mins;
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
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
  // Per-slot ±30-min extensions, keyed by `${court}-${time}`.
  const [ext, setExt] = useState<Record<string, Ext>>({});
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<Account>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [addons] = useState(ADDONS);
  const [mobileCourt, setMobileCourt] = useState<number>(1);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [emailed, setEmailed] = useState(true);
  const [creditMin, setCreditMin] = useState(0);
  // Sport the court is being booked for (pickleball default; club also offers
  // cricket and badminton on the same courts).
  const [sport, setSport] = useState<"pickleball" | "cricket" | "badminton">("pickleball");
  const [activeCourts, setActiveCourts] = useState<number[]>([1, 2, 3]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setAccount(d.user ?? null))
      .catch(() => setAccount(null))
      .finally(() => setAuthLoaded(true));
    // Load prepaid balance (ignored if not logged in).
    fetch("/api/player/credits")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCreditMin(Number(d.balanceMin) || 0))
      .catch(() => {});
  }, []);

  const slotKey = (court: number, time: string) => `${court}-${time}`;

  // Is an hour slot open (and not itself selected) so it can host an extension?
  function adjacentOpen(court: number, time: string) {
    if (sport === "cricket") {
      const c1 = slots.find((s) => s.court === 1 && s.time === time);
      const c2 = slots.find((s) => s.court === 2 && s.time === time);
      const c3 = slots.find((s) => s.court === 3 && s.time === time);
      if (!c1 || c1.status !== "open") return false;
      if (!c2 || c2.status !== "open") return false;
      if (!c3 || c3.status !== "open") return false;
      return !selected.some((x) => x.time === time);
    }
    const cell = slots.find((s) => s.court === court && s.time === time);
    if (!cell || cell.status !== "open") return false;
    return !selected.some((x) => x.court === court && x.time === time);
  }
  function canExtendBefore(s: Slot) {
    return adjacentOpen(s.court, addMinutes(s.time, -60));
  }
  function canExtendAfter(s: Slot) {
    return adjacentOpen(s.court, addMinutes(s.time, 60));
  }
  // Effective booking range for a selected slot, honouring valid extensions.
  function effective(s: Slot) {
    const e = ext[slotKey(s.court, s.time)] ?? { before: false, after: false };
    const before = e.before && canExtendBefore(s);
    const after = e.after && canExtendAfter(s);
    const startTime = before ? addMinutes(s.time, -30) : s.time;
    const durationMin = 60 + (before ? 30 : 0) + (after ? 30 : 0);
    return { before, after, startTime, durationMin };
  }
  function toggleExt(s: Slot, side: "before" | "after") {
    const key = slotKey(s.court, s.time);
    setError(null);
    setConfirmed(false);
    setExt((cur) => {
      const prev = cur[key] ?? { before: false, after: false };
      return { ...cur, [key]: { ...prev, [side]: !prev[side] } };
    });
  }

  const slotsNeededMin = selected.reduce((sum, s) => sum + effective(s).durationMin, 0);
  const hasEnoughCredit = creditMin >= slotsNeededMin && selected.length > 0;

  // Build the cart from the current selection (incl. extensions + sport) and go
  // to the dedicated cart → payment → confirmation flow.
  function proceedToCart() {
    if (selected.length === 0) return;
    const newItems = selected.map((s) => {
      const ef = effective(s);
      return {
        court: s.court,
        time: ef.startTime,
        durationMin: ef.durationMin,
        price: priceForRange(sport, date, ef.startTime, ef.durationMin),
        sport, // tag each line with the sport it was booked under
      };
    });
    // Merge with an existing same-date cart so "Add more slots" accumulates
    // ACROSS sports (a cart holds one date). Dedupe by court+time+sport.
    const existing = loadCart();
    let items = newItems;
    if (existing && existing.date === date && Array.isArray(existing.items)) {
      const keyOf = (i: { court: number; time: string; sport?: string }) =>
        `${i.court}|${i.time}|${i.sport ?? existing.sport}`;
      const incoming = new Set(newItems.map(keyOf));
      const kept = existing.items
        .map((i) => ({ ...i, sport: i.sport ?? existing.sport }))
        .filter((i) => !incoming.has(keyOf(i)));
      items = [...kept, ...newItems];
    }
    saveCart({ date, sport, items });
    router.push("/cart");
  }

  async function bookWithCredit() {
    if (!hasEnoughCredit) return;
    setPaying(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport,
          slots: selected.map((s) => {
            const ef = effective(s);
            return { date, court: s.court, time: ef.startTime, durationMin: ef.durationMin };
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not book with credit.");
      setCreditMin(Number(data.balanceMin) || 0);
      setEmailed(true);
      setConfirmed(true);
      setSelected([]);
      setExt({});
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not book with credit.");
    } finally {
      setPaying(false);
    }
  }

  function refreshSlots() {
    setLoading(true);
    setSelected([]);
    setExt({});
    setError(null);
    setConfirmed(false);
    fetch(`/api/slots?date=${date}&sport=${sport}`)
      .then((r) => r.json())
      .then((d) => {
        setSlots(d.slots ?? []);
        if (d.courts) setActiveCourts(d.courts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(refreshSlots, [date, sport]);

  // Live availability: quietly re-fetch slots (without disturbing the user's
  // current selection) every 25s and whenever the tab regains focus, so a slot
  // booked by someone else shows as taken almost immediately.
  useEffect(() => {
    let active = true;
    const quiet = () => {
      if (document.visibilityState !== "visible") return;
      fetch(`/api/slots?date=${date}&sport=${sport}`)
        .then((r) => r.json())
        .then((d) => {
          if (active && Array.isArray(d.slots)) setSlots(d.slots);
          if (active && d.courts) setActiveCourts(d.courts);
        })
        .catch(() => {});
    };
    const id = setInterval(quiet, 60000);
    const onVis = () => document.visibilityState === "visible" && quiet();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", quiet);
    return () => {
      active = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", quiet);
    };
  }, [date, sport]);

  const minDate = todayIST();

  const times = useMemo(() => Array.from(new Set(slots.map((s) => s.time))).sort(), [slots]);

  function findSlot(court: number, time: string) {
    return slots.find((s) => s.court === court && s.time === time);
  }
  function isSelected(s: Slot) {
    return selected.some((x) => x.court === s.court && x.time === s.time);
  }
  function toggle(s: Slot) {
    if (s.status !== "open") return;
    setError(null);
    setConfirmed(false);
    const removing = isSelected(s);
    setSelected((cur) =>
      removing ? cur.filter((x) => !(x.court === s.court && x.time === s.time)) : [...cur, s],
    );
    if (removing) {
      setExt((cur) => {
        const next = { ...cur };
        delete next[slotKey(s.court, s.time)];
        return next;
      });
    }
  }

  const equipmentTotal = addons.filter((a) => a.on).reduce((sum, a) => sum + a.price * a.qty, 0);
  const base = selected.reduce((sum, s) => {
    const ef = effective(s);
    return sum + priceForRange(sport, date, ef.startTime, ef.durationMin);
  }, 0);
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
      const slotsPayload = selected.map((s) => {
        const ef = effective(s);
        return { date, court: s.court, time: ef.startTime, durationMin: ef.durationMin };
      });
      const addonsPayload = addons.filter((a) => a.on).map(({ id, label, price, qty }) => ({ id, label, price, qty }));

      const orderRes = await fetch("/api/bookings/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: slotsPayload, addons: addonsPayload, sport }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error ?? "Could not create order");

      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Could not load Razorpay checkout.");

      // Razorpay global injected by checkout.js
      const Razorpay = (window as unknown as {
        Razorpay: new (opts: unknown) => { open: () => void; on: (evt: string, cb: (resp: { error?: { description?: string } }) => void) => void };
      }).Razorpay;
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
                sport,
              }),
            });
            const verify = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verify.error ?? "Payment verification failed");
            setEmailed(verify.emailed !== false);
            setConfirmed(true);
            setSelected([]);
            setExt({});
            // Hard-navigate to the portal so the just-confirmed booking renders
            // immediately (bypasses the App Router client cache). Brief pause so
            // the "Booking confirmed!" state is visible first.
            setTimeout(() => {
              window.location.href = "/dashboard";
            }, 1200);
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
      // Explicit failure handling — no booking is created, show a clear message.
      rzp.on("payment.failed", (resp) => {
        setPaying(false);
        setConfirmed(false);
        setError(
          resp?.error?.description
            ? `Payment failed: ${resp.error.description}. You have not been charged — please try again.`
            : "Payment failed or was cancelled. You have not been charged — please try again.",
        );
      });
      rzp.open();
    } catch (e) {
      setPaying(false);
      setError(e instanceof Error ? e.message : "Could not start payment");
    }
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Step 1: Choose Sport */}
      <section className="overflow-hidden rounded-3xl border-2 border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-[#111c38]">
        <h2 className="font-display text-lg font-extrabold tracking-tight text-ink dark:text-white mb-4 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand text-white text-xs font-bold animate-pulse">1</span>
          Choose your sport
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {([
            { key: "pickleball", label: "Pickleball", emoji: "🎾", sub: "3 Courts Available", desc: "Book individual courts. Complimentary paddles & balls included.", price: "₹600 – ₹1000 / hr" },
            { key: "badminton", label: "Badminton", emoji: "🏸", sub: "Court 1 Only", desc: "Book Court 1 for badminton games. Same pricing as pickleball.", price: "₹600 – ₹1000 / hr" },
            { key: "cricket", label: "Cricket Turf", emoji: "🏏", sub: "Entire Turf (3 Courts)", desc: "Book all 3 courts combined. Premium turf experience.", price: "₹1500 – ₹2500 / hr" },
          ] as const).map((s) => {
            const isActive = sport === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSport(s.key)}
                className={`text-left p-4 rounded-2xl border-2 transition-all duration-200 ${
                  isActive
                    ? "border-brand bg-brand/5 dark:border-brand-300 dark:bg-brand/10 shadow-[0_4px_20px_-4px_rgba(47,91,255,0.3)]"
                    : "border-ink/10 hover:border-brand/40 hover:bg-slate-50 dark:border-white/10 dark:hover:border-brand-300/40 dark:hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{s.emoji}</span>
                  <div>
                    <h3 className="font-display font-extrabold text-ink dark:text-white">{s.label}</h3>
                    <p className="text-[10px] text-brand dark:text-brand-300 font-bold uppercase tracking-wider">{s.sub}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slatey dark:text-white/60 leading-normal">
                  {s.desc}
                </p>
                <div className="mt-3 text-xs font-extrabold text-ink dark:text-white">
                  {s.price}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 2: Slot booking */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:pb-0">
        {/* ---- Grid panel ---- */}
        <section className="overflow-hidden rounded-3xl border-2 border-ink/10 bg-white dark:border-white/10 dark:bg-[#111c38]">

          {/* Login nudge banner */}
          {authLoaded && !account && (
            <div className="flex items-center justify-between gap-3 border-b-2 border-brand/10 bg-brand/5 px-4 py-3 text-xs dark:border-white/10 dark:bg-white/5 sm:text-sm">
              <span className="font-bold text-ink dark:text-white">Log in to confirm a booking. You can still browse availability.</span>
              <Link
                href="/login?next=/book"
                className="btn-primary py-1.5 text-xs"
              >
                <LogIn className="h-3.5 w-3.5" /> Log in
              </Link>
            </div>
          )}

          {/* Header row */}
          <div className="flex flex-col gap-4 border-b-2 border-ink/10 p-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="hidden items-center gap-3 sm:flex">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-xl font-extrabold tracking-tight text-ink dark:text-white flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand/20 text-brand text-xs font-bold dark:bg-brand-300/20 dark:text-brand-300">2</span>
                  Select slots
                </h2>
                <p className="text-xs font-semibold text-slatey dark:text-white/50">1-hour slots · extend ±30 min</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="flex items-center gap-2 text-sm font-bold text-ink dark:text-white sm:hidden">
                <CalendarDays className="h-4 w-4 text-brand" /> Date:
              </span>
              <input
                type="date"
                min={minDate}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl border-2 border-ink/10 bg-white px-3 py-2.5 text-sm font-bold text-ink outline-none transition focus:border-brand dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-brand-300"
              />
            </div>
          </div>

          {/* Date + legend row */}
          <div className="flex flex-col gap-3 border-b border-ink/5 bg-ink/[0.02] px-5 py-3 text-xs dark:border-white/5 dark:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between">
            <span className="font-extrabold text-ink dark:text-white">{dateLabel(date)}</span>
            <div className="flex flex-wrap items-center gap-3 text-slatey dark:text-white/50">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border-2 border-lime/60 bg-lime/20" /> Open
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-brand" /> Selected
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-[#E24B4A]" /> Booked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-ink/30 dark:bg-white/20" /> Blocked
              </span>
            </div>
          </div>



          {/* Mobile: court tabs */}
          <div className="lg:hidden">
            {sport === "pickleball" && activeCourts.length > 1 && (
              <div className="flex gap-1 border-b-2 border-ink/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#111c38]">
                {activeCourts.map((c) => {
                  const isActive = mobileCourt === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setMobileCourt(c)}
                      className={`flex-1 rounded-full px-3 py-2 text-xs font-extrabold uppercase tracking-wide transition ${
                        isActive
                          ? "bg-brand text-white"
                          : "text-ink/60 hover:bg-brand/5 dark:text-white/50 dark:hover:bg-white/5"
                      }`}
                    >
                      Court {c}
                    </button>
                  );
                })}
              </div>
            )}
            {loading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-ink/5 dark:bg-white/5" />
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-ink/5 dark:divide-white/5">
                {times.map((t) => {
                  const activeCourt = activeCourts.includes(mobileCourt) ? mobileCourt : activeCourts[0] || 1;
                  const cell = findSlot(activeCourt, t);
                  if (!cell) return null;
                  return <MobileRow key={t} slot={cell} selected={isSelected(cell)} onToggle={() => toggle(cell)} sport={sport} />;
                })}
              </ul>
            )}
          </div>

          {/* Desktop grid */}
          <div className="hidden lg:block">
            <div
              className="grid border-y border-ink/5 bg-ink/[0.02] text-center text-[0.65rem] font-extrabold uppercase tracking-[0.15em] text-slatey dark:border-white/5 dark:bg-white/[0.02]"
              style={{ gridTemplateColumns: `72px repeat(${activeCourts.length}, minmax(0, 1fr))` }}
            >
              <div className="p-3">Time</div>
              {activeCourts.map((c) => (
                <div key={c} className="border-l border-ink/5 p-3 text-brand dark:border-white/5 dark:text-brand-300">
                  {sport === "cricket" ? "Cricket Turf" : sport === "badminton" ? "Badminton Court" : `Court ${c}`}
                </div>
              ))}
            </div>
            <div className="relative max-h-[640px] overflow-y-auto">
              {loading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded-xl bg-ink/5 dark:bg-white/5" />
                  ))}
                </div>
              ) : (
                times.map((t) => (
                  <div
                    key={t}
                    className="grid border-b border-ink/5 dark:border-white/5"
                    style={{ gridTemplateColumns: `72px repeat(${activeCourts.length}, minmax(0, 1fr))` }}
                  >
                    <div className="sticky left-0 z-10 flex items-center justify-center bg-white p-2 text-center text-[0.65rem] font-extrabold uppercase tracking-wide text-slatey dark:bg-[#111c38] dark:text-white/40">
                      {timeLabel(t)}
                    </div>
                    {activeCourts.map((c) => {
                      const cell = findSlot(c, t);
                      if (!cell) return <div key={c} className="border-l border-ink/5 dark:border-white/5" />;
                      const sel = isSelected(cell);
                      return (
                        <div key={`${c}-${t}`} className="m-1.5">
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

      {/* ---- Summary aside ---- */}
      <aside className="h-fit rounded-3xl border-2 border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-[#111c38] lg:sticky lg:top-28">
        {/* Tape stripe top */}
        <div aria-hidden className="tape-stripe -mx-5 -mt-5 mb-5 h-1" />

        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-ink dark:text-white">
          <ReceiptText className="h-5 w-5 text-brand" /> Reservation summary
        </h2>

        <div className="mt-4 space-y-2">
          {selected.length === 0 && (
            <p className="rounded-2xl border-2 border-dashed border-ink/10 bg-ink/[0.02] p-4 text-sm text-slatey dark:border-white/10 dark:bg-white/[0.02] dark:text-white/40">
              Tap open slots in the grid to build your booking.
            </p>
          )}
          {selected.map((s) => {
            const ef = effective(s);
            const endTime = addMinutes(ef.startTime, ef.durationMin);
            const beforeAvail = canExtendBefore(s);
            const afterAvail = canExtendAfter(s);
            return (
              <motion.div
                key={`${s.court}-${s.time}`}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-2xl border-2 border-brand/15 bg-brand/5 p-3 dark:border-brand-300/15 dark:bg-brand/10"
              >
                <div className="flex justify-between text-sm font-extrabold text-ink dark:text-white">
                  <span>
                    {sport === "cricket"
                      ? "Cricket Turf"
                      : sport === "badminton"
                        ? "Badminton Court"
                        : `Court ${s.court}`}
                  </span>
                  <span className="text-brand dark:text-brand-300">₹{priceForRange(sport, date, ef.startTime, ef.durationMin)}</span>
                </div>
                <p className="text-xs text-slatey dark:text-white/50">
                  {timeLabel(ef.startTime)} – {timeLabel(endTime)} · {ef.durationMin} min
                </p>
                {(beforeAvail || afterAvail || ef.before || ef.after) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(beforeAvail || ef.before) && (
                      <ExtChip
                        on={ef.before}
                        onClick={() => toggleExt(s, "before")}
                        label={`+₹${Math.round(getSlotPrice(addMinutes(s.time, -30), date, sport) / 2)} · 30 min before`}
                      />
                    )}
                    {(afterAvail || ef.after) && (
                      <ExtChip
                        on={ef.after}
                        onClick={() => toggleExt(s, "after")}
                        label={`+₹${Math.round(getSlotPrice(addMinutes(s.time, 60), date, sport) / 2)} · 30 min after`}
                      />
                    )}
                  </div>
                )}
                <p className="mt-1.5 text-[0.65rem] text-slatey dark:text-white/40">Extensions are charged at half the hourly rate.</p>
              </motion.div>
            );
          })}
        </div>

        {/* Complimentary gear notice */}
        <div className="mt-4 flex items-start gap-2 rounded-xl border-2 border-lime/30 bg-lime/10 px-3 py-2.5 text-xs text-ink dark:text-white">
          <Gift className="mt-0.5 h-4 w-4 shrink-0 text-lime-dark" />
          <span>
            <strong className="font-extrabold">Paddles &amp; balls are complimentary</strong> — included free with every court booking.
          </span>
        </div>

        {/* Totals */}
        <div className="mt-4 space-y-2 border-t-2 border-ink/10 pt-4 text-sm dark:border-white/10">
          <div className="flex justify-between text-slatey dark:text-white/50">
            <span>Subtotal</span>
            <span className="font-bold text-ink dark:text-white">₹{totals.subtotal}</span>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-2xl bg-ink px-4 py-3 text-lg font-extrabold text-white dark:bg-white dark:text-ink">
            <span>Total</span>
            <span>₹{totals.total}</span>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border-2 border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        {confirmed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-3 flex items-start gap-2 rounded-xl border-2 border-lime/40 bg-lime/10 px-3 py-2.5 text-xs font-semibold text-lime-dark"
          >
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Booking confirmed!{" "}
              {emailed
                ? "A confirmation email is on its way."
                : "Your booking is safe and shows on your dashboard — the confirmation email couldn't be sent just now."}{" "}
              Redirecting…
            </span>
          </motion.div>
        )}

        {/* Prepaid balance badge */}
        {account?.role === "user" && creditMin > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-xl border-2 border-lime/40 bg-lime/10 px-3 py-2 text-xs font-extrabold text-lime-dark">
            <span>Prepaid balance</span>
            <span>{Math.round((creditMin / 60) * 10) / 10} h · {Math.floor(creditMin / 60)} slots</span>
          </div>
        )}

        {/* CTA → review the cart before payment */}
        <button
          type="button"
          onClick={proceedToCart}
          disabled={selected.length === 0}
          className="btn-primary mt-4 w-full justify-center disabled:cursor-not-allowed disabled:bg-ink/30 disabled:shadow-none dark:disabled:bg-white/20"
        >
          {selected.length === 0 ? "Select a slot to continue" : `Proceed to booking · Pay ₹200 Advance`}
        </button>

        <p className="mt-3 text-[0.68rem] leading-5 text-slatey dark:text-white/40">
          Review your slots in the cart, then pay securely by Razorpay or with prepaid bulk hours.
        </p>
      </aside>

      {/* Sticky mobile pay bar */}
      {selected.length > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink/10 bg-white px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 shadow-[0_-12px_32px_-8px_rgba(13,20,38,0.3)] lg:hidden dark:border-white/10 dark:bg-ink"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-slatey dark:text-white/50">
                {selected.length} slot{selected.length > 1 ? "s" : ""} · Total ₹{totals.total}
              </div>
              <div className="font-display text-2xl font-extrabold text-ink dark:text-white">₹200 Advance</div>
            </div>
            <button
              type="button"
              onClick={proceedToCart}
              className="btn-primary max-w-[60%] flex-1 justify-center disabled:opacity-60"
            >
              Go to booking
            </button>
          </div>
        </motion.div>
      )}
    </div>
  </div>
);
}

function ExtChip({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.65rem] font-extrabold uppercase tracking-wide transition ${
        on
          ? "bg-brand text-white"
          : "border-2 border-brand/30 bg-white text-brand hover:border-brand dark:border-brand-300/30 dark:bg-white/5 dark:text-brand-300 dark:hover:border-brand-300"
      }`}
    >
      {on ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />} {label}
    </button>
  );
}

function SlotButton({ slot, selected, onClick }: { slot: Slot; selected: boolean; onClick: () => void }) {
  const state = selected ? "selected" : slot.status;

  // Bold, unmistakable slot states
  let cls =
    "border-2 border-lime/50 bg-lime/15 text-lime-dark hover:border-lime hover:bg-lime/25 hover:-translate-y-0.5";
  if (state === "selected")
    cls = "border-2 border-brand bg-brand text-white shadow-[0_4px_0_-1px_rgba(35,72,224,0.5)]";
  if (state === "booked")
    cls = "cursor-not-allowed border-2 border-red-200/60 bg-red-50/80 text-[#E24B4A] dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-400";
  if (state === "blocked")
    cls = "cursor-not-allowed border-2 border-ink/10 bg-ink/5 text-ink/30 dark:border-white/10 dark:bg-white/5 dark:text-white/20";
  // Past (today IST, start time already gone): render as an empty, inert cell.
  if (state === "past")
    cls = "cursor-default border-2 border-dashed border-ink/5 bg-transparent text-ink/15 dark:border-white/5 dark:text-white/10";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={slot.status !== "open"}
      whileHover={slot.status === "open" && !selected ? { y: -2, scale: 1.01 } : undefined}
      whileTap={slot.status === "open" ? { scale: 0.97 } : undefined}
      className={`flex min-h-[52px] w-full flex-col items-start rounded-xl p-2.5 text-left text-xs font-extrabold transition-all duration-150 ${cls}`}
    >
      <span className="flex w-full items-center justify-between">
        <span className="uppercase tracking-wide">
          {state === "open" ? "Open" : state === "selected" ? "Picked" : state === "booked" ? "Booked" : state === "past" ? "—" : "Blocked"}
        </span>
        {state === "booked" ? (
          <Lock className="h-3.5 w-3.5" />
        ) : state === "selected" ? (
          <Check className="h-3.5 w-3.5" />
        ) : null}
      </span>
      {slot.status !== "blocked" && slot.status !== "past" && (
        <span className={`mt-1 text-[11px] font-bold ${state === "selected" ? "text-white/80" : ""}`}>
          ₹{slot.price}
        </span>
      )}
    </motion.button>
  );
}

function MobileRow({ slot, selected, onToggle, sport }: { slot: Slot; selected: boolean; onToggle: () => void; sport: string }) {
  const state = selected ? "selected" : slot.status;
  const disabled = slot.status !== "open";

  let pill = "border-2 border-lime/50 bg-lime/15 text-lime-dark";
  if (state === "selected") pill = "border-2 border-brand bg-brand text-white";
  if (state === "booked") pill = "border-2 border-red-200 bg-red-50 text-[#E24B4A] dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-400";
  if (state === "blocked") pill = "border-2 border-ink/10 bg-ink/5 text-ink/30 dark:border-white/10 dark:bg-white/5 dark:text-white/25";
  if (state === "past") pill = "border border-dashed border-ink/10 bg-transparent text-ink/25 dark:border-white/10 dark:text-white/20";

  return (
    <li
      className={`flex min-h-[64px] items-center justify-between border-b border-ink/5 px-4 py-3.5 transition dark:border-white/5 ${
        disabled ? "cursor-default" : "cursor-pointer hover:bg-brand/5 active:bg-brand/10 dark:hover:bg-white/5"
      } ${state === "past" ? "opacity-50" : ""}`}
      onClick={() => !disabled && onToggle()}
    >
      <div>
        <div className="font-display text-sm font-extrabold text-ink dark:text-white">{timeLabel(slot.time)}</div>
        <div className="text-xs text-slatey dark:text-white/40">
          {sport === "cricket"
            ? "Cricket Turf"
            : sport === "badminton"
              ? "Badminton Court"
              : `Court ${slot.court}`}
          {state !== "past" && <> · ₹{slot.price}</>}
        </div>
      </div>
      <span className={`rounded-full px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-wide ${pill}`}>
        {state === "open" ? "Open" : state === "selected" ? "Picked" : state === "booked" ? "Booked" : state === "past" ? "Ended" : "Blocked"}
      </span>
    </li>
  );
}
