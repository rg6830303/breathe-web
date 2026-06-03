"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * A small pickleball paddle that spins in proportion to how far the page is
 * scrolled. Mobile-only (hidden on lg+), since the brief is to delight phone
 * users — and it doubles as a tap-to-top button, which is genuinely useful on
 * the long marketing/booking pages. Respects prefers-reduced-motion: it still
 * appears (so the back-to-top affordance remains) but does not spin.
 */
export function ScrollPaddle() {
  const { scrollY, scrollYProgress } = useScroll();
  const reduce = useReducedMotion();
  // Three full turns across the length of the page feels lively without being
  // dizzying. Clamped to 0 when the user has opted out of motion.
  const rotate = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 1080]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only reveal once the user has actually scrolled down a little.
    const unsub = scrollY.on("change", (v) => setShow(v > 260));
    return () => unsub();
  }, [scrollY]);

  return (
    <motion.button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })}
      initial={false}
      animate={{
        opacity: show ? 1 : 0,
        scale: show ? 1 : 0.6,
      }}
      style={{ pointerEvents: show ? "auto" : "none" }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="fixed right-4 bottom-[max(env(safe-area-inset-bottom),1rem)] z-40 flex h-12 w-12 items-center justify-center rounded-full border border-brand/15 bg-white/90 shadow-card backdrop-blur-md lg:hidden dark:border-white/15 dark:bg-ink/80"
    >
      <motion.svg
        viewBox="0 0 100 100"
        className="h-7 w-7"
        style={{ rotate }}
        aria-hidden="true"
      >
        {/* Paddle head + handle, brand-coloured with ball-hole detail. */}
        <ellipse cx="50" cy="40" rx="22" ry="27" className="fill-brand" />
        <rect x="46" y="66" width="8" height="24" rx="3" className="fill-brand-700" />
        <g className="fill-white/85">
          <circle cx="44" cy="32" r="2" /><circle cx="50" cy="32" r="2" /><circle cx="56" cy="32" r="2" />
          <circle cx="44" cy="40" r="2" /><circle cx="50" cy="40" r="2" /><circle cx="56" cy="40" r="2" />
          <circle cx="47" cy="48" r="2" /><circle cx="53" cy="48" r="2" />
        </g>
      </motion.svg>
    </motion.button>
  );
}
