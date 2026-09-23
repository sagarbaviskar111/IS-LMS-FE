import Link from "next/link";
import styles from "./landing.module.css";
import heroStyles from "./LandingHero.module.css";

const CAPABILITIES = [
  { value: "10+", label: "Modules in one dashboard" },
  { value: "100%", label: "White-labeled — your name, your URL" },
  { value: "< 1 day", label: "To set up and go live" },
  { value: "Zero", label: "Spreadsheets or paper registers" },
];

export default function LandingHero() {
  return (
    <section className={heroStyles.hero}>
      <div className={`${styles.container} ${heroStyles.grid}`}>
        <div className={heroStyles.copy}>
          <span className={styles.eyebrow}>Built for Indian coaching institutes</span>
          <h1 className={heroStyles.title}>
            Run your coaching institute like a business, not a pile of spreadsheets and registers.
          </h1>
          <p className={heroStyles.subtitle}>
            InstituteSathi brings students, teachers, batches, attendance, fees, exams, assignments,
            study material and admissions into one branded dashboard — with your own logo, your own
            colors, and your own <code className={heroStyles.code}>yourinstitute.institutesathi.com</code> portal.
          </p>

          <div className={styles.buttonRow}>
            <Link href="/signup" className={styles.buttonPrimary}>
              Get started free →
            </Link>
            <Link href="#showcase" className={styles.buttonSecondary}>
              See it in action
            </Link>
          </div>

          <div className={heroStyles.capabilities}>
            {CAPABILITIES.map((c) => (
              <div key={c.label} className={heroStyles.capability}>
                <div className={styles.statValue}>{c.value}</div>
                <div className={styles.statLabel}>{c.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={heroStyles.visual}>
          <div className={styles.browserFrame}>
            <div className={styles.browserFrameBar}>
              <span className={styles.browserDot} />
              <span className={styles.browserDot} />
              <span className={styles.browserDot} />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/demo-admin-overview.jpg" alt="InstituteSathi admin dashboard overview" />
          </div>
          <div className={heroStyles.floatCard}>
            <div className={heroStyles.floatDot} />
            <div>
              <div className={heroStyles.floatTitle}>Live attendance synced</div>
              <div className={heroStyles.floatSub}>Across every batch, in real time</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
