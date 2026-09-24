"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import styles from "../../signup/signup.module.css";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setSubmitting(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset password");
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

        {done ? (
          <div className={`${styles.card} ${styles.success}`}>
            <div className={styles.successIcon}>✓</div>
            <h1 className={styles.title}>Password reset</h1>
            <p className={styles.subtitle}>Taking you to login...</p>
          </div>
        ) : (
          <form className={styles.card} onSubmit={handleSubmit}>
            <h1 className={styles.title}>Set a new password</h1>
            <p className={styles.subtitle}>Choose a new password for your account.</p>

            <label className={styles.label}>
              New password
              <input
                className={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </label>

            <label className={styles.label}>
              Confirm password
              <input
                className={styles.input}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
              />
            </label>

            {error && <p className={styles.error}>{error}</p>}

            <button className={styles.button} type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Reset password"}
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
