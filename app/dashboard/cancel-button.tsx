"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function CancelBookingButton({
  bookingId,
  disabled,
  disabledReason,
}: {
  bookingId: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCancel() {
    if (!confirm("Cancel this booking? This cannot be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/player/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not cancel.");
      toast.show("Booking cancelled. Any refund will be processed per policy.", "success");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not cancel.";
      setError(msg);
      toast.show(msg, "error");
    } finally {
      setBusy(false);
    }
  }

  if (disabled) {
    return (
      <span title={disabledReason} className="text-[10px] font-semibold text-slatey">
        {disabledReason ?? "Cannot cancel"}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />} Cancel
      </button>
      {error && <p className="text-[10px] text-red-700">{error}</p>}
    </div>
  );
}
