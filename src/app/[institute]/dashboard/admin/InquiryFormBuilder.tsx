"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError, InquiryQuestion, InquiryQuestionType } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "./admin.module.css";
import b from "./inquiry.module.css";

export const QUESTION_TYPE_LABELS: Record<InquiryQuestionType, string> = {
  short_text: "Short answer",
  paragraph: "Paragraph",
  multiple_choice: "Multiple choice",
  checkboxes: "Checkboxes",
  dropdown: "Dropdown",
  linear_scale: "Linear scale",
  date: "Date",
  time: "Time",
  multiple_choice_grid: "Multiple choice grid",
  checkbox_grid: "Checkbox grid",
  name: "Name (first + last)",
  phone: "Phone number",
  email: "Email address",
  lead: "Lead question (Yes / No)",
};

const TYPE_GROUPS: { label: string; types: InquiryQuestionType[] }[] = [
  {
    label: "Questions",
    types: ["short_text", "paragraph", "multiple_choice", "checkboxes", "dropdown", "linear_scale", "date", "time", "multiple_choice_grid", "checkbox_grid"],
  },
  { label: "Contact (checked for valid input)", types: ["name", "phone", "email"] },
  { label: "Lead", types: ["lead"] },
];

const LEAD_DEFAULT_TITLE = "Would you like us to contact you about joining?";

const newId = () => `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const blankQuestion = (): InquiryQuestion => ({
  id: newId(),
  type: "multiple_choice",
  title: "",
  description: "",
  required: false,
  options: ["Option 1"],
});

// Contact questions come pre-filled and required — the admin only edits the
// wording if they want to. A title the admin typed themselves is never overwritten.
const CONTACT_DEFAULT_TITLES: Partial<Record<InquiryQuestionType, string>> = {
  name: "Your name",
  phone: "Phone number",
  email: "Email address",
};
const isDefaultTitle = (title: string) =>
  !title.trim() || Object.values(CONTACT_DEFAULT_TITLES).includes(title.trim()) || title.trim() === LEAD_DEFAULT_TITLE;

const contactQuestion = (type: "name" | "phone" | "email"): InquiryQuestion => ({
  id: newId(),
  type,
  title: CONTACT_DEFAULT_TITLES[type] || "",
  description: "",
  required: true,
});

// Gives a question the extra fields its (new) type needs, keeping the title.
const withTypeDefaults = (q: InquiryQuestion, type: InquiryQuestionType): InquiryQuestion => {
  const next: InquiryQuestion = { ...q, type };
  if (type === "name" || type === "phone" || type === "email") {
    next.required = true;
    if (isDefaultTitle(q.title)) next.title = CONTACT_DEFAULT_TITLES[type] || q.title;
  }
  if (type === "lead") {
    next.required = true;
    if (!q.title.trim()) next.title = LEAD_DEFAULT_TITLE;
  }
  if (["multiple_choice", "checkboxes", "dropdown"].includes(type)) {
    next.options = q.options?.length ? q.options : ["Option 1"];
  }
  if (type === "linear_scale") {
    next.scaleMin = q.scaleMin ?? 1;
    next.scaleMax = q.scaleMax ?? 5;
  }
  if (type === "multiple_choice_grid" || type === "checkbox_grid") {
    next.rows = q.rows?.length ? q.rows : ["Row 1"];
    next.columns = q.columns?.length ? q.columns : ["Column 1"];
  }
  return next;
};

function ListEditor({
  title,
  items,
  prefix,
  onChange,
}: {
  title: string;
  items: string[];
  prefix: string;
  onChange: (items: string[]) => void;
}) {
  return (
    <div className={b.listEditor}>
      <span className={b.listTitle}>{title}</span>
      {items.map((item, i) => (
        <div key={i} className={b.listItem}>
          <input
            className={styles.input}
            value={item}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
            placeholder={`${prefix} ${i + 1}`}
          />
          <button
            type="button"
            className={b.iconButton}
            disabled={items.length <= 1}
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            aria-label="Remove"
          >
            ✕
          </button>
        </div>
      ))}
      <div>
        <button type="button" className={styles.smallButton} onClick={() => onChange([...items, ""])}>
          + Add {prefix.toLowerCase()}
        </button>
      </div>
    </div>
  );
}

function QuestionEditor({
  q,
  index,
  total,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
}: {
  q: InquiryQuestion;
  index: number;
  total: number;
  onChange: (q: InquiryQuestion) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const isChoice = ["multiple_choice", "checkboxes", "dropdown"].includes(q.type);
  const isGrid = q.type === "multiple_choice_grid" || q.type === "checkbox_grid";

  return (
    <div className={b.questionCard}>
      <div className={b.row}>
        <label className={`${styles.label} ${b.grow}`}>
          Question {index + 1}
          <input
            className={styles.input}
            value={q.title}
            onChange={(e) => onChange({ ...q, title: e.target.value })}
            placeholder="Question"
            maxLength={500}
          />
        </label>
        <label className={`${styles.label} ${b.typeSelect}`}>
          Type
          <select
            className={styles.select}
            value={q.type}
            onChange={(e) => onChange(withTypeDefaults(q, e.target.value as InquiryQuestionType))}
          >
            {TYPE_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.types.map((t) => (
                  <option key={t} value={t}>
                    {QUESTION_TYPE_LABELS[t]}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>

      <input
        className={styles.input}
        value={q.description || ""}
        onChange={(e) => onChange({ ...q, description: e.target.value })}
        placeholder="Description (optional)"
        maxLength={1000}
      />

      {q.type === "short_text" && <span className={b.listTitle}>Respondents type a short answer.</span>}
      {q.type === "paragraph" && <span className={b.listTitle}>Respondents type a long answer.</span>}
      {q.type === "date" && <span className={b.listTitle}>Respondents pick a date.</span>}
      {q.type === "time" && <span className={b.listTitle}>Respondents pick a time.</span>}
      {q.type === "name" && (
        <span className={b.listTitle}>Shows separate First name and Last name fields (letters only). Used as the lead&apos;s name.</span>
      )}
      {q.type === "phone" && (
        <span className={b.listTitle}>
          Only valid mobile numbers are accepted (10-digit Indian, or +country code). Used as the lead&apos;s phone.
        </span>
      )}
      {q.type === "email" && (
        <span className={b.listTitle}>Only valid email addresses are accepted. Saved on the lead too.</span>
      )}
      {q.type === "lead" && (
        <span className={b.listTitle}>
          Always Yes / No and always required. Everyone who answers <strong>Yes</strong> is added to your Leads
          automatically. The form needs a required Name and Phone number question.
        </span>
      )}

      {isChoice && (
        <ListEditor
          title="Options"
          prefix="Option"
          items={q.options || []}
          onChange={(options) => onChange({ ...q, options })}
        />
      )}

      {q.type === "linear_scale" && (
        <div className={b.scaleRow}>
          <label className={styles.label}>
            From
            <select
              className={styles.select}
              value={q.scaleMin ?? 1}
              onChange={(e) => onChange({ ...q, scaleMin: Number(e.target.value) })}
            >
              <option value={0}>0</option>
              <option value={1}>1</option>
            </select>
          </label>
          <label className={styles.label}>
            To
            <select
              className={styles.select}
              value={q.scaleMax ?? 5}
              onChange={(e) => onChange({ ...q, scaleMax: Number(e.target.value) })}
            >
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.label}>
            Low label
            <input
              className={styles.input}
              value={q.scaleMinLabel || ""}
              onChange={(e) => onChange({ ...q, scaleMinLabel: e.target.value })}
              placeholder="optional"
            />
          </label>
          <label className={styles.label}>
            High label
            <input
              className={styles.input}
              value={q.scaleMaxLabel || ""}
              onChange={(e) => onChange({ ...q, scaleMaxLabel: e.target.value })}
              placeholder="optional"
            />
          </label>
        </div>
      )}

      {isGrid && (
        <div className={b.gridCols}>
          <ListEditor title="Rows" prefix="Row" items={q.rows || []} onChange={(rows) => onChange({ ...q, rows })} />
          <ListEditor
            title="Columns"
            prefix="Column"
            items={q.columns || []}
            onChange={(columns) => onChange({ ...q, columns })}
          />
        </div>
      )}

      <div className={b.cardFooter}>
        <label className={b.toggle}>
          <input
            type="checkbox"
            checked={q.required}
            disabled={q.type === "lead"}
            onChange={(e) => onChange({ ...q, required: e.target.checked })}
          />
          {q.type === "lead" ? "Required (always)" : "Required"}
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className={b.iconButton} disabled={index === 0} onClick={() => onMove(-1)} aria-label="Move up">
            ↑
          </button>
          <button
            type="button"
            className={b.iconButton}
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            aria-label="Move down"
          >
            ↓
          </button>
          <button type="button" className={styles.smallButton} onClick={onDuplicate}>
            Duplicate
          </button>
          <button type="button" className={styles.dangerButton} disabled={total <= 1} onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InquiryFormBuilder({ formId }: { formId?: string }) {
  const { institute } = useParams<{ institute: string }>();
  const router = useRouter();
  const listPath = `/${institute}/dashboard/admin/inquiry-forms`;

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<InquiryQuestion[]>([blankQuestion()]);
  const [loading, setLoading] = useState(!!formId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!formId) return;
    api
      .getInquiryForm(formId)
      .then(({ form }) => {
        setSubject(form.subject);
        setDescription(form.description || "");
        setQuestions(form.questions);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load the form"))
      .finally(() => setLoading(false));
  }, [formId]);

  const update = (i: number, q: InquiryQuestion) => setQuestions((qs) => qs.map((x, j) => (j === i ? q : x)));

  const move = (i: number, dir: -1 | 1) =>
    setQuestions((qs) => {
      const next = [...qs];
      [next[i], next[i + dir]] = [next[i + dir], next[i]];
      return next;
    });

  const handleSave = async () => {
    setError("");
    if (!subject.trim()) return setError("Add a subject line for the form");
    const blank = questions.findIndex((q) => !q.title.trim());
    if (blank !== -1) return setError(`Question ${blank + 1} needs a title`);
    if (questions.filter((q) => q.type === "lead").length > 1) return setError("A form can have only one Lead question");
    if (questions.some((q) => q.type === "lead")) {
      const nameQ = questions.find((q) => q.type === "name");
      const phoneQ = questions.find((q) => q.type === "phone");
      if (!nameQ?.required || !phoneQ?.required) {
        return setError(
          "A Lead question needs a required Name (first + last) question and a required Phone number question, so every lead has someone to call"
        );
      }
    }

    setSaving(true);
    try {
      const payload = { subject, description, questions };
      if (formId) await api.updateInquiryForm(formId, payload);
      else await api.createInquiryForm(payload);
      router.push(listPath);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the form");
      setSaving(false);
    }
  };

  if (loading) return <p className={styles.sectionSubtitle}>Loading...</p>;

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>{formId ? "Edit inquiry form" : "Create inquiry form"}</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Students open the form through a shareable link and their answers show up under Responses.
      </p>

      <div className={b.builder}>
        <section className={styles.section}>
          <div className={styles.form} style={{ gridTemplateColumns: "1fr" }}>
            <label className={styles.label}>
              <span>
                Form subject<span className={styles.required}>*</span>
              </span>
              <input
                className={styles.input}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Admission Inquiry 2026"
                maxLength={200}
                autoComplete="off"
                required
              />
              <span className={styles.hint}>Shown as the heading students see. {subject.length}/200</span>
            </label>
            <label className={styles.label}>
              Description (optional)
              <textarea
                className={styles.input}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional — shown under the subject"
                rows={3}
                maxLength={2000}
              />
            </label>
          </div>
        </section>

        {questions.map((q, i) => (
          <QuestionEditor
            key={q.id}
            q={q}
            index={i}
            total={questions.length}
            onChange={(nq) => update(i, nq)}
            onMove={(dir) => move(i, dir)}
            onDuplicate={() =>
              setQuestions((qs) => [...qs.slice(0, i + 1), { ...q, id: newId() }, ...qs.slice(i + 1)])
            }
            onDelete={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}
          />
        ))}

        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" className={styles.smallButton} onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}>
              + Add question
            </button>
            <span className={b.listTitle}>Quick add:</span>
            {(["name", "phone", "email"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={styles.smallButton}
                disabled={questions.some((q) => q.type === t)}
                title={questions.some((q) => q.type === t) ? "Already on this form" : undefined}
                onClick={() => setQuestions((qs) => [...qs, contactQuestion(t)])}
              >
                + {t === "name" ? "Name" : t === "phone" ? "Phone" : "Email"}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className={styles.messageError} role="alert">
            {error}
          </p>
        )}

        <div className={styles.formActions}>
          <button type="button" className={styles.primaryButton} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : formId ? "Save changes" : "Create form"}
          </button>
          <button type="button" className={styles.smallButton} onClick={() => router.push(listPath)} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
