"use client";

import { motion } from "framer-motion";

/** Next App Router `template.tsx` re-mounts on every route change (unlike
 *  layout.tsx, which persists). Wrapping its children in a motion.div gives
 *  every navigation a uniform fade+rise transition with no extra effort at
 *  the per-page level. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
