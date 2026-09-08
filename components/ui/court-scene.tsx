"use client";

/**
 * Cinematic "pickleball in action" hero scene — a motion-video look built from a
 * single inline SVG + CSS transforms (see globals.css). A perspective court
 * sweeps to the horizon under a floodlight cone while two player silhouettes
 * rally a glowing ball back and forth, paddles swinging on the hit, with motion
 * streaks and a tracking ground shadow. Purely decorative (aria-hidden,
 * pointer-events-none) and fully frozen under prefers-reduced-motion.
 */
function Player({ side }: { side: "left" | "right" }) {
  const armClass = side === "left" ? "scene-arm-left" : "scene-arm-right";
  return (
    <g className={side === "left" ? "scene-player-left" : "scene-player-right"}>
      {/* contact shadow */}
      <ellipse cx="0" cy="88" rx="28" ry="6.5" fill="#000" opacity="0.3" />
      {/* legs */}
      <path d="M-7 86 L-11 50 L0 40 L11 50 L7 86" fill="currentColor" opacity="0.92" />
      {/* torso */}
      <path d="M-13 50 Q0 22 13 50 L9 30 Q0 16 -9 30 Z" fill="currentColor" />
      {/* head */}
      <circle cx="0" cy="13" r="9.5" fill="currentColor" />
      {/* headband — lime accent */}
      <path d="M-9 11 Q0 6 9 11" stroke="#c6f432" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* arm + paddle (swings on contact) */}
      <g className={armClass} transform={side === "left" ? "translate(11 30)" : "translate(-11 30)"}>
        <rect x="-3" y="0" width="6" height="27" rx="3" fill="currentColor" />
        <g transform="translate(0 29)">
          <ellipse cx="0" cy="0" rx="9.5" ry="12.5" fill="#c6f432" />
          <ellipse cx="0" cy="0" rx="9.5" ry="12.5" fill="none" stroke="#0d1426" strokeOpacity="0.25" strokeWidth="1" />
          <rect x="-2.5" y="10" width="5" height="11" rx="2" fill="#a3bf1a" />
        </g>
      </g>
    </g>
  );
}

export function CourtScene({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {/* cinematic depth wash */}
      <div className="absolute inset-0 bg-[radial-gradient(125%_100%_at_50%_-15%,#1a2b66_0%,#0b1530_55%,#060b1c_100%)]" />

      {/* floodlight cone from above */}
      <div className="hero-floodlight" />

      {/* drifting stadium glow */}
      <div className="arena-orb left-[-8%] top-[-12%] h-80 w-80 bg-brand/30" />
      <div className="arena-orb right-[-10%] top-[2%] h-96 w-96 bg-[#0EA5E9]/20" style={{ animationDelay: "-5s" }} />
      <div className="arena-orb bottom-[-14%] left-[35%] h-72 w-72 bg-lime/10" style={{ animationDelay: "-9s" }} />

      <svg
        viewBox="0 0 800 460"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="court-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2f5bff" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2f5bff" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {/* ---- Perspective court ---- */}
        <g>
          <polygon points="250,150 550,150 760,430 40,430" fill="url(#court-grad)" />
          <polygon points="250,150 550,150 760,430 40,430" fill="none" stroke="#ffffff" strokeOpacity="0.38" strokeWidth="2.5" />
          {/* net posts + tape */}
          <line x1="180" y1="290" x2="620" y2="290" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="3" />
          <line x1="180" y1="290" x2="180" y2="266" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="2" />
          <line x1="620" y1="290" x2="620" y2="266" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="2" />
          {/* net mesh hint */}
          <line x1="180" y1="278" x2="620" y2="278" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="1" strokeDasharray="3 4" />
          {/* kitchen lines */}
          <line x1="212" y1="240" x2="588" y2="240" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="2" />
          <line x1="150" y1="345" x2="650" y2="345" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="2" />
          {/* center service lines */}
          <line x1="400" y1="150" x2="400" y2="240" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="2" />
          <line x1="400" y1="345" x2="400" y2="430" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="2" />
        </g>

        {/* ---- Players ---- */}
        <g className="text-white/85" transform="translate(250 248) scale(1.08)">
          <Player side="left" />
        </g>
        <g className="text-white/85" transform="translate(560 248) scale(1.08)">
          <Player side="right" />
        </g>

        {/* ---- Rallying ball + ground shadow ---- */}
        <g transform="translate(270 232)">
          <ellipse className="scene-ball-shadow" cx="0" cy="36" rx="13" ry="3.5" fill="#000" opacity="0.5" />
          <g className="scene-ball">
            <circle r="9.5" fill="#eaff7a" />
            <circle r="9.5" fill="none" stroke="#9fbe1f" strokeWidth="1" />
            <circle r="9.5" fill="#fff" opacity="0.18" transform="translate(-3 -3)" />
            <circle cx="-3" cy="-2" r="1.3" fill="#0d1426" opacity="0.5" />
            <circle cx="3" cy="-1" r="1.3" fill="#0d1426" opacity="0.5" />
            <circle cx="0" cy="3" r="1.3" fill="#0d1426" opacity="0.5" />
          </g>
        </g>
      </svg>

      {/* motion streaks for energy */}
      <span className="hero-streak left-0 top-[38%] w-40" />
      <span className="hero-streak left-0 top-[58%] w-28" style={{ animationDelay: "-2.2s" }} />
      <span className="hero-streak left-0 top-[70%] w-52" style={{ animationDelay: "-3.4s" }} />

      {/* floodlight sweep + legibility vignettes + grain */}
      <div className="arena-sweep" />
      <div className="grain" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink/80 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink to-transparent" />
    </div>
  );
}
