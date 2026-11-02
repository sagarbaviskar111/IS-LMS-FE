"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError, Course, EnrollmentSummary, Lead, RegisterStudentPayload, User } from "@/lib/api";
import styles from "./admin.module.css";
import RegisterStudentModal from "./RegisterStudentModal";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

const EXPIRY_OPTIONS: { hours: number; label: string }[] = [
  { hours: 24, label: "1 day" },
  { hours: 72, label: "3 days" },
  { hours: 168, label: "7 days" },
  { hours: 360, label: "15 days" },
  { hours: 720, label: "30 days" },
];

const PAID_LABEL = { unpaid: "Not paid yet", first_installment: "First installment received", full: "Full fee received" } as const;

function who(ref: { name: string } | string | null | undefined): string {
  if (!ref) return "—";
  return typeof ref === "object" ? ref.name : ref;
}

// Turning a lead into a student works exactly like Students > Register student:
// pick the course, say what was paid, and the student gets a private link to
// finish their registration. Admins and telecallers share this; only the API
// calls differ.
export default function LeadConversion({
  lead,
  role,
  onChanged,
}: {
  lead: Lead;
  role: "admin" | "telecaller";
  onChanged: () => void;
}) {
  const { institute } = useAuth();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [student, setStudent] = useState<User | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentSummary | null>(null);
  const [hours, setHours] = useState(72);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const converted = !!lead.convertedStudent || !!student;
  const isAdmin = role === "admin";

  useEffect(() => {
    if (!lead.convertedStudent) return;
    let live = true;
    (isAdmin ? api.leadEnrollment(lead._id) : api.myLeadEnrollment(lead._id))
      .then((r) => live && setEnrollment(r.enrollment))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [lead._id, lead.convertedStudent, isAdmin]);

  const loadCourses = async (): Promise<Course[]> =>
    isAdmin
      ? (await api.listCourses({ limit: 500 })).courses.filter((c) => c.isActive)
      : (await api.telecallerCourses()).courses;

  const register = async (payload: RegisterStudentPayload) => {
    const res = isAdmin ? await api.registerLeadStudent(lead._id, payload) : await api.registerMyLeadStudent(lead._id, payload);
    return { student: res.student, enrollment: res.enrollment };
  };

  const link =
    enrollment?.token && typeof window !== "undefined"
      ? `${window.location.origin}/${institute?.slug ?? ""}/enroll/${enrollment.token}`
      : "";

  const makeLink = async () => {
    setError("");
    setBusy(true);
    try {
      const res = isAdmin ? await api.createLeadEnrollmentLink(lead._id, hours) : await api.createMyLeadEnrollmentLink(lead._id, hours);
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

  if (!converted) {
    return (
      <section className={styles.section} style={{ marginTop: 16 }}>
        <h3 className={styles.sectionTitle} style={{ fontSize: "0.95rem" }}>
          Register as a student
        </h3>
        <p className={styles.sectionSubtitle} style={{ margin: "6px 0 14px" }}>
          Choose the course and say what they have paid. They then get a private link to finish their registration (documents, signature,
          photo).
        </p>
        <button className={styles.primaryButton} type="button" onClick={() => setRegisterOpen(true)}>
          Register as student
        </button>

        {registerOpen && (
          <RegisterStudentModal
            title={`Register ${lead.name} as a student`}
            subtitle={
              <>
                Converts this lead. The student is created as <strong>inactive</strong>; next you share their private registration link.
              </>
            }
            initial={{ name: lead.name, email: lead.email || "", phone: lead.phone }}
            loadCourses={loadCourses}
            register={register}
            onClose={() => setRegisterOpen(false)}
            onRegistered={(s, e) => {
              setRegisterOpen(false);
              setStudent(s);
              if (e) setEnrollment(e);
              onChanged();
            }}
          />
        )}
      </section>
    );
  }

  const done = enrollment?.state === "used";
  const studentName = student?.name ?? who(lead.convertedStudent);

  return (
    <section className={styles.section} style={{ marginTop: 16 }}>
      <span className={styles.badgeSuccess}>Converted — {studentName}</span>
      <p className={styles.sectionSubtitle} style={{ marginTop: 8 }}>
        {student || lead.convertedBy ? `Registered by ${student ? "you" : who(lead.convertedBy)}` : "Self-registered via link"}
        {enrollment?.course ? ` · Course: ${enrollment.course.name}` : ""}
      </p>

      {enrollment && (
        <div style={{ display: "grid", gap: 6, marginTop: 12, fontSize: "0.9rem" }}>
          <div>
            <strong>Fees:</strong> {PAID_LABEL[enrollment.paidStatus]}
            {enrollment.paidStatus !== "unpaid" && ` — ${inr(enrollment.amountPaid)} of ${inr(enrollment.planTotal)} (${enrollment.paymentMethod})`}
          </div>
          {enrollment.paidStatus === "unpaid" && (
            <span className={styles.sectionSubtitle} style={{ margin: 0 }}>
              The student pays in the payment step of their registration.
            </span>
          )}
        </div>
      )}

      {enrollment && !done && (
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <strong style={{ fontSize: "0.9rem" }}>Registration link</strong>
          {link ? (
            <>
              <div className={styles.inviteRow}>
                <span className={styles.linkBox}>{link}</span>
                <button className={styles.primaryButton} type="button" onClick={copy}>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <span className={styles.sectionSubtitle} style={{ margin: 0 }}>
                {enrollment.state === "expired" ? "Expired" : "Expires"} {when(enrollment.expiresAt)}. Send it to the student on WhatsApp.
              </span>
            </>
          ) : (
            <span className={styles.sectionSubtitle} style={{ margin: 0 }}>
              No link yet.
            </span>
          )}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <select className={styles.select} style={{ maxWidth: 160 }} value={hours} onChange={(e) => setHours(Number(e.target.value))} aria-label="Link expiry">
              {EXPIRY_OPTIONS.map((o) => (
                <option key={o.hours} value={o.hours}>
                  Valid for {o.label}
                </option>
              ))}
            </select>
            <button className={styles.smallButton} type="button" onClick={makeLink} disabled={busy}>
              {busy ? "Creating…" : link ? "Make a new link" : "Create link"}
            </button>
          </div>
        </div>
      )}
      {done && (
        <p className={styles.sectionSubtitle} style={{ marginTop: 12 }}>
          The student has finished registration.
        </p>
      )}
      {error && <p className={styles.messageError}>{error}</p>}
    </section>
  );
}
