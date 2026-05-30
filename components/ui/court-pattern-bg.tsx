/** Top-view pickleball court line SVG used as a decorative background.
 *  Pure SVG, no client boundary needed. Accepts a className so callers can
 *  position it absolutely and control its opacity. Defaults to white strokes
 *  so it sits well on a dark gradient; pass `stroke` to override. */
export function CourtPatternBg({
  className = "",
  stroke = "white",
}: {
  className?: string;
  stroke?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 800 500"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      fill="none"
      stroke={stroke}
      strokeWidth={1.5}
    >
      {/* Outer boundary */}
      <rect x={40} y={40} width={720} height={420} rx={4} />
      {/* Centre net line — thicker */}
      <line x1={400} y1={40} x2={400} y2={460} strokeWidth={2.5} />
      {/* Non-volley zone (kitchen) lines — 7ft from net each side */}
      <line x1={300} y1={40} x2={300} y2={460} strokeDasharray="6 6" />
      <line x1={500} y1={40} x2={500} y2={460} strokeDasharray="6 6" />
      {/* Centreline of each service court */}
      <line x1={40} y1={250} x2={300} y2={250} />
      <line x1={500} y1={250} x2={760} y2={250} />
    </svg>
  );
}
