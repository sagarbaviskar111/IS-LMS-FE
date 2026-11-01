import Link from "next/link";
import sharedStyles from "./landing.module.css";
import styles from "./LandingTestimonials.module.css";
import { DEFAULT_TESTIMONIALS, TestimonialItem } from "@/lib/defaultTestimonials";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/+$/, "");

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

// Superadmin-managed reviews; if there are none (or the API is down) the
// built-in ones keep the section filled.
async function loadTestimonials(): Promise<TestimonialItem[]> {
  try {
    const res = await fetch(`${API_URL}/api/testimonials`, { next: { revalidate: 60 } });
    if (!res.ok) return DEFAULT_TESTIMONIALS;
    const data = (await res.json()) as { testimonials?: TestimonialItem[] };
    return data.testimonials?.length ? data.testimonials : DEFAULT_TESTIMONIALS;
  } catch {
    return DEFAULT_TESTIMONIALS;
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

function Stars() {
  return (
    <div className={styles.starRow} aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={styles.star}>
          &#9733;
        </span>
      ))}
    </div>
  );
}

export default async function LandingTestimonials() {
  const testimonials = await loadTestimonials();
  return (
    <>
      <section id="reviews" className={sharedStyles.section}>
        <div className={sharedStyles.container}>
          <div className={sharedStyles.sectionHeadCenter}>
            <span className={sharedStyles.eyebrow}>Reviews</span>
            <h2 className={sharedStyles.sectionTitle}>Trusted by institutes across India.</h2>
            <p className={sharedStyles.sectionSubtitle}>
              A few examples of the kind of everyday difference institutes tell us InstituteSathi
              makes.
            </p>
          </div>

          <div className={sharedStyles.grid3}>
            {testimonials.map((t, i) => (
              <div key={`${t.name}-${i}`} className={sharedStyles.card}>
                <Stars />
                <p className={styles.quote}>&ldquo;{t.quote}&rdquo;</p>
                <div className={styles.cardFooter}>
                  <div className={styles.avatarCircle}>{initialsOf(t.name)}</div>
                  <div className={styles.footerText}>
                    <p className={styles.footerName}>{t.name}</p>
                    <p className={styles.footerRole}>
                      {[t.role, t.city].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className={sharedStyles.sectionAlt}>
        <div className={sharedStyles.container}>
          <div className={sharedStyles.sectionHeadCenter}>
            <span className={sharedStyles.eyebrow}>FAQ</span>
            <h2 className={sharedStyles.sectionTitle}>Frequently asked questions.</h2>
            <p className={sharedStyles.sectionSubtitle}>
              Everything institutes usually ask before switching to InstituteSathi.
            </p>
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
            <h2 className={styles.ctaTitle}>Ready to run your institute the modern way?</h2>
            <p className={styles.ctaSubtitle}>
              Set up your branded portal, add your batches and start collecting fees online in
              under a day.
            </p>
            <div className={styles.ctaButtonRow}>
              <Link href="/signup" className={styles.ctaButton}>
                Get started free
              </Link>
              <Link href="/login" className={styles.ctaButtonGhost}>
                Log in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={sharedStyles.container}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <div className={styles.footerBrandRow}>
                <div className={styles.footerMark}>IS</div>
                <span className={styles.footerBrandName}>InstituteSathi</span>
              </div>
              <p className={styles.footerTagline}>
                The all-in-one dashboard for coaching institutes.
              </p>
            </div>

            <div className={styles.footerCols}>
              <div className={styles.footerCol}>
                <p className={styles.footerColTitle}>Product</p>
                <ul className={styles.footerColList}>
                  <li>
                    <a href="#services" className={styles.footerColLink}>
                      Services
                    </a>
                  </li>
                  <li>
                    <a href="#how-it-works" className={styles.footerColLink}>
                      How it works
                    </a>
                  </li>
                  <li>
                    <a href="#showcase" className={styles.footerColLink}>
                      Product
                    </a>
                  </li>
                  <li>
                    <a href="#faq" className={styles.footerColLink}>
                      Reviews
                    </a>
                  </li>
                </ul>
              </div>

              <div className={styles.footerCol}>
                <p className={styles.footerColTitle}>Company</p>
                <ul className={styles.footerColList}>
                  <li>
                    <a href="#" className={styles.footerColLink}>
                      About
                    </a>
                  </li>
                  <li>
                    <a href="#" className={styles.footerColLink}>
                      Contact
                    </a>
                  </li>
                  <li>
                    <a href="#" className={styles.footerColLink}>
                      Careers
                    </a>
                  </li>
                </ul>
              </div>

              <div className={styles.footerCol}>
                <p className={styles.footerColTitle}>Legal</p>
                <ul className={styles.footerColList}>
                  <li>
                    <a href="#" className={styles.footerColLink}>
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a href="#" className={styles.footerColLink}>
                      Terms of Service
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <p className={styles.footerBottomText}>
              &copy; {new Date().getFullYear()} InstituteSathi. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
