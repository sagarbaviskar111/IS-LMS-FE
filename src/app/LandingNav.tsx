"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import BrandLogo from "@/components/BrandLogo";
import styles from "./landing.module.css";
import navStyles from "./LandingNav.module.css";

const NAV_LINKS = [
  { href: "/#services", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#showcase", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/student-portfolio", label: "Student Portfolio" },
  { href: "/#faq", label: "FAQ" },
];

export default function LandingNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the menu whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Esc closes; lock page scroll while the sheet is open; close if resized to desktop.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth > 860) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className={navStyles.header}>
      <div className={`${styles.container} ${navStyles.inner}`}>
        <Link href="/" className={navStyles.brand} aria-label="InstituteSathi home">
          <BrandLogo height={40} />
        </Link>

        <nav className={navStyles.links} aria-label="Main">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={navStyles.link}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={navStyles.actions}>
          <ThemeToggle />
          <Link href="/login" className={`${styles.buttonSecondary} ${navStyles.navCta} ${navStyles.loginCta}`}>
            Log in
          </Link>
          <Link href="/get-started" className={`${styles.buttonPrimary} ${navStyles.navCta}`}>
            Start free trial
          </Link>
          <button
            type="button"
            className={navStyles.menuBtn}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className={`${navStyles.bars} ${open ? navStyles.barsOpen : ""}`} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      {open && <div className={navStyles.backdrop} onClick={close} aria-hidden="true" />}
      <div id="mobile-menu" className={`${navStyles.sheet} ${open ? navStyles.sheetOpen : ""}`} hidden={!open}>
        <nav className={navStyles.sheetNav} aria-label="Mobile">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={navStyles.sheetLink} onClick={close}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className={navStyles.sheetActions}>
          <Link href="/login" className={styles.buttonSecondary} onClick={close}>
            Log in
          </Link>
          <Link href="/get-started" className={styles.buttonPrimary} onClick={close}>
            Start free trial
          </Link>
        </div>
      </div>
    </header>
  );
}
