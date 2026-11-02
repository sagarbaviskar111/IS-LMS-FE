"use client";

import { useEffect, useState, useCallback } from "react";
import { api, Lead, LeadFilterState, LeadSourceOption, LeadStatus, LeadSummary } from "@/lib/api";
import { STATUS_LABELS, followUpState, formatFollowUp, telUrl, whatsappUrl } from "@/lib/leadStatus";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import styles from "./TelecallerLeads.module.css";
import TelecallerLeadModal from "./TelecallerLeadModal";
import Pagination from "../Pagination";
import InvalidLeadsBar from "../admin/InvalidLeadsBar";
import LeadFilters,{ EMPTY_LEAD_FILTERS, activeFilterCount } from "../admin/LeadFilters";



// Semantic status colors (design tokens) instead of the generic
// brand/pending badges — makes lead state scannable at a glance.
const STATUS_BADGE: Record<LeadStatus, string> = {
  new: styles.badgeNew,
  contacted: styles.badgeContacted,
  no_answer: styles.badgeContacted,
  call_back_later: styles.badgeNew,
  interested: styles.badgeInterested,
  not_interested: styles.badgeNotInterested,
  wrong_number: styles.badgeNotInterested,
  converted: styles.badgeConverted,
  lost: styles.badgeLost,
};

const lastCall = (l: Lead) => (l.callLogs.length ? l.callLogs[l.callLogs.length - 1].createdAt : null);

function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export default function TelecallerLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<LeadFilterState>(EMPTY_LEAD_FILTERS);
  const [sources, setSources] = useState<LeadSourceOption[]>([]);
  const [summary, setSummary] = useState<LeadSummary | null>(null);
  const [invalidOnly, setInvalidOnly] = useState(false);
  const [invalidCount, setInvalidCount] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allSelected, setAllSelected] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, sourcesRes, summaryRes] = await Promise.all([
        api.myLeads({ page, limit, ...filters, invalid: invalidOnly }),
        api.myLeadSources(),
        api.leadSummary(),
      ]);
      setSummary(summaryRes);
      setSources(sourcesRes.sources);
      setLeads(res.leads);
      setTotalPages(res.totalPages);
      setTotal(res.total);
      setInvalidCount(res.invalidCount);
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters, invalidOnly]);

  useEffect(() => {
    load();
  }, [load]);

  // A selection only makes sense for the page/filters it was made on.
  useEffect(() => {
    setSelected(new Set());
    setAllSelected(false);
  }, [page, limit, filters, invalidOnly]);

  // Quick-filter chips: one tap to "who do I call now?".
  const chips: { label: string; count: number | null; patch: Partial<LeadFilterState>; alert?: boolean }[] = [
    { label: "All", count: summary?.total ?? null, patch: {} },
    { label: "Overdue", count: summary?.overdue ?? null, patch: { followUp: "overdue" }, alert: true },
    { label: "Due today", count: summary?.today ?? null, patch: { followUp: "today" } },
    { label: "New", count: summary?.byStatus.new ?? null, patch: { status: "new" } },
    { label: "No answer", count: summary?.byStatus.no_answer ?? null, patch: { status: "no_answer" } },
    { label: "Call back later", count: summary?.byStatus.call_back_later ?? null, patch: { status: "call_back_later" } },
    { label: "Interested", count: summary?.byStatus.interested ?? null, patch: { status: "interested" } },
  ];
  const chipActive = (patch: Partial<LeadFilterState>) =>
    !invalidOnly &&
    (Object.keys(patch).length === 0
      ? !filters.status && !filters.followUp
      : (patch.status ?? "") === filters.status && (patch.followUp ?? "") === filters.followUp);
  const applyChip = (patch: Partial<LeadFilterState>) => {
    setInvalidOnly(false);
    setPage(1);
    setFilters({ ...filters, status: "", followUp: "", ...patch });
  };

  const toggleInvalidMode = () => {
    setPage(1);
    setInvalidOnly((v) => !v);
  };
  const toggleRow = (id: string) => {
    setAllSelected(false);
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              className={chipActive(c.patch) ? adminStyles.primaryButton : adminStyles.smallButton}
              style={c.alert && (c.count ?? 0) > 0 && !chipActive(c.patch) ? { borderColor: "var(--danger)", color: "var(--danger)" } : undefined}
              onClick={() => applyChip(c.patch)}
            >
              {c.label}
              {c.count !== null ? ` (${c.count})` : ""}
            </button>
          ))}
        </div>

        <LeadFilters
          value={filters}
          onChange={(next) => {
            setPage(1);
            setFilters(next);
          }}
          sources={sources}
          total={total}
        />

        <InvalidLeadsBar
          invalidCount={invalidCount}
          active={invalidOnly}
          onToggle={toggleInvalidMode}
          pageIds={leads.map((l) => l._id)}
          selected={selected}
          setSelected={setSelected}
          allSelected={allSelected}
          setAllSelected={setAllSelected}
          remove={api.deleteMyInvalidLeads}
          onDeleted={() => {
            setPage(1);
            load();
          }}
        />

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
            <p className={styles.emptyTitle}>
              {invalidOnly
                ? "No invalid leads"
                : activeFilterCount(filters) > 0
                ? "No leads match these filters"
                : "No leads assigned to you yet"}
            </p>
            <p className={styles.emptySubtitle}>
              {activeFilterCount(filters) > 0
                ? "Try clearing a filter or two."
                : "When your admin assigns leads to you, they'll show up here ready to call."}
            </p>
          </div>
        )}

        {leads.length > 0 && (
          <div className={`${adminStyles.tableWrap} table-scroll`}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  {invalidOnly && <th style={{ width: 36 }}></th>}
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Follow-up</th>
                  <th>Last call</th>
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
                    {invalidOnly && (
                      <td onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${l.name}`}
                          checked={allSelected || selected.has(l._id)}
                          onChange={() => toggleRow(l._id)}
                        />
                      </td>
                    )}
                    <td style={{ maxWidth: 200, overflowWrap: "anywhere" }}>{l.name}</td>
                    <td>{l.phone}</td>
                    <td style={{ maxWidth: 220, overflowWrap: "anywhere" }}>{l.email || "—"}</td>
                    <td>
                      <span className={STATUS_BADGE[l.status]}>{STATUS_LABELS[l.status]}</span>
                    </td>
                    <td>
                      {l.followUpAt && followUpState(l) ? (
                        <span style={followUpState(l) === "overdue" ? { color: "var(--danger)", fontWeight: 600 } : undefined}>
                          {formatFollowUp(l.followUpAt)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {lastCall(l) ? (
                        <span title={`${l.callLogs.length} call${l.callLogs.length === 1 ? "" : "s"}`}>{ago(lastCall(l)!)}</span>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>Never</span>
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <div className={adminStyles.rowActions} style={{ flexWrap: "nowrap" }}>
                        <a className={adminStyles.smallButton} href={telUrl(l.phone)} title="Call" aria-label={`Call ${l.name}`}>
                          📞
                        </a>
                        <a
                          className={adminStyles.smallButton}
                          href={whatsappUrl(l.phone, "")}
                          target="_blank"
                          rel="noreferrer"
                          title="WhatsApp"
                          aria-label={`WhatsApp ${l.name}`}
                        >
                          💬
                        </a>
                        <button className={adminStyles.smallButton} onClick={() => setActiveLeadId(l._id)}>
                          Open
                        </button>
                      </div>
                    </td>
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
