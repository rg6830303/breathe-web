import { CalendarDays, IndianRupee, Phone, Users } from "lucide-react";
import { turso } from "@/lib/turso";

type Today = {
  id: string;
  slot_time: string;
  court_number: number;
  user_name: string;
  user_phone: string | null;
  total: number;
  status: string;
};

function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function format12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

async function loadToday(): Promise<{ rows: Today[]; revenue: number; courtsInUse: number } | null> {
  const date = todayIST();
  try {
    const result = await turso.execute({
      sql: `SELECT b.id, b.slot_time, b.court_number,
                   COALESCE(u.full_name, b.guest_name, 'Guest') as user_name,
                   COALESCE(u.phone, b.guest_phone) as user_phone,
                   b.amount_paid as total, b.status
            FROM bookings b
            LEFT JOIN users u ON u.id = b.user_id
            WHERE b.slot_date = ? AND b.status = 'confirmed'
            ORDER BY b.slot_time ASC`,
      args: [date],
    });
    const rows: Today[] = result.rows.map((r) => ({
      id: String(r.id),
      slot_time: String(r.slot_time).slice(0, 5),
      court_number: Number(r.court_number) || 1,
      user_name: String(r.user_name),
      user_phone: r.user_phone ? String(r.user_phone) : null,
      total: Number(r.total) || 0,
      status: String(r.status),
    }));
    const revenue = rows.reduce((s, b) => s + b.total, 0);
    const courtsInUse = new Set(rows.map((b) => b.court_number)).size;
    return { rows, revenue, courtsInUse };
  } catch (err) {
    console.error("[admin today panel error]", err);
    return null;
  }
}

export async function TodayPanel() {
  const data = await loadToday();
  if (!data) return null;
  const { rows, revenue, courtsInUse } = data;

  return (
    <section className="card-sport overflow-hidden p-0">
      {/* Header bar */}
      <div className="tape-stripe h-1.5 w-full" />
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 pt-5 pb-4 border-b-2 border-ink/10 dark:border-white/10">
        <div>
          <span className="eyebrow">
            <CalendarDays className="h-3.5 w-3.5" />
            Today
          </span>
          <p className="mt-0.5 text-xs font-bold text-ink/40 dark:text-white/40 tracking-wide">
            {todayIST()}
          </p>
        </div>

        {/* KPI strip */}
        <div className="flex flex-wrap items-center gap-5">
          <div className="text-right">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/40 dark:text-white/40">
              Bookings
            </div>
            <div className="font-display text-2xl font-extrabold tracking-tight text-ink dark:text-white">
              {rows.length}
            </div>
          </div>
          <div className="h-8 w-px bg-ink/10 dark:bg-white/10" aria-hidden />
          <div className="text-right">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/40 dark:text-white/40">
              Courts
            </div>
            <div className="flex items-center justify-end gap-1 font-display text-2xl font-extrabold tracking-tight text-ink dark:text-white">
              <Users className="h-4 w-4 text-brand" aria-hidden />
              {courtsInUse}/3
            </div>
          </div>
          <div className="h-8 w-px bg-ink/10 dark:bg-white/10" aria-hidden />
          <div className="text-right">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/40 dark:text-white/40">
              Revenue
            </div>
            <div className="flex items-center justify-end gap-0.5 font-display text-2xl font-extrabold tracking-tight text-brand">
              <IndianRupee className="h-5 w-5" aria-hidden />
              {revenue.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </div>

      {/* Booking list */}
      <div className="px-6 py-4">
        {rows.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-ink/10 p-6 text-center text-sm text-ink/40 dark:border-white/10 dark:text-white/40">
            No bookings today.
          </p>
        ) : (
          <ul className="grid gap-2">
            {rows.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-ink/10 bg-ink/[0.02] px-4 py-3 dark:border-white/10 dark:bg-white/[0.02]"
              >
                <div className="flex items-center gap-3">
                  {/* Time chip */}
                  <span className="inline-flex h-10 min-w-[3.5rem] items-center justify-center rounded-xl bg-brand px-2 text-xs font-extrabold uppercase text-white">
                    {format12h(b.slot_time).replace(" ", "\n")}
                  </span>
                  <div>
                    <div className="font-bold text-ink dark:text-white">{b.user_name}</div>
                    <div className="text-xs text-ink/50 dark:text-white/50">
                      Court {b.court_number}
                      {b.user_phone && (
                        <>
                          {" · "}
                          <Phone className="mr-0.5 inline h-3 w-3" aria-hidden />
                          {b.user_phone}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <span className="font-display text-base font-extrabold text-brand">
                  ₹{b.total.toLocaleString("en-IN")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
