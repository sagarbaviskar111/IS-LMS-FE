import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import sharedStyles from "./landing.module.css";
import styles from "./LandingTestimonials.module.css";
import { TestimonialItem } from "@/lib/defaultTestimonials";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/+$/, "");

// Superadmin-managed reviews. With none (or the API down) the section is hidden
// rather than showing invented ones.
async function loadTestimonials(): Promise<TestimonialItem[]> {
  try {
    const res = await fetch(`${API_URL}/api/testimonials`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { testimonials?: TestimonialItem[] };
    return data.testimonials || [];
  } catch {
    return [];
  }
}

const faqs: { question: string; answer: string }[] = [
  {
    question: "Does every institute get its own website?",
    answer:
      "Yes — every institute gets a branded portal at its own URL (e.g. institutesathi.com/your-institute-name), with its own logo and accent color shown alongside the InstituteSathi mark.",
  },
  {
    question: "Can students see their fee and assignment status without calling the office?",
    answer:
      "Yes — every student gets their own dashboard showing attendance, assignments (with due dates), study material and session recordings.",
  },
  {
    question: "How do assignment due dates work?",
    answer:
      "Teachers set a due date when creating an assignment; students can upload their work any time before it, and submission auto-locks once the deadline passes.",
  },
  {
    question: "Where are session recordings hosted, and are they safe from being shared elsewhere?",
    answer:
      "Recordings play through a custom in-dashboard player — students never see or click a raw external video link.",
  },
  {
    question: "Can we collect admission/registration fees online?",
    answer:
      "Yes — registration links can require an online payment via Razorpay before the account is activated.",
  },
  {
    question: "How long does it take to set up?",
    answer:
      "Most institutes are live with their branding, batches and first students added within a day.",
  },
];

export default async function LandingTestimonials() {
  const testimonials = await loadTestimonials();
  return (
    <>
      {testimonials.length > 0 && (
        <section id="reviews" className={sharedStyles.section}>
          <div className={sharedStyles.container}>
            <div className={sharedStyles.sectionHead}>
              <span className={sharedStyles.eyebrow}>Reviews</span>
              <h2 className={sharedStyles.sectionTitle}>What institutes say</h2>
            </div>

            <div className={sharedStyles.grid3}>
              {testimonials.map((t, i) => (
                <div
                  key={`${t.name}-${i}`}
                  className={i === 0 ? `${sharedStyles.card} ${styles.featuredCard}` : sharedStyles.card}
                >
                  <p className={i === 0 ? styles.featuredQuote : styles.quote}>&ldquo;{t.quote}&rdquo;</p>
                  <div className={styles.cardFooter}>
                    <div className={styles.footerText}>
                      <p className={styles.footerName}>{t.name}</p>
                      <p className={styles.footerRole}>{[t.role, t.city].filter(Boolean).join(" · ")}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="faq" className={sharedStyles.sectionAlt}>
        <div className={sharedStyles.container}>
          <div className={sharedStyles.sectionHead}>
            <h2 className={sharedStyles.sectionTitle}>Questions institutes ask first</h2>
          </div>

          <div className={styles.faqList}>
            {faqs.map((f) => (
              <details key={f.question} className={styles.faqItem}>
                <summary className={styles.faqSummary}>
                  {f.question}
                  <span className={styles.faqIcon}>+</span>
                </summary>
                <p className={styles.faqAnswer}>{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className={sharedStyles.section}>
        <div className={sharedStyles.container}>
          <div className={styles.ctaPanel}>
            <h2 className={styles.ctaTitle}>Set up your institute's portal today.</h2>
            <p className={styles.ctaSubtitle}>
              Free trial, no card. Add your logo, batches and first students, and share the link.
            </p>
            <div className={styles.ctaButtonRow}>
              <Link href="/get-started" className={styles.ctaButton}>
                Start free trial
              </Link>
              <Link href="/demo" className={styles.ctaButtonGhost}>
                Book a demo
              </Link>
              <Link href="/login" className={styles.ctaButtonGhost}>
                Log in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
