"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError, Institute, InquiryAnswer, InquiryQuestion, PublicInquiryForm } from "@/lib/api";
import { brandVars, isHex } from "@/lib/palette";
import {
  EMAIL_ERROR,
  FIRST_NAME_ERROR,
  LAST_NAME_ERROR,
  PHONE_ERROR,
  normalizeEmail,
  normalizeNamePart,
  normalizePhone,
} from "@/lib/validate";
import styles from "./inquiry.module.css";

// Short single-line inputs sit two to a row; everything else gets the full width.
const COMPACT = ["short_text", "dropdown", "date", "time", "name", "phone", "email"];

type Answers = Record<string, InquiryAnswer>;

const isEmpty = (v: InquiryAnswer | undefined) =>
  v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

// Returns an error message for a question, or "" when it's fine.
// The name question holds { first, last } while it's being filled in.
const nameParts = (v: InquiryAnswer | undefined) => {
  const o = (v && typeof v === "object" && !Array.isArray(v) ? v : {}) as Record<string, string>;
  return { first: o.first || "", last: o.last || "" };
};

function validate(q: InquiryQuestion, v: InquiryAnswer | undefined): string {
  if (q.type === "name") {
    const { first, last } = nameParts(v);
    if (!first.trim() && !last.trim()) return q.required ? "This is a required question" : "";
    if (!normalizeNamePart(first)) return FIRST_NAME_ERROR;
    if (!normalizeNamePart(last)) return LAST_NAME_ERROR;
    return "";
  }
  // Contact fields are format-checked whenever something was typed, required or not.
  if (typeof v === "string" && v.trim() !== "") {
    if (q.type === "phone" && !normalizePhone(v)) return PHONE_ERROR;
    if (q.type === "email" && !normalizeEmail(v)) return EMAIL_ERROR;
  }
  if (q.type === "lead") return v === "yes" || v === "no" ? "" : "Please choose Yes or No";
  if (!q.required) return "";
  if (q.type === "multiple_choice_grid" || q.type === "checkbox_grid") {
    const grid = (v && typeof v === "object" && !Array.isArray(v) ? v : {}) as Record<string, string | string[]>;
    const missing = (q.rows || []).some((r) => isEmpty(grid[r]));
    return missing ? "Answer every row" : "";
  }
  return isEmpty(v) ? "This is a required question" : "";
}

function QuestionInput({
  q,
  value,
  onChange,
}: {
  q: InquiryQuestion;
  value: InquiryAnswer | undefined;
  onChange: (v: InquiryAnswer) => void;
}) {
  const name = `q_${q.id}`;

  switch (q.type) {
    case "short_text":
      return (
        <input
          className={styles.input}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your answer"
          maxLength={500}
        />
      );
    case "name": {
      const { first, last } = nameParts(value);
      return (
        <div className={styles.nameRow}>
          <input
            className={styles.input}
            value={first}
            onChange={(e) => onChange({ first: e.target.value, last })}
            placeholder="First name"
            aria-label="First name"
            autoComplete="given-name"
            maxLength={50}
          />
          <input
            className={styles.input}
            value={last}
            onChange={(e) => onChange({ first, last: e.target.value })}
            placeholder="Last name"
            aria-label="Last name"
            autoComplete="family-name"
            maxLength={50}
          />
        </div>
      );
    }
    case "phone":
      return (
        <input
          className={styles.input}
          type="tel"
          inputMode="tel"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value.replace(/[^\d+\s\-()]/g, ""))}
          placeholder="e.g. 98765 43210"
          autoComplete="tel"
          maxLength={20}
        />
      );
    case "email":
      return (
        <input
          className={styles.input}
          type="email"
          inputMode="email"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="name@example.com"
          autoComplete="email"
          maxLength={254}
        />
      );
    case "lead":
      return (
        <div className={styles.optionList}>
          {(
            [
              ["yes", "Yes"],
              ["no", "No"],
            ] as const
          ).map(([val, label]) => (
            <label key={val} className={styles.choice}>
              <input type="radio" name={name} checked={value === val} onChange={() => onChange(val)} />
              <span className={styles.mark} aria-hidden="true" />
              <span className={styles.choiceText}>{label}</span>
            </label>
          ))}
        </div>
      );
    case "paragraph":
      return (
        <textarea
          className={styles.textarea}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your answer"
          maxLength={5000}
        />
      );
    case "multiple_choice":
      return (
        <div className={styles.optionList}>
          {(q.options || []).map((o) => (
            <label key={o} className={styles.choice}>
              <input type="radio" name={name} checked={value === o} onChange={() => onChange(o)} />
              <span className={styles.mark} aria-hidden="true" />
              <span className={styles.choiceText}>{o}</span>
            </label>
          ))}
        </div>
      );
    case "checkboxes": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className={styles.optionList}>
          {(q.options || []).map((o) => (
            <label key={o} className={styles.choice}>
              <input
                type="checkbox"
                checked={selected.includes(o)}
                onChange={(e) => onChange(e.target.checked ? [...selected, o] : selected.filter((x) => x !== o))}
              />
              <span className={styles.markSquare} aria-hidden="true" />
              <span className={styles.choiceText}>{o}</span>
            </label>
          ))}
        </div>
      );
    }
    case "dropdown":
      return (
        <select className={styles.select} value={(value as string) || ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose</option>
          {(q.options || []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case "linear_scale": {
      const min = q.scaleMin ?? 1;
      const max = q.scaleMax ?? 5;
      const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      return (
        <div className={styles.scale}>
          {q.scaleMinLabel && <span className={styles.scaleLabel}>{q.scaleMinLabel}</span>}
          {nums.map((n) => (
            <label key={n} className={styles.scaleBtn}>
              <input type="radio" name={name} checked={value === String(n)} onChange={() => onChange(String(n))} />
              <span>{n}</span>
            </label>
          ))}
          {q.scaleMaxLabel && <span className={styles.scaleLabel}>{q.scaleMaxLabel}</span>}
        </div>
      );
    }
    case "date":
      return (
        <input
          className={styles.shortInput}
          type="date"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "time":
      return (
        <input
          className={styles.shortInput}
          type="time"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "multiple_choice_grid":
    case "checkbox_grid": {
      const multi = q.type === "checkbox_grid";
      const grid = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<
        string,
        string | string[]
      >;
      return (
        <div className={styles.gridWrap}>
          <table className={styles.grid}>
            <thead>
              <tr>
                <th></th>
                {(q.columns || []).map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(q.rows || []).map((r) => (
                <tr key={r}>
                  <td>{r}</td>
                  {(q.columns || []).map((c) => {
                    const cell = grid[r];
                    const checked = multi ? Array.isArray(cell) && cell.includes(c) : cell === c;
                    return (
                      <td key={c}>
                        <label className={styles.dotWrap}>
                          <input
                            type={multi ? "checkbox" : "radio"}
                            name={`${name}_${r}`}
                            checked={checked}
                            aria-label={`${r}: ${c}`}
                            onChange={(e) => {
                              if (!multi) return onChange({ ...grid, [r]: c });
                              const cur = Array.isArray(cell) ? cell : [];
                              onChange({ ...grid, [r]: e.target.checked ? [...cur, c] : cur.filter((x) => x !== c) });
                            }}
                          />
                          <span className={multi ? styles.dotSquare : styles.dot} aria-hidden="true" />
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }
}

export default function PublicInquiryPage() {
  const { institute: slug, formKey } = useParams<{ institute: string; formKey: string }>();
  const [institute, setInstitute] = useState<Institute | null>(null);
  const [form, setForm] = useState<PublicInquiryForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api
      .getPublicInquiryForm(slug, formKey)
      .then((res) => {
        setInstitute(res.institute);
        setForm(res.form);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Could not load this form"))
      .finally(() => setLoading(false));
  }, [slug, formKey]);

  const setAnswer = (id: string, v: InquiryAnswer) => {
    setAnswers((a) => ({ ...a, [id]: v }));
    setErrors((e) => (e[id] ? { ...e, [id]: "" } : e));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSubmitError("");

    const nextErrors: Record<string, string> = {};
    for (const q of form.questions) {
      const msg = validate(q, answers[q.id]);
      if (msg) nextErrors[q.id] = msg;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      document.getElementById(`q-${Object.keys(nextErrors)[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    try {
      await api.submitPublicInquiryForm(slug, formKey, answers);
      setDone(true);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Could not submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // The inquiry page is always light; use the light half of the generated palette.
  const themeStyle = isHex(institute?.brandColor) ? brandVars(institute.brandColor, "light") : undefined;

  if (loading) return <div className={styles.wrapper} />;

  const answeredCount = form
    ? form.questions.filter((q) => {
        const v = answers[q.id];
        if (q.type === "multiple_choice_grid" || q.type === "checkbox_grid" || q.type === "name") {
          return v && typeof v === "object" && !Array.isArray(v) && Object.values(v).some((x) => !isEmpty(x));
        }
        return !isEmpty(v);
      }).length
    : 0;
  const totalQuestions = form?.questions.length || 0;
  const progress = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const requiredCount = form?.questions.filter((q) => q.required).length || 0;

  const logo = institute?.logoUrl ? (
    <span className={styles.logoChip}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={institute.logoUrl} alt={institute.name} className={styles.logo} />
    </span>
  ) : institute ? (
    <span className={styles.logoChip}>
      <span className={styles.instituteName}>{institute.name}</span>
    </span>
  ) : null;

  // Not-found / closed / thank-you all share one centred card.
  const statusCard = (icon: string | null, title: string, text: string, action?: React.ReactNode) => (
    <div className={styles.statusCard}>
      {icon ? <span className={styles.statusIcon} aria-hidden="true">{icon}</span> : logo}
      <h1 className={styles.statusTitle}>{title}</h1>
      <p className={styles.statusText}>{text}</p>
      {action}
    </div>
  );

  let content: React.ReactNode;
  if (!form || loadError) {
    content = statusCard(null, "Form not found", loadError || "This link may be incorrect or the form was removed.");
  } else if (!form.isActive) {
    content = statusCard(null, form.subject, "This form is no longer accepting responses.");
  } else if (done) {
    content = statusCard(
      "✓",
      "Thank you!",
      `Your response to “${form.subject}” has been received${institute ? ` by ${institute.name}` : ""}. We'll get back to you soon.`,
      <button
        type="button"
        className={styles.secondaryButton}
        onClick={() => {
          setAnswers({});
          setDone(false);
        }}
      >
        Submit another response
      </button>
    );
  } else {
    content = (
      <div className={styles.shell}>
        <aside className={styles.aside}>
          {logo}
          <div className={styles.asideBody}>
            <p className={styles.eyebrow}>Inquiry form</p>
            <h1 className={styles.subject}>{form.subject}</h1>
            {form.description && <p className={styles.description}>{form.description}</p>}
          </div>

          <ul className={styles.facts}>
            <li>
              <span className={styles.factIcon}>?</span>
              {totalQuestions} question{totalQuestions === 1 ? "" : "s"}
            </li>
            <li>
              <span className={styles.factIcon}>◷</span>≈ {Math.max(1, Math.ceil(totalQuestions / 3))} min to complete
            </li>
            {requiredCount > 0 && (
              <li>
                <span className={styles.factIcon}>*</span>
                {requiredCount} required
              </li>
            )}
          </ul>

          <div className={styles.progress}>
            <div className={styles.progressMeta}>
              <span>Your progress</span>
              <span>{progress}%</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
          </div>
        </aside>

        <main className={styles.formCard}>
          <div className={styles.formHead}>
            <h2 className={styles.formTitle}>Tell us about yourself</h2>
            <p className={styles.formSub}>
              Fields marked with <span className={styles.star}>*</span> are required.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.fields}>
              {form.questions.map((q, i) => (
                <div
                  key={q.id}
                  id={`q-${q.id}`}
                  className={`${styles.field} ${COMPACT.includes(q.type) ? styles.span6 : styles.span12} ${errors[q.id] ? styles.fieldError : ""}`}
                >
                  <div className={styles.label}>
                    <span className={styles.qIndex}>{String(i + 1).padStart(2, "0")}</span>
                    <span className={styles.qTitle}>
                      {q.title}
                      {q.required && <span className={styles.star}>*</span>}
                    </span>
                  </div>
                  {q.description && <p className={styles.qDesc}>{q.description}</p>}
                  <QuestionInput q={q} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} />
                  {errors[q.id] && <p className={styles.errorText}>{errors[q.id]}</p>}
                </div>
              ))}
            </div>

            {submitError && <p className={styles.errorText}>{submitError}</p>}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.clear}
                onClick={() => {
                  setAnswers({});
                  setErrors({});
                }}
              >
                Clear form
              </button>
              <button className={styles.submit} type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit inquiry →"}
              </button>
            </div>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.wrapper} style={themeStyle}>
      {content}
    </div>
  );
}
