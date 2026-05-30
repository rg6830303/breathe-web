import Link from "next/link";
import { motion } from "framer-motion";

/** Pickleball paddle + ball mark, echoing the club logo's paddle that replaces the "t". */
export function PaddleMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <g transform="rotate(18 24 24)">
        {/* paddle face */}
        <rect x="14" y="3" width="20" height="26" rx="10" fill="currentColor" />
        {/* handle */}
        <rect x="21" y="27" width="6" height="15" rx="3" fill="currentColor" />
        {/* face holes */}
        <g fill="#2F5BFF">
          <circle cx="20" cy="11" r="1.6" />
          <circle cx="24" cy="11" r="1.6" />
          <circle cx="28" cy="11" r="1.6" />
          <circle cx="20" cy="16" r="1.6" />
          <circle cx="24" cy="16" r="1.6" />
          <circle cx="28" cy="16" r="1.6" />
          <circle cx="22" cy="21" r="1.6" />
          <circle cx="26" cy="21" r="1.6" />
        </g>
      </g>
      {/* ball */}
      <circle cx="9" cy="14" r="6" fill="#C6F23E" />
      <g fill="#1B39C4">
        <circle cx="7" cy="12" r="1" />
        <circle cx="11" cy="12" r="1" />
        <circle cx="9" cy="16" r="1" />
        <circle cx="6.5" cy="15" r="0.9" />
      </g>
    </svg>
  );
}

/**
 * Brand wordmark. `variant="light"` renders white text for dark/brand backgrounds,
 * `variant="dark"` renders ink/brand text for white backgrounds.
 */
export function Logo({
  variant = "dark",
  className = "",
}: {
  variant?: "light" | "dark";
  className?: string;
}) {
  const isLight = variant === "light";
  return (
    <motion.div whileHover={{ scale: 1.05 }} className="inline-block origin-left">
      <Link href="/" className={`group inline-flex items-center gap-2.5 ${className}`} aria-label="Breathe Pickleball home">
      <span className={isLight ? "text-white" : "text-brand"}>
        <PaddleMark className="h-8 w-8 transition-transform duration-300 group-hover:-rotate-6" />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={`font-display text-2xl font-extrabold italic tracking-tight ${
            isLight ? "text-white" : "text-ink"
          }`}
        >
          brea<span className={isLight ? "text-white/90" : "text-brand"}>the</span>
        </span>
        <span
          className={`mt-0.5 text-[0.6rem] font-bold uppercase tracking-[0.42em] ${
            isLight ? "text-white/75" : "text-brand/70"
          }`}
        >
          pickleball
        </span>
      </span>
    </Link>
    </motion.div>
  );
}
