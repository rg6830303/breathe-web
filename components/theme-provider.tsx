"use client";

import { createContext, useContext, useEffect } from "react";

/**
 * DARK-ONLY THEME. The product decision is a single permanent dark theme:
 * the `dark` class is hardcoded on <html> (see app/layout.tsx) so every
 * `dark:` Tailwind variant always applies. This provider remains only so any
 * legacy useTheme() consumer keeps compiling — toggling is a no-op.
 */
type Theme = "dark";
type ThemeCtx = { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void };

const Ctx = createContext<ThemeCtx>({ theme: "dark", toggle: () => {}, setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Belt-and-braces: enforce dark even if something removed the class, and
    // clear any stale stored preference from the old light/dark toggle.
    const root = document.documentElement;
    root.classList.add("dark");
    root.style.colorScheme = "dark";
    try {
      localStorage.removeItem("breathe-theme");
    } catch {
      /* storage unavailable — non-fatal */
    }
  }, []);

  return <Ctx.Provider value={{ theme: "dark", toggle: () => {}, setTheme: () => {} }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  return useContext(Ctx);
}
