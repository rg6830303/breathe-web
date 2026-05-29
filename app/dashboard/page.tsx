import { Award, Clock, Flame, Trophy, Zap } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { Container, Eyebrow } from "@/components/ui";

export const dynamic = "force-dynamic";

async function getDashboard() {
  const fallback = {
    profile: { full_name: "Dinker Pro", current_streak: 12, current_xp: 8450 },
    metrics: { level: 24, nextLevelXp: 10000, winRate: 68, matches: 142, courtHours: 32 },
    badges: [
      { name: "Dinker", progress: 100, unlocked: true },
      { name: "Rallier", progress: 60, unlocked: false },
      { name: "Pro-Smasher", progress: 0, unlocked: false },
    ],
  };
  if (!process.env.VERCEL_URL && process.env.NODE_ENV === "production") return fallback;
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/player/dashboard`, { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return fallback;
  return response.json();
}

export default async function DashboardPage() {
  const data = await getDashboard();
  const xpPct = Math.min(100, Math.round((data.profile.current_xp / data.metrics.nextLevelXp) * 100));
  const stats = [
    { icon: Trophy, value: `${data.metrics.winRate}%`, label: "Win rate" },
    { icon: Zap, value: data.metrics.matches, label: "Matches" },
    { icon: Clock, value: `${data.metrics.courtHours}h`, label: "Court time" },
  ];

  return (
    <>
      <Nav />
      <main>
        <section className="brand-gradient brand-mesh relative overflow-hidden text-white">
          <div className="court-lines absolute inset-0 opacity-25" />
          <Container className="relative py-12 sm:py-14">
            <Eyebrow light>Player dashboard</Eyebrow>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 font-display text-2xl font-extrabold">
                {String(data.profile.full_name).charAt(0)}
              </div>
              <div>
                <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{data.profile.full_name}</h1>
                <p className="text-sm font-semibold text-ball">Level {data.metrics.level} Athlete</p>
              </div>
            </div>
          </Container>
        </section>

        <Container className="py-10">
          <div className="grid gap-6 lg:grid-cols-3">
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label} className="rounded-3xl border border-brand/10 bg-white p-6 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-slatey">{label}</span>
                  <Icon className="h-5 w-5 text-brand" />
                </div>
                <div className="mt-3 font-display text-3xl font-extrabold text-ink">{value}</div>
              </div>
            ))}
          </div>

          {/* XP progress */}
          <div className="mt-6 rounded-3xl border border-brand/10 bg-white p-6 shadow-soft">
            <div className="mb-3 flex items-center justify-between text-sm font-semibold">
              <span className="text-ink">Progress to next level</span>
              <span className="text-brand">{data.profile.current_xp} / {data.metrics.nextLevelXp} XP</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-brand/10">
              <div className="h-full rounded-full brand-gradient" style={{ width: `${xpPct}%` }} />
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Badges */}
            <div className="rounded-3xl border border-brand/10 bg-white p-6 shadow-soft">
              <h3 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
                <Award className="h-5 w-5 text-brand" /> Badge unlocks
              </h3>
              <div className="mt-4 space-y-3">
                {data.badges.map((badge: { name: string; progress: number; unlocked: boolean }) => (
                  <div key={badge.name} className="rounded-2xl border border-brand/10 bg-brand/[0.03] p-4">
                    <div className="mb-2 flex justify-between text-sm font-bold">
                      <span className="text-ink">{badge.name}</span>
                      <span className={badge.unlocked ? "text-brand" : "text-slatey"}>
                        {badge.unlocked ? "Unlocked" : `${badge.progress}%`}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-brand/10">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, badge.progress)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Streak */}
            <div className="flex flex-col justify-between rounded-3xl border border-brand/10 bg-white p-6 shadow-soft">
              <div>
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slatey">
                  <Flame className="h-4 w-4 text-brand" /> Current streak
                </h3>
                <div className="mt-3 font-display text-5xl font-extrabold text-brand">{data.profile.current_streak} days</div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slatey">
                Keep the streak alive — book your next session and stay on the ladder. Metrics sync from your booking
                history once your account is connected.
              </p>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
