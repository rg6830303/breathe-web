"use client";

import { motion } from "framer-motion";
import { Award, Flame, Lock, Sparkles, Star, Trophy, Zap } from "lucide-react";
import type { Booking } from "@/lib/types";

type Stats = {
  totalSessions: number;
  totalHours: number;
  totalSpent: number;
  currentStreak: number;
  longestStreak: number;
  thisMonthSessions: number;
};

// 100 XP per confirmed session + 1 XP per ₹10 spent. Levels scale quadratically.
function deriveXp(stats: Stats) {
  return stats.totalSessions * 100 + Math.floor(stats.totalSpent / 10);
}
function levelFromXp(xp: number) {
  // level n requires 500 * n^1.5 cumulative XP (gentle curve)
  let level = 1;
  while (xp >= Math.round(500 * Math.pow(level, 1.5))) level++;
  const floor = level === 1 ? 0 : Math.round(500 * Math.pow(level - 1, 1.5));
  const ceil = Math.round(500 * Math.pow(level, 1.5));
  const pct = Math.min(100, Math.round(((xp - floor) / (ceil - floor)) * 100));
  return { level, floor, ceil, pct, into: xp - floor, span: ceil - floor };
}

const TIERS = ["Rookie", "Rallyer", "Contender", "Challenger", "Pro", "Ace", "Legend"];
function tierName(level: number) {
  return TIERS[Math.min(TIERS.length - 1, Math.floor((level - 1) / 2))];
}

export function GameStats({ bookings, stats }: { bookings: Booking[]; stats: Stats }) {
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
      {/* Level + XP hero */}
      <div className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white shadow-glow">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-brand/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-lime/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 14 }}
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-700 font-display text-2xl font-extrabold shadow-glow"
            >
              {lvl.level}
            </motion.div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime">{tierName(lvl.level)}</p>
              <h3 className="font-display text-xl font-extrabold">Level {lvl.level}</h3>
              <p className="text-xs text-white/60">{xp.toLocaleString("en-IN")} XP total</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 font-display text-2xl font-extrabold text-lime">
                <Flame className="h-5 w-5" /> {stats.currentStreak}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">Day streak</p>
            </div>
            <div>
              <div className="font-display text-2xl font-extrabold text-white">{unlockedCount}/{badges.length}</div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">Badges</p>
            </div>
          </div>
        </div>
        <div className="relative mt-5">
          <div className="mb-1 flex justify-between text-xs font-semibold text-white/70">
            <span>Level {lvl.level}</span>
            <span>{lvl.into} / {lvl.span} XP to Level {lvl.level + 1}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${lvl.pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-brand to-lime"
            />
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="rounded-3xl border border-brand/10 bg-white p-5 shadow-soft">
        <h3 className="mb-4 flex items-center gap-2 font-display text-base font-extrabold text-ink">
          <Award className="h-5 w-5 text-brand" /> Achievements
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {badges.map((b, i) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={b.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`relative rounded-2xl border p-4 text-center ${
                  b.unlocked ? "border-brand/20 bg-brand/[0.04]" : "border-brand/10 bg-white"
                }`}
              >
                <div
                  className={`mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl ${
                    b.unlocked ? "bg-gradient-to-br from-brand to-brand-700 text-white shadow-soft" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {b.unlocked ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                </div>
                <p className={`text-xs font-bold ${b.unlocked ? "text-ink" : "text-slate-400"}`}>{b.label}</p>
                <p className="mt-0.5 text-[10px] leading-tight text-slatey">{b.desc}</p>
                {!b.unlocked && typeof b.progress === "number" && b.progress > 0 && (
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand/50" style={{ width: `${b.progress}%` }} />
                  </div>
                )}
                {b.unlocked && (
                  <span className="absolute right-2 top-2 text-[9px] font-bold uppercase tracking-wide text-brand">✓</span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
