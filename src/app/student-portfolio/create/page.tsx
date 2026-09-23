"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, PortfolioOwn } from "@/lib/api";
import PortfolioForm from "../PortfolioForm";
import ThemeToggle from "@/components/ThemeToggle";
import styles from "../PortfolioAuth.module.css";

export default function CreatePortfolioPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<PortfolioOwn | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async (payload: {
    name: string;
    email: string;
    password: string;
    dob: string;
    headline?: string;
    bio?: string;
    phone?: string;
    location?: string;
  }) => {
    setError("");
    setSubmitting(true);
    try {
      const { portfolio } = await api.portfolioRegister(payload);
      setCreated(portfolio);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create your portfolio");
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    const publicLinkText = `institutesathi.com/student-portfolio/${created.slug}`;

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(publicLinkText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard access can fail (permissions, non-secure context); the
        // link text is already visible on screen for manual copying.
      }
    };

    return (
      <div className={styles.wrapper}>
        <ThemeToggle className={styles.themeToggleFixed} />
        <div className={styles.stack}>
          <div className={`${styles.card} ${styles.success}`}>
            <div className={styles.successIcon}>✓</div>
            <h1 className={styles.title}>Your portfolio is live</h1>
            <p className={styles.subtitle}>
              Share this link with anyone — it&apos;s your public portfolio page.
            </p>

            <div className={styles.linkBox}>
              <Link href={`/student-portfolio/${created.slug}`} className={styles.linkBoxLink}>
                {publicLinkText}
              </Link>
              <button type="button" className={styles.copyButton} onClick={handleCopy}>
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>

            <button
              type="button"
              className={styles.button}
              style={{ width: "100%" }}
              onClick={() => router.push("/student-portfolio/dashboard")}
            >
              Go to my dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <ThemeToggle className={styles.themeToggleFixed} />
      <div className={styles.stack}>
        <div className={styles.brandRow}>
          <div className={styles.brandMark} />
          <span className={styles.brandName}>InstituteSathi</span>
        </div>

        <h1 className={styles.pageTitle}>Create your portfolio</h1>
        <p className={styles.pageSubtitle}>
          Build a free, shareable resume page in a few minutes.
        </p>

        <PortfolioForm
          mode="create"
          onSubmitCreate={handleCreate}
          submitting={submitting}
          error={error}
        />

        <p className={styles.footerLink}>
          Already have a portfolio? <Link href="/student-portfolio/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
