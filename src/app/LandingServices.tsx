import type { ReactNode } from "react";
import sharedStyles from "./landing.module.css";
import styles from "./LandingServices.module.css";

type Feature = {
  title: string;
  text: string;
  icon: ReactNode;
};

const features: Feature[] = [
  {
    title: "Student, Teacher & Telecaller Management",
    text: "Role-based accounts for admins, teachers, telecallers and students, each with their own dashboard and permissions — so everyone sees only what's relevant to their job.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="6" r="2.6" />
        <path d="M2.5 17c0-2.8 2-4.6 4.5-4.6s4.5 1.8 4.5 4.6" />
        <circle cx="15" cy="7" r="2" />
        <path d="M12.8 12.6c2.1.1 3.7 1.7 3.7 4.4" />
      </svg>
    ),
  },
  {
    title: "Batch Management & Attendance",
    text: "Organize students into batches and mark attendance in seconds, with a clear per-batch and per-student record you can pull up anytime.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="3.5" width="15" height="14" rx="2" />
        <path d="M2.5 8h15" />
        <path d="M6 2v3M14 2v3" />
        <path d="M5.5 11.5l1.5 1.5 2.5-2.8" />
      </svg>
    ),
  },
  {
    title: "Assignments with Due Dates",
    text: "Teachers set a name, due date, description and an optional document; students upload their work before the deadline, and submissions auto-lock the moment it passes — no more late excuses.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2.5h6.5L16 6v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" />
        <path d="M12 2.5V6h4" />
        <path d="M6.5 10.5h6M6.5 13h4.5" />
      </svg>
    ),
  },
  {
    title: "Study Material Library",
    text: "Teachers upload notes, PDFs and documents for a batch, and students open everything in an in-app viewer — nothing to download, no external redirects.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 4.5c1.8-1 4.3-1 6 0v11.5c-1.7-1-4.2-1-6 0V4.5Z" />
        <path d="M17 4.5c-1.8-1-4.3-1-6 0v11.5c1.7-1 4.2-1 6 0V4.5Z" />
      </svg>
    ),
  },
  {
    title: "Safe Session Recordings",
    text: "Recorded classes play in a fully custom, YouTube-style player embedded right in the dashboard — no stray links, no distracting recommendations, no leaving the platform.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="4" width="15" height="11.5" rx="2" />
        <path d="M8.3 7.5l4 2.5-4 2.5v-5Z" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    title: "Online Exams",
    text: "Create and schedule exams for a batch, and track results as they come in, all without leaving the same dashboard your teachers already live in.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 2.5h9l3.5 3.5V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" />
        <path d="M7 10.5l1.8 1.8L13 8.2" />
      </svg>
    ),
  },
  {
    title: "Admissions & Lead Management",
    text: "Turn enquiries into enrolled students with invite links and shareable registration links, with optional online fee collection at signup via Razorpay.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 6.5l7.5 5 7.5-5" />
        <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
        <path d="M13.5 13.5l1.3 1.3 2.2-2.4" />
      </svg>
    ),
  },
  {
    title: "Student Groups",
    text: "Save a reusable group of students once, then drop the whole group into any batch in one click instead of hunting for names one by one.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6.5" cy="6.5" r="2.2" />
        <circle cx="13.5" cy="6.5" r="2.2" />
        <path d="M2.7 16c0-2.4 1.7-4 3.8-4s3.8 1.6 3.8 4" />
        <path d="M9.7 16c0-2.4 1.7-4 3.8-4s3.8 1.6 3.8 4" />
      </svg>
    ),
  },
  {
    title: "White-Label Branding",
    text: "Every institute gets its own branded portal at /your-institute-name, with its own logo and accent color shown alongside the InstituteSathi mark.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="3" width="15" height="14" rx="2" />
        <path d="M2.5 6.5h15" />
        <circle cx="5.3" cy="4.75" r="0.6" fill="currentColor" stroke="none" />
        <path d="M6 10.5h8M6 13h5" />
      </svg>
    ),
  },
];

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
            <h2 className={sharedStyles.sectionTitle}>
              Everything your institute needs, in one place.
            </h2>
            <p className={sharedStyles.sectionSubtitle}>
              From admissions to exams, InstituteSathi replaces the spreadsheets, registers and
              WhatsApp groups with one dashboard built for coaching institutes.
            </p>
          </div>
          <div className={sharedStyles.grid3}>
            {features.map((feature) => (
              <div
                key={feature.title}
                className={`${sharedStyles.card} ${sharedStyles.cardHover}`}
              >
                <div className={sharedStyles.iconBadge}>{feature.icon}</div>
                <h3 className={sharedStyles.cardTitle}>{feature.title}</h3>
                <p className={sharedStyles.cardText}>{feature.text}</p>
              </div>
            ))}
          </div>
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
