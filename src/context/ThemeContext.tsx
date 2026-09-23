"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const getSystemTheme = (): Theme =>
  typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always "light" on both the server render and the client's first
  // (hydrating) render — reading `document` in the initializer instead would
  // make the client's first render disagree with the server-rendered HTML
  // (the blocking inline script in RootLayout has already set the *real*
  // data-theme on <html> by the time this component mounts) and trigger a
  // React hydration-mismatch error on any consumer that renders differently
  // per theme. Synced to the real value in the effect below, which only runs
  // after hydration completes — any component that needs to avoid a one-tick
  // flash of this default should key off the `data-theme` attribute directly
  // via CSS (see ThemeToggle) rather than off this context value.
  const [theme, setThemeState] = useState<Theme>("light");
  // The mount-time sync below (reading the DOM into state) and this write-back
  // effect both fire on the same first commit; without this guard the write
  // effect would still see the stale "light" default and stomp the correct
  // dark attribute the blocking script already set, causing a one-frame
  // flash back to light before the sync's state update re-renders it right.
  // Skip exactly that first, redundant write — every write after it is real.
  const skipNextWrite = useRef(true);

  useEffect(() => {
    const attr = document.documentElement.getAttribute("data-theme");
    setThemeState(attr === "dark" ? "dark" : getSystemTheme());
  }, []);

  useEffect(() => {
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Only follow the OS preference live when the user hasn't made an explicit
  // choice yet — once they pick one, it sticks regardless of OS changes.
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setThemeState(media.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing / storage disabled — theme just won't persist.
    }
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
