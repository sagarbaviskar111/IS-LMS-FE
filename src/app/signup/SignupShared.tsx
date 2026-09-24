"use client";

import { CSSProperties, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ApiError, Institute, Role } from "@/lib/api";
import { shade } from "@/lib/color";
import ThemeToggle from "@/components/ThemeToggle";
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
        Invite code
        <input
          className={styles.input}
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          placeholder="e.g. DD513736"
          required
        />
      </label>

      {checkingInvite && <p className={styles.subtitle} style={{ margin: 0 }}>Checking code...</p>}

      {!checkingInvite && invite && (
        <div className={styles.inviteBadge}>
          Signing up as <strong>{ROLE_LABELS[invite.role]}</strong> for{" "}
          <strong>{invite.coachingClassName}</strong>
        </div>
      )}

      {!checkingInvite && inviteError && <p className={styles.error}>{inviteError}</p>}

      <div className={styles.row}>
        <label className={styles.label}>
          Full name
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

        <label className={styles.label}>
          Phone
          <input
            className={styles.input}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
      </div>

      <label className={styles.label}>
        Email
        <input
          className={styles.input}
          type="email"
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
      </label>

      {error && <p className={styles.error}>{error}</p>}

      <button className={styles.button} type="submit" disabled={submitting || !invite}>
        {submitting ? "Submitting..." : "Create account"}
      </button>

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
  const themeStyle = institute?.brandColor
    ? ({ "--brand": institute.brandColor, "--brand-dark": shade(institute.brandColor, -12) } as CSSProperties)
    : undefined;

  return (
    <div className={styles.wrapper} style={themeStyle}>
      <ThemeToggle className={styles.themeToggleFixed} />
      <div className={styles.stack}>
        <div className={styles.brandRow}>
          {institute?.logoUrl ? (
            <span className={styles.instituteLogoChip}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={institute.logoUrl} alt={institute.name} className={styles.instituteLogo} />
            </span>
          ) : (
            <>
              <div className={styles.brandMark} />
              <span className={styles.brandName}>{institute?.name || "InstituteSathi"}</span>
            </>
          )}
        </div>

        <Suspense fallback={null}>
          <SignupFormInner basePath={basePath} />
        </Suspense>
      </div>
    </div>
  );
}
