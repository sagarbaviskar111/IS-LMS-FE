"use client";

import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ApiError, DemoStudentBand } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import BrandLogo from "@/components/BrandLogo";
import styles from "../signup/signup.module.css";
import local from "./demo.module.css";

const BANDS: { value: DemoStudentBand; label: string }[] = [
  { value: "under_50", label: "Under 50" },
  { value: "50_150", label: "50 to 150" },
  { value: "150_300", label: "150 to 300" },
  { value: "300_750", label: "300 to 750" },
  { value: "750_1500", label: "750 to 1,500" },
  { value: "1500_plus", label: "1,500+" },
];
const TOOLS = ["Excel or paper", "Classplus", "Teachmint", "Edmingle", "Entab", "Other", "None"];
const TIMES = ["Morning", "Afternoon", "Evening", "WhatsApp me first"];

function Form() {
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [instituteName, setInstituteName] = useState("");
  const [city, setCity] = useState("");
  const [studentCount, setStudentCount] = useState<DemoStudentBand | "">("");
  const [email, setEmail] = useState("");
  const [currentTool, setCurrentTool] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [doneName, setDoneName] = useState<string | null>(null);
  const [donePhone, setDonePhone] = useState("");
  const lock = useRef(false);

  // Where the visitor came from, kept quiet: "demo" plus utm_source/medium if present.
  const source = () => {
    const parts = ["demo", searchParams.get("utm_source"), searchParams.get("utm_medium")].filter(Boolean);
    return parts.join("/").slice(0, 120);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lock.current) return;
    if (!studentCount) {
      setError("Select how many students you have.");
      return;
    }
    lock.current = true;
    setError("");
    setSubmitting(true);
    try {
      await api.requestDemo({
        name: name.trim(),
        phone: phone.trim(),
        instituteName: instituteName.trim(),
        city: city.trim(),
        studentCount,
        email: email.trim() || undefined,
        currentTool: currentTool || undefined,
        preferredTime: preferredTime || undefined,
        source: source(),
        website,
      });
      setDoneName(name.trim());
      setDonePhone(phone.trim());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send your request. Please try again.");
      lock.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  if (doneName !== null) {
    return (
      <div className={`${styles.card} ${local.done}`}>
        <h1 className={local.doneTitle}>Thanks, {doneName}.</h1>
        <p className={local.doneText}>
          We will call or WhatsApp you on {donePhone}. Until then you can look around: the free trial needs no card.
        </p>
        <div className={local.doneLinks}>
          <Link href="/">Back to home</Link>
          <Link href="/pricing">See pricing</Link>
          <Link href="/get-started">Start free trial</Link>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <h1 className={styles.title}>Book a demo</h1>
      <p className={styles.subtitle}>Tell us a little about your institute and we will get in touch.</p>

      <div className={local.intro}>
        A 20-minute walkthrough, set up around your batches and fee structure:
        <ul>
          <li>Attendance and fee reminders for a sample batch</li>
          <li>Collecting fees into your own Razorpay account</li>
          <li>Questions about moving over from registers or another app</li>
        </ul>
      </div>

      <label className={styles.label}>
        <span>
          Your name <span className={styles.req} aria-hidden="true">*</span>
        </span>
        <input
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          minLength={2}
          maxLength={80}
          required
        />
      </label>

      <div className={styles.row}>
        <label className={styles.label}>
          <span>
            Mobile number <span className={styles.req} aria-hidden="true">*</span>
          </span>
          <input
            className={styles.input}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            pattern="[0-9+\-\s()]{10,18}"
            title="Enter a 10-digit mobile number"
            placeholder="10-digit number"
            required
          />
        </label>
        <label className={styles.label}>
          <span>
            City <span className={styles.req} aria-hidden="true">*</span>
          </span>
          <input
            className={styles.input}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            autoComplete="address-level2"
            maxLength={60}
            required
          />
        </label>
      </div>

      <label className={styles.label}>
        <span>
          Institute name <span className={styles.req} aria-hidden="true">*</span>
        </span>
        <input
          className={styles.input}
          value={instituteName}
          onChange={(e) => setInstituteName(e.target.value)}
          autoComplete="organization"
          placeholder="e.g. Sharma Physics Classes"
          maxLength={120}
          required
        />
      </label>

      <label className={styles.label}>
        <span>
          Number of students <span className={styles.req} aria-hidden="true">*</span>
        </span>
        <select
          className={styles.select}
          value={studentCount}
          onChange={(e) => setStudentCount(e.target.value as DemoStudentBand | "")}
          required
        >
          <option value="">Select</option>
          {BANDS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.label}>
        <span>
          Email <span className={local.optional}>(optional)</span>
        </span>
        <input
          className={styles.input}
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <div className={styles.row}>
        <label className={styles.label}>
          <span>
            Current software <span className={local.optional}>(optional)</span>
          </span>
          <select className={styles.select} value={currentTool} onChange={(e) => setCurrentTool(e.target.value)}>
            <option value="">Select</option>
            {TOOLS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.label}>
          <span>
            Best time to call <span className={local.optional}>(optional)</span>
          </span>
          <select className={styles.select} value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)}>
            <option value="">Any time</option>
            {TIMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Honeypot: people never see or fill this. */}
      <div className={local.trap} aria-hidden="true">
        <label>
          Website
          <input
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button className={styles.button} type="submit" disabled={submitting}>
        {submitting ? "Sending..." : "Request a demo"}
      </button>

      <p className={styles.footerLink}>
        Prefer to try it yourself? <Link href="/get-started">Start the free trial</Link>
      </p>
    </form>
  );
}

export default function DemoForm() {
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
