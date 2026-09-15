"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Camera, Loader2, Trophy, X } from "lucide-react";
import { Container } from "@/components/ui";
import { trackFb, CURRENCY } from "@/lib/analytics";

type Account = { id: string; email: string; name: string; role: "user" | "admin" } | null;

export type EntryTournament = {
  id: string;
  name: string;
  event_date: string | null;
  format: string | null;
  prize: string | null;
  fee: number;
  description: string | null;
  poster_url: string | null;
};

const SEXES = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
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

/**
 * Shrink the chosen photo to a 512px JPEG in the browser before it ever leaves
 * the device. A 6 MB phone snap becomes ~60 KB, which keeps the upload instant
 * and the stored image small whichever way the server persists it.
 */
async function downscale(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const max = 512;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.82));
  if (!blob) return file;
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}

type Props = {
  /** Where the selectable events come from — the public list, or a single event. */
  source: string;
  /** Stored on the entry so captains are separable from players in the console. */
  category: "singles" | "captain";
  /** Shown on the Razorpay sheet, e.g. "player entry". */
  entryLabel: string;
  /** Hidden when the page is for one fixed event. */
  showPicker?: boolean;
  /** Off on the standalone captain page, which links nowhere into the site. */
  showBackLink?: boolean;
  emptyTitle: string;
  emptyBody: string;
};

/**
 * The paid tournament entry form, shared by the public player page and the
 * direct-link captain page. Open to guests: an account only prefills the name
 * and email. The entry row is written by the server after Razorpay verifies the
 * payment, so there is no pay-later path — closing the sheet leaves no entry.
 */
export function TournamentEntryForm({
  source,
  category,
  entryLabel,
  showPicker = true,
  showBackLink = true,
  emptyTitle,
  emptyBody,
}: Props) {
  const [account, setAccount] = useState<Account>(null);
  const [tournaments, setTournaments] = useState<EntryTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneRef, setDoneRef] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    tournament_id: "",
    player_name: "",
    email: "",
    phone: "",
    age: "",
    sex: "" as "" | (typeof SEXES)[number]["value"],
    photo_url: "",
    dupr_id: "",
    dupr_level: "",
  });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const u: Account = d.user ?? null;
        setAccount(u);
        // Prefill from the account when there is one — guests just type it in.
        if (u && u.role === "user") {
          setForm((f) => ({ ...f, player_name: f.player_name || u.name, email: f.email || u.email }));
        }
      })
      .catch(() => {});
    fetch(source)
      .then((r) => (r.ok ? r.json() : { tournaments: [] }))
      .then((d) => {
        const list: EntryTournament[] = d.tournaments ?? [];
        setTournaments(list);
        if (list.length > 0) setForm((f) => ({ ...f, tournament_id: f.tournament_id || list[0].id }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [source]);

  const selected = useMemo(
    () => tournaments.find((t) => t.id === form.tournament_id) ?? null,
    [tournaments, form.tournament_id],
  );

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError("Photo must be a JPG, PNG or WebP image.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const small = await downscale(file);
      const fd = new FormData();
      fd.append("file", small);
      const res = await fetch("/api/tournaments/register/photo", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Could not upload that photo.");
      setForm((f) => ({ ...f, photo_url: String(d.url) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload that photo.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!selected) {
      setError("Please choose a tournament.");
      return;
    }
    if (!form.photo_url) {
      setError("Please upload a profile photo.");
      return;
    }
    if (!form.sex) {
      setError("Please select your sex.");
      return;
    }
    setPaying(true);
    try {
      const payload = {
        tournament_id: form.tournament_id,
        player_name: form.player_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        age: Number(form.age),
        sex: form.sex,
        photo_url: form.photo_url,
        dupr_id: form.dupr_id.trim(),
        dupr_level: form.dupr_level.trim(),
        category,
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
        description: `${selected.name} · ${entryLabel}`,
        order_id: order.orderId,
        prefill: { name: payload.player_name, email: payload.email, contact: payload.phone },
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
            {showBackLink && (
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/tournaments" className="btn-primary">
                  Back to tournaments
                </Link>
                {account && (
                  <Link href="/dashboard" className="btn-outline">
                    Go to my dashboard
                  </Link>
                )}
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="card-sport flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
          </div>
        ) : tournaments.length === 0 ? (
          /* ── Nothing open ── */
          <div className="card-sport p-8 text-center">
            <Trophy className="mx-auto h-10 w-10 text-brand dark:text-lime" />
            <h2 className="mt-4 font-display text-xl font-extrabold text-ink dark:text-white">{emptyTitle}</h2>
            <p className="mt-2 text-sm text-slatey dark:text-white/60">{emptyBody}</p>
            {showBackLink && (
              <Link href="/tournaments" className="btn-outline mt-6 inline-flex">
                Back to tournaments
              </Link>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="card-sport space-y-5 p-6 sm:p-8">
            {/* Poster for the selected event */}
            {selected?.poster_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.poster_url}
                alt={`${selected.name} poster`}
                className="w-full rounded-2xl border border-ink/10 dark:border-white/10"
              />
            )}

            {/* Tournament — a single-event page states it instead of asking. */}
            {showPicker ? (
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
            ) : (
              selected && (
                <div className="rounded-xl bg-ink/[0.03] px-4 py-3 dark:bg-white/5">
                  <div className="font-display text-base font-extrabold text-ink dark:text-white">{selected.name}</div>
                  <p className="mt-1 text-xs text-slatey dark:text-white/50">
                    {formatDate(selected.event_date)}
                    {selected.prize ? ` · ${selected.prize}` : ""}
                  </p>
                </div>
              )
            )}

            {/* Name */}
            <div>
              <label className={LABEL} htmlFor="name">
                Full name
              </label>
              <input
                id="name"
                className={FIELD}
                value={form.player_name}
                onChange={(e) => setForm({ ...form, player_name: e.target.value })}
                placeholder="As it should appear on the draw"
                required
              />
            </div>

            {/* Email + phone */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL} htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className={FIELD}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="For your confirmation"
                  required
                />
              </div>
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
            </div>

            {/* Age + sex */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL} htmlFor="age">
                  Age
                </label>
                <input
                  id="age"
                  type="number"
                  min={8}
                  max={99}
                  className={FIELD}
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  placeholder="e.g. 28"
                  required
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="sex">
                  Sex
                </label>
                <select
                  id="sex"
                  className={FIELD}
                  value={form.sex}
                  onChange={(e) => setForm({ ...form, sex: e.target.value as typeof form.sex })}
                  required
                >
                  <option value="">Select…</option>
                  {SEXES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Profile photo */}
            <div>
              <label className={LABEL}>Profile photo</label>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-ink/10 bg-ink/5 dark:border-white/15 dark:bg-white/10">
                  {form.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.photo_url} alt="Your profile" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <Camera className="h-5 w-5 text-ink/30 dark:text-white/30" />
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="btn-outline px-3 py-2 text-xs"
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                    {form.photo_url ? "Change photo" : "Upload photo"}
                  </button>
                  {form.photo_url && !uploading && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, photo_url: "" })}
                      className="inline-flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400"
                    >
                      <X className="h-3 w-3" /> Remove
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={pickPhoto}
                />
              </div>
              <p className="mt-2 text-[11px] text-slatey dark:text-white/40">
                JPG, PNG or WebP. We resize it on your device before uploading.
              </p>
            </div>

            {/* DUPR */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL} htmlFor="duprid">
                  DUPR ID <span className="normal-case text-slatey/70">(optional)</span>
                </label>
                <input
                  id="duprid"
                  className={FIELD}
                  value={form.dupr_id}
                  onChange={(e) => setForm({ ...form, dupr_id: e.target.value })}
                  placeholder="e.g. ABC123"
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="duprlevel">
                  DUPR level <span className="normal-case text-slatey/70">(optional)</span>
                </label>
                <input
                  id="duprlevel"
                  className={FIELD}
                  value={form.dupr_level}
                  onChange={(e) => setForm({ ...form, dupr_level: e.target.value })}
                  placeholder="e.g. 3.5"
                />
              </div>
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

            <button
              type="submit"
              disabled={paying || uploading || !selected}
              className="btn-primary w-full justify-center"
            >
              {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
              {selected ? `Pay ₹${selected.fee.toLocaleString("en-IN")} & confirm entry` : "Confirm entry"}
            </button>

            <p className="text-center text-[11px] leading-relaxed text-slatey dark:text-white/40">
              Your spot is confirmed only once payment succeeds — there is no pay-later option. Entry fees are
              non-refundable within 48 hours of the event.
            </p>
          </form>
        )}
      </div>
    </Container>
  );
}
