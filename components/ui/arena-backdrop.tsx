"use client";

/**
 * 3D pickleball arena backdrop (dark-only redesign). Pure-CSS, GPU-friendly:
 * a perspective court floor sweeping to the horizon, a pickleball flying real
 * 3D serve arcs with a tracking ground shadow, a floodlight sweep, and drifting
 * stadium glow orbs. Decorative only — aria-hidden + pointer-events-none, and
 * it freezes under prefers-reduced-motion (see globals.css).
 *
 * Drop it as the first child of any `relative overflow-hidden` dark section.
 */
export function ArenaBackdrop({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {/* deep base wash */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-10%,#16235a_0%,#0b1530_55%,#070d22_100%)]" />

      {/* drifting stadium glow */}
      <div className="arena-orb left-[-6%] top-[-8%] h-72 w-72 bg-brand/30" />
      <div className="arena-orb right-[-8%] top-[10%] h-80 w-80 bg-[#0EA5E9]/20" style={{ animationDelay: "-4s" }} />
      <div className="arena-orb bottom-[-10%] left-[30%] h-72 w-72 bg-lime/12" style={{ animationDelay: "-8s" }} />

      {/* perspective court floor */}
      <div className="arena-floor" />

      {/* floodlight sweep */}
      <div className="arena-sweep" />

      {/* flying ball + tracking shadow, anchored low-left of centre */}
      <div className="absolute bottom-[22%] left-[16%]">
        <div className="arena-ball-shadow absolute top-9 left-0" />
        <div className="arena-ball" />
      </div>

      {/* top + bottom vignettes so content stays legible */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink/80 to-transparent" />
    </div>
  );
}
