"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ApiError, Institute, Role } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import BrandLogo from "@/components/BrandLogo";
import BrandStyle from "@/components/BrandStyle";
import styles from "./signup.module.css";

const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  student: "Student",
  teacher: "Teacher",
  telecaller: "Telecaller",
};

function SignupFormInner({ basePath }: { basePath: string }) {
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState(searchParams.get("code") || "");

  const [invite, setInvite] = useState<{ role: Role; coachingClassName: string } | null>(null);
  const [inviteError, setInviteError] = useState("");
  const [checkingInvite, setCheckingInvite] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const code = inviteCode.trim();
    setInvite(null);
    setInviteError("");

    if (code.length < 4) return;

    setCheckingInvite(true);
    const timer = setTimeout(() => {
      api
        .inviteInfo(code)
        .then((res) => setInvite(res))
        .catch((err) => setInviteError(err instanceof ApiError ? err.message : "Invalid invite code"))
        .finally(() => setCheckingInvite(false));
    }, 400);

    return () => {
      clearTimeout(timer);
      setCheckingInvite(false);
    };
  }, [inviteCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;

    setError("");
    setSubmitting(true);
    try {
      await api.register({ name, email, password, phone, inviteCode: inviteCode.trim() });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={`${styles.card} ${styles.success}`}>
        <div className={styles.successIcon}>✓</div>
        <h1 className={styles.title}>Request submitted</h1>
        <p className={styles.subtitle}>
          Your account is waiting on approval from your coaching class admin. You&apos;ll be able
          to log in once they approve it.
        </p>
        <Link href={`${basePath}/login`}>
          <button className={styles.button} type="button" style={{ width: "100%" }}>
            Back to login
          </button>
        </Link>
      </div>
    );
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <h1 className={styles.title}>Create your account</h1>
      <p className={styles.subtitle}>Join your coaching class with the invite code they shared</p>

      <label className={styles.label}>
        <span>
          Invite code <span className={styles.req} aria-hidden="true">*</span>
        </span>
        <input
          className={styles.input}
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          placeholder="e.g. DD513736"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={!!inviteError && !checkingInvite}
          aria-describedby="invite-hint"
          required
        />
        <span className={styles.hint} id="invite-hint">
          Ask your coaching class admin for this code.
        </span>
      </label>

      <div aria-live="polite">
        {checkingInvite && <p className={styles.hint} style={{ margin: 0 }}>Checking code...</p>}

        {!checkingInvite && invite && (
          <div className={styles.inviteBadge}>
            Signing up as <strong>{ROLE_LABELS[invite.role]}</strong> for{" "}
            <strong>{invite.coachingClassName}</strong>
          </div>
        )}

        {!checkingInvite && inviteError && <p className={styles.error} role="alert">{inviteError}</p>}
      </div>

      <div className={styles.row}>
        <label className={styles.label}>
          <span>
            Full name <span className={styles.req} aria-hidden="true">*</span>
          </span>
          <input
            className={styles.input}
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

        <label className={styles.label}>
          <span>
            Phone <span className={styles.optional}>(optional)</span>
          </span>
          <input
            className={styles.input}
            type="tel"
            name="phone"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
      </div>

      <label className={styles.label}>
        <span>
          Email <span className={styles.req} aria-hidden="true">*</span>
        </span>
        <input
          className={styles.input}
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>

      <label className={styles.label}>
        <span>
          Password <span className={styles.req} aria-hidden="true">*</span>
        </span>
        <span className={styles.passwordWrap}>
          <input
            className={`${styles.input} ${styles.passwordInput}`}
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            aria-describedby="password-hint"
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
          className={`${styles.hint} ${password.length > 0 && password.length < 6 ? styles.hintWarn : ""}`}
          id="password-hint"
        >
          At least 6 characters.
        </span>
      </label>

      {error && <p className={styles.error} role="alert">{error}</p>}

      <button className={styles.button} type="submit" disabled={submitting || !invite}>
        {submitting ? "Submitting..." : "Create account"}
      </button>
      {!invite && !checkingInvite && (
        <p className={styles.hint} style={{ textAlign: "center", margin: 0 }}>
          Enter a valid invite code to continue.
        </p>
      )}

      <p className={styles.footerLink}>
        Already have an account? <Link href={`${basePath}/login`}>Sign in</Link>
      </p>
    </form>
  );
}

export default function SignupShared({
  institute,
  basePath,
}: {
  institute?: Institute | null;
  basePath: string;
}) {
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

        <Suspense fallback={null}>
          <SignupFormInner basePath={basePath} />
        </Suspense>
      </div>
    </div>
  );
}
