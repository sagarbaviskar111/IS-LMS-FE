"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError, Lead, LeadStatus, User } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "./admin.module.css";
import AdminLeadModal from "./AdminLeadModal";
import Pagination from "../Pagination";

const PAGE_SIZE = 10;

const STATUS_BADGE: Record<LeadStatus, string> = {
  new: styles.badgePending,
  contacted: styles.badgePending,
  interested: styles.badgeSuccess,
  not_interested: styles.badgeInactive,
  converted: styles.badgeSuccess,
  lost: styles.badgeInactive,
};

function who(ref: { name: string } | string | null | undefined): string {
  if (!ref) return "Unassigned";
  return typeof ref === "object" ? ref.name : ref;
}

function convertedByLabel(lead: Lead): string {
  if (!lead.convertedStudent) return "—";
  if (!lead.convertedBy) return "Self-registered";
  return typeof lead.convertedBy === "object" ? lead.convertedBy.name : lead.convertedBy;
}

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [telecallers, setTelecallers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsRes, telecallersRes] = await Promise.all([
        api.listLeads({ page, limit: PAGE_SIZE }),
        // Full list for the reassign dropdown/create form — not the browsable page.
        api.listUsers({ role: "telecaller", status: "team", limit: 500 }),
      ]);
      setLeads(leadsRes.leads);
      setTotalPages(leadsRes.totalPages);
      setTotal(leadsRes.total);
      setTelecallers(telecallersRes.users);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      await api.createLead(form);
      setForm({ name: "", phone: "", email: "", notes: "" });
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not create lead");
    } finally {
      setSubmitting(false);
    }
  };

  const activeLead = leads.find((l) => l._id === activeLeadId) || null;

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Leads</h1>
      <p className={dashboardStyles.pageSubtitle}>
        New leads are auto-assigned to whichever telecaller has the fewest leads right now.
      </p>

      {activeLead && (
        <AdminLeadModal
          lead={activeLead}
          telecallers={telecallers}
          onClose={() => setActiveLeadId(null)}
          onChanged={load}
        />
      )}

      <div className={styles.grid}>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Add a lead</h2>
              {telecallers.length === 0 && (
                <p className={styles.sectionSubtitle} style={{ color: "var(--danger)" }}>
                  You have no telecallers yet — add one first, leads need someone to assign to.
                </p>
              )}
            </div>
          </div>

          <form className={styles.form} onSubmit={handleCreate}>
            <label className={styles.label}>
              Name
              <input
                className={styles.input}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label className={styles.label}>
              Phone
              <input
                className={styles.input}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </label>
            <label className={styles.label}>
              Email
              <input
                className={styles.input}
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="optional"
              />
            </label>
            <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
              Notes
              <input
                className={styles.input}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="optional — how they found us, what they're interested in, etc."
              />
            </label>
            <div className={styles.formActions}>
              <button className={styles.primaryButton} type="submit" disabled={submitting || telecallers.length === 0}>
                {submitting ? "Adding..." : "Add lead"}
              </button>
              {formError && <p className={styles.messageError}>{formError}</p>}
            </div>
          </form>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>All leads</h2>
              <p className={styles.sectionSubtitle}>{total} total</p>
            </div>
          </div>

          {!loading && leads.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyStateIcon} aria-hidden="true">📇</span>
              <p className={styles.emptyStateText}>No leads yet — add one using the form above.</p>
            </div>
          )}

          {leads.length > 0 && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Telecaller</th>
                    <th>Calls</th>
                    <th>Converted by</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l._id}>
                      <td>{l.name}</td>
                      <td>{l.phone}</td>
                      <td>
                        {l.source === "webhook" ? (
                          <span className={styles.badgePending}>{l.sourceLabel || "Integration"}</span>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>Manual</span>
                        )}
                      </td>
                      <td>
                        <span className={STATUS_BADGE[l.status]}>{l.status.replace("_", " ")}</span>
                      </td>
                      <td>{who(l.assignedTelecaller)}</td>
                      <td>{l.callLogs.length}</td>
                      <td>{convertedByLabel(l)}</td>
                      <td>
                        <button className={styles.smallButton} onClick={() => setActiveLeadId(l._id)}>
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
    </div>
  );
}
