"use client";

import { useEffect, useState } from "react";
import { api, ApiError, StudentAssignment } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import studentStyles from "./student.module.css";
import DocumentViewerModal from "../DocumentViewerModal";
import StudentEmptyState from "./StudentEmptyState";
import StudentLoading from "./StudentLoading";

interface ViewingFile {
  fileName: string;
  fileUrl: string;
  mimeType?: string;
}

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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [viewing, setViewing] = useState<ViewingFile | null>(null);

  const load = () => {
    setLoading(true);
    return api
      .studentListAssignments()
      .then((res) => setAssignments(res.assignments))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (id: string) => {
    const file = files[id];
    if (!file) return;
    setErrors((prev) => ({ ...prev, [id]: "" }));
    setBusy((prev) => ({ ...prev, [id]: true }));
    try {
      await api.studentSubmitAssignment(id, file);
      setFiles((prev) => ({ ...prev, [id]: null }));
      const el = document.getElementById(`assignment-file-${id}`) as HTMLInputElement | null;
      if (el) el.value = "";
      await load();
    } catch (err) {
      setErrors((prev) => ({ ...prev, [id]: err instanceof ApiError ? err.message : "Upload failed" }));
    } finally {
      setBusy((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Assignments</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Upload your work before the due date — submissions close automatically once it passes.
      </p>

      {loading && <StudentLoading />}
      {!loading && assignments.length === 0 && (
        <StudentEmptyState title="No assignments yet" hint="Anything your teacher assigns will appear here." />
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {assignments.map((a) => (
          <section
            key={a._id}
            className={a.locked ? `${adminStyles.section} ${studentStyles.lockedCard}` : adminStyles.section}
          >
            <div className={adminStyles.sectionHead}>
              <div>
                <h2 className={adminStyles.sectionTitle}>{a.title}</h2>
                <p className={adminStyles.sectionSubtitle}>{a.description || "No description"}</p>
              </div>
              {a.submitted ? (
                <span className={studentStyles.badgeSuccess}>Submitted</span>
              ) : a.locked ? (
                <span className={studentStyles.badgeDanger}>Blocked — deadline passed</span>
              ) : (
                <span className={adminStyles.badgePending}>Pending</span>
              )}
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 12 }}>
              Due {formatDueDate(a.dueDate)}
            </p>

            {a.attachment.fileUrl && (
              <p style={{ marginBottom: 12 }}>
                <button
                  className={adminStyles.smallButton}
                  onClick={() =>
                    setViewing({
                      fileName: a.attachment.fileName || "attachment",
                      fileUrl: a.attachment.fileUrl!,
                      mimeType: a.attachment.mimeType || undefined,
                    })
                  }
                >
                  Open attachment ({a.attachment.fileName})
                </button>
              </p>
            )}

            {a.submission && (
              <p style={{ fontSize: "0.85rem", marginBottom: 12 }}>
                You submitted{" "}
                <button
                  className={adminStyles.linkButton}
                  onClick={() =>
                    setViewing({
                      fileName: a.submission!.fileName,
                      fileUrl: a.submission!.fileUrl,
                      mimeType: a.submission!.mimeType,
                    })
                  }
                >
                  {a.submission.fileName}
                </button>{" "}
                ({formatSize(a.submission.fileSize)}) on{" "}
                {new Date(a.submission.submittedAt).toLocaleString()}
              </p>
            )}

            {a.locked ? (
              !a.submitted && (
                <p className={adminStyles.messageError}>
                  The due date has passed — you can no longer submit this assignment.
                </p>
              )
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <input
                  id={`assignment-file-${a._id}`}
                  className={adminStyles.input}
                  type="file"
                  accept={ATTACHMENT_ACCEPT}
                  onChange={(e) => setFiles((prev) => ({ ...prev, [a._id]: e.target.files?.[0] || null }))}
                />
                <button
                  className={adminStyles.primaryButton}
                  disabled={!files[a._id] || busy[a._id]}
                  onClick={() => submit(a._id)}
                >
                  {busy[a._id] ? "Uploading..." : a.submitted ? "Resubmit" : "Submit"}
                </button>
              </div>
            )}
            {errors[a._id] && <p className={adminStyles.messageError}>{errors[a._id]}</p>}
          </section>
        ))}
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
