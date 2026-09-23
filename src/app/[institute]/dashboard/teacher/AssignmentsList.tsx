"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTeacherBatch } from "@/context/TeacherBatchContext";
import { api, ApiError, AssignmentSummary } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import styles from "./teacher.module.css";
import BatchSwitcher from "./BatchSwitcher";

const ATTACHMENT_ACCEPT =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,image/jpeg,image/png,image/webp";

function formatDueDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type AssignmentRow = AssignmentSummary & { overdue: boolean };

export default function AssignmentsList() {
  const { institute } = useParams<{ institute: string }>();
  const { activeBatchId, activeBatch } = useTeacherBatch();
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!activeBatchId) return;
    setLoading(true);
    try {
      const res = await api.listAssignments(activeBatchId);
      const now = Date.now();
      setAssignments(res.assignments.map((a) => ({ ...a, overdue: new Date(a.dueDate).getTime() < now })));
    } finally {
      setLoading(false);
    }
  }, [activeBatchId]);

  useEffect(() => {
    load();
  }, [load]);

  const resetFileInput = () => {
    const el = document.getElementById("assignment-file") as HTMLInputElement | null;
    if (el) el.value = "";
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBatchId || !dueDate) return;
    setError("");
    setSubmitting(true);
    try {
      await api.createAssignment({
        batch: activeBatchId,
        title,
        description,
        dueDate: new Date(dueDate).toISOString(),
        file,
      });
      setTitle("");
      setDescription("");
      setDueDate("");
      setFile(null);
      resetFileInput();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create assignment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Assignments</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Set an assignment for {activeBatch?.name || "your batch"} with a due date. Students lose the
        ability to submit once it passes.
      </p>

      <BatchSwitcher />

      <div className={adminStyles.grid}>
        <section className={adminStyles.section}>
          <div className={adminStyles.sectionHead}>
            <div>
              <h2 className={adminStyles.sectionTitle}>Create an assignment</h2>
              <p className={adminStyles.sectionSubtitle}>Attaching a file (question sheet) is optional.</p>
            </div>
          </div>

          <form className={adminStyles.form} onSubmit={handleCreate}>
            <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
              Title
              <input
                className={adminStyles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chapter 4 problem set"
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

            <label className={adminStyles.label}>
              Due date
              <input
                className={adminStyles.input}
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </label>

            <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
              Attachment (optional)
              <input
                id="assignment-file"
                className={adminStyles.input}
                type="file"
                accept={ATTACHMENT_ACCEPT}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>

            <div className={adminStyles.formActions}>
              <button className={adminStyles.primaryButton} type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create assignment"}
              </button>
              {error && <p className={adminStyles.messageError}>{error}</p>}
            </div>
          </form>
        </section>

        <section className={adminStyles.section}>
          <div className={adminStyles.sectionHead}>
            <div>
              <h2 className={adminStyles.sectionTitle}>All assignments</h2>
              <p className={adminStyles.sectionSubtitle}>{assignments.length} total</p>
            </div>
          </div>

          {!loading && assignments.length === 0 && (
            <div className={styles.emptyBlock}>
              <span className={styles.emptyIcon} aria-hidden="true" />
              <p className={styles.emptyText}>No assignments yet — create one above.</p>
            </div>
          )}

          {assignments.length > 0 && (
            <div className={`${adminStyles.tableWrap} ${styles.tableHoverWrap}`}>
              <table className={adminStyles.table}>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Due</th>
                    <th>Submitted</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a._id}>
                      <td>{a.title}</td>
                      <td>
                        {formatDueDate(a.dueDate)}
                        {a.overdue && (
                          <span
                            className={adminStyles.badgeInactive}
                            style={{ marginLeft: 6, background: "var(--warning-soft)", color: "var(--warning)" }}
                          >
                            past due
                          </span>
                        )}
                      </td>
                      <td>
                        {a.submittedCount} / {a.studentCount}
                      </td>
                      <td>
                        <Link
                          className={adminStyles.smallButton}
                          style={{ display: "inline-block", textDecoration: "none" }}
                          href={`/${institute}/dashboard/teacher/assignments/${a._id}`}
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
