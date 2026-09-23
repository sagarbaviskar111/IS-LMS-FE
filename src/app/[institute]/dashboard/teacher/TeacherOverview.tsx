"use client";

import { useEffect, useState } from "react";
import { useTeacherBatch } from "@/context/TeacherBatchContext";
import { api, User } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import styles from "./teacher.module.css";
import BatchSwitcher from "./BatchSwitcher";

export default function TeacherOverview() {
  const { activeBatchId, activeBatch } = useTeacherBatch();
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeBatchId) return;
    setLoading(true);
    api
      .batchStudents(activeBatchId)
      .then((res) => setStudents(res.students))
      .finally(() => setLoading(false));
  }, [activeBatchId]);

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Teacher dashboard</h1>
      <p className={dashboardStyles.pageSubtitle}>Your classes and students.</p>

      <BatchSwitcher />

      <div className={dashboardStyles.cardGrid} style={{ marginBottom: 20 }}>
        <div className={dashboardStyles.card}>
          <p className={dashboardStyles.cardLabel}>My Batch</p>
          <p className={dashboardStyles.cardValue}>{activeBatch?.name || "—"}</p>
        </div>
        <div className={dashboardStyles.card}>
          <p className={dashboardStyles.cardLabel}>My Students</p>
          <p className={dashboardStyles.cardValue}>{loading ? "…" : students.length}</p>
        </div>
      </div>

      <section className={adminStyles.section}>
        <div className={adminStyles.sectionHead}>
          <div>
            <h2 className={adminStyles.sectionTitle}>Students in {activeBatch?.name}</h2>
          </div>
        </div>

        {!loading && students.length === 0 && (
          <div className={styles.emptyBlock}>
            <span className={styles.emptyIcon} aria-hidden="true" />
            <p className={styles.emptyText}>No students in this batch yet.</p>
          </div>
        )}

        {students.length > 0 && (
          <div className={`${adminStyles.tableWrap} ${styles.tableHoverWrap}`}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s._id}>
                    <td>{s.name}</td>
                    <td>{s.email}</td>
                    <td>{s.phone || "—"}</td>
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
