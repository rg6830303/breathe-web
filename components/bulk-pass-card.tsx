"use client";

import { useEffect, useState } from "react";
import { Clock, Sparkles } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/social-icons";
import { site } from "@/lib/site";

type Account = { id: string; email: string; name: string; role: "user" | "admin" } | null;

export function BulkPassCard() {
  const [account, setAccount] = useState<Account>(null);
  const [balanceMin, setBalanceMin] = useState(0);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setAccount(d.user ?? null)).catch(() => {});
    fetch("/api/player/credits").then((r) => (r.ok ? r.json() : null)).then((d) => d && setBalanceMin(Number(d.balanceMin) || 0)).catch(() => {});
  }, []);

  // Bulk passes are arranged personally over WhatsApp (admin DM, not the
  // community group): the customer taps through to a pre-filled message and the
  // admin handles payment + grants the prepaid hours from the console.
  const topUp = balanceMin > 0;
  const message =
    `Hi Breathe Pickleball! 👋 I'm interested in the ${topUp ? "13-Hour Bulk Pass top-up" : "13-Hour Bulk Pass"} (₹8,000 for 13 hours of court time).` +
    (account?.name ? ` My name is ${account.name}.` : "") +
    ` Please help me get started.`;
  const waHref = `${site.whatsappHref}?text=${encodeURIComponent(message)}`;

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
            13-Hour{" "}
            <span className="mark-lime">Bulk Pass</span>
          </h3>

          <div className="mt-1 font-display text-3xl font-extrabold text-lime">
            ₹8,000
          </div>

          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
            Prepay 13 hours of court time, then book any open slot{" "}
            <strong className="font-extrabold text-white">instantly with no further payment</strong>.
            Works out to ~₹615/hour.
          </p>

          <p className="mt-2 max-w-md text-xs leading-relaxed text-white/50">
            Message us on WhatsApp to grab the pass — we&apos;ll set you up in minutes.
          </p>

          {balanceMin > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border-2 border-lime/40 bg-lime/15 px-4 py-1.5 text-sm font-extrabold text-lime">
              <Clock className="h-4 w-4" />
              You have {Math.round((balanceMin / 60) * 10) / 10}h prepaid
            </div>
          )}
        </div>

        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-accent shrink-0 self-start sm:self-center"
        >
          <WhatsAppIcon className="h-4 w-4" />
          {topUp ? "Top up on WhatsApp" : "Enquire on WhatsApp"}
        </a>
      </div>
    </div>
  );
}
