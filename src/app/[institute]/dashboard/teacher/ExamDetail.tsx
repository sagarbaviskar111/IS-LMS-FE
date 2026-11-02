"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError, ExamDetail as ExamDetailType, Submission } from "@/lib/api";
import ReviewModal from "./ReviewModal";
import RichText from "../RichText";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import styles from "./teacher.module.css";
import Pagination from "../Pagination";
import ListToolbar from "../admin/ListToolbar";

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
  const [reviewing, setReviewing] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [rq, setRq] = useState("");
  const [rSort, setRSort] = useState("name");
  const [rPage, setRPage] = useState(1);
  const [rLimit, setRLimit] = useState(10);
  useEffect(() => setRPage(1), [rq, rSort, rLimit]);

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

  const rNeedle = rq.trim().toLowerCase();
  const nameOf = (s: Submission) => (typeof s.student === "object" ? s.student.name : String(s.student));
  const emailOf = (s: Submission) => (typeof s.student === "object" ? s.student.email : "");
  const resultRows = submissions
    .filter((s) => !rNeedle || `${nameOf(s)} ${emailOf(s)}`.toLowerCase().includes(rNeedle))
    .sort((a, b) => (rSort === "score_desc" ? b.score - a.score : rSort === "score_asc" ? a.score - b.score : nameOf(a).localeCompare(nameOf(b))));
  const rTotalPages = Math.max(1, Math.ceil(resultRows.length / rLimit));
  const resultPage = resultRows.slice((rPage - 1) * rLimit, rPage * rLimit);

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
      <h1 className={dashboardStyles.pageTitle} style={{ overflowWrap: "anywhere" }}>{exam.title}</h1>
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
            <div className={adminStyles.rowActions} style={{ flexWrap: "wrap" }}>
              <span className={STATUS_BADGE[exam.status]}>{exam.status}</span>
              {exam.resultsAnnounced && <span className={adminStyles.badge}>results announced</span>}
            </div>
          </div>

          <div className={adminStyles.rowActions} style={{ flexWrap: "wrap" }}>
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
              <label className={`${adminStyles.label} ${adminStyles.fullRow}`}>
                <span>Question <span className={adminStyles.required}>*</span></span>
                <input
                  className={adminStyles.input}
                  value={qForm.text}
                  onChange={(e) => setQForm({ ...qForm, text: e.target.value })}
                  required
                />
              </label>

              <div className={`${adminStyles.label} ${adminStyles.fullRow}`}>
                <span>Options <span className={adminStyles.required}>*</span> <span className={adminStyles.hint}>Tick the radio button next to the correct answer. 2 to 6 options.</span></span>
                {qForm.options.map((opt, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                    <input
                      type="radio"
                      name="correctOption" aria-label={`Option ${i + 1} is correct`}
                      checked={qForm.correctOptionIndex === i}
                      onChange={() => setQForm({ ...qForm, correctOptionIndex: i })}
                    />
                    <input
                      className={adminStyles.input}
                      style={{ flex: "1 1 180px", minWidth: 0 }} aria-label={`Option ${i + 1}`} maxLength={300}
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
                <span>Marks <span className={adminStyles.required}>*</span></span>
                <input
                  className={adminStyles.input}
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={qForm.marks}
                  onChange={(e) => setQForm({ ...qForm, marks: Number(e.target.value) || 1 })}
                />
              </label>
                <span className={adminStyles.hint}>Points awarded for a correct answer.</span>

              <div className={adminStyles.formActions} style={{ flexWrap: "wrap" }}>
                <button className={adminStyles.primaryButton} type="submit" disabled={qSubmitting}>
                  {qSubmitting ? "Saving…" : editingQid ? "Save question" : "Add question"}
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
              <p style={{ fontWeight: 600, marginBottom: 8, overflowWrap: "anywhere" }}>
                {i + 1}. {q.text} <span style={{ color: "var(--muted)", fontWeight: 400 }}>({q.marks} mark{q.marks > 1 ? "s" : ""})</span>
              </p>
              <ul style={{ margin: 0, paddingLeft: 20, overflowWrap: "anywhere" }}>
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

            {submissions.length > 0 && (
              <ListToolbar
                search={rq}
                onSearch={setRq}
                placeholder="Search student name or email"
                total={resultRows.length}
                sort={{ key: "sort", label: "Sort by", value: rSort, onChange: setRSort, options: [{ value: "name", label: "Name (A-Z)" }, { value: "score_desc", label: "Highest score" }, { value: "score_asc", label: "Lowest score" }] }}
                onClear={() => { setRq(""); setRSort("name"); }}
              />
            )}
            {submissions.length === 0 && (
              <div className={styles.emptyBlock}>
                <span className={styles.emptyIcon} aria-hidden="true" />
                <p className={styles.emptyText}>No submissions yet.</p>
              </div>
            )}

            {resultRows.length > 0 && (
              <div className={`${adminStyles.tableWrap} ${styles.tableHoverWrap}`}>
                <table className={adminStyles.table}>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Email</th>
                      <th>Score</th>
                      <th>Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultPage.map((s) => (
                      <tr key={s._id}>
                        <td style={{ overflowWrap: "anywhere" }}>{typeof s.student === "object" ? s.student.name : s.student}</td>
                        <td style={{ overflowWrap: "anywhere" }}>{typeof s.student === "object" ? s.student.email : "—"}</td>
                        <td>
                          {s.score} / {s.totalMarks}
                          {!!s.adjustment && (
                            <span className={adminStyles.sectionSubtitle} style={{ margin: "0 0 0 6px" }}>
                              ({s.adjustment > 0 ? "+" : "−"}
                              {Math.abs(s.adjustment)})
                            </span>
                          )}
                        </td>
                        <td>
                          {s.review ? <RichText html={s.review} /> : null}
                          <button className={adminStyles.smallButton} type="button" onClick={() => setReviewing(s)}>
                            {s.review || s.adjustment ? "Edit review" : "Review"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {submissions.length > 0 && resultRows.length === 0 && <p className={adminStyles.empty}>No students match your search.</p>}
            <Pagination page={rPage} totalPages={rTotalPages} total={resultRows.length} onPageChange={setRPage} limit={rLimit} onLimitChange={setRLimit} />
          </section>
        )}
      </div>

      {reviewing && (
        <ReviewModal
          target={{
            kind: "exam",
            studentName: typeof reviewing.student === "object" ? reviewing.student.name : "Student",
            autoScore: reviewing.autoScore ?? reviewing.score,
            totalMarks: reviewing.totalMarks,
            adjustment: reviewing.adjustment ?? 0,
            review: reviewing.review || "",
          }}
          onClose={() => setReviewing(null)}
          onSave={async (payload) => {
            const res = await api.reviewExamSubmission(id, reviewing._id, payload);
            setSubmissions((list) => list.map((x) => (x._id === reviewing._id ? { ...x, ...res.submission } : x)));
            setReviewing(null);
          }}
        />
      )}
    </div>
  );
}
