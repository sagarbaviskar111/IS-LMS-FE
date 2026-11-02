"use client";

import { ReactNode, useEffect, useState } from "react";
import { api, ApiError, Course, EnrollmentSummary, PaidStatus, RegisterStudentPayload, User } from "@/lib/api";
import styles from "./admin.module.css";
import Modal from "../Modal";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

// What the student owes under each way of paying — mirrors the server's maths.
function amounts(course: Course | undefined) {
  if (!course) return { first: 0, full: 0, installmentTotal: 0 };
  const sum = course.installments.reduce((s, i) => s + i.amount, 0) + (course.installmentCharge || 0);
  const first = course.installments.length ? round2(course.installments[0].amount + (course.installmentCharge || 0)) : 0;
  const installmentTotal = round2(sum);
  return { first, installmentTotal, full: course.oneTimeEnabled ? course.oneTimeAmount : installmentTotal };
}

// Used for Students > Register student, and (with `initial`, `loadCourses` and
// `register` swapped in) when a lead is converted by an admin or telecaller.
export default function RegisterStudentModal({
  onClose,
  onRegistered,
  title = "Register student",
  subtitle,
  initial,
  loadCourses,
  register,
}: {
  onClose: () => void;
  onRegistered: (student: User, enrollment?: EnrollmentSummary) => void;
  title?: string;
  subtitle?: ReactNode;
  initial?: { name: string; email: string; phone: string };
  loadCourses?: () => Promise<Course[]>;
  register?: (payload: RegisterStudentPayload) => Promise<{ student: User; enrollment?: EnrollmentSummary }>;
}) {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [f, setF] = useState({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    courseId: "",
    paymentStatus: "unpaid" as PaidStatus,
    method: "cash" as "cash" | "upi" | "other",
    amount: "",
    note: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = loadCourses ?? (async () => (await api.listCourses({ limit: 500 })).courses.filter((c) => c.isActive));
    load()
      .then(setCourses)
      .catch(() => setCourses([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const course = courses?.find((c) => c._id === f.courseId);
  const money = amounts(course);
  const canInstall = !!course && course.installmentEnabled && course.installments.length > 0;

  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => setF((p) => ({ ...p, [key]: value }));

  // Switching course or payment option refills the amount with the right figure.
  const pickCourse = (courseId: string) => setF((p) => ({ ...p, courseId, paymentStatus: "unpaid", amount: "" }));
  const pickStatus = (paymentStatus: PaidStatus) => {
    const m = amounts(course);
    const next = paymentStatus === "first_installment" ? m.first : paymentStatus === "full" ? m.full : 0;
    setF((p) => ({ ...p, paymentStatus, amount: next ? String(next) : "" }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!f.name.trim()) return setError("Enter the student's name");
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return setError("Enter a valid email address");
    if (f.phone.replace(/\D/g, "").length < 10) return setError("Enter a valid phone number");
    if (!f.courseId) return setError("Select a course");
    if (f.paymentStatus !== "unpaid" && !(Number(f.amount) > 0)) return setError("Enter the amount received");

    setBusy(true);
    try {
      const send = register ?? api.registerStudent;
      const res = await send({
        name: f.name.trim(),
        email: f.email.trim(),
        phone: f.phone.trim(),
        courseId: f.courseId,
        paymentStatus: f.paymentStatus,
        ...(f.paymentStatus !== "unpaid"
          ? { paymentMethod: f.method, amount: Number(f.amount), note: f.note.trim() }
          : {}),
      });
      onRegistered(res.student, res.enrollment);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not register the student");
      setBusy(false);
    }
  };

  const full = { gridColumn: "1 / -1" } as const;
  const req = <span className={styles.required}>*</span>;

  return (
    <Modal onClose={onClose} dialogStyle={{ maxWidth: 640, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <p className={styles.sectionSubtitle}>
        {subtitle ?? (
          <>
            The student is created as <strong>inactive</strong>. Next you make them a private link to finish the rest (documents, signature, photo).
          </>
        )}
      </p>

      <form className={styles.form} onSubmit={submit}>
        <label className={styles.label} style={full}>
          <span>Full name{req}</span>
          <input className={styles.input} value={f.name} maxLength={100} autoFocus autoComplete="off" onChange={(e) => set("name", e.target.value)} />
        </label>
        <label className={styles.label}>
          <span>Email{req}</span>
          <input className={styles.input} type="email" autoComplete="off" value={f.email} onChange={(e) => set("email", e.target.value)} />
        </label>
        <label className={styles.label}>
          <span>Phone{req}</span>
          <input className={styles.input} type="tel" inputMode="tel" autoComplete="off" placeholder="10-digit mobile number" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
        </label>
        <label className={styles.label} style={full}>
          <span>Course{req}</span>
          <select className={styles.select} value={f.courseId} onChange={(e) => pickCourse(e.target.value)}>
            <option value="">{courses === null ? "Loading courses…" : "Select a course"}</option>
            {(courses || []).map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          {courses && courses.length === 0 && <span className={styles.hint}>No active courses — create a course first.</span>}
        </label>

        {course && (
          <>
            <h3 className={styles.formSectionTitle} style={{ ...full, padding: 0 }}>
              Fees
            </h3>
            <div style={{ ...full, fontSize: "0.88rem", color: "var(--muted)" }}>
              {course.oneTimeEnabled && <div>One-time: {inr(course.oneTimeAmount)}</div>}
              {canInstall && (
                <div>
                  {course.installments.length} installments: {inr(money.installmentTotal)} (first: {inr(money.first)}
                  {course.installmentCharge > 0 ? `, includes ${inr(course.installmentCharge)} charge` : ""})
                </div>
              )}
            </div>

            <label className={styles.label} style={full}>
              Payment received by you
              <select className={styles.select} value={f.paymentStatus} onChange={(e) => pickStatus(e.target.value as PaidStatus)}>
                <option value="unpaid">Nothing received — student pays during registration</option>
                <option value="first_installment" disabled={!canInstall}>
                  First installment received{canInstall ? "" : " (course has no installments)"}
                </option>
                <option value="full">Full fee received</option>
              </select>
              <span className={styles.hint}>
                {f.paymentStatus === "unpaid"
                  ? "The student will see the payment step at the end of their registration."
                  : "Already paid — the student's registration will skip the payment step."}
              </span>
            </label>

            {f.paymentStatus !== "unpaid" && (
              <>
                <label className={styles.label}>
                  <span>Paid by</span>
                  <select className={styles.select} value={f.method} onChange={(e) => set("method", e.target.value as "cash" | "upi" | "other")}>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className={styles.label}>
                  <span>Amount received (₹){req}</span>
                  <input
                    className={styles.input}
                    type="number"
                    inputMode="decimal"
                    min={1}
                    step="any"
                    value={f.amount}
                    onChange={(e) => set("amount", e.target.value)}
                  />
                </label>
                <label className={styles.label} style={full}>
                  <span>Note <span className={styles.hint}>(optional)</span></span>
                  <input className={styles.input} value={f.note} maxLength={200} placeholder="e.g. UPI ref no." onChange={(e) => set("note", e.target.value)} />
                </label>
              </>
            )}
          </>
        )}

        <div className={styles.modalFooter}>
          {error && (
            <p className={styles.messageError} role="alert" style={{ margin: 0, marginRight: "auto" }}>
              {error}
            </p>
          )}
          <button className={styles.smallButton} type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className={styles.primaryButton} type="submit" disabled={busy || !courses?.length}>
            {busy ? "Registering…" : "Register student"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
