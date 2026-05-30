"use client";

import { ArrowRight } from "lucide-react";

/** Mobile-only sticky bar that surfaces the current selection total above the
 *  fold so a user mid-scroll can jump straight to confirm. Slides in from the
 *  bottom when `selectedCount > 0` and slides back out at zero. iOS home-bar
 *  is respected via `env(safe-area-inset-bottom)`.
 *
 *  Naming note: the spec asked for `BookingStickyBar.tsx`; this codebase uses
 *  kebab-case filenames everywhere else, so the file is `booking-sticky-bar.tsx`
 *  and the export is `BookingStickyBar`.
 */
export function BookingStickyBar({
  selectedCount,
  total,
  onContinue,
}: {
  selectedCount: number;
  total: number;
  onContinue: () => void;
}) {
  const visible = selectedCount > 0;
  return (
    <div
      role="region"
      aria-label="Booking summary"
      aria-hidden={!visible}
      className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 pt-3 lg:hidden transition-transform duration-300 ease-out shadow-[0_-12px_28px_-12px_rgba(13,20,38,0.18)] ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
    >
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wide text-slatey">
            {selectedCount} slot{selectedCount === 1 ? "" : "s"} selected
          </div>
          <div className="font-display text-lg font-extrabold text-ink">₹{total}</div>
        </div>
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-bold text-white shadow-glow active:scale-[0.98]"
        >
          Continue <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
