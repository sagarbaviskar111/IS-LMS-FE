"use client";

import { useEffect, useState, useCallback } from "react";
import { api, JobEmailLead } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "../admin/admin.module.css";
import Pagination from "../Pagination";

const PAGE_SIZE = 20;

export default function SuperAdminJobEmailLeads() {
  const [leads, setLeads] = useState<JobEmailLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listJobEmailLeads({ page, limit: PAGE_SIZE });
      setLeads(res.leads);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Job Email Contacts</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Every job posting where an institute&apos;s admin pasted an HR email instead of a link —
        company, HR email, and which institute posted it.
      </p>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.sectionTitle}>All email contacts</h2>
            <p className={styles.sectionSubtitle}>{total} total</p>
          </div>
        </div>

        {!loading && leads.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyStateIcon} aria-hidden="true">
              📧
            </span>
            <p className={styles.emptyStateText}>Nothing here yet.</p>
          </div>
        )}

        {leads.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>HR Email</th>
                  <th>Institute</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l._id}>
                    <td>{l.company}</td>
                    <td>{l.email}</td>
                    <td>{l.instituteName}</td>
                    <td>{new Date(l.createdAt).toLocaleDateString()}</td>
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
