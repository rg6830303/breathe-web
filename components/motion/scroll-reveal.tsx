"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

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
 *  (the duration is clamped, not the variants themselves). */
export function ScrollReveal({ children, delay = 0, direction = "up", className = "", margin = "-80px" }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: margin as any });
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
    <motion.div ref={ref} variants={variants} initial="hidden" animate={inView ? "visible" : "hidden"} className={className}>
      {children}
    </motion.div>
  );
}
