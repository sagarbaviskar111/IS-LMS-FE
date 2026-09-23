"use client";

import { useEffect, useState, useCallback } from "react";
import { api, Lead, LeadStatus } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import styles from "./TelecallerLeads.module.css";
import TelecallerLeadModal from "./TelecallerLeadModal";
import Pagination from "../Pagination";

const PAGE_SIZE = 10;

// Semantic status colors (design tokens) instead of the generic
// brand/pending badges — makes lead state scannable at a glance.
const STATUS_BADGE: Record<LeadStatus, string> = {
  new: styles.badgeNew,
  contacted: styles.badgeContacted,
  interested: styles.badgeInterested,
  not_interested: styles.badgeNotInterested,
  converted: styles.badgeConverted,
  lost: styles.badgeLost,
};

export default function TelecallerLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.myLeads({ page, limit: PAGE_SIZE });
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

  const activeLead = leads.find((l) => l._id === activeLeadId) || null;

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>My Leads</h1>
      <p className={dashboardStyles.pageSubtitle}>Students assigned to you — log calls and convert them.</p>

      {activeLead && (
        <TelecallerLeadModal
          lead={activeLead}
          onClose={() => setActiveLeadId(null)}
          onChanged={load}
        />
      )}

      <section className={adminStyles.section}>
        {loading && leads.length === 0 && (
          <div className={styles.loadingState}>
            <span className={styles.spinner} aria-hidden="true" />
            Loading your leads…
          </div>
        )}

        {!loading && leads.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon} aria-hidden="true">
              📋
            </span>
            <p className={styles.emptyTitle}>No leads assigned to you yet</p>
            <p className={styles.emptySubtitle}>
              When your admin assigns leads to you, they&apos;ll show up here ready to call.
            </p>
          </div>
        )}

        {leads.length > 0 && (
          <div className={`${adminStyles.tableWrap} table-scroll`}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Calls</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr
                    key={l._id}
                    className={styles.row}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open ${l.name}`}
                    onClick={() => setActiveLeadId(l._id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActiveLeadId(l._id);
                      }
                    }}
                  >
                    <td>{l.name}</td>
                    <td>{l.phone}</td>
                    <td>{l.email || "—"}</td>
                    <td>
                      <span className={STATUS_BADGE[l.status]}>{l.status.replace("_", " ")}</span>
                    </td>
                    <td>{l.callLogs.length}</td>
                    <td>
                      <button
                        className={adminStyles.smallButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveLeadId(l._id);
                        }}
                      >
                        Open
                      </button>
                    </td>
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
