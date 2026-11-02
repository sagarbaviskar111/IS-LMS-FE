import type { ReactNode } from "react";
import LandingNav from "@/app/LandingNav";
import SiteFooter from "./SiteFooter";
import landing from "@/app/landing.module.css";
import styles from "./SitePage.module.css";

type Props = {
  eyebrow: string;
  title: string;
  intro?: string;
  updated?: string;
  children: ReactNode;
};

// Shared frame for the public information pages: same header and footer as the
// landing page, with a readable column for the content.
export default function SitePage({ eyebrow, title, intro, updated, children }: Props) {
  return (
    <div className={landing.page}>
      <LandingNav />
      <main className={styles.main}>
        <div className={landing.container}>
          <header className={styles.head}>
            <span className={landing.eyebrow}>{eyebrow}</span>
            <h1 className={styles.title}>{title}</h1>
            {intro && <p className={styles.intro}>{intro}</p>}
            {updated && <p className={styles.updated}>Last updated: {updated}</p>}
          </header>
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export { styles as siteStyles };
