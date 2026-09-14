"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Lock, Trophy } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Container } from "@/components/ui";
import { PageHero } from "@/components/ui/page-hero";
import { trackFb, CURRENCY } from "@/lib/analytics";

type Account = { id: string; email: string; name: string; role: "user" | "admin" } | null;
type Tournament = {
  id: string;
  name: string;
  event_date: string | null;
  format: string | null;
  prize: string | null;
  fee: number;
  description: string | null;
};

const CATEGORIES = [
  { value: "singles", label: "Singles" },
  { value: "doubles", label: "Doubles" },
  { value: "mixed_doubles", label: "Mixed doubles" },
] as const;

const LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
] as const;

const FIELD =
  "w-full rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm font-medium text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40";
const LABEL = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-slatey dark:text-white/55";

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

function formatDate(d: string | null) {
  if (!d) return "Date to be announced";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}

export default function TournamentRegisterPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneRef, setDoneRef] = useState<string | null>(null);

  const [form, setForm] = useState({
    tournament_id: "",
    category: "singles" as (typeof CATEGORIES)[number]["value"],
    skill_level: "intermediate" as (typeof LEVELS)[number]["value"],
    phone: "",
    partner_name: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setAccount(d.user ?? null))
      .catch(() => {})
      .finally(() => setAuthLoaded(true));
    fetch("/api/tournaments")
      .then((r) => (r.ok ? r.json() : { tournaments: [] }))
      .then((d) => {
        const list: Tournament[] = d.tournaments ?? [];
        setTournaments(list);
        if (list.length > 0) setForm((f) => ({ ...f, tournament_id: list[0].id }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selected = useMemo(
    () => tournaments.find((t) => t.id === form.tournament_id) ?? null,
    [tournaments, form.tournament_id],
  );
  const needsPartner = form.category !== "singles";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!account || account.role !== "user") {
      router.push("/login?next=/tournaments/register");
      return;
    }
    if (!selected) {
      setError("Please choose a tournament.");
      return;
    }
    setPaying(true);
    try {
      const payload = {
        tournament_id: form.tournament_id,
        category: form.category,
        skill_level: form.skill_level,
        phone: form.phone,
        partner_name: needsPartner ? form.partner_name : "",
        notes: form.notes,
      };

      const orderRes = await fetch("/api/tournaments/register/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error ?? "Could not start the payment.");

      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Could not load the payment window. Check your connection.");

      const Razorpay = (
        window as unknown as {
          Razorpay: new (o: unknown) => {
            open: () => void;
            on: (e: string, cb: (r: { error?: { description?: string } }) => void) => void;
          };
        }
      ).Razorpay;

      const rzp = new Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Breathe Pickleball",
        description: `${selected.name} · ${form.category.replace("_", " ")}`,
        order_id: order.orderId,
        prefill: { name: account.name, email: account.email, contact: form.phone },
        theme: { color: "#2F5BFF" },
        handler: async (resp: {
          razorpay_order_id?: string;
          razorpay_payment_id?: string;
          razorpay_signature?: string;
        }) => {
          try {
            const vr = await fetch("/api/tournaments/register/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...payload,
                orderId: resp.razorpay_order_id,
                paymentId: resp.razorpay_payment_id,
                signature: resp.razorpay_signature,
              }),
            });
            const v = await vr.json();
            if (!vr.ok) throw new Error(v.error ?? "We couldn't confirm your entry.");
            // Paid conversion — tagged so it's separable from court bookings.
            trackFb("Purchase", {
              value: Number(v.fee) || selected.fee,
              currency: CURRENCY,
              content_category: "tournament",
              content_name: selected.name,
            });
            setDoneRef(String(v.id ?? "").slice(0, 8).toUpperCase());
          } catch (err) {
            setError(err instanceof Error ? err.message : "We couldn't confirm your entry.");
          } finally {
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
    } catch (err) {
      setPaying(false);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <>
      <Nav />
      <main className="app-surface min-h-screen bg-white dark:bg-ink">
        <PageHero
          label="Tournaments"
          title="Register your entry"
          subtitle="Secure your spot in the next Breathe Open. Pay the entry fee online and we'll email your confirmation and the match schedule."
        />

        <Container className="py-10">
          <div className="mx-auto max-w-xl">
            {/* ── Confirmed ── */}
            {doneRef ? (
              <div className="card-sport p-8 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-lime" />
                <h2 className="mt-4 font-display text-2xl font-extrabold text-ink dark:text-white">
                  You&apos;re registered!
                </h2>
                <p className="mt-2 text-sm text-slatey dark:text-white/60">
                  Entry <span className="font-bold text-ink dark:text-white">{doneRef}</span> is confirmed. We&apos;ve
                  emailed your details and will send the match schedule closer to the date.
                </p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link href="/dashboard" className="btn-primary">
                    Go to my dashboard
                  </Link>
                  <Link href="/tournaments" className="btn-outline">
                    Back to tournaments
                  </Link>
                </div>
              </div>
            ) : loading ? (
              <div className="card-sport flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin text-brand" />
              </div>
            ) : tournaments.length === 0 ? (
              /* ── Nothing open ── */
              <div className="card-sport p-8 text-center">
                <Trophy className="mx-auto h-10 w-10 text-brand dark:text-lime" />
                <h2 className="mt-4 font-display text-xl font-extrabold text-ink dark:text-white">
                  No tournaments open right now
                </h2>
                <p className="mt-2 text-sm text-slatey dark:text-white/60">
                  Registrations open ahead of each event. Follow us on Instagram or check back soon — the next Breathe
                  Open will appear here.
                </p>
                <Link href="/tournaments" className="btn-outline mt-6 inline-flex">
                  Back to tournaments
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="card-sport space-y-5 p-6 sm:p-8">
                {/* Tournament */}
                <div>
                  <label className={LABEL} htmlFor="tournament">
                    Tournament
                  </label>
                  <select
                    id="tournament"
                    className={FIELD}
                    value={form.tournament_id}
                    onChange={(e) => setForm({ ...form, tournament_id: e.target.value })}
                  >
                    {tournaments.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  {selected && (
                    <p className="mt-2 text-xs text-slatey dark:text-white/50">
                      {formatDate(selected.event_date)}
                      {selected.format ? ` · ${selected.format}` : ""}
                      {selected.prize ? ` · ${selected.prize}` : ""}
                    </p>
                  )}
                </div>

                {/* Category + level */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={LABEL} htmlFor="category">
                      Category
                    </label>
                    <select
                      id="category"
                      className={FIELD}
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value as typeof form.category })
                      }
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL} htmlFor="level">
                      Skill level
                    </label>
                    <select
                      id="level"
                      className={FIELD}
                      value={form.skill_level}
                      onChange={(e) =>
                        setForm({ ...form, skill_level: e.target.value as typeof form.skill_level })
                      }
                    >
                      {LEVELS.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Partner — doubles only */}
                {needsPartner && (
                  <div>
                    <label className={LABEL} htmlFor="partner">
                      Partner&apos;s name
                    </label>
                    <input
                      id="partner"
                      className={FIELD}
                      value={form.partner_name}
                      onChange={(e) => setForm({ ...form, partner_name: e.target.value })}
                      placeholder="Who are you playing with?"
                      required
                    />
                  </div>
                )}

                {/* Phone */}
                <div>
                  <label className={LABEL} htmlFor="phone">
                    Mobile number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    className={FIELD}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="For match-day updates"
                    required
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className={LABEL} htmlFor="notes">
                    Anything we should know? <span className="normal-case text-slatey/70">(optional)</span>
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    className={FIELD}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Preferred match times, accessibility needs…"
                  />
                </div>

                {/* Fee */}
                {selected && (
                  <div className="flex items-center justify-between rounded-xl bg-ink/[0.03] px-4 py-3 dark:bg-white/5">
                    <span className="text-sm font-semibold text-ink dark:text-white">Entry fee</span>
                    <span className="font-display text-xl font-extrabold text-brand dark:text-lime">
                      ₹{selected.fee.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                    {error}
                  </div>
                )}

                {/* Login gate */}
                {authLoaded && (!account || account.role !== "user") ? (
                  <div className="space-y-3">
                    <p className="text-center text-sm text-slatey dark:text-white/60">
                      Please log in to register — we link your entry to your player account.
                    </p>
                    <Link href="/login?next=/tournaments/register" className="btn-primary w-full justify-center">
                      <Lock className="h-4 w-4" /> Log in to register
                    </Link>
                  </div>
                ) : (
                  <button type="submit" disabled={paying || !selected} className="btn-primary w-full justify-center">
                    {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                    {selected ? `Pay ₹${selected.fee.toLocaleString("en-IN")} & confirm entry` : "Confirm entry"}
                  </button>
                )}

                <p className="text-center text-[11px] leading-relaxed text-slatey dark:text-white/40">
                  Your spot is confirmed once payment succeeds. Entry fees are non-refundable within 48 hours of the
                  event.
                </p>
              </form>
            )}
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
