import { createNotice, deleteNotice } from "@/app/actions";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";

export default function AdminPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-10 md:px-8">
        <div className="mb-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-volt">Owner Console</p>
          <h1 className="font-display text-5xl font-black text-white">Notice Board Editorial</h1>
          <p className="mt-3 text-slate-300">Secured server actions validate the caller against the admin role in `profiles` before mutating records.</p>
        </div>
        <form action={createNotice} className="glass grid gap-4 rounded-lg p-5">
          <input name="userId" placeholder="Admin user UUID" className="rounded-md border border-line bg-midnight px-3 py-2" required />
          <input name="title" placeholder="Notice title" className="rounded-md border border-line bg-midnight px-3 py-2" required />
          <textarea name="content" placeholder="Announcement content" rows={5} className="rounded-md border border-line bg-midnight px-3 py-2" required />
          <select name="type" className="rounded-md border border-line bg-midnight px-3 py-2">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <button className="rounded-md bg-volt px-4 py-3 font-black text-midnight">Publish Notice</button>
        </form>
        <form action={deleteNotice} className="glass mt-6 flex flex-col gap-3 rounded-lg p-5 md:flex-row">
          <input name="userId" placeholder="Admin user UUID" className="flex-1 rounded-md border border-line bg-midnight px-3 py-2" required />
          <input name="id" placeholder="Notice ID to purge" type="number" className="flex-1 rounded-md border border-line bg-midnight px-3 py-2" required />
          <button className="rounded-md border border-red-300/40 px-4 py-2 font-black text-red-200">Purge</button>
        </form>
      </main>
      <Footer />
    </>
  );
}
