"use client";

import { useEffect, useState, useCallback } from "react";
import { useTeacherBatch } from "@/context/TeacherBatchContext";
import { api, AttendanceSummaryRow } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import styles from "./teacher.module.css";
import BatchSwitcher from "./BatchSwitcher";

function percentageClass(pct: number | null): string {
  if (pct === null) return adminStyles.badge;
  if (pct >= 75) return adminStyles.badge;
  if (pct >= 50) return adminStyles.badgePending;
  return adminStyles.badgeInactive;
}

export default function AttendanceSummary() {
  const { activeBatchId, activeBatch } = useTeacherBatch();
  const [summary, setSummary] = useState<AttendanceSummaryRow[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeBatchId) return;
    setLoading(true);
    try {
      const res = await api.batchAttendanceSummary(activeBatchId);
      setSummary(res.summary);
      setSessionCount(res.sessionCount);
    } finally {
      setLoading(false);
    }
  }, [activeBatchId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Attendance</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Attendance percentage for {activeBatch?.name || "your batch"}.
      </p>

      <BatchSwitcher />

      <div className={dashboardStyles.cardGrid} style={{ marginBottom: 20 }}>
        <div className={dashboardStyles.card}>
          <p className={dashboardStyles.cardLabel}>Sessions Marked</p>
          <p className={dashboardStyles.cardValue}>{loading ? "…" : sessionCount}</p>
        </div>
        <div className={dashboardStyles.card}>
          <p className={dashboardStyles.cardLabel}>Students</p>
          <p className={dashboardStyles.cardValue}>{loading ? "…" : summary.length}</p>
        </div>
      </div>

      <section className={adminStyles.section}>
        <div className={adminStyles.sectionHead}>
          <div>
            <h2 className={adminStyles.sectionTitle}>Per-student attendance</h2>
            <p className={adminStyles.sectionSubtitle}>
              Based on sessions where attendance has been marked.
            </p>
          </div>
        </div>

        {!loading && summary.length === 0 && (
          <div className={styles.emptyBlock}>
            <span className={styles.emptyIcon} aria-hidden="true" />
            <p className={styles.emptyText}>No students in this batch yet.</p>
          </div>
        )}

        {summary.length > 0 && (
          <div className={`${adminStyles.tableWrap} ${styles.tableHoverWrap}`}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Present</th>
                  <th>Total</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr key={row.student}>
                    <td>{row.name}</td>
                    <td>{row.email}</td>
                    <td>{row.present}</td>
                    <td>{row.total}</td>
                    <td>
                      <span className={percentageClass(row.percentage)}>
                        {row.percentage === null ? "No data" : `${row.percentage}%`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
