import Link from "next/link";
import sharedStyles from "@/app/landing.module.css";
import styles from "@/app/LandingTestimonials.module.css";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#services", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#showcase", label: "Product" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/careers", label: "Careers" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/refund-policy", label: "Refund Policy" },
    ],
  },
];

// Site-wide footer for the landing page and the public information pages.
export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={sharedStyles.container}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <div className={styles.footerBrandRow}>
              <div className={styles.footerMark}>IS</div>
              <span className={styles.footerBrandName}>InstituteSathi</span>
            </div>
            <p className={styles.footerTagline}>The all-in-one dashboard for coaching institutes.</p>
          </div>

          <div className={styles.footerCols}>
            {COLUMNS.map((col) => (
              <div className={styles.footerCol} key={col.title}>
                <p className={styles.footerColTitle}>{col.title}</p>
                <ul className={styles.footerColList}>
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className={styles.footerColLink}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p className={styles.footerBottomText}>&copy; {new Date().getFullYear()} InstituteSathi. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
