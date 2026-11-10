"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ApiError, BillingPlan, BillingSettings } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import BrandLogo from "@/components/BrandLogo";
import styles from "../signup/signup.module.css";
import local from "./get-started.module.css";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function Form() {
  const searchParams = useSearchParams();
  const [instituteName, setInstituteName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [planId, setPlanId] = useState(searchParams.get("plan") || "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false);

  useEffect(() => {
    api
      .billingPlans()
      .then((res) => {
        setPlans(res.plans);
        setSettings(res.settings);
        setPlanId((cur) =>
          res.plans.some((p) => p._id === cur) ? cur : res.plans.find((p) => p.isPopular)?._id || res.plans[0]?._id || ""
        );
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setError("");
    setSubmitting(true);
    try {
      const res = await api.institutesSignup({
        instituteName: instituteName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        planId: planId || undefined,
      });
      // Hard navigation so the new session cookie is picked up by the dashboard.
      window.location.href = `/${res.institute?.slug || ""}/dashboard/admin`;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create your account. Try again.");
      setSubmitting(false);
      lock.current = false;
    }
  };

  const perStudent = settings?.pricingMode === "per_student";
  const trialDays = settings?.trialDays ?? 14;

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <h1 className={styles.title}>Set up your institute</h1>
      <p className={styles.subtitle}>Create the admin account for your coaching institute.</p>

      {settings && settings.signupOpen === false && (
        <p className={styles.error} role="alert">
          New signups are closed right now.
        </p>
      )}

      <p className={local.trialNote}>
        {trialDays} days free, no card needed.
        {settings && settings.trialStudentLimit > 0 ? ` Up to ${settings.trialStudentLimit} students during the trial.` : ""}
      </p>

      <label className={styles.label}>
        <span>
          Institute name <span className={styles.req} aria-hidden="true">*</span>
        </span>
        <input
          className={styles.input}
          value={instituteName}
          onChange={(e) => setInstituteName(e.target.value)}
          placeholder="e.g. Sharma Physics Classes"
          minLength={3}
          maxLength={80}
          required
        />
        <span className={styles.hint}>Students will see this name. Your login link is built from it.</span>
      </label>

      <div className={styles.row}>
        <label className={styles.label}>
          <span>
            Email <span className={styles.req} aria-hidden="true">*</span>
          </span>
          <input
            className={styles.input}
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className={styles.label}>
          <span>
            Phone <span className={styles.req} aria-hidden="true">*</span>
          </span>
          <input
            className={styles.input}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </label>
      </div>

      <label className={styles.label}>
        <span>
          Password <span className={styles.req} aria-hidden="true">*</span>
        </span>
        <span className={styles.passwordWrap}>
          <input
            className={`${styles.input} ${styles.passwordInput}`}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => setShowPassword((v) => !v)}
            aria-pressed={showPassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </span>
        <span className={`${styles.hint} ${password.length > 0 && password.length < 6 ? styles.hintWarn : ""}`}>
          At least 6 characters.
        </span>
      </label>

      {plans.length > 0 && !perStudent && (
        <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
          <legend className={styles.label} style={{ marginBottom: 6 }}>
            Plan after the trial
          </legend>
          <div className={local.planList}>
            {plans.map((p) => (
              <label key={p._id} className={local.planOption}>
                <input type="radio" name="plan" value={p._id} checked={planId === p._id} onChange={() => setPlanId(p._id)} />
                <span className={local.planName}>
                  {p.name} - {p.priceMonthly > 0 ? `${inr(p.priceMonthly)}/month` : "Free"}
                  <span className={local.planMeta}>{p.studentLimit > 0 ? `Up to ${p.studentLimit} students` : "Unlimited students"}</span>
                </span>
              </label>
            ))}
          </div>
          <span className={styles.hint}>You can change this any time from Billing.</span>
        </fieldset>
      )}
      {perStudent && settings && (
        <p className={styles.hint} style={{ margin: 0 }}>
          After the trial: {inr(settings.perStudentPrice)} per student per month, plus GST.
        </p>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button className={styles.button} type="submit" disabled={submitting || settings?.signupOpen === false}>
        {submitting ? "Creating your account..." : `Start ${trialDays}-day free trial`}
      </button>

      <p className={styles.footerLink}>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </form>
  );
}

export default function GetStarted() {
  return (
    <div className={styles.wrapper}>
      <ThemeToggle className={styles.themeToggleFixed} />
      <div className={styles.stack}>
        <div className={styles.brandRow}>
          <BrandLogo height={40} />
        </div>
        <Suspense fallback={null}>
          <Form />
        </Suspense>
      </div>
    </div>
  );
}
