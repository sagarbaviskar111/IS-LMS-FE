import styles from "./BrandLogo.module.css";

// Both logo images are always in the DOM; pure CSS (keyed off the same
// data-theme attribute ThemeToggle uses) shows the right one with zero flash
// and zero hydration mismatch — see ThemeToggle.tsx for why that matters.
export default function BrandLogo({ height = 32, className }: { height?: number; className?: string }) {
  return (
    <span className={`${styles.wrap} ${className || ""}`} style={{ height }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/IS%20logo%20light.jpeg" alt="InstituteSathi" className={styles.light} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/IS%20logo%20dark.jpeg" alt="InstituteSathi" className={styles.dark} />
    </span>
  );
}
