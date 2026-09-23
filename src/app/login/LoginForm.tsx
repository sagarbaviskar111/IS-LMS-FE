"use client";

import { CSSProperties, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ApiError, Institute, Role } from "@/lib/api";
import { shade } from "@/lib/color";
import ThemeToggle from "@/components/ThemeToggle";
import styles from "./login.module.css";

const TEST_ACCOUNTS: { role: Role; label: string; email: string; password: string }[] = [
  { role: "superadmin", label: "Super Admin", email: "superadmin@dashboard.com", password: "SuperAdmin@123" },
  { role: "admin", label: "Admin", email: "admin@dashboard.com", password: "Admin@123" },
  { role: "student", label: "Student", email: "student@dashboard.com", password: "Student@123" },
  { role: "teacher", label: "Teacher", email: "teacher@dashboard.com", password: "Teacher@123" },
  { role: "telecaller", label: "Telecaller", email: "telecaller@dashboard.com", password: "Telecaller@123" },
];

export default function LoginForm({
  institute,
  basePath,
}: {
  // null/undefined on the generic, unbranded /login page.
  institute?: Institute | null;
  // "" on the generic page, "/<slug>" on the branded /<slug>/login page.
  basePath: string;
}) {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const doLogin = async (loginEmail: string, loginPassword: string) => {
    setError("");
    setSubmitting(true);
    try {
      const { user, institute: resolvedInstitute } = await login(loginEmail, loginPassword);
      const slug = user.role === "superadmin" ? "platform" : resolvedInstitute?.slug;
      if (!slug) {
        setError("Your account isn't linked to an institute yet — contact support.");
        setSubmitting(false);
        return;
      }
      router.push(`/${slug}/dashboard/${user.role}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin(email, password);
  };

  const themeStyle = institute?.brandColor
    ? ({ "--brand": institute.brandColor, "--brand-dark": shade(institute.brandColor, -12) } as CSSProperties)
    : undefined;

  return (
    <div className={styles.wrapper} style={themeStyle}>
      <ThemeToggle className={styles.themeToggleFixed} />
      <div className={styles.stack}>
        <div className={styles.brandRow}>
          {institute?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={institute.logoUrl} alt={institute.name} style={{ height: 34, maxWidth: 200, objectFit: "contain" }} />
          ) : (
            <>
              <div className={styles.brandMark} />
              <span className={styles.brandName}>{institute?.name || "InstituteSathi"}</span>
            </>
          )}
        </div>

        <form className={styles.card} onSubmit={handleSubmit}>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to continue to your dashboard</p>

          <label className={styles.label}>
            Email
            <input
              className={styles.input}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className={styles.label}>
            Password
            <input
              className={styles.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.button} type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>

          <p className={styles.footerLink}>
            Student, teacher or telecaller? <Link href={`${basePath}/signup`}>Create an account</Link>
          </p>
        </form>

        {process.env.NODE_ENV !== "production" && (
          <div className={styles.testCard}>
            <div className={styles.testHeader}>
              <span className={styles.testDot} />
              <p className={styles.testLabel}>Quick login (test only)</p>
            </div>
            <div className={styles.testGrid}>
              {TEST_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  className={styles.testButton}
                  disabled={submitting}
                  onClick={() => doLogin(acc.email, acc.password)}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
