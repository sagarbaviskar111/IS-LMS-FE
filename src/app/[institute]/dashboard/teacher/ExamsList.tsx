"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTeacherBatch } from "@/context/TeacherBatchContext";
import { api, ApiError, ExamSummary } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import styles from "./teacher.module.css";
import BatchSwitcher from "./BatchSwitcher";

const STATUS_BADGE: Record<ExamSummary["status"], string> = {
  draft: adminStyles.badgePending,
  published: adminStyles.badge,
  closed: adminStyles.badgeInactive,
};

export default function ExamsList() {
  const { institute } = useParams<{ institute: string }>();
  const { activeBatchId, activeBatch } = useTeacherBatch();
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!activeBatchId) return;
    setLoading(true);
    try {
      const res = await api.listExams(activeBatchId);
      setExams(res.exams);
    } finally {
      setLoading(false);
    }
  }, [activeBatchId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBatchId) return;
    setError("");
    setSubmitting(true);
    try {
      await api.createExam({ batch: activeBatchId, title, description });
      setTitle("");
      setDescription("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create exam");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Exams</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Create exams for {activeBatch?.name || "your batch"}, add questions, then publish.
      </p>

      <BatchSwitcher />

      <div className={adminStyles.grid}>
        <section className={adminStyles.section}>
          <div className={adminStyles.sectionHead}>
            <div>
              <h2 className={adminStyles.sectionTitle}>Create an exam</h2>
              <p className={adminStyles.sectionSubtitle}>
                Starts as a draft — add questions before publishing it to students.
              </p>
            </div>
          </div>

          <form className={adminStyles.form} onSubmit={handleCreate}>
            <label className={adminStyles.label}>
              Title
              <input
                className={adminStyles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Unit 2 Test"
                required
              />
            </label>

            <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
              Description
              <input
                className={adminStyles.input}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="optional"
              />
            </label>

            <div className={adminStyles.formActions}>
              <button className={adminStyles.primaryButton} type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create exam"}
              </button>
              {error && <p className={adminStyles.messageError}>{error}</p>}
            </div>
          </form>
        </section>

        <section className={adminStyles.section}>
          <div className={adminStyles.sectionHead}>
            <div>
              <h2 className={adminStyles.sectionTitle}>All exams</h2>
              <p className={adminStyles.sectionSubtitle}>{exams.length} total</p>
            </div>
          </div>

          {!loading && exams.length === 0 && (
            <div className={styles.emptyBlock}>
              <span className={styles.emptyIcon} aria-hidden="true" />
              <p className={styles.emptyText}>No exams yet — create one above.</p>
            </div>
          )}

          {exams.length > 0 && (
            <div className={`${adminStyles.tableWrap} ${styles.tableHoverWrap}`}>
              <table className={adminStyles.table}>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Questions</th>
                    <th>Total marks</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((e) => (
                    <tr key={e._id}>
                      <td>{e.title}</td>
                      <td>
                        <span className={STATUS_BADGE[e.status]}>{e.status}</span>
                        {e.resultsAnnounced && (
                          <span
                            className={adminStyles.badge}
                            style={{ marginLeft: 6, background: "var(--info-soft)", color: "var(--info)" }}
                          >
                            results out
                          </span>
                        )}
                      </td>
                      <td>{e.questionCount}</td>
                      <td>{e.totalMarks}</td>
                      <td>
                        <Link
                          className={adminStyles.smallButton}
                          style={{ display: "inline-block", textDecoration: "none" }}
                          href={`/${institute}/dashboard/teacher/exams/${e._id}`}
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
