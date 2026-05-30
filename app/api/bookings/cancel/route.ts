import { NextRequest, NextResponse } from "next/server";
import { sendTelegramAlert } from "@/lib/notifications";
import { getSession } from "@/lib/session";
import { getSupabaseService, hasSupabaseEnv } from "@/lib/supabase";

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to cancel a booking." }, { status: 401 });
  }

  const { bookingId, reason } = await request.json().catch(() => ({}));
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId is required." }, { status: 400 });
  }

  if (!hasSupabaseEnv()) {
    // Mock path so previews without Supabase env still respond cleanly. Treat
    // the body as authoritative and return a fabricated cancelled record.
    return NextResponse.json({
      booking: {
        id: bookingId,
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason ?? null,
      },
      mocked: true,
    });
  }

  const supabase = getSupabaseService();

  // Look up the profile by session email so we can verify ownership without
  // needing the session itself to carry a user_id.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", session.email)
    .maybeSingle();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  // Owner-or-admin gate: pull the booking first.
  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id,user_id,court_id,start_time,end_time,status")
    .eq("id", bookingId)
    .maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  const isOwner = booking.user_id === profile.id;
  const isAdmin = session.role === "admin";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Not allowed to cancel this booking." }, { status: 403 });
  }

  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "Booking already cancelled." }, { status: 409 });
  }

  // 4-hour cancellation policy. Admins bypass it (the owner sometimes needs to
  // cancel last-minute on a player's behalf).
  const startMs = new Date(booking.start_time).getTime();
  if (!isAdmin && startMs - Date.now() < FOUR_HOURS_MS) {
    return NextResponse.json(
      { error: "Too close to slot time. Free cancellation ends 4 hours before the booking." },
      { status: 400 },
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason ?? null,
    })
    .eq("id", bookingId)
    .select()
    .maybeSingle();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Notify the admin Telegram channel. Best-effort — don't fail the request.
  const startDate = new Date(booking.start_time);
  const dateLabel = startDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const timeLabel = startDate.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  void sendTelegramAlert(
    `❌ Cancellation: Court ${booking.court_id} on ${dateLabel} at ${timeLabel} — ${session.name}` +
      (reason ? `\nReason: ${reason}` : ""),
  ).catch(() => undefined);

  return NextResponse.json({ booking: updated });
}
