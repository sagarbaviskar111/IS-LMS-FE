"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Detection, FaceDetector as MPFaceDetector } from "@mediapipe/tasks-vision";
import { api, ApiError, CourseRegistrationInfo } from "@/lib/api";
import s from "./enroll.module.css";
import { clearDraft, FileSlot, loadFile, loadText, saveFile, saveText } from "./enrollDraft";

type Info = CourseRegistrationInfo;
type Plan = "one_time" | "installment";
type Step = "course" | "details" | "documents" | "terms" | "verify" | "payment";

const STEPS: { key: Step; label: string }[] = [
  { key: "course", label: "Course" },
  { key: "details", label: "Your details" },
  { key: "documents", label: "Documents" },
  { key: "terms", label: "Terms" },
  { key: "verify", label: "Verification" },
  { key: "payment", label: "Payment" },
];
const ID_TYPES = ["Aadhaar card", "PAN card", "Driving licence", "Passport", "Voter ID", "School / college ID", "Other"];
const MAX_FILE = 5 * 1024 * 1024;

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const round2 = (n: number) => Math.round(n * 100) / 100;
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function scheduleFor(course: Info["course"], plan: Plan) {
  if (plan === "one_time") return [{ label: "Full payment", amount: course.oneTimeAmount, dueAfterDays: 0 }];
  return course.installments.map((it, i) => ({
    label: it.label || `Installment ${i + 1}`,
    amount: round2(it.amount + (i === 0 ? course.installmentCharge || 0 : 0)),
    dueAfterDays: it.dueAfterDays,
  }));
}

export default function EnrollPage() {
  const { institute: slug, token } = useParams<{ institute: string; token: string }>();

  const [info, setInfo] = useState<Info | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "invalid">("loading");
  const [invalidMsg, setInvalidMsg] = useState("");
  const [step, setStep] = useState<Step>("course");
  const [done, setDone] = useState<{ amountPaid: number; planTotal: number; balance: number; paidEarlier?: boolean } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  // documents
  const [idType1, setIdType1] = useState("");
  const [idType2, setIdType2] = useState("");
  const [id1, setId1] = useState<File | null>(null);
  const [id2, setId2] = useState<File | null>(null);
  // terms
  const [readAll, setReadAll] = useState(false);
  const [accepted, setAccepted] = useState(false);
  // verification
  const [signature, setSignature] = useState<Blob | null>(null);
  const [selfie, setSelfie] = useState<Blob | null>(null);
  // payment
  const [plan, setPlan] = useState<Plan>("one_time");

  // A private link made by the admin for one student: details come pre-filled, and
  // when the admin already collected the fees the payment step is left out.
  const skipPayment = !!info?.enrollment?.skipPayment;
  const steps = skipPayment ? STEPS.filter((x) => x.key !== "payment") : STEPS;

  useEffect(() => {
    api
      .courseRegistrationInfo(token, slug)
      .then((res) => {
        setInfo(res);
        setPlan(res.enrollment?.plan ?? (res.course.oneTimeEnabled ? "one_time" : "installment"));
        if (res.enrollment) {
          setName(res.enrollment.name);
          setEmail(res.enrollment.email);
          setPhone(res.enrollment.phone);
        }
        setLoadState("ready");
      })
      .catch((err) => {
        setInvalidMsg(err instanceof ApiError ? err.message : "This registration link is not valid");
        setLoadState("invalid");
      });
  }, [token, slug]);

  useEffect(() => {
    if (!profilePhoto) return;
    const url = URL.createObjectURL(profilePhoto);
    setProfilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [profilePhoto]);

  // ---- autosave: a refresh must never lose what the student has filled in ----
  const draftKey = `${slug}:${token}`;
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (loadState !== "ready" || !info || restored) return;
    let alive = true;
    (async () => {
      const t = loadText(draftKey);
      if (t) {
        const str = (v: unknown) => (typeof v === "string" ? v : "");
        setName(str(t.name));
        setEmail(str(t.email));
        setPhone(str(t.phone));
        setDob(str(t.dob));
        setAddress(str(t.address));
        setPassword(str(t.password));
        setPassword2(str(t.password2));
        setIdType1(str(t.idType1));
        setIdType2(str(t.idType2));
        setReadAll(t.readAll === true);
        setAccepted(t.accepted === true);
        if (!info.enrollment?.skipPayment) {
          if (t.plan === "one_time" && info.course.oneTimeEnabled) setPlan("one_time");
          if (t.plan === "installment" && info.course.installmentEnabled) setPlan("installment");
        }
        if (info.enrollment) setEmail(info.enrollment.email); // fixed by the institute
        if (STEPS.some((x) => x.key === t.step) && !(info.enrollment?.skipPayment && t.step === "payment")) setStep(t.step as Step);
      }
      const slots: FileSlot[] = ["idProof1", "idProof2", "profilePhoto", "signature", "selfie"];
      const found = await Promise.all(slots.map((slot) => loadFile(draftKey, slot)));
      if (!alive) return;
      const asFile = (f: (typeof found)[number]) => (f ? new File([f.blob], f.name, { type: f.type }) : null);
      if (found[0]) setId1(asFile(found[0]));
      if (found[1]) setId2(asFile(found[1]));
      if (found[2]) setProfilePhoto(asFile(found[2]));
      if (found[3]) setSignature(found[3].blob);
      if (found[4]) setSelfie(found[4].blob);
      setRestored(true);
    })();
    return () => {
      alive = false;
    };
  }, [loadState, info, restored, draftKey]);

  useEffect(() => {
    if (!restored || done) return;
    saveText(draftKey, { step, name, email, phone, dob, address, password, password2, idType1, idType2, readAll, accepted, plan });
  }, [restored, done, draftKey, step, name, email, phone, dob, address, password, password2, idType1, idType2, readAll, accepted, plan]);

  useEffect(() => {
    if (restored && !done) saveFile(draftKey, "idProof1", id1);
  }, [restored, done, draftKey, id1]);
  useEffect(() => {
    if (restored && !done) saveFile(draftKey, "idProof2", id2);
  }, [restored, done, draftKey, id2]);
  useEffect(() => {
    if (restored && !done) saveFile(draftKey, "profilePhoto", profilePhoto);
  }, [restored, done, draftKey, profilePhoto]);
  useEffect(() => {
    if (restored && !done) saveFile(draftKey, "signature", signature);
  }, [restored, done, draftKey, signature]);
  useEffect(() => {
    if (restored && !done) saveFile(draftKey, "selfie", selfie);
  }, [restored, done, draftKey, selfie]);

  const stepIndex = steps.findIndex((x) => x.key === step);
  const go = (to: Step) => {
    setError("");
    setStep(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const fileProblem = (file: File | null, label: string, allowPdf: boolean) => {
    if (!file) return `Upload ${label}`;
    if (file.size > MAX_FILE) return `${label} is too large (max 5 MB)`;
    const ok = file.type.startsWith("image/") || (allowPdf && file.type === "application/pdf");
    return ok ? "" : `${label} must be ${allowPdf ? "a photo or PDF" : "a photo"}`;
  };

  const next = () => {
    setError("");
    if (step === "details") {
      if (name.trim().length < 2) return setError("Enter your full name");
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address");
      if (phone.replace(/\D/g, "").length < 10) return setError("Enter a valid 10-digit phone number");
      if (password.length < 6) return setError("Password must be at least 6 characters");
      if (password !== password2) return setError("The two passwords do not match");
      if (profilePhoto) {
        const p = fileProblem(profilePhoto, "Profile photo", false);
        if (p) return setError(p);
      }
      return go("documents");
    }
    if (step === "documents") {
      if (!idType1) return setError("Select the document type of ID proof 1");
      const p1 = fileProblem(id1, "ID proof 1", true);
      if (p1) return setError(p1);
      if (!idType2) return setError("Select the document type of ID proof 2");
      if (idType1 === idType2) return setError("The two ID proofs must be different documents (for example Aadhaar and PAN)");
      const p2 = fileProblem(id2, "ID proof 2", true);
      if (p2) return setError(p2);
      return go("terms");
    }
    if (step === "terms") {
      if (!readAll) return setError("Please scroll down and read the whole terms first");
      if (!accepted) return setError("Tick the box to accept the terms and conditions");
      return go("verify");
    }
    if (step === "verify") {
      if (!signature) return setError("Add your digital signature (draw it or upload it)");
      if (!selfie) return setError("Complete the live facial verification by taking your photo");
      if (skipPayment) return submit();
      return go("payment");
    }
  };

  const c = info?.course;
  const schedule = c ? scheduleFor(c, plan) : [];
  const planTotal = round2(schedule.reduce((sum, i) => sum + i.amount, 0));
  const payNow = schedule[0]?.amount ?? 0;

  const submit = async () => {
    if (!id1 || !id2 || !signature || !selfie) return;
    setError("");
    setBusy(true);
    try {
      const form = new FormData();
      form.append("slug", slug);
      form.append("name", name.trim());
      form.append("email", email.trim());
      form.append("phone", phone.trim());
      form.append("password", password);
      form.append("dateOfBirth", dob);
      form.append("address", address.trim());
      form.append("idType1", idType1);
      form.append("idType2", idType2);
      form.append("termsAccepted", "true");
      form.append("plan", plan);
      form.append("idProof1", id1);
      form.append("idProof2", id2);
      form.append("selfie", selfie, "selfie.jpg");
      form.append("signature", signature, "signature.png");
      if (profilePhoto) form.append("profilePhoto", profilePhoto);
      const res = await api.submitCourseRegistration(token, form);
      setDone(res);
      clearDraft(draftKey); // registered — don't keep the documents around
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // ------------------------------------------------------------------ render
  if (loadState === "loading" || (loadState === "ready" && !restored)) {
    return (
      <div className={s.page}>
        <div className={s.center}>
          <p>Loading registration form...</p>
        </div>
      </div>
    );
  }

  if (loadState === "invalid" || !info || !c) {
    return (
      <div className={s.page}>
        <div className={s.center}>
          <div className={`${s.card} ${s.done}`}>
            <h1 className={s.sectionTitle}>Link not available</h1>
            <p className={s.sectionHint}>{invalidMsg}</p>
            <Link href="/login" className={s.btn}>
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const inst = info.institute;

  return (
    <div className={s.page}>
      <header className={s.topbar}>
        <div className={s.topbarInner}>
          <div className={s.brand}>
            {inst.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={s.logo} src={inst.logoUrl} alt={inst.name} />
            ) : (
              <div className={s.logoFallback}>{inst.name.charAt(0).toUpperCase()}</div>
            )}
            <div style={{ minWidth: 0 }}>
              <h1 className={s.instituteName}>{inst.name}</h1>
              <p className={s.formLabel}>Student registration form</p>
            </div>
          </div>
          <span className={s.secure}>🔒 Secure registration</span>
        </div>
      </header>

      <section className={s.hero}>
        <div className={s.heroInner}>
          <p className={s.heroKicker}>{info.enrollment ? "Complete your registration" : "Admission open"}</p>
          <h2 className={s.heroTitle}>{c.name}</h2>
          <div className={s.heroChips}>
            <span className={s.chip}>{cap(c.mode)}</span>
            {c.durationValue > 0 && (
              <span className={s.chip}>
                {c.durationValue} {c.durationUnit}
              </span>
            )}
            {c.level !== "all" && <span className={s.chip}>{cap(c.level)}</span>}
            {c.language && <span className={s.chip}>{c.language}</span>}
          </div>
        </div>
      </section>

      {done ? (
        <div className={`${s.layout} ${s.layoutSingle}`}>
          <div className={`${s.card} ${s.done}`}>
            <div className={s.doneIcon}>✓</div>
            <h2 className={s.sectionTitle}>Registration complete</h2>
            <p className={s.sectionHint} style={{ maxWidth: 460 }}>
              Welcome to {inst.name}, {name.split(" ")[0]}! You are registered for <strong>{c.name}</strong>.
            </p>
            <div className={s.feeBox} style={{ minWidth: 260 }}>
              <div className={s.kv}>
                <span>{done.paidEarlier ? "Paid earlier" : "Paid now"}</span>
                <span>{inr(done.amountPaid)}</span>
              </div>
              <div className={s.kv}>
                <span>Total fee</span>
                <span>{inr(done.planTotal)}</span>
              </div>
              {done.balance > 0 && (
                <div className={s.kv}>
                  <span>Remaining</span>
                  <span>{inr(done.balance)}</span>
                </div>
              )}
            </div>
            <p className={s.sectionHint}>Log in with your email and the password you created.</p>
            <Link href={`/${slug}/login`} className={`${s.btn} ${s.btnBig}`}>
              Go to login
            </Link>
          </div>
        </div>
      ) : (
        <div className={s.layout}>
          {/* ---------------------------------------------------- main form */}
          <div className={s.card}>
            <nav className={s.stepper} aria-label="Progress">
              {steps.map((st, i) => (
                <div key={st.key} className={`${s.step} ${i < stepIndex ? s.stepDone : ""} ${i === stepIndex ? s.stepActive : ""}`}>
                  <span className={s.stepNum}>{i < stepIndex ? "✓" : i + 1}</span>
                  <span className={s.stepName}>{st.label}</span>
                </div>
              ))}
            </nav>

            <p className={s.saved}>✓ Your progress is saved automatically — refreshing the page will not lose it.</p>

            <div className={s.body}>
              {/* ---------------- course ---------------- */}
              {step === "course" && (
                <>
                  <div>
                    <h3 className={s.sectionTitle}>About this course</h3>
                    <p className={s.sectionHint}>Please review the course details and fees before you register.</p>
                  </div>
                  {info.enrollment && (
                    <p className={s.notice} style={{ background: "#eaf1ff", borderColor: "#c7d8fb", color: "#1e3a8a" }}>
                      Welcome, {info.enrollment.name.split(" ")[0]}! {inst.name} has registered you for this course. Complete the steps below to
                      activate your account.
                      {info.enrollment.skipPayment
                        ? ` Your fee payment of ${inr(info.enrollment.amountPaid)} (${info.enrollment.paymentMethod}) is already received — no payment is needed.`
                        : ""}
                    </p>
                  )}
                  {c.description && <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{c.description}</p>}
                  {c.prerequisites && (
                    <div className={`${s.panel} ${s.panelSoft}`}>
                      <p className={s.panelTitle}>Prerequisites</p>
                      <p style={{ margin: 0 }}>{c.prerequisites}</p>
                    </div>
                  )}
                  {c.syllabus && (
                    <div>
                      <p className={s.panelTitle}>What will be covered</p>
                      <div className={s.syllabus}>{c.syllabus}</div>
                    </div>
                  )}
                  <div className={s.actions} style={{ justifyContent: "flex-end" }}>
                    <button className={`${s.btn} ${s.btnBig}`} type="button" onClick={() => go("details")}>
                      Start registration →
                    </button>
                  </div>
                </>
              )}

              {/* ---------------- details ---------------- */}
              {step === "details" && (
                <>
                  <div>
                    <h3 className={s.sectionTitle}>Your details</h3>
                    <p className={s.sectionHint}>Fields marked * are required. Use your real name — it must match your ID.</p>
                  </div>

                  <div className={s.avatarRow}>
                    <div className={s.avatar}>
                      {profilePreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profilePreview} alt="Profile" />
                      ) : (
                        "Profile photo"
                      )}
                    </div>
                    <label className={s.field}>
                      Profile picture (optional)
                      <input
                        className={s.input}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          setProfilePhoto(f);
                          if (!f) setProfilePreview(null);
                        }}
                      />
                      <span className={s.help}>JPG or PNG, up to 5 MB. Shown on your student profile.</span>
                    </label>
                  </div>

                  <div className={s.grid2}>
                    <label className={`${s.field} ${s.full}`}>
                      <span>
                        Full name <span className={s.req}>*</span>
                      </span>
                      <input className={s.input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                    </label>
                    <label className={s.field}>
                      <span>
                        Email address <span className={s.req}>*</span>
                      </span>
                      <input className={s.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" disabled={!!info.enrollment} />
                      {info.enrollment && <span className={s.help}>Set by your institute — this is your login email.</span>}
                    </label>
                    <label className={s.field}>
                      <span>
                        Phone number <span className={s.req}>*</span>
                      </span>
                      <input className={s.input} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
                    </label>
                    <label className={s.field}>
                      Date of birth
                      <input className={s.input} type="date" value={dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDob(e.target.value)} />
                    </label>
                    <label className={`${s.field} ${s.full}`}>
                      Address
                      <textarea className={s.textarea} rows={2} value={address} maxLength={500} onChange={(e) => setAddress(e.target.value)} />
                    </label>
                    <label className={s.field}>
                      <span>
                        Create password <span className={s.req}>*</span>
                      </span>
                      <input className={s.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="At least 6 characters" />
                    </label>
                    <label className={s.field}>
                      <span>
                        Confirm password <span className={s.req}>*</span>
                      </span>
                      <input className={s.input} type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" />
                    </label>
                  </div>
                  <Nav back={() => go("course")} next={next} error={error} />
                </>
              )}

              {/* ---------------- documents ---------------- */}
              {step === "documents" && (
                <>
                  <div>
                    <h3 className={s.sectionTitle}>Upload ID proofs</h3>
                    <p className={s.sectionHint}>
                      Upload two different documents. Photo or PDF, up to 5 MB each. They are used only to verify your identity.
                    </p>
                  </div>
                  <DocCard
                    n={1}
                    type={idType1}
                    onType={setIdType1}
                    file={id1}
                    onFile={setId1}
                    disabledType={idType2}
                  />
                  <DocCard
                    n={2}
                    type={idType2}
                    onType={setIdType2}
                    file={id2}
                    onFile={setId2}
                    disabledType={idType1}
                  />
                  <Nav back={() => go("details")} next={next} error={error} />
                </>
              )}

              {/* ---------------- terms ---------------- */}
              {step === "terms" && (
                <>
                  <div>
                    <h3 className={s.sectionTitle}>Terms &amp; conditions</h3>
                    <p className={s.sectionHint}>Please read everything — scroll to the bottom to enable the checkbox.</p>
                  </div>
                  <div
                    className={s.terms}
                    onScroll={(e) => {
                      const el = e.currentTarget;
                      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setReadAll(true);
                    }}
                    ref={(el) => {
                      // Short terms that fit without scrolling count as read.
                      if (el && el.scrollHeight <= el.clientHeight + 8 && !readAll) setReadAll(true);
                    }}
                  >
                    {c.terms}
                  </div>
                  <label className={s.check} style={{ opacity: readAll ? 1 : 0.5 }}>
                    <input type="checkbox" checked={accepted} disabled={!readAll} onChange={(e) => setAccepted(e.target.checked)} />
                    <span>I have read and agree to the terms and conditions of {inst.name}.</span>
                  </label>
                  <Nav back={() => go("documents")} next={next} error={error} />
                </>
              )}

              {/* ---------------- verification ---------------- */}
              {step === "verify" && (
                <>
                  <div>
                    <h3 className={s.sectionTitle}>Signature &amp; facial verification</h3>
                    <p className={s.sectionHint}>Sign the form and take a live photo of your face to confirm it is really you.</p>
                  </div>
                  <SignatureBox value={signature} onChange={setSignature} />
                  <FaceBox value={selfie} onChange={setSelfie} />
                  <Nav
                    back={() => go("terms")}
                    next={next}
                    error={error}
                    busy={busy}
                    nextLabel={skipPayment ? "Complete registration ✓" : undefined}
                  />
                </>
              )}

              {/* ---------------- payment ---------------- */}
              {step === "payment" && (
                <>
                  <div>
                    <h3 className={s.sectionTitle}>Course payment</h3>
                    <p className={s.sectionHint}>The amount is fixed by {inst.name}.</p>
                  </div>

                  <p className={s.notice}>
                    Online payment is not connected yet — pressing &quot;Payment done&quot; only records this payment. No money is charged.
                  </p>

                  {c.oneTimeEnabled && c.installmentEnabled && (
                    <div style={{ display: "grid", gap: 10 }}>
                      <label className={`${s.payRow} ${plan === "one_time" ? s.payRowOn : ""}`}>
                        <input type="radio" name="plan" checked={plan === "one_time"} onChange={() => setPlan("one_time")} />
                        <span>
                          <strong>Pay in full</strong> — {inr(c.oneTimeAmount)}
                        </span>
                      </label>
                      <label className={`${s.payRow} ${plan === "installment" ? s.payRowOn : ""}`}>
                        <input type="radio" name="plan" checked={plan === "installment"} onChange={() => setPlan("installment")} />
                        <span>
                          <strong>Pay in {c.installments.length} installments</strong> —{" "}
                          {inr(round2(scheduleFor(c, "installment").reduce((sum, i) => sum + i.amount, 0)))} total
                        </span>
                      </label>
                    </div>
                  )}

                  <div className={s.payNow}>
                    <div className={s.help}>{plan === "one_time" ? "Amount to pay now (full fee)" : "Amount to pay now (first installment)"}</div>
                    <div className={s.payAmount}>{inr(payNow)}</div>
                    {plan === "installment" && (
                      <div className={s.help} style={{ marginTop: 6 }}>
                        {c.installmentCharge > 0 && `Includes the ${inr(c.installmentCharge)} installment charge. `}
                        The remaining {inr(round2(planTotal - payNow))} is paid in the next installments, as shown in the schedule.
                      </div>
                    )}
                  </div>

                  {error && <p className={s.error}>{error}</p>}
                  <div className={s.actions}>
                    <button className={`${s.btn} ${s.btnGhost}`} type="button" onClick={() => go("verify")} disabled={busy}>
                      ← Back
                    </button>
                    <button className={`${s.btn} ${s.btnBig} ${s.btnGreen}`} type="button" onClick={submit} disabled={busy}>
                      {busy ? "Completing registration..." : `Payment done · ${inr(payNow)}`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ---------------------------------------------------- course summary */}
          <aside className={`${s.card} ${s.side}`}>
            <div className={s.sideHead}>
              <p className={s.formLabel}>Your course</p>
              <h3 className={s.sideTitle}>{c.name}</h3>
            </div>
            <div className={s.sideBody}>
              <div style={{ display: "grid", gap: 8 }}>
                <div className={s.kv}>
                  <span>Mode</span>
                  <span>{cap(c.mode)}</span>
                </div>
                {c.durationValue > 0 && (
                  <div className={s.kv}>
                    <span>Duration</span>
                    <span>
                      {c.durationValue} {c.durationUnit}
                    </span>
                  </div>
                )}
                {c.language && (
                  <div className={s.kv}>
                    <span>Language</span>
                    <span>{c.language}</span>
                  </div>
                )}
                <div className={s.kv}>
                  <span>Level</span>
                  <span>{c.level === "all" ? "All levels" : cap(c.level)}</span>
                </div>
              </div>

              <div className={s.feeBox}>
                <strong style={{ fontSize: "0.9rem" }}>Fee &amp; payment plan</strong>
                <div className={s.sched} style={{ marginTop: 8 }}>
                  {schedule.map((it, i) => (
                    <div key={i} className={s.schedRow}>
                      <span>
                        {it.label}
                        <small> · {it.dueAfterDays === 0 ? "at joining" : `after ${it.dueAfterDays} days`}</small>
                      </span>
                      <strong>{inr(it.amount)}</strong>
                    </div>
                  ))}
                </div>
                <div className={s.feeTotal}>
                  <span>Total</span>
                  <span>{inr(planTotal)}</span>
                </div>
                {skipPayment && info.enrollment && (
                  <div className={s.help} style={{ marginTop: 8, color: "#15803d", fontWeight: 600 }}>
                    ✓ {inr(info.enrollment.amountPaid)} received ({info.enrollment.paymentMethod}) — nothing to pay here.
                  </div>
                )}
              </div>
              {c.oneTimeEnabled && c.installmentEnabled && step === "course" && !skipPayment && (
                <p className={s.help} style={{ margin: 0 }}>
                  You can choose between paying in full ({inr(c.oneTimeAmount)}) or installments at the payment step.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Nav({
  back,
  next,
  error,
  busy,
  nextLabel,
}: {
  back: () => void;
  next: () => void;
  error: string;
  busy?: boolean;
  nextLabel?: string;
}) {
  return (
    <>
      {error && <p className={s.error}>{error}</p>}
      <div className={s.actions}>
        <button className={`${s.btn} ${s.btnGhost}`} type="button" onClick={back}>
          ← Back
        </button>
        <button className={nextLabel ? `${s.btn} ${s.btnBig} ${s.btnGreen}` : s.btn} type="button" onClick={next} disabled={busy}>
          {busy ? "Completing registration..." : (nextLabel ?? "Save & continue →")}
        </button>
      </div>
    </>
  );
}

function DocCard({
  n,
  type,
  onType,
  file,
  onFile,
  disabledType,
}: {
  n: number;
  type: string;
  onType: (t: string) => void;
  file: File | null;
  onFile: (f: File | null) => void;
  disabledType: string;
}) {
  return (
    <div className={s.docCard}>
      <p className={s.panelTitle} style={{ margin: 0 }}>
        <span className={s.docNum}>{n}</span>ID proof {n}
      </p>
      <div className={s.grid2}>
        <label className={s.field}>
          <span>
            Document type <span className={s.req}>*</span>
          </span>
          <select className={s.select} value={type} onChange={(e) => onType(e.target.value)}>
            <option value="">Select document type...</option>
            {ID_TYPES.map((t) => (
              <option key={t} value={t} disabled={t === disabledType}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          <span>
            Upload file <span className={s.req}>*</span>
          </span>
          <input className={s.input} type="file" accept="image/*,application/pdf" onChange={(e) => onFile(e.target.files?.[0] || null)} />
          {file && <span className={s.fileName}>✓ {file.name}</span>}
        </label>
      </div>
    </div>
  );
}

// ---- digital signature: draw it or upload an image of it ------------------

function SignatureBox({ value, onChange }: { value: Blob | null; onChange: (b: Blob | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [mode, setMode] = useState<"draw" | "upload">("draw");
  const [hasInk, setHasInk] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!value) return;
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * e.currentTarget.width) / r.width,
      y: ((e.clientY - r.top) * e.currentTarget.height) / r.height,
    };
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const { x, y } = pos(e);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  };
  const up = () => {
    drawing.current = false;
  };
  const clear = () => {
    const c = canvasRef.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
  };
  const saveDrawn = () => {
    const c = canvasRef.current;
    if (!c || !hasInk) return;
    const out = document.createElement("canvas");
    out.width = c.width;
    out.height = c.height;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(c, 0, 0);
    out.toBlob((b) => b && onChange(b), "image/png");
  };
  const onUpload = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErr("Upload your signature as a photo (JPG or PNG)");
    if (file.size > MAX_FILE) return setErr("Signature image is too large (max 5 MB)");
    setErr("");
    onChange(file);
  };

  return (
    <div className={s.panel}>
      <p className={s.panelTitle}>Digital signature</p>
      {value && preview ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={s.sigPreview} src={preview} alt="Your signature" />
          <span className={s.verifiedTag}>✓ Signature added</span>
          <div className={s.btnRow}>
            <button className={`${s.btn} ${s.btnGhost}`} type="button" onClick={() => onChange(null)}>
              Change signature
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={s.tabs} role="tablist">
            <button type="button" className={`${s.tab} ${mode === "draw" ? s.tabOn : ""}`} onClick={() => setMode("draw")}>
              ✍ Draw signature
            </button>
            <button type="button" className={`${s.tab} ${mode === "upload" ? s.tabOn : ""}`} onClick={() => setMode("upload")}>
              ⬆ Upload signature
            </button>
          </div>

          {mode === "draw" ? (
            <>
              <canvas
                ref={canvasRef}
                className={s.sigCanvas}
                width={900}
                height={260}
                onPointerDown={down}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={up}
              />
              <p className={s.help} style={{ margin: "6px 0 0" }}>
                Sign inside the box using your finger or mouse.
              </p>
              <div className={s.btnRow}>
                <button className={`${s.btn} ${s.btnGhost}`} type="button" onClick={clear}>
                  Clear
                </button>
                <button className={s.btn} type="button" onClick={saveDrawn} disabled={!hasInk}>
                  Save signature
                </button>
              </div>
            </>
          ) : (
            <label className={s.field}>
              Choose a photo of your signature (on white paper)
              <input className={s.input} type="file" accept="image/*" onChange={(e) => onUpload(e.target.files?.[0])} />
            </label>
          )}
          {err && (
            <p className={s.error} style={{ marginTop: 10 }}>
              {err}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ---- live facial verification ---------------------------------------------

// A face only has to be visible: no position, distance or head-angle rules.
// Returns null when a face is in view, otherwise the instruction to show.
function faceProblem(dets: Detection[]): string | null {
  return dets.length > 0 ? null : "No face detected — show your face to the camera.";
}

function FaceBox({ value, onChange }: { value: Blob | null; onChange: (b: Blob | null) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<MPFaceDetector | null>(null);
  const timers = useRef<{ detect?: ReturnType<typeof setInterval>; count?: ReturnType<typeof setInterval> }>({});
  const okStreak = useRef(0);
  const lastFaceAt = useRef(0);
  const [phase, setPhase] = useState<"idle" | "starting" | "live">("idle");
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>("Starting face check...");
  const [ready, setReady] = useState(false); // proper face held steady
  const [ratio, setRatio] = useState(4 / 3);
  const [camError, setCamError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const stopTimers = () => {
    clearInterval(timers.current.detect);
    clearInterval(timers.current.count);
  };

  const stop = () => {
    stopTimers();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    okStreak.current = 0;
    setCount(null);
    setReady(false);
    setPhase("idle");
  };

  useEffect(
    () => () => {
      clearInterval(timers.current.detect);
      clearInterval(timers.current.count);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      detectorRef.current?.close();
      detectorRef.current = null;
    },
    []
  );

  useEffect(() => {
    if (!value) return;
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  // Attach the stream once the <video> exists.
  useEffect(() => {
    const v = videoRef.current;
    if (phase === "live" && v && streamRef.current) {
      v.srcObject = streamRef.current;
      v.play().catch(() => {});
    }
  }, [phase]);

  const loadDetector = async () => {
    if (detectorRef.current) return detectorRef.current;
    const vision = await import("@mediapipe/tasks-vision");
    const files = await vision.FilesetResolver.forVisionTasks("/mediapipe/wasm");
    const det = await vision.FaceDetector.createFromOptions(files, {
      baseOptions: { modelAssetPath: "/mediapipe/blaze_face_short_range.tflite" },
      runningMode: "VIDEO",
      minDetectionConfidence: 0.4,
    });
    detectorRef.current = det;
    return det;
  };

  const startChecking = async () => {
    setLoadingCheck(true);
    setProblem("Loading face check...");
    try {
      const det = await loadDetector();
      setLoadingCheck(false);
      okStreak.current = 0;
      timers.current.detect = setInterval(() => {
        const v = videoRef.current;
        if (!v || !v.videoWidth || v.readyState < 2) return;
        try {
          const p = faceProblem(det.detectForVideo(v, performance.now()).detections);
          if (!p) lastFaceAt.current = Date.now();
          okStreak.current = p ? 0 : okStreak.current + 1;
          setProblem(p);
          // Two quick hits in a row (a fraction of a second) so one flickery frame doesn't count.
          setReady(okStreak.current >= 2);
        } catch {
          /* a dropped frame — try again on the next tick */
        }
      }, 130);
    } catch {
      setLoadingCheck(false);
      setProblem("The face check could not start.");
      setCamError("The face-verification check could not load. Check your internet connection, reload the page and try again.");
    }
  };

  const start = async () => {
    setCamError("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      return setCamError(
        "The camera can only be used on a secure page (https). Please open the registration link using https — or on the same computer using localhost."
      );
    }
    setPhase("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // 4:3 at a modest size gives the camera's full, un-cropped view.
        video: { facingMode: "user", aspectRatio: { ideal: 4 / 3 }, width: { ideal: 1024 } },
        audio: false,
      });
      streamRef.current = stream;
      // Phones with a zoomable camera: start fully zoomed out.
      try {
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities?.() as (MediaTrackCapabilities & { zoom?: { min: number } }) | undefined;
        if (caps?.zoom) await track.applyConstraints({ advanced: [{ zoom: caps.zoom.min } as MediaTrackConstraintSet] });
      } catch {
        /* zoom not supported — fine */
      }
      setPhase("live");
      startChecking();
    } catch (e) {
      setPhase("idle");
      const name = (e as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setCamError("Camera access was blocked. Click the camera icon in the address bar, choose Allow, then try again.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setCamError("No camera was found on this device.");
      } else if (name === "NotReadableError") {
        setCamError("The camera is being used by another app. Close it and try again.");
      } else {
        setCamError("Could not start the camera. Please try again.");
      }
    }
  };

  const snap = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return setCamError("The camera is not ready yet — wait a second and try again.");

    // The face must have been in view during the last couple of seconds.
    if (Date.now() - lastFaceAt.current > 2500) {
      okStreak.current = 0;
      setReady(false);
      return setCamError("Photo not taken: no face was visible. Show your face to the camera and try again.");
    }

    const cv = document.createElement("canvas");
    cv.width = v.videoWidth;
    cv.height = v.videoHeight;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);

    // Reject frames that are too dark to identify anyone.
    const probe = document.createElement("canvas");
    probe.width = 32;
    probe.height = 32;
    const pctx = probe.getContext("2d");
    if (pctx) {
      pctx.drawImage(cv, 0, 0, 32, 32);
      const px = pctx.getImageData(0, 0, 32, 32).data;
      let sum = 0;
      for (let i = 0; i < px.length; i += 4) sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      if (sum / (px.length / 4) < 25) {
        return setCamError("The photo is too dark. Move to a brighter place or face a light, then try again.");
      }
    }
    cv.toBlob(
      (b) => {
        if (b) {
          onChange(b);
          stop();
        }
      },
      "image/jpeg",
      0.92
    );
  };

  const capture = () => {
    if (!ready) return;
    setCamError("");
    let n = 3;
    setCount(n);
    timers.current.count = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(timers.current.count);
        setCount(null);
        snap();
      } else {
        setCount(n);
      }
    }, 1000);
  };

  return (
    <div className={s.panel}>
      <p className={s.panelTitle}>Live facial verification</p>
      {value && preview ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={s.photoPreview} src={preview} alt="Your live photo" />
          <span className={s.verifiedTag}>✓ Face verified</span>
          <div className={s.btnRow}>
            <button className={`${s.btn} ${s.btnGhost}`} type="button" onClick={() => onChange(null)}>
              Retake photo
            </button>
          </div>
        </>
      ) : phase === "live" ? (
        <>
          <div className={s.camWrap} style={{ aspectRatio: ratio }}>
            <video
              ref={videoRef}
              className={s.camVideo}
              playsInline
              muted
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight);
              }}
            />
            <div className={`${s.camOval} ${ready ? s.camOvalOk : ""}`} />
            {count !== null && <div className={s.camCount}>{count}</div>}
          </div>
          <p className={`${s.camStatus} ${ready ? s.camStatusOk : ""}`}>
            {loadingCheck ? "Loading face check..." : ready ? "Face detected — press Capture." : problem}
          </p>
          {camError && <p className={s.error}>{camError}</p>}
          <div className={s.btnRow} style={{ justifyContent: "center" }}>
            <button className={`${s.btn} ${s.btnGreen}`} type="button" onClick={capture} disabled={!ready || count !== null}>
              {count !== null ? "Hold still..." : "📸 Capture"}
            </button>
            <button className={`${s.btn} ${s.btnGhost}`} type="button" onClick={stop} disabled={count !== null}>
              Close camera
            </button>
          </div>
        </>
      ) : (
        <>
          <p className={s.help} style={{ margin: "0 0 10px" }}>
            We take a live photo of your face to confirm it is really you. The Capture button turns on as soon as your face is visible to the camera — an old photo cannot be uploaded.
          </p>
          <ul className={s.camTips}>
            <li>Keep your face in front of the camera</li>
            <li>Stand in good light — keep the light in front of you</li>
            <li>No cap, mask or dark glasses</li>
            <li>Only you should be in the frame</li>
          </ul>
          {camError && <p className={s.error}>{camError}</p>}
          <div className={s.btnRow}>
            <button className={s.btn} type="button" onClick={start} disabled={phase === "starting"}>
              {phase === "starting" ? "Starting camera..." : "📷 Open camera"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
