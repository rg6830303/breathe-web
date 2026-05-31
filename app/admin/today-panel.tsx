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
    <section className="rounded-3xl border border-brand/10 bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-extrabold text-ink">
            <CalendarDays className="mr-2 inline h-5 w-5 text-brand" /> Today
          </h2>
          <p className="text-xs text-slatey">{todayIST()}</p>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slatey">Bookings</div>
            <div className="font-display text-lg font-extrabold text-ink">{rows.length}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slatey">Courts in use</div>
            <div className="font-display text-lg font-extrabold text-ink">
              <Users className="mr-1 inline h-4 w-4 text-brand" />
              {courtsInUse}/3
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slatey">Revenue</div>
            <div className="font-display text-lg font-extrabold text-brand">
              <IndianRupee className="inline h-4 w-4" />
              {revenue.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-brand/20 bg-brand/[0.03] p-6 text-center text-sm text-slatey">
          No bookings today.
        </p>
      ) : (
        <ul className="mt-5 grid gap-2">
          {rows.map((b) => (
            <li
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/10 bg-brand/[0.02] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-12 items-center justify-center rounded-xl bg-brand text-xs font-extrabold uppercase text-white">
                  {format12h(b.slot_time).replace(" ", "")}
                </span>
                <div>
                  <div className="font-semibold text-ink">{b.user_name}</div>
                  <div className="text-xs text-slatey">
                    Court {b.court_number}
                    {b.user_phone && (
                      <>
                        {" · "}
                        <Phone className="mr-0.5 inline h-3 w-3" />
                        {b.user_phone}
                      </>
                    )}
                  </div>
                </div>
              </div>
              <span className="font-display text-sm font-extrabold text-brand">
                ₹{b.total.toLocaleString("en-IN")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
