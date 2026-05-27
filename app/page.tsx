import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { NoticeBoard } from "@/components/notice-board";
import type { Notice } from "@/lib/types";

async function getNotices(): Promise<Notice[]> {
  const fallback = [
    { id: 1, title: "Tonight: Court 1 prime slot", content: "Two 7 PM openings are live.", type: "daily" as const, created_at: "", updated_at: "" },
    { id: 2, title: "Weekly ladder", content: "Registration closes Friday.", type: "weekly" as const, created_at: "", updated_at: "" },
    { id: 3, title: "Monthly neon cup", content: "Early bird passes are available.", type: "monthly" as const, created_at: "", updated_at: "" },
  ];
  if (!process.env.VERCEL_URL) return fallback;
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
  try {
    const response = await fetch(`${baseUrl}/api/notice-board`, { next: { revalidate: 60 } });
    return response.json();
  } catch {
    return fallback;
  }
}

export default async function Home() {
  const notices = await getNotices();
  return (
    <>
      <Nav />
      <main>
        <section className="relative min-h-[76vh] overflow-hidden px-4 py-20 md:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(42,102,255,0.25),transparent_34%),radial-gradient(circle_at_80%_70%,rgba(210,255,42,0.16),transparent_28%)]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <p className="mb-4 text-sm font-black uppercase tracking-[0.25em] text-volt">Kaikhali's cyber-athletic arena</p>
              <h1 className="font-display text-6xl font-black uppercase leading-none text-white md:text-8xl">
                Breathe <span className="text-court">Pickleball</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                Premium court booking, live slot intelligence, player progression, and owner operations in one Vercel-ready system.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="/book" className="rounded-md bg-volt px-6 py-3 font-black text-midnight shadow-volt">Book Slot Now</a>
                <a href="/dashboard" className="rounded-md border border-court px-6 py-3 font-black text-white hover:bg-court/20">Player Dashboard</a>
              </div>
            </div>
            <div className="relative h-[420px]">
              <div className="court-perspective absolute left-8 top-16 grid w-[520px] grid-cols-2 gap-3 rounded-lg border border-court/60 bg-court/10 p-5 shadow-glow">
                {Array.from({ length: 18 }).map((_, index) => (
                  <div key={index} className={`h-14 rounded border ${index % 5 === 0 ? "border-volt bg-volt/20" : "border-court/35 bg-midnight/80"}`} />
                ))}
              </div>
              <div className="glass absolute bottom-8 right-0 max-w-xs rounded-lg p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-volt">Live Status</p>
                <h2 className="mt-2 font-display text-3xl font-black text-white">Courts Active</h2>
                <p className="mt-3 text-sm text-slate-300">Availability feeds directly into reservations and admin alerts.</p>
              </div>
            </div>
          </div>
        </section>
        <section className="border-y border-line bg-panel/40 px-4 py-12 md:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
            {[
              ["500+", "Matches Played"],
              ["2", "Live Courts"],
              ["1,250+", "Player Check-ins"],
            ].map(([value, label]) => (
              <div key={label} className="glass rounded-lg p-6 text-center">
                <div className="font-display text-5xl font-black text-volt">{value}</div>
                <div className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
              </div>
            ))}
          </div>
        </section>
        <NoticeBoard notices={notices} />
      </main>
      <Footer />
    </>
  );
}
