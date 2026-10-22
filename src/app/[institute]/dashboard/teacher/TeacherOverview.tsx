"use client";

import { useEffect, useState } from "react";
import { useTeacherBatch } from "@/context/TeacherBatchContext";
import { api, User } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import styles from "./teacher.module.css";
import BatchSwitcher from "./BatchSwitcher";
import Pagination from "../Pagination";

const PAGE_SIZE = 10;

export default function TeacherOverview() {
  const { activeBatchId, activeBatch } = useTeacherBatch();
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!activeBatchId) return;
    setLoading(true);
    api
      .batchStudents(activeBatchId, { page, limit: PAGE_SIZE })
      .then((res) => {
        setStudents(res.students);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .finally(() => setLoading(false));
  }, [activeBatchId, page]);

  useEffect(() => {
    setPage(1);
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
          <p className={dashboardStyles.cardValue}>{loading ? "…" : total}</p>
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

        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </section>
    </div>
  );
}
