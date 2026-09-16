"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { Container } from "@/components/ui";
import { site } from "@/lib/site";

type Status = {
  state: "confirmed" | "partial" | "pending" | "cancelled" | "unknown";
  ref?: string;
  playerName?: string;
  email?: string;
  tournamentName?: string | null;
  eventDate?: string | null;
  fee?: number;
  amountPaid?: number;
  due?: number;
  paymentId?: string | null;
};

function money(n: number) {
  return `₹${(n || 0).toLocaleString("en-IN")}`;
}

function formatDate(d?: string | null) {
  if (!d) return null;
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/**
 * Where both entry forms land after Razorpay closes.
 *
 * `?ref=` is an entry the server recorded — its real state is read back from
 * the database rather than assumed from the checkout, so the page says
 * "confirmed", or names what is still due, based on what was actually banked.
 * `?state=failed` is the other ending: no money taken, nothing to chase.
 *
 * A pending entry is re-checked a few times: payment can be confirmed a moment
 * after the sheet closes, and the entrant should see it settle rather than be
 * told to worry.
 */
function ConfirmationBody() {
  const params = useSearchParams();
  const ref = params.get("ref") ?? "";
  const failed = params.get("state") === "failed";
  const reason = params.get("reason") ?? "";
  // The captain page is handed out as a standalone link, so it must not grow
  // a route back into the rest of the website.
  const standalone = params.get("ctx") === "captain";

  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(!!ref);
  const [tries, setTries] = useState(0);

  const check = useCallback(async () => {
    if (!ref) return;
    try {
      const res = await fetch(`/api/tournaments/register/status?ref=${encodeURIComponent(ref)}`);
      const d = (await res.json()) as Status;
      setStatus(d);
      // Still settling — look again shortly.
      if ((d.state === "pending" || d.state === "unknown") && tries < 4) {
        setTimeout(() => setTries((t) => t + 1), 2500);
      }
    } catch {
      setStatus({ state: "unknown" });
    } finally {
      setLoading(false);
    }
  }, [ref, tries]);

  useEffect(() => {
    check();
  }, [check]);

  const state: Status["state"] = failed ? "cancelled" : (status?.state ?? "unknown");
  const due = status?.due ?? 0;

  const tone =
    state === "confirmed"
      ? { icon: CheckCircle2, colour: "text-lime", title: "Registration confirmed" }
      : state === "partial"
        ? { icon: AlertTriangle, colour: "text-amber-500", title: "Registration incomplete — payment due" }
        : state === "pending"
          ? { icon: Clock, colour: "text-amber-500", title: "Waiting for your payment to clear" }
          : failed
            ? { icon: XCircle, colour: "text-red-500", title: "Payment not completed" }
            : { icon: AlertTriangle, colour: "text-amber-500", title: "We couldn't find that registration" };
  const Icon = tone.icon;

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-lg">
        <div className="card-sport p-8 text-center">
          {loading ? (
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand" />
          ) : (
            <Icon className={`mx-auto h-12 w-12 ${tone.colour}`} />
          )}

          <h1 className="mt-4 font-display text-2xl font-extrabold text-ink dark:text-white">
            {loading ? "Checking your payment…" : tone.title}
          </h1>

          {/* ── Confirmed ── */}
          {!loading && state === "confirmed" && (
            <>
              <p className="mt-2 text-sm text-slatey dark:text-white/60">
                You&apos;re in{status?.playerName ? `, ${status.playerName.split(" ")[0]}` : ""}. Entry{" "}
                <span className="font-bold text-ink dark:text-white">{status?.ref}</span> is confirmed and paid in
                full. We&apos;ll send the match schedule closer to the date.
              </p>
              <dl className="mt-6 grid gap-2 rounded-xl bg-ink/[0.03] p-4 text-left text-sm dark:bg-white/5">
                {[
                  ["Event", status?.tournamentName ?? "—"],
                  ["Date", formatDate(status?.eventDate) ?? "To be announced"],
                  ["Paid", money(status?.amountPaid ?? 0)],
                  ["Confirmation to", status?.email ?? "—"],
                  ["Payment ref", status?.paymentId ?? "—"],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between gap-4">
                    <dt className="text-slatey dark:text-white/50">{k}</dt>
                    <dd className="text-right font-semibold text-ink dark:text-white">{v}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}

          {/* ── Paid, but short of the fee ── */}
          {!loading && state === "partial" && (
            <>
              <p className="mt-2 text-sm text-slatey dark:text-white/60">
                We received {money(status?.amountPaid ?? 0)} of the {money(status?.fee ?? 0)} entry fee for{" "}
                {status?.tournamentName ?? "this event"}. Your place is held, but{" "}
                <span className="font-bold text-ink dark:text-white">{money(due)} is still due</span> — please settle
                it with the club to complete your registration.
              </p>
              <p className="mt-3 text-xs text-slatey dark:text-white/45">
                Entry {status?.ref}
                {status?.paymentId ? ` · payment ${status.paymentId}` : ""}
              </p>
            </>
          )}

          {/* ── Money in flight ── */}
          {!loading && state === "pending" && (
            <p className="mt-2 text-sm text-slatey dark:text-white/60">
              Your entry is saved and we&apos;re waiting for the bank to confirm the payment. This usually takes a
              moment. If it has been charged, it will be confirmed automatically — you do not need to pay again.
              {status?.ref ? ` Keep your reference: ${status.ref}.` : ""}
            </p>
          )}

          {/* ── Failed / cancelled ── */}
          {!loading && failed && (
            <p className="mt-2 text-sm text-slatey dark:text-white/60">
              {reason ? `${reason}. ` : ""}You have not been charged and no place has been reserved. You can try the
              payment again whenever you&apos;re ready.
            </p>
          )}

          {!loading && !failed && state === "unknown" && (
            <p className="mt-2 text-sm text-slatey dark:text-white/60">
              We couldn&apos;t match that reference to a registration. If you have been charged, contact the club with
              your payment reference and we&apos;ll sort it out — nothing is lost.
            </p>
          )}

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            {failed ? (
              <button type="button" onClick={() => history.back()} className="btn-primary">
                Try again
              </button>
            ) : null}
            {!standalone && (
              <Link href="/tournaments" className={failed ? "btn-outline" : "btn-primary"}>
                Back to tournaments
              </Link>
            )}
            <a href={site.phoneHref} className="btn-outline">
              Call the club
            </a>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slatey dark:text-white/40">
          Questions? {site.phoneDisplay} · {site.email}
        </p>
      </div>
    </Container>
  );
}

export default function TournamentConfirmationPage() {
  return (
    <main className="app-surface min-h-screen bg-white dark:bg-ink">
      <header className="flex items-center justify-center border-b border-ink/5 px-4 py-5 dark:border-white/10">
        <Image
          src="/breathe-logo-nav.png"
          alt="Breathe Pickleball"
          width={220}
          height={100}
          priority
          className="h-10 w-auto object-contain"
        />
      </header>
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
          </div>
        }
      >
        <ConfirmationBody />
      </Suspense>
    </main>
  );
}
