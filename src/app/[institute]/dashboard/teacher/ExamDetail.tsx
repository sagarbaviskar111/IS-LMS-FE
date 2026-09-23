"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError, ExamDetail as ExamDetailType, Submission } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import styles from "./teacher.module.css";

const STATUS_BADGE: Record<string, string> = {
  draft: adminStyles.badgePending,
  published: adminStyles.badge,
  closed: adminStyles.badgeInactive,
};

const emptyQuestionForm = () => ({
  text: "",
  options: ["", ""],
  correctOptionIndex: 0,
  marks: 1,
});

export default function ExamDetail() {
  const { id, institute } = useParams<{ id: string; institute: string }>();
  const router = useRouter();

  const [exam, setExam] = useState<ExamDetailType | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const [qForm, setQForm] = useState(emptyQuestionForm());
  const [qError, setQError] = useState("");
  const [qSubmitting, setQSubmitting] = useState(false);
  const [editingQid, setEditingQid] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getExam(id);
      setExam(res.exam);
      if (res.exam.status !== "draft") {
        const subRes = await api.listSubmissions(id);
        setSubmissions(subRes.submissions);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const resetQForm = () => {
    setQForm(emptyQuestionForm());
    setEditingQid(null);
  };

  const setOption = (i: number, value: string) => {
    setQForm((prev) => {
      const options = [...prev.options];
      options[i] = value;
      return { ...prev, options };
    });
  };

  const addOption = () => {
    setQForm((prev) => (prev.options.length >= 6 ? prev : { ...prev, options: [...prev.options, ""] }));
  };

  const removeOption = (i: number) => {
    setQForm((prev) => {
      if (prev.options.length <= 2) return prev;
      const options = prev.options.filter((_, idx) => idx !== i);
      const correctOptionIndex = prev.correctOptionIndex >= options.length ? 0 : prev.correctOptionIndex;
      return { ...prev, options, correctOptionIndex };
    });
  };

  const submitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setQError("");
    if (qForm.options.some((o) => !o.trim())) {
      setQError("All options need text");
      return;
    }
    setQSubmitting(true);
    try {
      if (editingQid) {
        await api.updateQuestion(id, editingQid, qForm);
      } else {
        await api.addQuestion(id, qForm);
      }
      resetQForm();
      load();
    } catch (err) {
      setQError(err instanceof ApiError ? err.message : "Could not save question");
    } finally {
      setQSubmitting(false);
    }
  };

  const startEditQuestion = (q: ExamDetailType["questions"][number]) => {
    setEditingQid(q._id);
    setQForm({
      text: q.text,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex ?? 0,
      marks: q.marks,
    });
  };

  const removeQuestion = async (qid: string) => {
    if (!window.confirm("Delete this question?")) return;
    await api.deleteQuestion(id, qid);
    load();
  };

  const doPublish = async () => {
    setActionError("");
    setActionBusy(true);
    try {
      await api.publishExam(id);
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not publish exam");
    } finally {
      setActionBusy(false);
    }
  };

  const doClose = async () => {
    if (!window.confirm("Close this exam? Students won't be able to submit after this.")) return;
    setActionError("");
    setActionBusy(true);
    try {
      await api.closeExam(id);
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not close exam");
    } finally {
      setActionBusy(false);
    }
  };

  const doAnnounce = async () => {
    if (!window.confirm("Announce results? Students will be able to see their scores.")) return;
    setActionError("");
    setActionBusy(true);
    try {
      await api.announceResults(id);
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not announce results");
    } finally {
      setActionBusy(false);
    }
  };

  const doDelete = async () => {
    if (!window.confirm("Delete this draft exam? This cannot be undone.")) return;
    await api.deleteExam(id);
    router.push(`/${institute}/dashboard/teacher/exams`);
  };

  if (loading || !exam) {
    return (
      <div className={styles.loadingRow}>
        <span className={styles.spinner} aria-hidden="true" />
        <span>Loading exam…</span>
      </div>
    );
  }

  const isDraft = exam.status === "draft";
  const isPublished = exam.status === "published";
  const isClosed = exam.status === "closed";
  const totalMarks = exam.questions.reduce((s, q) => s + q.marks, 0);
  const averageScore =
    submissions.length > 0
      ? (submissions.reduce((s, sub) => s + sub.score, 0) / submissions.length).toFixed(1)
      : null;

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>{exam.title}</h1>
      <p className={dashboardStyles.pageSubtitle}>{exam.description || "No description"}</p>

      <div className={dashboardStyles.cardGrid} style={{ marginBottom: 20 }}>
        <div className={dashboardStyles.card}>
          <p className={dashboardStyles.cardLabel}>Status</p>
          <p className={dashboardStyles.cardValue} style={{ textTransform: "capitalize" }}>
            {exam.status}
          </p>
        </div>
        <div className={dashboardStyles.card}>
          <p className={dashboardStyles.cardLabel}>Questions / Marks</p>
          <p className={dashboardStyles.cardValue}>
            {exam.questions.length} / {totalMarks}
          </p>
        </div>
        {!isDraft && (
          <div className={dashboardStyles.card}>
            <p className={dashboardStyles.cardLabel}>Submissions</p>
            <p className={dashboardStyles.cardValue}>{submissions.length}</p>
          </div>
        )}
        {averageScore !== null && (
          <div className={dashboardStyles.card}>
            <p className={dashboardStyles.cardLabel}>Average score</p>
            <p className={dashboardStyles.cardValue}>{averageScore}</p>
          </div>
        )}
      </div>

      <div className={adminStyles.grid}>
        <section className={adminStyles.section}>
          <div className={adminStyles.sectionHead}>
            <div>
              <h2 className={adminStyles.sectionTitle}>Actions</h2>
            </div>
            <div className={adminStyles.rowActions}>
              <span className={STATUS_BADGE[exam.status]}>{exam.status}</span>
              {exam.resultsAnnounced && <span className={adminStyles.badge}>results announced</span>}
            </div>
          </div>

          <div className={adminStyles.rowActions}>
            {isDraft && (
              <>
                <button
                  className={adminStyles.primaryButton}
                  onClick={doPublish}
                  disabled={actionBusy || exam.questions.length === 0}
                >
                  Publish exam
                </button>
                <button className={adminStyles.dangerButton} onClick={doDelete} disabled={actionBusy}>
                  Delete exam
                </button>
              </>
            )}
            {isPublished && (
              <button className={adminStyles.primaryButton} onClick={doClose} disabled={actionBusy}>
                Close exam
              </button>
            )}
            {isClosed && !exam.resultsAnnounced && (
              <button className={adminStyles.primaryButton} onClick={doAnnounce} disabled={actionBusy}>
                Announce results
              </button>
            )}
          </div>
          {actionError && <p className={adminStyles.messageError}>{actionError}</p>}
          {isDraft && exam.questions.length === 0 && (
            <p className={adminStyles.sectionSubtitle} style={{ marginTop: 8 }}>
              Add at least one question before you can publish.
            </p>
          )}
        </section>

        {isDraft && (
          <section className={adminStyles.section}>
            <div className={adminStyles.sectionHead}>
              <div>
                <h2 className={adminStyles.sectionTitle}>
                  {editingQid ? "Edit question" : "Add a question"}
                </h2>
              </div>
            </div>

            <form className={adminStyles.form} onSubmit={submitQuestion}>
              <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
                Question
                <input
                  className={adminStyles.input}
                  value={qForm.text}
                  onChange={(e) => setQForm({ ...qForm, text: e.target.value })}
                  required
                />
              </label>

              <div className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
                Options (select the correct one)
                {qForm.options.map((opt, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                    <input
                      type="radio"
                      name="correctOption"
                      checked={qForm.correctOptionIndex === i}
                      onChange={() => setQForm({ ...qForm, correctOptionIndex: i })}
                    />
                    <input
                      className={adminStyles.input}
                      style={{ flex: 1 }}
                      value={opt}
                      onChange={(e) => setOption(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                    />
                    {qForm.options.length > 2 && (
                      <button type="button" className={adminStyles.smallButton} onClick={() => removeOption(i)}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                {qForm.options.length < 6 && (
                  <button type="button" className={adminStyles.smallButton} style={{ marginTop: 8 }} onClick={addOption}>
                    Add option
                  </button>
                )}
              </div>

              <label className={adminStyles.label}>
                Marks
                <input
                  className={adminStyles.input}
                  type="number"
                  min={1}
                  value={qForm.marks}
                  onChange={(e) => setQForm({ ...qForm, marks: Number(e.target.value) || 1 })}
                />
              </label>

              <div className={adminStyles.formActions}>
                <button className={adminStyles.primaryButton} type="submit" disabled={qSubmitting}>
                  {qSubmitting ? "Saving..." : editingQid ? "Save question" : "Add question"}
                </button>
                {editingQid && (
                  <button type="button" className={adminStyles.smallButton} onClick={resetQForm}>
                    Cancel
                  </button>
                )}
                {qError && <p className={adminStyles.messageError}>{qError}</p>}
              </div>
            </form>
          </section>
        )}

        <section className={adminStyles.section}>
          <div className={adminStyles.sectionHead}>
            <div>
              <h2 className={adminStyles.sectionTitle}>Questions</h2>
              <p className={adminStyles.sectionSubtitle}>{exam.questions.length} question(s)</p>
            </div>
          </div>

          {exam.questions.length === 0 && (
            <div className={styles.emptyBlock}>
              <span className={styles.emptyIcon} aria-hidden="true" />
              <p className={styles.emptyText}>No questions yet.</p>
            </div>
          )}

          {exam.questions.map((q, i) => (
            <div key={q._id} className={adminStyles.section} style={{ marginBottom: 10 }}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>
                {i + 1}. {q.text} <span style={{ color: "var(--muted)", fontWeight: 400 }}>({q.marks} mark{q.marks > 1 ? "s" : ""})</span>
              </p>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {q.options.map((opt, oi) => (
                  <li
                    key={oi}
                    style={{
                      color: oi === q.correctOptionIndex ? "var(--success)" : "var(--foreground)",
                      fontWeight: oi === q.correctOptionIndex ? 700 : 400,
                    }}
                  >
                    {opt} {oi === q.correctOptionIndex && "✓"}
                  </li>
                ))}
              </ul>
              {isDraft && (
                <div className={adminStyles.rowActions} style={{ marginTop: 10 }}>
                  <button className={adminStyles.smallButton} onClick={() => startEditQuestion(q)}>
                    Edit
                  </button>
                  <button className={adminStyles.dangerButton} onClick={() => removeQuestion(q._id)}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </section>

        {!isDraft && (
          <section className={adminStyles.section}>
            <div className={adminStyles.sectionHead}>
              <div>
                <h2 className={adminStyles.sectionTitle}>Results</h2>
                <p className={adminStyles.sectionSubtitle}>
                  {exam.resultsAnnounced ? "Visible to students" : "Not yet announced to students"}
                </p>
              </div>
            </div>

            {submissions.length === 0 && (
              <div className={styles.emptyBlock}>
                <span className={styles.emptyIcon} aria-hidden="true" />
                <p className={styles.emptyText}>No submissions yet.</p>
              </div>
            )}

            {submissions.length > 0 && (
              <div className={`${adminStyles.tableWrap} ${styles.tableHoverWrap}`}>
                <table className={adminStyles.table}>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Email</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((s) => (
                      <tr key={s._id}>
                        <td>{typeof s.student === "object" ? s.student.name : s.student}</td>
                        <td>{typeof s.student === "object" ? s.student.email : "—"}</td>
                        <td>
                          {s.score} / {s.totalMarks}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
