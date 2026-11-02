"use client";

import { useEffect, useState } from "react";
import { useTeacherBatch } from "@/context/TeacherBatchContext";
import { api, User } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import styles from "./teacher.module.css";
import BatchSwitcher from "./BatchSwitcher";
import Pagination from "../Pagination";
import ListToolbar from "../admin/ListToolbar";
import { useDebounced } from "../admin/useDebounced";



export default function TeacherOverview() {
  const { activeBatchId, activeBatch } = useTeacherBatch();
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 300);
  const [sortBy, setSortBy] = useState("name");
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!activeBatchId) return;
    setLoading(true);
    api
      .batchStudents(activeBatchId, { page, limit, q: dq, sort: sortBy })
      .then((res) => {
        setStudents(res.students);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .finally(() => setLoading(false));
  }, [activeBatchId, page, limit, dq, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [activeBatchId, dq, sortBy]);

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

        <ListToolbar
          search={q}
          onSearch={setQ}
          placeholder="Search by name, email or phone"
          total={total}
          sort={{ key: "sort", label: "Sort by", value: sortBy, onChange: setSortBy, options: [{ value: "name", label: "Name (A-Z)" }, { value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }] }}
          onClear={() => { setQ(""); setSortBy("name"); }}
        />
        {loading && students.length === 0 && <p className={adminStyles.empty} role="status">Loading students…</p>}
        {!loading && students.length === 0 && (
          <div className={styles.emptyBlock}>
            <span className={styles.emptyIcon} aria-hidden="true" />
            <p className={styles.emptyText}>{q ? "No students match your search." : "No students in this batch yet."}</p>
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
                    <td style={{ overflowWrap: "anywhere" }}>{s.name}</td>
                    <td style={{ overflowWrap: "anywhere" }}>{s.email}</td>
                    <td>{s.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} limit={limit} onLimitChange={(n) => { setPage(1); setLimit(n); }} />
      </section>
    </div>
  );
}
