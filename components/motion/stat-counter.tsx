"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

type Props = {
  end: number;
  prefix?: string;
  suffix?: string;
  /** Tween duration in ms. Default 1800ms hits the sweet spot between
   *  noticeable and not-annoying. */
  duration?: number;
  className?: string;
};

/** Counts from 0 → `end` via requestAnimationFrame when scrolled into view.
 *  Ease-out so the number decelerates at the finish, which reads more
 *  natural than a linear ramp. Runs once. */
export function StatCounter({ end, prefix = "", suffix = "", duration = 1800, className }: Props) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(end * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, end, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}
