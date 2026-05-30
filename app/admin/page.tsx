import { addFinanceEntry, importBookingsCsv, updateBookingAdmin, upsertPricingRule } from "@/app/actions";
import { AdminNotices, type AdminNotice } from "@/components/admin-notices";
import { BookingHeatmap } from "@/components/booking-heatmap";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { Container, Eyebrow } from "@/components/ui";
import { getAdminOverview, getBookingAnalytics } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/guards";
import { getSupabaseService, hasSupabaseEnv } from "@/lib/supabase";
import { logout } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

const field = "rounded-xl border border-brand/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand";
const fieldSm = "rounded-lg border border-brand/15 bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-brand";
const card = "rounded-3xl border border-brand/10 bg-white p-6 shadow-soft";
const btnPrimary = "rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-glow transition hover:bg-brand-600";
const btnGhost = "rounded-xl border border-brand/30 px-4 py-3 text-sm font-bold text-brand transition hover:bg-brand/5";

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function dateTimeInput(value: string) {
  return new Date(value).toISOString().slice(0, 16);
}

async function getNoticesForAdmin(): Promise<AdminNotice[]> {
  if (!hasSupabaseEnv()) {
    return [
      { id: "fb-1", title: "Tonight: prime-time courts filling fast", body: "7–9 PM slots on Courts 1 & 2 are nearly gone.", category: "daily", active: true, created_at: new Date().toISOString() },
      { id: "fb-2", title: "Weekend Doubles Ladder", body: "Saturday social ladder.", category: "weekly", active: true, created_at: new Date().toISOString() },
    ];
  }
  const { data } = await getSupabaseService().from("notices").select("*").order("created_at", { ascending: false });
  return (data ?? []) as AdminNotice[];
}

export default async function AdminPage() {
  const admin = await requireAdmin();
  const overview = await getAdminOverview();
  const analytics = await getBookingAnalytics();
  const notices = await getNoticesForAdmin();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Nav />
      <main>
        <section className="brand-gradient brand-mesh relative overflow-hidden text-white">
          <div className="court-lines absolute inset-0 opacity-25" />
          <Container className="relative flex flex-col gap-4 py-12 sm:py-14 md:flex-row md:items-end md:justify-between">
            <div>
              <Eyebrow light>Owner console</Eyebrow>
              <h1 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">Bookings, pricing & finance</h1>
              <p className="mt-3 max-w-2xl text-white/85">
                Daily operating controls for court reservations, rates, exports, imports, and profit tracking.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-white/12 px-4 py-2 text-xs font-semibold text-white">
                Signed in as {admin.email}
              </span>
              <form action={logout}>
                <button className="rounded-full bg-white px-5 py-2 text-sm font-bold text-brand transition hover:bg-ball hover:text-ink">
                  Log out
                </button>
              </form>
            </div>
          </Container>
        </section>

        <Container className="py-10">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Bookings", overview.summary.bookings],
              ["Court revenue", money(overview.summary.courtRevenue)],
              ["Tax collected", money(overview.summary.taxCollected)],
              ["Net profit", money(overview.summary.netProfit)],
            ].map(([label, value]) => (
              <div key={label} className={card}>
                <p className="text-xs font-bold uppercase tracking-wide text-slatey">{label}</p>
                <div className="mt-2 font-display text-2xl font-extrabold text-brand">{value}</div>
              </div>
            ))}
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-3">
            <form action="/api/admin/export/bookings" method="get" className={`${card} grid gap-3`}>
              <h2 className="font-display text-lg font-extrabold text-ink">Download bookings</h2>
              <div className="grid grid-cols-2 gap-2">
                <input name="from" type="date" defaultValue={today} className={field} />
                <input name="to" type="date" defaultValue={today} className={field} />
              </div>
              <button className={btnPrimary}>Download Excel CSV</button>
            </form>

            <form action="/api/admin/export/finances" method="get" className={`${card} grid gap-3`}>
              <h2 className="font-display text-lg font-extrabold text-ink">Download finance</h2>
              <div className="grid grid-cols-2 gap-2">
                <input name="from" type="date" defaultValue={today} className={field} />
                <input name="to" type="date" defaultValue={today} className={field} />
              </div>
              <button className={btnGhost}>Download P&amp;L CSV</button>
            </form>

            <form action={importBookingsCsv} className={`${card} grid gap-3`}>
              <h2 className="font-display text-lg font-extrabold text-ink">Load sheet edits</h2>
              <input name="file" type="file" accept=".csv,text/csv" className={field} />
              <textarea name="csv" rows={3} placeholder="Or paste CSV rows from Google Sheets / Excel" className={field} />
              <button className={btnPrimary}>Import booking CSV</button>
            </form>
          </section>

          <section className={`mt-6 ${card}`}>
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-brand">Booking ledger</p>
                <h2 className="font-display text-xl font-extrabold text-ink">Owner-managed reservations</h2>
              </div>
              <div className="text-sm text-slatey">Gross profit: {money(overview.summary.grossProfit)}</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead className="bg-brand/5 text-left text-xs uppercase tracking-wide text-slatey">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Player</th>
                    <th className="p-3">Court</th>
                    <th className="p-3">Window</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Profit</th>
                    <th className="p-3">Update</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.ledger.map((booking) => (
                    <tr key={booking.id} className="border-t border-brand/10">
                      <td className="p-3 font-bold text-brand">{booking.id}</td>
                      <td className="p-3">
                        <div className="font-bold text-ink">{booking.player_name || booking.user_id}</div>
                        <div className="text-xs text-slatey">{booking.player_email}</div>
                      </td>
                      <td className="p-3 text-ink">Court {booking.court_id}</td>
                      <td className="p-3 text-slatey">{new Date(booking.start_time).toLocaleString("en-IN")}</td>
                      <td className="p-3 text-ink">{booking.status}</td>
                      <td className="p-3 text-ink">{money(booking.total_amount)}</td>
                      <td className="p-3 font-semibold text-brand">{money(booking.gross_profit)}</td>
                      <td className="p-3">
                        <form action={updateBookingAdmin} className="grid grid-cols-2 gap-2">
                          <input type="hidden" name="id" value={booking.id} />
                          <input name="courtId" type="number" inputMode="numeric" defaultValue={booking.court_id} className={fieldSm} />
                          <select name="status" defaultValue={booking.status} className={fieldSm}>
                            <option value="confirmed">confirmed</option>
                            <option value="paid">paid</option>
                            <option value="cancelled">cancelled</option>
                            <option value="completed">completed</option>
                          </select>
                          <input name="startTime" type="datetime-local" defaultValue={dateTimeInput(booking.start_time)} className={fieldSm} />
                          <input name="endTime" type="datetime-local" defaultValue={dateTimeInput(booking.end_time)} className={fieldSm} />
                          <input name="totalAmount" type="number" inputMode="decimal" step="0.01" defaultValue={booking.total_amount} className={fieldSm} />
                          <button className="rounded-lg bg-brand px-2 py-1.5 text-sm font-bold text-white">Save</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className={card}>
              <p className="text-xs font-bold uppercase tracking-wide text-brand">Rate controls</p>
              <h2 className="mb-4 font-display text-xl font-extrabold text-ink">Court pricing rules</h2>
              <div className="space-y-3">
                {overview.pricingRules.map((rule) => (
                  <form key={rule.id} action={upsertPricingRule} className="grid grid-cols-2 gap-2 rounded-2xl border border-brand/10 bg-brand/[0.03] p-3 md:grid-cols-6">
                    <input type="hidden" name="id" value={rule.id} />
                    <input name="label" defaultValue={rule.label} className={`${fieldSm} md:col-span-2`} />
                    <input name="courtId" inputMode="numeric" placeholder="Court or blank" defaultValue={rule.court_id ?? ""} className={fieldSm} />
                    <input name="price" type="number" inputMode="numeric" defaultValue={rule.price} className={fieldSm} />
                    <input name="startTime" type="time" defaultValue={rule.start_time.slice(0, 5)} className={fieldSm} />
                    <input name="endTime" type="time" defaultValue={rule.end_time.slice(0, 5)} className={fieldSm} />
                    <label className="flex items-center gap-2 text-xs font-bold text-ink"><input name="active" type="checkbox" defaultChecked={rule.active} className="accent-brand" /> Active</label>
                    <button className="rounded-lg bg-brand px-2 py-1.5 text-sm font-bold text-white">Save rate</button>
                  </form>
                ))}
              </div>
            </div>

            <div className={card}>
              <p className="text-xs font-bold uppercase tracking-wide text-brand">Finance ledger</p>
              <h2 className="mb-4 font-display text-xl font-extrabold text-ink">Expenses and adjustments</h2>
              <form action={addFinanceEntry} className="grid gap-2 rounded-2xl border border-brand/10 bg-brand/[0.03] p-3">
                <div className="grid grid-cols-2 gap-2">
                  <input name="entryDate" type="date" defaultValue={today} className={field} />
                  <select name="category" className={field}>
                    <option value="expense">Expense</option>
                    <option value="adjustment">Adjustment</option>
                    <option value="revenue">Revenue</option>
                  </select>
                </div>
                <input name="label" placeholder="Label" className={field} />
                <input name="amount" type="number" inputMode="decimal" step="0.01" placeholder="Amount" className={field} />
                <textarea name="notes" rows={2} placeholder="Notes" className={field} />
                <button className={btnPrimary}>Add finance entry</button>
              </form>
            </div>
          </section>

          {/* Notice board (group12) — read/writes the new `notices` table
              via /api/notices. Replaces the old form/purge pair that wrote
              to `notice_board`. */}
          <section className="mt-6">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-wide text-brand">Editorial</p>
              <h2 className="font-display text-xl font-extrabold text-ink">Notice board</h2>
            </div>
            <AdminNotices initial={notices} />
          </section>

          {/* Analytics (group12) */}
          <section className="mt-6">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-wide text-brand">Insights</p>
              <h2 className="font-display text-xl font-extrabold text-ink">Analytics — this month</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Total bookings", String(analytics.totalBookings)],
                ["Revenue", money(analytics.totalRevenue)],
                ["Occupancy", `${analytics.occupancyPct}%`],
                [
                  "Top hour",
                  analytics.mostPopularHour == null
                    ? "—"
                    : `${analytics.mostPopularHour % 12 === 0 ? 12 : analytics.mostPopularHour % 12}${analytics.mostPopularHour >= 12 ? " PM" : " AM"}`,
                ],
              ].map(([label, value]) => (
                <div key={label} className={card}>
                  <p className="text-xs font-bold uppercase tracking-wide text-slatey">{label}</p>
                  <div className="mt-2 font-display text-2xl font-extrabold text-brand">{value}</div>
                </div>
              ))}
            </div>

            <div className={`mt-4 ${card}`}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slatey">
                Bookings by hour (off-peak · standard · prime · late)
              </p>
              <BookingHeatmap data={analytics.hourly} />
            </div>
          </section>
        </Container>
      </main>
      <Footer />
    </>
  );
}
