import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import landingStyles from "../landing.module.css";
import styles from "./StudentPortfolioIntro.module.css";

const INCLUDED = [
  "Profile picture & a custom background banner",
  "Headline, bio, location & contact details",
  "Education history",
  "Work / internship experience",
  "Projects with links to live demos or code",
  "Skills, shown as clean tags",
  "Achievements & certifications",
  "LinkedIn, Naukri.com, GitHub & website links",
];

export default function StudentPortfolioIntroPage() {
  return (
    <div className={landingStyles.page}>
      <header className={styles.header}>
        <div className={`${landingStyles.container} ${styles.headerInner}`}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandMark}>IS</span>
            <span className={styles.brandName}>InstituteSathi</span>
          </Link>
          <div className={landingStyles.buttonRow}>
            <ThemeToggle />
            <Link href="/student-portfolio/login" className={landingStyles.buttonSecondary}>
              Log in
            </Link>
            <Link href="/student-portfolio/create" className={landingStyles.buttonPrimary}>
              Create your portfolio →
            </Link>
          </div>
        </div>
      </header>

      <section className={landingStyles.section}>
        <div className={`${landingStyles.container} ${styles.hero}`}>
          <span className={landingStyles.eyebrow}>Free · No institute needed</span>
          <h1 className={styles.title}>
            One link for your whole story — not just your resume.
          </h1>
          <p className={styles.subtitle}>
            Build a free, shareable student portfolio with your photo, education, projects,
            experience, skills and achievements. Get a clean public link you can drop straight
            into your resume, LinkedIn or job applications — anyone can make one, whether or not
            you&apos;re at an InstituteSathi institute.
          </p>

          <div className={landingStyles.buttonRow}>
            <Link href="/student-portfolio/create" className={landingStyles.buttonPrimary}>
              Create your portfolio — it&apos;s free
            </Link>
            <Link href="/student-portfolio/login" className={landingStyles.buttonSecondary}>
              I already have one
            </Link>
          </div>

          <div className={styles.linkPreview}>
            <span className={styles.linkPreviewLabel}>Your link will look like</span>
            <code className={styles.linkPreviewCode}>
              institutesathi.com/student-portfolio/your-name-1234
            </code>
          </div>
        </div>
      </section>

      <section className={landingStyles.sectionAlt}>
        <div className={landingStyles.container}>
          <div className={landingStyles.sectionHeadCenter}>
            <span className={landingStyles.eyebrow}>What&apos;s included</span>
            <h2 className={landingStyles.sectionTitle}>Everything a resume link is missing.</h2>
            <p className={landingStyles.sectionSubtitle}>
              Fill it in once, share it everywhere — recruiters, professors, or anyone who asks
              &quot;got a portfolio?&quot;
            </p>
          </div>

          <div className={landingStyles.grid2}>
            <ul className={styles.includedList}>
              {INCLUDED.slice(0, 4).map((item) => (
                <li key={item} className={styles.includedItem}>
                  <span className={styles.includedCheck}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <ul className={styles.includedList}>
              {INCLUDED.slice(4).map((item) => (
                <li key={item} className={styles.includedItem}>
                  <span className={styles.includedCheck}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={landingStyles.section}>
        <div className={`${landingStyles.container} ${styles.ctaBand}`}>
          <h2 className={landingStyles.sectionTitle}>Ready to put yourself online?</h2>
          <p className={landingStyles.sectionSubtitle}>Takes a few minutes. Free, always.</p>
          <div className={landingStyles.buttonRow} style={{ justifyContent: "center", marginTop: 20 }}>
            <Link href="/student-portfolio/create" className={landingStyles.buttonPrimary}>
              Create your portfolio →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
