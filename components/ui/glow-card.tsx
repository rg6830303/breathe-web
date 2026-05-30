"use client";

import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";

type Props = HTMLMotionProps<"div"> & {
  /** Defaults to the standard "raise + brand-blue glow" hover. Pass a custom
   *  `whileHover` to override (e.g. tournament cards use a gold glow). */
  glow?: string;
};

/** Reusable card surface with a brand-blue glow on hover. Used for program
 *  cards, format cards, feature cards, stat tiles, etc. The default styling
 *  matches the existing rounded-2xl + border + soft-shadow conventions so
 *  callers can drop it in without restyling. */
export function GlowCard({ children, glow, className = "", whileHover, transition, ...rest }: Props) {
  return (
    <motion.div
      whileHover={
        whileHover ?? {
          y: -6,
          boxShadow: glow ?? "0 20px 60px rgba(47,91,255,0.18)",
        }
      }
      transition={transition ?? { type: "spring", stiffness: 300, damping: 20 }}
      className={`bg-white rounded-2xl border border-gray-100 p-6 shadow-soft ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
