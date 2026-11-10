import sharedStyles from "./landing.module.css";
import styles from "./LandingServices.module.css";
import LandingBento from "./LandingBento";

const painPoints: string[] = [
  "Attendance marked on paper registers, re-entered by hand later (if at all).",
  "Fee follow-ups mean calling or WhatsApping parents one by one, every month.",
  "No visibility into which batch is falling behind until it's too late.",
  "Admin staff buried in paperwork just to answer \"has my child submitted homework?\"",
];

const resolutions: string[] = [
  "Attendance marked per batch in the dashboard, with a record you can pull up instantly.",
  "Fee collection and dues tracked online, with optional Razorpay collection at signup.",
  "A single dashboard view shows batch progress, so problems surface early.",
  "Assignments, submissions and results live in one place students and parents can check themselves.",
];

export default function LandingServices() {
  return (
    <>
      <section id="services" className={sharedStyles.section}>
        <div className={sharedStyles.container}>
          <div className={sharedStyles.sectionHead}>
            <h2 className={sharedStyles.sectionTitle}>Attendance, fees, assignments and results in one login.</h2>
            <p className={sharedStyles.sectionSubtitle}>
              Replace the paper register, the fee spreadsheet and the parents' WhatsApp group with one dashboard your staff and students both use.
            </p>
          </div>
          <LandingBento />
        </div>
      </section>

      <section id="how-it-works" className={sharedStyles.sectionAlt}>
        <div className={sharedStyles.container}>
          <div className={sharedStyles.sectionHead}>
            <h2 className={sharedStyles.sectionTitle}>
              A normal week, before and after.
            </h2>
            <p className={sharedStyles.sectionSubtitle}>
              What changes in the daily routine once the register and the spreadsheet are gone.
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
