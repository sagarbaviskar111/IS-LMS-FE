"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError, CourseRegistrationRow, EnrollmentSummary, User } from "@/lib/api";
import styles from "./admin.module.css";
import Modal from "../Modal";
import { ProofGallery } from "./AdminCourses";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

const EXPIRY_OPTIONS: { hours: number; label: string }[] = [
  { hours: 1, label: "1 hour" },
  { hours: 6, label: "6 hours" },
  { hours: 24, label: "1 day" },
  { hours: 72, label: "3 days" },
  { hours: 168, label: "7 days" },
  { hours: 360, label: "15 days" },
  { hours: 720, label: "30 days" },
];

const PAID_LABEL = { unpaid: "Not paid yet", first_installment: "First installment received", full: "Full fee received" } as const;

// One student's details: how they were registered, the fees admin collected, the
// private registration link (with an expiry the admin picks) and, once they have
// finished, the documents they submitted.
export default function StudentDetailsModal({ student, onClose, onChanged }: { student: User; onClose: () => void; onChanged: () => void }) {
  const { institute } = useAuth();
  const [enrollment, setEnrollment] = useState<EnrollmentSummary | null>(null);
  const [registration, setRegistration] = useState<(CourseRegistrationRow & { course?: { name: string } | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(72);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  const load = useCallback(async () => {
    try {
      const [e, r] = await Promise.all([api.getStudentEnrollment(student._id), api.getStudentRegistration(student._id)]);
      setEnrollment(e.enrollment);
      setRegistration(r.registration);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load the details");
    } finally {
      setLoading(false);
    }
  }, [student._id]);

  useEffect(() => {
    load();
  }, [load]);

  const link = enrollment?.token && typeof window !== "undefined" ? `${window.location.origin}/${institute?.slug ?? ""}/enroll/${enrollment.token}` : "";

  const makeLink = async () => {
    setError("");
    setBusy(true);
    try {
      const res = await api.createStudentEnrollmentLink(student._id, hours);
      setEnrollment(res.enrollment);
      setCopied(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the link");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt("Copy this registration link:", link); // clipboard blocked (e.g. plain http)
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pending = student.registrationComplete === false;
  const row = (label: string, value: React.ReactNode) =>
    value ? (
      <div style={{ display: "flex", gap: "2px 12px", flexWrap: "wrap" }}>
        <span className={styles.sectionSubtitle} style={{ minWidth: 130, margin: 0 }}>
          {label}
        </span>
        <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{value}</span>
      </div>
    ) : null;

  const stateBadge =
    enrollment?.state === "active" ? (
      <span className={`${styles.badge} ${styles.badgeSuccess}`}>Active</span>
    ) : enrollment?.state === "expired" ? (
      <span className={`${styles.badge} ${styles.badgeInactive}`}>Expired</span>
    ) : enrollment?.state === "used" ? (
      <span className={`${styles.badge} ${styles.badgeSuccess}`}>Used</span>
    ) : null;

  return (
    <Modal onClose={onClose} dialogStyle={{ maxWidth: 680, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
      <h2 className={styles.sectionTitle}>{student.name}</h2>

      <div style={{ display: "grid", gap: 6, margin: "10px 0 16px" }}>
        {row("Email", student.email)}
        {row("Phone", student.phone)}
        {row("Course", enrollment?.course?.name || registration?.course?.name)}
        {row(
          "Registration",
          pending ? <span className={`${styles.badge} ${styles.badgePending}`}>Not finished — account inactive</span> : <span className={`${styles.badge} ${styles.badgeSuccess}`}>Complete</span>
        )}
      </div>

      {loading && <p className={styles.empty}>Loading…</p>}
      {error && <p className={styles.messageError} role="alert">{error}</p>}

      {!loading && enrollment && (
        <>
          <h3 className={styles.formSectionTitle} style={{ padding: 0 }}>
            Fees
          </h3>
          <div style={{ display: "grid", gap: 6, margin: "8px 0 16px" }}>
            {row("Collected by you", PAID_LABEL[enrollment.paidStatus])}
            {enrollment.paidStatus !== "unpaid" && row("Amount", `${inr(enrollment.amountPaid)} of ${inr(enrollment.planTotal)} (${enrollment.paymentMethod})`)}
            {enrollment.paidStatus === "unpaid" && (
              <p className={styles.sectionSubtitle} style={{ margin: 0 }}>
                The student will pay in the payment step of their registration.
              </p>
            )}
            {enrollment.paidStatus !== "unpaid" && (
              <p className={styles.sectionSubtitle} style={{ margin: 0 }}>
                Payment is already done, so the student&apos;s registration skips the payment step. Record any further payments from the Payments button.
              </p>
            )}
          </div>

          {enrollment.state !== "used" && (
            <>
              <h3 className={styles.formSectionTitle} style={{ padding: 0 }}>
                Registration link
              </h3>
              <p className={styles.sectionSubtitle}>
                A private link made only for {student.name.split(" ")[0]}. They add their password, ID proofs, signature and live photo{enrollment.paidStatus === "unpaid" ? ", then pay" : ""} to finish.
              </p>

              {link && (
                <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 12, margin: "10px 0", display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <span>
                      {stateBadge}{" "}
                      <span className={styles.sectionSubtitle}>
                        {enrollment.state === "expired" ? "Expired on" : "Expires"} {when(enrollment.expiresAt)}
                      </span>
                    </span>
                  </div>
                  <span className={styles.linkBox} style={{ wordBreak: "break-all", minWidth: 0 }}>
                    {link}
                  </span>
                  <div>
                    <button className={styles.primaryButton} type="button" onClick={copy} disabled={enrollment.state === "expired"}>
                      {copied ? "Copied!" : "Copy link"}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                <label className={styles.label} style={{ maxWidth: 220, flex: "1 1 160px" }}>
                  Link expires after
                  <select className={styles.select} value={hours} onChange={(e) => setHours(Number(e.target.value))}>
                    {EXPIRY_OPTIONS.map((o) => (
                      <option key={o.hours} value={o.hours}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button className={styles.primaryButton} type="button" onClick={makeLink} disabled={busy}>
                  {busy ? "Creating…" : link ? "Create new link" : "Create link"}
                </button>
              </div>
              {link && (
                <p className={styles.sectionSubtitle}>A new link replaces the old one — the old link stops working straight away.</p>
              )}
            </>
          )}
        </>
      )}

      {!loading && !enrollment && !registration && (
        <p className={styles.empty}>
          This student has no registration record — they were added another way, so there is no registration link or documents to show.
        </p>
      )}

      {!loading && registration && (
        <>
          <h3 className={styles.formSectionTitle} style={{ padding: 0, marginTop: 16 }}>
            Submitted registration
          </h3>
          <div style={{ display: "grid", gap: 6, margin: "8px 0" }}>
            {row("Submitted", when(registration.createdAt))}
            {row("Date of birth", registration.dateOfBirth ? new Date(registration.dateOfBirth).toLocaleDateString() : "")}
            {row("Address", registration.address)}
            {row("Fee plan", registration.plan === "one_time" ? "One-time payment" : "Installments")}
          </div>
          <button className={styles.smallButton} type="button" onClick={() => setShowDocs((v) => !v)}>
            {showDocs ? "Hide documents" : "View documents, signature & photo"}
          </button>
          {showDocs && <ProofGallery reg={registration} />}
        </>
      )}

      <div className={styles.modalFooter}>
        <button
          className={styles.smallButton}
          type="button"
          onClick={() => {
            onChanged();
            onClose();
          }}
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
