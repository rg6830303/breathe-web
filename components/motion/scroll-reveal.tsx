"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type Direction = "up" | "left" | "right" | "none";

type Props = {
  children: React.ReactNode;
  /** Stagger delay in seconds. Caller is responsible for ordering. */
  delay?: number;
  direction?: Direction;
  className?: string;
  /** Optional override of the rootMargin offset — bigger = triggers later. */
  margin?: string;
};

/** Scroll-triggered reveal used on every inner page. Fires `once`, so once
 *  the element is visible it stays visible — avoids flashing on scroll back.
 *  Respects prefers-reduced-motion via the global CSS rule in globals.css
 *  (the duration is clamped, not the variants themselves).
 *
 *  Mobile safety net: some mobile browsers mis-handle a negative Intersection
 *  Observer rootMargin on sections taller than the viewport, so `useInView`
 *  never fires and the content stays stuck at opacity:0 (the "blank, unreadable
 *  lower half" bug). We therefore (a) use a smaller default margin so it
 *  triggers more readily, (b) reveal immediately for reduced-motion users, and
 *  (c) force-reveal after a short fallback timeout so nothing is ever left
 *  permanently invisible. */
export function ScrollReveal({ children, delay = 0, direction = "up", className = "", margin = "-40px" }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: margin as any });
  const [forced, setForced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setForced(true);
      return;
    }
    // Hard guarantee against permanently-hidden content: if the observer hasn't
    // fired within ~1.1s of mount, reveal anyway. Below-fold content reveals via
    // useInView on scroll first; this only ever rescues a missed observer.
    const t = window.setTimeout(() => setForced(true), 1100);
    return () => window.clearTimeout(t);
  }, []);

  const visible = inView || forced;
  const variants = {
    hidden: {
      opacity: 0,
      y: direction === "up" ? 32 : 0,
      x: direction === "left" ? -32 : direction === "right" ? 32 : 0,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
    },
  };
  return (
    <motion.div ref={ref} variants={variants} initial="hidden" animate={visible ? "visible" : "hidden"} className={className}>
      {children}
    </motion.div>
  );
}
