import { addFinanceEntry, createNotice, deleteNotice, importBookingsCsv, updateBookingAdmin, upsertPricingRule } from "@/app/actions";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { getAdminOverview } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function dateTimeInput(value: string) {
  return new Date(value).toISOString().slice(0, 16);
}

export default async function AdminPage() {
  const overview = await getAdminOverview();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-volt">Owner Console</p>
          <h1 className="font-display text-5xl font-black text-white">Bookings, Pricing, Finance</h1>
          <p className="mt-3 text-slate-300">Daily operating controls for court reservations, rates, exports, imports, and profit tracking.</p>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            ["Bookings", overview.summary.bookings],
            ["Court revenue", money(overview.summary.courtRevenue)],
            ["Tax collected", money(overview.summary.taxCollected)],
            ["Net profit", money(overview.summary.netProfit)],
          ].map(([label, value]) => (
            <div key={label} className="glass rounded-lg p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
              <div className="mt-2 font-display text-3xl font-black text-volt">{value}</div>
            </div>
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <form action="/api/admin/export/bookings" method="get" className="glass grid gap-3 rounded-lg p-5">
            <h2 className="font-display text-2xl font-black text-white">Download Bookings</h2>
            <input name="userId" placeholder="Admin user UUID" className="rounded-md border border-line bg-midnight px-3 py-2" />
            <div className="grid grid-cols-2 gap-2">
              <input name="from" type="date" defaultValue={today} className="rounded-md border border-line bg-midnight px-3 py-2" />
              <input name="to" type="date" defaultValue={today} className="rounded-md border border-line bg-midnight px-3 py-2" />
            </div>
            <button className="rounded-md bg-volt px-4 py-3 font-black text-midnight">Download Excel CSV</button>
          </form>

          <form action="/api/admin/export/finances" method="get" className="glass grid gap-3 rounded-lg p-5">
            <h2 className="font-display text-2xl font-black text-white">Download Finance</h2>
            <input name="userId" placeholder="Admin user UUID" className="rounded-md border border-line bg-midnight px-3 py-2" />
            <div className="grid grid-cols-2 gap-2">
              <input name="from" type="date" defaultValue={today} className="rounded-md border border-line bg-midnight px-3 py-2" />
              <input name="to" type="date" defaultValue={today} className="rounded-md border border-line bg-midnight px-3 py-2" />
            </div>
            <button className="rounded-md border border-court px-4 py-3 font-black text-white">Download P&L CSV</button>
          </form>

          <form action={importBookingsCsv} className="glass grid gap-3 rounded-lg p-5">
            <h2 className="font-display text-2xl font-black text-white">Load Sheet Edits</h2>
            <input name="userId" placeholder="Admin user UUID" className="rounded-md border border-line bg-midnight px-3 py-2" required />
            <input name="file" type="file" accept=".csv,text/csv" className="rounded-md border border-line bg-midnight px-3 py-2" />
            <textarea name="csv" rows={3} placeholder="Or paste CSV rows from Google Sheets / Excel" className="rounded-md border border-line bg-midnight px-3 py-2" />
            <button className="rounded-md bg-court px-4 py-3 font-black text-white">Import Booking CSV</button>
          </form>
        </section>

        <section className="glass mt-6 rounded-lg p-5">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-volt">Booking Ledger</p>
              <h2 className="font-display text-3xl font-black text-white">Owner-managed reservations</h2>
            </div>
            <div className="text-sm text-slate-400">Gross profit: {money(overview.summary.grossProfit)}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead className="bg-midnight text-left text-xs uppercase tracking-[0.14em] text-slate-400">
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
                  <tr key={booking.id} className="border-t border-line/70">
                    <td className="p-3 font-bold text-volt">{booking.id}</td>
                    <td className="p-3">
                      <div className="font-bold text-white">{booking.player_name || booking.user_id}</div>
                      <div className="text-xs text-slate-500">{booking.player_email}</div>
                    </td>
                    <td className="p-3">Court {booking.court_id}</td>
                    <td className="p-3 text-slate-300">{new Date(booking.start_time).toLocaleString("en-IN")}</td>
                    <td className="p-3">{booking.status}</td>
                    <td className="p-3">{money(booking.total_amount)}</td>
                    <td className="p-3 text-volt">{money(booking.gross_profit)}</td>
                    <td className="p-3">
                      <form action={updateBookingAdmin} className="grid grid-cols-2 gap-2">
                        <input type="hidden" name="id" value={booking.id} />
                        <input name="userId" placeholder="Admin UUID" className="col-span-2 rounded border border-line bg-midnight px-2 py-1" required />
                        <input name="courtId" type="number" defaultValue={booking.court_id} className="rounded border border-line bg-midnight px-2 py-1" />
                        <select name="status" defaultValue={booking.status} className="rounded border border-line bg-midnight px-2 py-1">
                          <option value="confirmed">confirmed</option>
                          <option value="paid">paid</option>
                          <option value="cancelled">cancelled</option>
                          <option value="completed">completed</option>
                        </select>
                        <input name="startTime" type="datetime-local" defaultValue={dateTimeInput(booking.start_time)} className="rounded border border-line bg-midnight px-2 py-1" />
                        <input name="endTime" type="datetime-local" defaultValue={dateTimeInput(booking.end_time)} className="rounded border border-line bg-midnight px-2 py-1" />
                        <input name="totalAmount" type="number" step="0.01" defaultValue={booking.total_amount} className="rounded border border-line bg-midnight px-2 py-1" />
                        <button className="rounded bg-volt px-2 py-1 font-black text-midnight">Save</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="glass rounded-lg p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-volt">Rate Controls</p>
            <h2 className="mb-4 font-display text-3xl font-black text-white">Court pricing rules</h2>
            <div className="space-y-3">
              {overview.pricingRules.map((rule) => (
                <form key={rule.id} action={upsertPricingRule} className="grid grid-cols-2 gap-2 rounded-md border border-line bg-midnight/70 p-3 md:grid-cols-6">
                  <input type="hidden" name="id" value={rule.id} />
                  <input name="userId" placeholder="Admin UUID" className="rounded border border-line bg-midnight px-2 py-1 md:col-span-2" required />
                  <input name="label" defaultValue={rule.label} className="rounded border border-line bg-midnight px-2 py-1 md:col-span-2" />
                  <input name="courtId" placeholder="Court or blank" defaultValue={rule.court_id ?? ""} className="rounded border border-line bg-midnight px-2 py-1" />
                  <input name="price" type="number" defaultValue={rule.price} className="rounded border border-line bg-midnight px-2 py-1" />
                  <input name="startTime" type="time" defaultValue={rule.start_time.slice(0, 5)} className="rounded border border-line bg-midnight px-2 py-1" />
                  <input name="endTime" type="time" defaultValue={rule.end_time.slice(0, 5)} className="rounded border border-line bg-midnight px-2 py-1" />
                  <label className="flex items-center gap-2 text-xs font-bold"><input name="active" type="checkbox" defaultChecked={rule.active} /> Active</label>
                  <button className="rounded bg-court px-2 py-1 font-black text-white">Save rate</button>
                </form>
              ))}
            </div>
          </div>

          <div className="glass rounded-lg p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-volt">Finance Ledger</p>
            <h2 className="mb-4 font-display text-3xl font-black text-white">Expenses and adjustments</h2>
            <form action={addFinanceEntry} className="grid gap-2 rounded-md border border-line bg-midnight/70 p-3">
              <input name="userId" placeholder="Admin user UUID" className="rounded-md border border-line bg-midnight px-3 py-2" required />
              <div className="grid grid-cols-2 gap-2">
                <input name="entryDate" type="date" defaultValue={today} className="rounded-md border border-line bg-midnight px-3 py-2" />
                <select name="category" className="rounded-md border border-line bg-midnight px-3 py-2">
                  <option value="expense">Expense</option>
                  <option value="adjustment">Adjustment</option>
                  <option value="revenue">Revenue</option>
                </select>
              </div>
              <input name="label" placeholder="Label" className="rounded-md border border-line bg-midnight px-3 py-2" />
              <input name="amount" type="number" step="0.01" placeholder="Amount" className="rounded-md border border-line bg-midnight px-3 py-2" />
              <textarea name="notes" rows={2} placeholder="Notes" className="rounded-md border border-line bg-midnight px-3 py-2" />
              <button className="rounded-md bg-volt px-4 py-3 font-black text-midnight">Add finance entry</button>
            </form>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <form action={createNotice} className="glass grid gap-4 rounded-lg p-5">
            <h2 className="font-display text-3xl font-black text-white">Notice Board Editorial</h2>
            <input name="userId" placeholder="Admin user UUID" className="rounded-md border border-line bg-midnight px-3 py-2" required />
            <input name="title" placeholder="Notice title" className="rounded-md border border-line bg-midnight px-3 py-2" required />
            <textarea name="content" placeholder="Announcement content" rows={5} className="rounded-md border border-line bg-midnight px-3 py-2" required />
            <select name="type" className="rounded-md border border-line bg-midnight px-3 py-2">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <button className="rounded-md bg-court px-4 py-3 font-black text-white">Publish Notice</button>
          </form>
          <form action={deleteNotice} className="glass flex flex-col gap-3 rounded-lg p-5">
            <h2 className="font-display text-3xl font-black text-white">Purge Notice</h2>
            <input name="userId" placeholder="Admin user UUID" className="rounded-md border border-line bg-midnight px-3 py-2" required />
            <input name="id" placeholder="Notice ID to purge" type="number" className="rounded-md border border-line bg-midnight px-3 py-2" required />
            <button className="rounded-md border border-red-300/40 px-4 py-3 font-black text-red-200">Purge</button>
          </form>
        </section>
      </main>
      <Footer />
    </>
  );
}
