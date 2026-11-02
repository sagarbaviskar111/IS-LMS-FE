"use client";

import { useEffect, useState, useCallback } from "react";
import { api, JobEmailLead } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "../admin/admin.module.css";
import Pagination from "../Pagination";
import ListToolbar from "../admin/ListToolbar";
import { useDebounced } from "../admin/useDebounced";

export default function SuperAdminJobEmailLeads() {
  const [leads, setLeads] = useState<JobEmailLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const q = useDebounced(search);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.listJobEmailLeads({ page, limit, q, sort });
      setLeads(res.leads);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch {
      setError("Could not load email contacts. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, q, sort]);

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

        <ListToolbar
          search={search}
          onSearch={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search company, email or institute"
          total={total}
          sort={{
            key: "sort",
            label: "Sort by",
            value: sort,
            options: [
              { value: "newest", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
              { value: "company_asc", label: "Company A–Z" },
              { value: "institute_asc", label: "Institute A–Z" },
            ],
            onChange: (v) => {
              setSort(v);
              setPage(1);
            },
          }}
          onClear={() => {
            setSearch("");
            setSort("newest");
            setPage(1);
          }}
        />

        {error && <p className={styles.messageError}>{error}</p>}
        {loading && leads.length === 0 && <p className={styles.empty}>Loading email contacts…</p>}

        {!loading && !error && leads.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyStateIcon} aria-hidden="true">
              📧
            </span>
            <p className={styles.emptyStateText}>
              {q ? "No contacts match your search." : "Nothing here yet."}
            </p>
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
                    <td style={{ overflowWrap: "anywhere" }}>{l.company}</td>
                    <td style={{ overflowWrap: "anywhere" }}>
                      <a href={`mailto:${l.email}`}>{l.email}</a>
                    </td>
                    <td style={{ overflowWrap: "anywhere" }}>{l.instituteName}</td>
                    <td>{new Date(l.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          limit={limit}
          onLimitChange={(n) => {
            setLimit(n);
            setPage(1);
          }}
        />
      </section>
    </div>
  );
}
