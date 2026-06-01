"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
type ThemeCtx = { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void };

const Ctx = createContext<ThemeCtx | null>(null);

const STORAGE_KEY = "breathe-theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start as light to match SSR output; the no-FOUC inline script in <head>
  // has already set the correct class before paint, so we just sync state.
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const stored = (typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY)) as Theme | null;
    const initial: Theme = stored ?? (document.documentElement.classList.contains("dark") ? "dark" : "light");
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* storage unavailable — non-fatal */
    }
  }, []);

  const toggle = useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [theme, setTheme]);

  return <Ctx.Provider value={{ theme, toggle, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  // Safe fallback so components using the hook never crash if rendered
  // outside the provider (e.g. in isolation/tests).
  if (!ctx) return { theme: "light", toggle: () => {}, setTheme: () => {} };
  return ctx;
}

/** Inline script string injected in <head> to set the theme class before
 *  first paint — prevents a flash of the wrong theme (FOUC). */
export const themeNoFlashScript = `
(function(){try{
  var t = localStorage.getItem('${STORAGE_KEY}');
  if(!t){ t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  var r = document.documentElement;
  r.classList.toggle('dark', t === 'dark');
  r.style.colorScheme = t;
}catch(e){}})();
`;
