"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError, AssignmentSummary, AssignmentSubmissionRow } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import styles from "./teacher.module.css";
import DocumentViewerModal from "../DocumentViewerModal";

interface ViewingFile {
  fileName: string;
  fileUrl: string;
  mimeType?: string;
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function AssignmentDetail() {
  const { id, institute } = useParams<{ id: string; institute: string }>();
  const router = useRouter();

  const [assignment, setAssignment] = useState<AssignmentSummary | null>(null);
  const [overdue, setOverdue] = useState(false);
  const [submissions, setSubmissions] = useState<AssignmentSubmissionRow[]>([]);
  const [notSubmitted, setNotSubmitted] = useState<{ _id: string; name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<ViewingFile | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [assignmentRes, subsRes] = await Promise.all([
        api.getAssignment(id),
        api.listAssignmentSubmissions(id),
      ]);
      setAssignment(assignmentRes.assignment);
      setOverdue(new Date(assignmentRes.assignment.dueDate).getTime() < Date.now());
      setSubmissions(subsRes.submissions);
      setNotSubmitted(subsRes.notSubmitted);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = () => {
    if (!assignment) return;
    setTitle(assignment.title);
    setDescription(assignment.description || "");
    setDueDate(toDatetimeLocal(assignment.dueDate));
    setSaveError("");
    setEditing(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");
    setSaving(true);
    try {
      await api.updateAssignment(id, {
        title,
        description,
        dueDate: new Date(dueDate).toISOString(),
      });
      setEditing(false);
      load();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!window.confirm("Delete this assignment? All student submissions will be removed too.")) return;
    await api.deleteAssignment(id);
    router.push(`/${institute}/dashboard/teacher/assignments`);
  };

  if (loading || !assignment) {
    return (
      <div className={styles.loadingRow}>
        <span className={styles.spinner} aria-hidden="true" />
        <span>Loading assignment…</span>
      </div>
    );
  }

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>{assignment.title}</h1>
      <p className={dashboardStyles.pageSubtitle}>{assignment.description || "No description"}</p>

      <div className={dashboardStyles.cardGrid} style={{ marginBottom: 20 }}>
        <div className={dashboardStyles.card}>
          <p className={dashboardStyles.cardLabel}>Due date</p>
          <p className={dashboardStyles.cardValue}>
            {new Date(assignment.dueDate).toLocaleString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className={dashboardStyles.card}>
          <p className={dashboardStyles.cardLabel}>Status</p>
          <p className={dashboardStyles.cardValue}>{overdue ? "Past due" : "Open"}</p>
        </div>
        <div className={dashboardStyles.card}>
          <p className={dashboardStyles.cardLabel}>Submitted</p>
          <p className={dashboardStyles.cardValue}>
            {submissions.length} / {submissions.length + notSubmitted.length}
          </p>
        </div>
      </div>

      <div className={adminStyles.grid}>
        <section className={adminStyles.section}>
          <div className={adminStyles.sectionHead}>
            <div>
              <h2 className={adminStyles.sectionTitle}>Details</h2>
            </div>
            <div className={adminStyles.rowActions}>
              {!editing && (
                <button className={adminStyles.smallButton} onClick={startEdit}>
                  Edit
                </button>
              )}
              <button className={adminStyles.dangerButton} onClick={doDelete}>
                Delete
              </button>
            </div>
          </div>

          {assignment.attachment.fileUrl && (
            <p style={{ marginBottom: editing ? 16 : 0 }}>
              <button
                className={adminStyles.smallButton}
                onClick={() =>
                  setViewing({
                    fileName: assignment.attachment.fileName || "attachment",
                    fileUrl: assignment.attachment.fileUrl!,
                    mimeType: assignment.attachment.mimeType || undefined,
                  })
                }
              >
                Open attachment ({assignment.attachment.fileName})
              </button>
            </p>
          )}

          {editing && (
            <form className={adminStyles.form} onSubmit={saveEdit} style={{ marginTop: 16 }}>
              <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
                Title
                <input
                  className={adminStyles.input}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
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
              <div className={adminStyles.formActions}>
                <button className={adminStyles.primaryButton} type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button type="button" className={adminStyles.smallButton} onClick={() => setEditing(false)}>
                  Cancel
                </button>
                {saveError && <p className={adminStyles.messageError}>{saveError}</p>}
              </div>
            </form>
          )}
        </section>

        <section className={adminStyles.section}>
          <div className={adminStyles.sectionHead}>
            <div>
              <h2 className={adminStyles.sectionTitle}>Submitted</h2>
              <p className={adminStyles.sectionSubtitle}>{submissions.length} student(s)</p>
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
                    <th>Submitted</th>
                    <th>File</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s._id}>
                      <td>{typeof s.student === "object" ? s.student.name : s.student}</td>
                      <td>{typeof s.student === "object" ? s.student.email : "—"}</td>
                      <td>{new Date(s.submittedAt).toLocaleString()}</td>
                      <td>
                        <button
                          className={adminStyles.smallButton}
                          onClick={() => setViewing({ fileName: s.fileName, fileUrl: s.fileUrl, mimeType: s.mimeType })}
                        >
                          {formatSize(s.fileSize)}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={adminStyles.section}>
          <div className={adminStyles.sectionHead}>
            <div>
              <h2 className={adminStyles.sectionTitle}>Not submitted</h2>
              <p className={adminStyles.sectionSubtitle}>{notSubmitted.length} student(s)</p>
            </div>
          </div>

          {notSubmitted.length === 0 ? (
            <div className={styles.emptyBlock}>
              <span className={`${styles.emptyIcon} ${styles.emptyIconSuccess}`} aria-hidden="true" />
              <p className={styles.emptyText}>Everyone has submitted.</p>
            </div>
          ) : (
            <div className={`${adminStyles.tableWrap} ${styles.tableHoverWrap}`}>
              <table className={adminStyles.table}>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {notSubmitted.map((s) => (
                    <tr key={s._id}>
                      <td>{s.name}</td>
                      <td>{s.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {viewing && (
        <DocumentViewerModal
          fileName={viewing.fileName}
          fileUrl={viewing.fileUrl}
          mimeType={viewing.mimeType}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
