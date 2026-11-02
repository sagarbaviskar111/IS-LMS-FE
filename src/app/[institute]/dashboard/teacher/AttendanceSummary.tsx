"use client";

import { useEffect, useState, useCallback } from "react";
import { useTeacherBatch } from "@/context/TeacherBatchContext";
import { api, AttendanceSummaryRow } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import styles from "./teacher.module.css";
import BatchSwitcher from "./BatchSwitcher";
import Pagination from "../Pagination";
import ListToolbar from "../admin/ListToolbar";

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
  const [q, setQ] = useState("");
  const [band, setBand] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

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

  useEffect(() => setPage(1), [q, band, sortBy, limit, activeBatchId]);

  useEffect(() => {
    load();
  }, [load]);

  const needle = q.trim().toLowerCase();
  const rows = summary
    .filter((r) => {
      if (needle && !`${r.name} ${r.email}`.toLowerCase().includes(needle)) return false;
      if (band === "nodata") return r.percentage === null;
      if (band === "low") return r.percentage !== null && r.percentage < 50;
      if (band === "mid") return r.percentage !== null && r.percentage >= 50 && r.percentage < 75;
      if (band === "good") return r.percentage !== null && r.percentage >= 75;
      return true;
    })
    .sort((a, b) => (sortBy === "pct_asc" ? (a.percentage ?? -1) - (b.percentage ?? -1) : sortBy === "pct_desc" ? (b.percentage ?? -1) - (a.percentage ?? -1) : a.name.localeCompare(b.name)));
  const totalPages = Math.max(1, Math.ceil(rows.length / limit));
  const pageRows = rows.slice((page - 1) * limit, page * limit);

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

        <ListToolbar
          search={q}
          onSearch={setQ}
          placeholder="Search by name or email"
          total={rows.length}
          filters={[{ key: "band", label: "Attendance", value: band, onChange: setBand, options: [{ value: "all", label: "All students" }, { value: "good", label: "75% and above" }, { value: "mid", label: "50-74%" }, { value: "low", label: "Below 50%" }, { value: "nodata", label: "No data" }] }]}
          sort={{ key: "sort", label: "Sort by", value: sortBy, onChange: setSortBy, options: [{ value: "name", label: "Name (A-Z)" }, { value: "pct_asc", label: "Lowest attendance first" }, { value: "pct_desc", label: "Highest attendance first" }] }}
          onClear={() => { setQ(""); setBand("all"); setSortBy("name"); }}
        />
        {loading && <p className={adminStyles.empty} role="status">Loading attendance…</p>}
        {!loading && rows.length === 0 && (
          <div className={styles.emptyBlock}>
            <span className={styles.emptyIcon} aria-hidden="true" />
            <p className={styles.emptyText}>{summary.length ? "No students match your search or filters." : "No students in this batch yet."}</p>
          </div>
        )}

        {rows.length > 0 && (
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
                {pageRows.map((row) => (
                  <tr key={row.student}>
                    <td style={{ overflowWrap: "anywhere" }}>{row.name}</td>
                    <td style={{ overflowWrap: "anywhere" }}>{row.email}</td>
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
        <Pagination page={page} totalPages={totalPages} total={rows.length} onPageChange={setPage} limit={limit} onLimitChange={setLimit} limitOptions={[15, 25, 50, 100]} />
      </section>
    </div>
  );
}
