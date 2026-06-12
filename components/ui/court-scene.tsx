"use client";

/**
 * Animated pickleball-court scene for the home hero — a "motion-video" look made
 * from a single inline SVG + CSS transforms (see globals.css): a perspective
 * court, net, two player silhouettes rallying a ball back and forth with paddle
 * swings and a tracking ground shadow. Decorative only (aria-hidden,
 * pointer-events-none) and frozen under prefers-reduced-motion.
 */
function Player({ side }: { side: "left" | "right" }) {
  // A simple athletic silhouette; the arm group swings on the hit.
  const armClass = side === "left" ? "scene-arm-left" : "scene-arm-right";
  return (
    <g className={side === "left" ? "scene-player-left" : "scene-player-right"}>
      {/* shadow */}
      <ellipse cx="0" cy="86" rx="26" ry="6" fill="#000" opacity="0.28" />
      {/* legs */}
      <path d="M-6 84 L-10 50 L0 40 L10 50 L6 84" fill="currentColor" opacity="0.92" />
      {/* torso */}
      <path d="M-12 50 Q0 24 12 50 L8 30 Q0 18 -8 30 Z" fill="currentColor" />
      {/* head */}
      <circle cx="0" cy="14" r="9" fill="currentColor" />
      {/* arm + paddle (swings) */}
      <g className={armClass} transform={side === "left" ? "translate(10 30)" : "translate(-10 30)"}>
        <rect x="-3" y="0" width="6" height="26" rx="3" fill="currentColor" />
        <g transform="translate(0 28)">
          <ellipse cx="0" cy="0" rx="9" ry="12" fill="#c6f432" />
          <rect x="-2.5" y="10" width="5" height="10" rx="2" fill="#a3bf1a" />
        </g>
      </g>
    </g>
  );
}

export function CourtScene({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {/* depth wash */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_-15%,#17265f_0%,#0b1530_58%,#070d22_100%)]" />
      {/* glow orbs */}
      <div className="arena-orb left-[-6%] top-[-10%] h-72 w-72 bg-brand/30" />
      <div className="arena-orb right-[-8%] top-[6%] h-80 w-80 bg-[#0EA5E9]/20" style={{ animationDelay: "-5s" }} />

      <svg
        viewBox="0 0 800 460"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="court-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2f5bff" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#2f5bff" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* ---- Perspective court ---- */}
        <g opacity="0.9">
          <polygon points="250,150 550,150 760,430 40,430" fill="url(#court-grad)" />
          {/* outer lines */}
          <polygon points="250,150 550,150 760,430 40,430" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="2.5" />
          {/* net (mid) */}
          <line x1="180" y1="290" x2="620" y2="290" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="3" />
          <line x1="180" y1="290" x2="180" y2="270" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="2" />
          <line x1="620" y1="290" x2="620" y2="270" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="2" />
          {/* kitchen lines */}
          <line x1="212" y1="240" x2="588" y2="240" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="2" />
          <line x1="150" y1="345" x2="650" y2="345" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="2" />
          {/* center service line */}
          <line x1="400" y1="150" x2="400" y2="240" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="2" />
          <line x1="400" y1="345" x2="400" y2="430" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="2" />
        </g>

        {/* ---- Players (text-white/85 via currentColor) ---- */}
        <g className="text-white/85" transform="translate(250 250) scale(1.05)">
          <Player side="left" />
        </g>
        <g className="text-white/85" transform="translate(560 250) scale(1.05)">
          <Player side="right" />
        </g>

        {/* ---- Rallying ball + shadow (origin at left player's contact) ---- */}
        <g transform="translate(270 235)">
          <ellipse className="scene-ball-shadow" cx="0" cy="34" rx="12" ry="3.5" fill="#000" opacity="0.5" />
          <g className="scene-ball">
            <circle r="9" fill="#eaff7a" />
            <circle r="9" fill="none" stroke="#9fbe1f" strokeWidth="1" />
            <circle cx="-3" cy="-2" r="1.3" fill="#0d1426" opacity="0.5" />
            <circle cx="3" cy="-1" r="1.3" fill="#0d1426" opacity="0.5" />
            <circle cx="0" cy="3" r="1.3" fill="#0d1426" opacity="0.5" />
          </g>
        </g>
      </svg>

      {/* floodlight sweep + legibility vignettes */}
      <div className="arena-sweep" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink/85 to-transparent" />
    </div>
  );
}
