"use client";

import { motion } from "framer-motion";
import { Award, Flame, Lock, Sparkles, Star, Trophy, Zap } from "lucide-react";
import { StatCounter } from "@/components/motion/stat-counter";

export type GameBooking = {
  court_number: number;
  slot_time: string;
  status: string;
};

export type GameStatsInput = {
  totalSessions: number;
  totalSpent: number;
  currentStreak: number;
  longestStreak: number;
};

// 100 XP per confirmed session + 1 XP per ₹10 spent. Levels scale gently.
function deriveXp(s: GameStatsInput) {
  return s.totalSessions * 100 + Math.floor(s.totalSpent / 10);
}
function levelFromXp(xp: number) {
  let level = 1;
  while (xp >= Math.round(500 * Math.pow(level, 1.5))) level++;
  const floor = level === 1 ? 0 : Math.round(500 * Math.pow(level - 1, 1.5));
  const ceil = Math.round(500 * Math.pow(level, 1.5));
  const pct = Math.min(100, Math.round(((xp - floor) / (ceil - floor)) * 100));
  return { level, into: xp - floor, span: ceil - floor, pct };
}

const TIERS = ["Rookie", "Rallyer", "Contender", "Challenger", "Pro", "Ace", "Legend"];
function tierName(level: number) {
  return TIERS[Math.min(TIERS.length - 1, Math.floor((level - 1) / 2))];
}

export function GameStats({ bookings, stats }: { bookings: GameBooking[]; stats: GameStatsInput }) {
  const xp = deriveXp(stats);
  const lvl = levelFromXp(xp);

  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const courtsPlayed = new Set(confirmed.map((b) => b.court_number)).size;
  const primeTime = confirmed.filter((b) => {
    const h = Number(String(b.slot_time).slice(0, 2));
    return h >= 17 && h < 22;
  }).length;

  const badges = [
    { key: "first", label: "First Serve", desc: "Complete your first booking", icon: Star, unlocked: stats.totalSessions >= 1 },
    { key: "regular", label: "Regular", desc: "Play 10 sessions", icon: Zap, unlocked: stats.totalSessions >= 10, progress: Math.min(100, (stats.totalSessions / 10) * 100) },
    { key: "streak", label: "On Fire", desc: "Hit a 3-day streak", icon: Flame, unlocked: stats.longestStreak >= 3, progress: Math.min(100, (stats.longestStreak / 3) * 100) },
    { key: "prime", label: "Prime Timer", desc: "5 prime-time games", icon: Trophy, unlocked: primeTime >= 5, progress: Math.min(100, (primeTime / 5) * 100) },
    { key: "explorer", label: "Court Explorer", desc: "Play all 3 courts", icon: Sparkles, unlocked: courtsPlayed >= 3, progress: Math.min(100, (courtsPlayed / 3) * 100) },
    { key: "centurion", label: "Centurion", desc: "Play 100 sessions", icon: Award, unlocked: stats.totalSessions >= 100, progress: Math.min(100, (stats.totalSessions / 100) * 100) },
  ];
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className="grid gap-4">
      {/* XP / Level card */}
      <div className="relative overflow-hidden rounded-3xl bg-ink">
        {/* Tape stripe top */}
        <div aria-hidden className="tape-stripe h-1.5 w-full" />

        {/* Court-line pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="relative p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Level badge + info */}
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 14 }}
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand font-display text-3xl font-extrabold text-white"
                style={{ boxShadow: "0 8px 0 -2px rgba(35,72,224,0.5)" }}
              >
                {lvl.level}
              </motion.div>
              <div>
                <span className="eyebrow text-lime">{tierName(lvl.level)}</span>
                <h3 className="mt-1 font-display text-2xl font-extrabold text-white">Level {lvl.level}</h3>
                <p className="text-xs text-white/50">
                  <StatCounter end={xp} className="font-bold text-white/70" /> XP total
                </p>
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-5">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 font-display text-3xl font-extrabold text-lime">
                  <Flame className="h-6 w-6" />
                  <StatCounter end={stats.currentStreak} className="" />
                </div>
                <p className="mt-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-white/40">
                  Day streak
                </p>
              </div>
              <div className="text-center">
                <div className="font-display text-3xl font-extrabold text-white">
                  {unlockedCount}/{badges.length}
                </div>
                <p className="mt-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-white/40">
                  Badges
                </p>
              </div>
            </div>
          </div>

          {/* XP progress bar */}
          <div className="relative mt-6">
            <div className="mb-2 flex justify-between text-[0.65rem] font-bold text-white/50">
              <span>Level {lvl.level}</span>
              <span>{lvl.into} / {lvl.span} XP → Level {lvl.level + 1}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${lvl.pct}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="h-full rounded-full bg-lime"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Achievements grid */}
      <div className="rounded-3xl border-2 border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-[#111c38]">
        <h3 className="mb-4 flex items-center gap-2 font-display text-base font-extrabold text-ink dark:text-white">
          <Award className="h-5 w-5 text-brand dark:text-brand-300" /> Achievements
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {badges.map((b, i) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={b.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className={`relative rounded-2xl border-2 p-4 text-center transition-all ${
                  b.unlocked
                    ? "border-brand/20 bg-brand/5 dark:border-brand-300/20 dark:bg-brand/10"
                    : "border-ink/8 bg-white dark:border-white/8 dark:bg-white/5"
                }`}
              >
                <div
                  className={`mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-2xl ${
                    b.unlocked
                      ? "bg-brand text-white"
                      : "bg-ink/5 text-ink/30 dark:bg-white/5 dark:text-white/25"
                  }`}
                  style={b.unlocked ? { boxShadow: "0 4px 0 -1px rgba(35,72,224,0.4)" } : undefined}
                >
                  {b.unlocked ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                </div>
                <p className={`text-xs font-extrabold ${b.unlocked ? "text-ink dark:text-white" : "text-ink/30 dark:text-white/25"}`}>
                  {b.label}
                </p>
                <p className="mt-0.5 text-[0.6rem] leading-tight text-slatey dark:text-white/35">{b.desc}</p>
                {!b.unlocked && typeof b.progress === "number" && b.progress > 0 && (
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink/8 dark:bg-white/10">
                    <div className="h-full rounded-full bg-brand/50" style={{ width: `${b.progress}%` }} />
                  </div>
                )}
                {b.unlocked && (
                  <span className="absolute right-2 top-2 text-[0.6rem] font-extrabold uppercase tracking-wide text-brand dark:text-brand-300">
                    ✓
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
