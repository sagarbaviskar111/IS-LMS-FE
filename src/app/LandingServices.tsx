import sharedStyles from "./landing.module.css";
import styles from "./LandingServices.module.css";
import LandingBento from "./LandingBento";

const painPoints: string[] = [
  "Attendance marked on paper registers, re-entered by hand later (if at all).",
  "Fee follow-ups mean calling or WhatsApping parents one by one, every month.",
  "No visibility into which batch is falling behind until it's too late.",
  "Admin staff buried in paperwork just to answer \"has my child submitted homework?\"",
  "Parents call in for every small update because there's no self-serve portal.",
  "Study material shared over WhatsApp/Telegram links that get buried and lost.",
];

const resolutions: string[] = [
  "Attendance marked per batch in the dashboard, with a record you can pull up instantly.",
  "Fee collection and dues tracked online, with optional Razorpay collection at signup.",
  "A single dashboard view shows batch progress, so problems surface early.",
  "Assignments, submissions and results live in one place students and parents can check themselves.",
  "A self-serve student portal answers the routine questions before the phone rings.",
  "Notes, PDFs and recordings live in one in-app library that never gets buried.",
];

export default function LandingServices() {
  return (
    <>
      <section id="services" className={sharedStyles.section}>
        <div className={sharedStyles.container}>
          <div className={sharedStyles.sectionHeadCenter}>
            <span className={sharedStyles.eyebrow}>Platform</span>
            <h2 className={sharedStyles.sectionTitle}>Everything your institute needs, in one place.</h2>
            <p className={sharedStyles.sectionSubtitle}>
              From admissions to exams, InstituteSathi replaces the spreadsheets, registers and
              WhatsApp groups with one dashboard built for coaching institutes.
            </p>
          </div>
          <LandingBento />
        </div>
      </section>

      <section id="how-it-works" className={sharedStyles.sectionAlt}>
        <div className={sharedStyles.container}>
          <div className={sharedStyles.sectionHeadCenter}>
            <span className={sharedStyles.eyebrow}>How it works</span>
            <h2 className={sharedStyles.sectionTitle}>
              From spreadsheet chaos to one dashboard.
            </h2>
            <p className={sharedStyles.sectionSubtitle}>
              The daily grind of running a coaching institute, before and after InstituteSathi.
            </p>
          </div>
          <div className={sharedStyles.grid2}>
            <div className={`${sharedStyles.card} ${styles.beforeCard}`}>
              <h3 className={styles.compareTitle}>Without InstituteSathi</h3>
              <ul className={styles.compareList}>
                {painPoints.map((point) => (
                  <li key={point} className={styles.compareItem}>
                    <span className={`${styles.marker} ${styles.markerX}`}>✕</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={`${sharedStyles.card} ${styles.afterCard}`}>
              <h3 className={styles.compareTitle}>With InstituteSathi</h3>
              <ul className={styles.compareList}>
                {resolutions.map((point) => (
                  <li key={point} className={styles.compareItem}>
                    <span className={`${styles.marker} ${styles.markerCheck}`}>✓</span>
                    <span className={styles.afterText}>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
