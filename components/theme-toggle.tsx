"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

/**
 * Sun/moon dark-mode switch. `tone="onLight"` for white surfaces (default),
 * `tone="onDark"` for brand/dark surfaces (e.g. inside the brand ticker).
 */
export function ThemeToggle({ tone = "onLight", className = "" }: { tone?: "onLight" | "onDark"; className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  const base =
    tone === "onDark"
      ? "border-white/25 text-white hover:bg-white/10"
      : "border-brand/15 text-ink hover:bg-brand/5 dark:border-white/15 dark:text-white dark:hover:bg-white/10";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      className={`relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border transition ${base} ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="moon"
            initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="h-4 w-4" />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="h-4 w-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
