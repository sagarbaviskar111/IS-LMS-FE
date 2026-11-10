import Link from "next/link";
import styles from "./landing.module.css";
import heroStyles from "./LandingHero.module.css";

const POINTS = [
  "Fee reminders by email, sent automatically",
  "Batch-wise attendance, no paper register",
  "Your own logo and link: sunrise-classes.institutesathi.com",
];

const PREVIEW_ROWS = [
  { name: "Aarav Sharma", state: "Present" },
  { name: "Priya Verma", state: "Present" },
  { name: "Rohit Singh", state: "Absent" },
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
            Attendance, fee reminders, assignments and results for every batch, under your own logo and your own link.
          </p>

          <div className={styles.buttonRow}>
            <Link href="/get-started" className={styles.buttonPrimary}>
              Start free trial
            </Link>
            <Link href="#showcase" className={styles.buttonSecondary}>
              See it in action
            </Link>
          </div>

          <ul className={heroStyles.points}>
            {POINTS.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>

        <div className={heroStyles.visual}>
          <div className={heroStyles.preview} role="group" aria-label="Sample dashboard preview">
            <div className={heroStyles.previewHead}>
              <div>
                <strong>Class 10th Math Batch</strong>
                <span>Today&apos;s attendance · 8:00 AM</span>
              </div>
              <span className={heroStyles.badge}>94% present</span>
            </div>

            <dl className={heroStyles.stats}>
              <div>
                <dt>Present</dt>
                <dd>47</dd>
              </div>
              <div>
                <dt>Absent</dt>
                <dd>3</dd>
              </div>
              <div>
                <dt>Total students</dt>
                <dd>50</dd>
              </div>
            </dl>

            <ul className={heroStyles.rows}>
              {PREVIEW_ROWS.map((r) => (
                <li key={r.name}>
                  <span className={heroStyles.avatar} aria-hidden="true">
                    {r.name[0]}
                  </span>
                  <span className={heroStyles.rowName}>{r.name}</span>
                  <span className={r.state === "Present" ? heroStyles.present : heroStyles.absent}>{r.state}</span>
                </li>
              ))}
            </ul>

            <div className={heroStyles.fee}>
              <div>
                <strong>Aarav Sharma · Class 10th Math</strong>
                <span>₹1,500 fee due · 5 Nov</span>
              </div>
              <span className={heroStyles.sent}>✓ Email reminder sent</span>
            </div>
          </div>
          <p className={heroStyles.sample}>Sample data</p>
        </div>
      </div>
    </section>
  );
}
