"use client";

import { AnimatePresence } from "framer-motion";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";

/** Root client boundary that owns the exit-animation context for the
 *  per-route template wrapper (see app/template.tsx). `mode="wait"` ensures
 *  the outgoing page finishes its exit animation before the incoming one
 *  mounts — avoids overlapping content during route changes. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AnimatePresence mode="wait">{children}</AnimatePresence>
      </ToastProvider>
    </ThemeProvider>
  );
}
