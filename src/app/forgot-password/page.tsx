"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import styles from "../signup/signup.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await api.forgotPassword(email);
      setResultMessage(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong — try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <ThemeToggle className={styles.themeToggleFixed} />
      <div className={styles.stack}>
        <div className={styles.brandRow}>
          <div className={styles.brandMark} />
          <span className={styles.brandName}>InstituteSathi</span>
        </div>

        {resultMessage ? (
          <div className={`${styles.card} ${styles.success}`}>
            <div className={styles.successIcon}>✓</div>
            <h1 className={styles.title}>Request sent</h1>
            <p className={styles.subtitle}>{resultMessage}</p>
            <Link href="/login">
              <button className={styles.button} type="button" style={{ width: "100%" }}>
                Back to login
              </button>
            </Link>
          </div>
        ) : (
          <form className={styles.card} onSubmit={handleSubmit}>
            <h1 className={styles.title}>Reset your password</h1>
            <p className={styles.subtitle}>
              Enter your account email and we&apos;ll send you a link to set a new password.
            </p>

            <label className={styles.label}>
              Email
              <input
                className={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>

            {error && <p className={styles.error}>{error}</p>}

            <button className={styles.button} type="submit" disabled={submitting}>
              {submitting ? "Sending..." : "Send reset link"}
            </button>

            <p className={styles.footerLink}>
              <Link href="/login">Back to login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
