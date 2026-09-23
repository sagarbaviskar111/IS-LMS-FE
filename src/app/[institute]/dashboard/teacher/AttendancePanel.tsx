"use client";

import { useEffect, useState } from "react";
import { api, ApiError, AttendanceRecord, AttendanceStatus, Session } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import styles from "./teacher.module.css";
import Modal from "../Modal";

export default function AttendancePanel({
  session,
  onClose,
  onSaved,
}: {
  session: Session;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [markedAt, setMarkedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .getSessionAttendance(session._id)
      .then((res) => {
        setRecords(res.records.map((r) => ({ ...r, status: r.status || "absent" })));
        setMarkedAt(res.markedAt);
      })
      .finally(() => setLoading(false));
  }, [session._id]);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setRecords((prev) => prev.map((r) => (r.student === studentId ? { ...r, status } : r)));
  };

  const markAll = (status: AttendanceStatus) => {
    setRecords((prev) => prev.map((r) => ({ ...r, status })));
  };

  const save = async () => {
    setError("");
    setSaving(true);
    try {
      await api.markSessionAttendance(
        session._id,
        records.map((r) => ({ student: r.student, status: r.status as AttendanceStatus }))
      );
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save attendance");
    } finally {
      setSaving(false);
    }
  };

  const presentCount = records.filter((r) => r.status === "present").length;

  return (
    <Modal onClose={onClose}>
      <div className={dashboardStyles.modalHead}>
        <div>
          <h2 className={adminStyles.sectionTitle}>
            Attendance — {session.topic} ({session.date.slice(0, 10)})
          </h2>
          <p className={adminStyles.sectionSubtitle}>
            {presentCount} of {records.length} present
            {markedAt && ` · previously marked ${new Date(markedAt).toLocaleString()} — editing existing entries`}
            {!markedAt && !loading && " · not marked yet"}
          </p>
        </div>
        <button className={dashboardStyles.modalCloseButton} type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <div className={adminStyles.rowActions} style={{ marginBottom: 16 }}>
        <button className={adminStyles.smallButton} type="button" onClick={() => markAll("present")}>
          Mark all present
        </button>
        <button className={adminStyles.smallButton} type="button" onClick={() => markAll("absent")}>
          Mark all absent
        </button>
      </div>

      {loading && (
        <div className={styles.loadingRow}>
          <span className={styles.spinner} aria-hidden="true" />
          <span>Loading attendance…</span>
        </div>
      )}

      {!loading && records.length === 0 && (
        <div className={styles.emptyBlock}>
          <span className={styles.emptyIcon} aria-hidden="true" />
          <p className={styles.emptyText}>No students in this batch yet.</p>
        </div>
      )}

      {!loading && records.length > 0 && (
        <div className={`${adminStyles.tableWrap} ${styles.tableHoverWrap}`}>
          <table className={adminStyles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.student}>
                  <td>{r.name}</td>
                  <td>{r.email}</td>
                  <td>
                    <div className={adminStyles.rowActions}>
                      <button
                        type="button"
                        className={adminStyles.smallButton}
                        style={
                          r.status === "present"
                            ? { background: "var(--success-soft)", borderColor: "var(--success)", color: "var(--success)" }
                            : undefined
                        }
                        onClick={() => setStatus(r.student, "present")}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        className={adminStyles.smallButton}
                        style={
                          r.status === "absent"
                            ? { background: "var(--danger-soft)", borderColor: "var(--danger)", color: "var(--danger)" }
                            : undefined
                        }
                        onClick={() => setStatus(r.student, "absent")}
                      >
                        Absent
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={adminStyles.formActions} style={{ marginTop: 16 }}>
        <button className={adminStyles.primaryButton} type="button" onClick={save} disabled={saving || loading}>
          {saving ? "Saving..." : "Save attendance"}
        </button>
        <button className={adminStyles.smallButton} type="button" onClick={onClose}>
          Cancel
        </button>
        {error && <p className={adminStyles.messageError}>{error}</p>}
      </div>
    </Modal>
  );
}
