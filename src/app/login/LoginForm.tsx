"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { payWithRazorpay } from "@/lib/razorpay";
import { api, ApiError, Institute } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import BrandLogo from "@/components/BrandLogo";
import BrandStyle from "@/components/BrandStyle";
import styles from "./login.module.css";

export default function LoginForm({
  institute,
  basePath,
}: {
  // null/undefined on the generic, unbranded /login page.
  institute?: Institute | null;
  // "" on the generic page, "/<slug>" on the branded /<slug>/login page.
  basePath: string;
}) {
  const { login, setUser, setInstitute } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Set when login was refused only because fees are overdue.
  const [canPayDues, setCanPayDues] = useState(false);

  const doLogin = async (loginEmail: string, loginPassword: string) => {
    setError("");
    setCanPayDues(false);
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
      setCanPayDues(err instanceof ApiError && err.data.canPayOnline === true);
      setSubmitting(false);
    }
  };

  const handlePayDues = async () => {
    setError("");
    setSubmitting(true);
    try {
      const creds = { email, password };
      const order = await api.createDuesOrder(creds);
      const proof = order.mode === "gateway" ? await payWithRazorpay(order, { title: "Fee payment", description: "Dues" }) : undefined;
      await api.payDues(creds, proof);
      // Account is active again — sign straight in.
      await doLogin(email, password);
      return;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Payment failed. Please try again.");
    }
    setSubmitting(false);
  };

  const devLogin = async (role: "admin" | "teacher" | "student" | "telecaller") => {
    setError("");
    setSubmitting(true);
    try {
      const res = await api.devLogin(role);
      setUser(res.user);
      setInstitute(res.institute);
      router.push(`/${res.institute?.slug}/dashboard/${res.user.role}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Dev login failed");
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin(email, password);
  };

  return (
    <div className={styles.wrapper} data-brand-scope="">
      <BrandStyle color={institute?.brandColor} />
      <ThemeToggle className={styles.themeToggleFixed} />
      <div className={styles.stack}>
        <div className={styles.brandRow}>
          {institute?.logoUrl ? (
            <span className={styles.instituteLogoChip}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={institute.logoUrl} alt={institute.name} className={styles.instituteLogo} />
            </span>
          ) : institute ? (
            <>
              <div className={styles.brandMark} />
              <span className={styles.brandName}>{institute.name}</span>
            </>
          ) : (
            <BrandLogo height={40} />
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

          <p className={styles.footerLink} style={{ textAlign: "right", margin: "-8px 0 0" }}>
            <Link href="/forgot-password">Forgot password?</Link>
          </p>

          {error && <p className={styles.error}>{error}</p>}

          {canPayDues && (
            <button className={styles.button} type="button" disabled={submitting} onClick={handlePayDues}>
              Pay pending fees now
            </button>
          )}

          <button className={styles.button} type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>

          <p className={styles.footerLink}>
            Student, teacher or telecaller? <Link href={`${basePath}/signup`}>Create an account</Link>
          </p>

          {process.env.NODE_ENV === "development" && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              <p className={styles.footerLink} style={{ width: "100%", margin: 0 }}>
                Dev login (test-admin)
              </p>
              {(["admin", "teacher", "student", "telecaller"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={styles.button}
                  style={{ flex: "1 1 40%", textTransform: "capitalize" }}
                  disabled={submitting}
                  onClick={() => devLogin(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
