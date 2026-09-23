"use client";

import { useTheme } from "@/context/ThemeContext";
import styles from "./ThemeToggle.module.css";

// The icon and label never read `theme` from context — that value starts as
// a placeholder on the client's first render (see ThemeContext) and would
// briefly disagree with the real `data-theme` attribute the blocking script
// already set on <html>, causing a hydration mismatch. Both icons are always
// in the DOM; pure CSS (keyed off that same, already-correct data-theme
// attribute) shows the right one with zero flash and zero mismatch risk.
export default function ThemeToggle({ className }: { className?: string }) {
  const { toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`${styles.toggle} ${className || ""}`}
      aria-label="Switch theme"
      title="Switch theme"
    >
      <svg className={styles.sunIcon} width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="4.2" />
        <path d="M10 1.8v2M10 16.2v2M18.2 10h-2M3.8 10h-2M15.6 4.4l-1.4 1.4M5.8 14.2l-1.4 1.4M15.6 15.6l-1.4-1.4M5.8 5.8 4.4 4.4" />
      </svg>
      <svg className={styles.moonIcon} width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
      </svg>
    </button>
  );
}
