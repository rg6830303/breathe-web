import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";

async function getDashboard() {
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/player/dashboard`, { cache: "no-store" }).catch(() => null);
  if (!response?.ok) {
    return {
      profile: { full_name: "Dinker Pro", current_streak: 12, current_xp: 8450 },
      metrics: { level: 24, nextLevelXp: 10000, winRate: 68, matches: 142, courtHours: 32 },
      badges: [
        { name: "Dinker", progress: 100, unlocked: true },
        { name: "Rallier", progress: 60, unlocked: false },
        { name: "Pro-Smasher", progress: 0, unlocked: false },
      ],
    };
  }
  return response.json();
}

export default async function DashboardPage() {
  const data = await getDashboard();
  const xpPct = Math.round((data.profile.current_xp / data.metrics.nextLevelXp) * 100);
  return (
    <>
      <Nav />
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-10 md:grid-cols-[280px_1fr] md:px-8">
        <aside className="glass rounded-lg p-5">
          <div className="mb-5 h-24 w-24 rounded-full border-4 border-court bg-[radial-gradient(circle,rgba(210,255,42,0.35),rgba(42,102,255,0.25))]" />
          <h1 className="font-display text-3xl font-black text-court">{data.profile.full_name}</h1>
          <p className="mt-1 text-sm font-bold text-volt">Level {data.metrics.level} Athlete</p>
          <div className="mt-8 space-y-2 text-sm font-bold text-slate-300">
            <div className="rounded-md bg-volt px-3 py-2 text-midnight">Stats</div>
            <div className="rounded-md px-3 py-2 hover:bg-court/10">Bookings</div>
            <div className="rounded-md px-3 py-2 hover:bg-court/10">Badges</div>
            <div className="rounded-md px-3 py-2 hover:bg-court/10">Contact</div>
          </div>
        </aside>
        <section className="space-y-6">
          <div className="glass relative overflow-hidden rounded-lg p-6">
            <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-court/20 blur-3xl" />
            <div className="relative">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-volt">Player Dashboard</p>
              <h2 className="mt-2 font-display text-5xl font-black text-white">{data.profile.full_name}</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  [`${data.metrics.winRate}%`, "Win Rate"],
                  [data.metrics.matches, "Matches"],
                  [`${data.metrics.courtHours}h`, "Court Time"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-lg border border-line bg-midnight/70 p-4 text-center">
                    <div className="font-display text-3xl font-black text-volt">{value}</div>
                    <div className="mt-1 text-xs font-black uppercase text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <div className="mb-2 flex justify-between text-sm font-bold">
                  <span>Progression to next level</span>
                  <span className="text-volt">{data.profile.current_xp} / {data.metrics.nextLevelXp} XP</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-midnight">
                  <div className="h-full rounded-full bg-gradient-to-r from-court to-volt" style={{ width: `${xpPct}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="glass rounded-lg p-5">
              <h3 className="mb-4 font-display text-2xl font-black text-white">Badge Unlocks</h3>
              <div className="space-y-3">
                {data.badges.map((badge: { name: string; progress: number; unlocked: boolean }) => (
                  <div key={badge.name} className="rounded-md border border-line bg-midnight/70 p-3">
                    <div className="mb-2 flex justify-between text-sm font-black">
                      <span>{badge.name}</span>
                      <span className={badge.unlocked ? "text-volt" : "text-slate-400"}>{badge.unlocked ? "Unlocked" : `${badge.progress}%`}</span>
                    </div>
                    <div className="h-2 rounded-full bg-panel">
                      <div className="h-full rounded-full bg-court" style={{ width: `${Math.min(100, badge.progress)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass rounded-lg p-5">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Current Streak</p>
              <div className="mt-3 font-display text-6xl font-black text-volt">{data.profile.current_streak} Days</div>
              <p className="mt-4 text-sm leading-6 text-slate-300">Dashboard metrics are served by `/api/player/dashboard` and can be swapped to authenticated user context when Supabase Auth is connected.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
