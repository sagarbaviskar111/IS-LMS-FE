import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import styles from "./landing.module.css";
import navStyles from "./LandingNav.module.css";

const NAV_LINKS = [
  { href: "#services", label: "Services" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#showcase", label: "Product" },
  { href: "#reviews", label: "Reviews" },
  { href: "/student-portfolio", label: "Student Portfolio" },
  { href: "#faq", label: "FAQ" },
];

export default function LandingNav() {
  return (
    <header className={navStyles.header}>
      <div className={`${styles.container} ${navStyles.inner}`}>
        <Link href="/" className={navStyles.brand}>
          <span className={navStyles.brandMark}>IS</span>
          <span className={navStyles.brandName}>InstituteSathi</span>
        </Link>

        <nav className={navStyles.links}>
          {NAV_LINKS.map((link) =>
            link.href.startsWith("#") ? (
              <a key={link.href} href={link.href} className={navStyles.link}>
                {link.label}
              </a>
            ) : (
              <Link key={link.href} href={link.href} className={navStyles.link}>
                {link.label}
              </Link>
            )
          )}
        </nav>

        <div className={navStyles.actions}>
          <ThemeToggle />
          <Link href="/login" className={`${styles.buttonSecondary} ${navStyles.navCta}`}>
            Log in
          </Link>
          <Link href="/signup" className={`${styles.buttonPrimary} ${navStyles.navCta}`}>
            Get started free
          </Link>
        </div>
      </div>
    </header>
  );
}
