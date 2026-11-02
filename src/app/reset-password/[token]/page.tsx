"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import BrandLogo from "@/components/BrandLogo";
import styles from "../../signup/signup.module.css";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;
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
          <BrandLogo height={40} />
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
              <span>
                New password <span className={styles.req} aria-hidden="true">*</span>
              </span>
              <span className={styles.passwordWrap}>
                <input
                  className={`${styles.input} ${styles.passwordInput}`}
                  type={showPassword ? "text" : "password"}
                  name="new-password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  aria-describedby="rp-hint"
                  required
                />
                <button
                  type="button"
                  className={styles.toggleBtn}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </span>
              <span
                id="rp-hint"
                className={`${styles.hint} ${password.length > 0 && password.length < 6 ? styles.hintWarn : ""}`}
              >
                At least 6 characters.
              </span>
            </label>

            <label className={styles.label}>
              <span>
                Confirm password <span className={styles.req} aria-hidden="true">*</span>
              </span>
              <input
                className={styles.input}
                type={showPassword ? "text" : "password"}
                name="confirm-password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                aria-invalid={mismatch}
                aria-describedby={mismatch ? "rp-mismatch" : undefined}
                required
              />
              {mismatch && (
                <span id="rp-mismatch" className={`${styles.hint} ${styles.hintWarn}`}>
                  Passwords don&apos;t match yet.
                </span>
              )}
            </label>

            {error && <p className={styles.error} role="alert">{error}</p>}

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
