"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import ListToolbar from "./ListToolbar";
import Pagination from "../Pagination";
import { useParams } from "next/navigation";
import { api, ApiError, InquiryForm } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "./admin.module.css";
import b from "./inquiry.module.css";

// role="telecaller" is the view-only version for callers: they can copy the
// link and read responses (and add people to leads), but not build or change forms.
export default function AdminInquiryForms({ role = "admin" }: { role?: "admin" | "telecaller" }) {
  const { institute } = useParams<{ institute: string }>();
  const base = `/${institute}/dashboard/${role}/inquiry-forms`;
  const readOnly = role === "telecaller";

  const [forms, setForms] = useState<InquiryForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = forms.filter(
      (f) =>
        (!q || f.subject.toLowerCase().includes(q)) &&
        (statusFilter === "all" || (statusFilter === "open") === f.isActive)
    );
    list.sort((a, b2) => {
      if (sort === "oldest") return +new Date(a.createdAt) - +new Date(b2.createdAt);
      if (sort === "responses") return b2.responseCount - a.responseCount;
      if (sort === "subject") return a.subject.localeCompare(b2.subject);
      return +new Date(b2.createdAt) - +new Date(a.createdAt);
    });
    return list;
  }, [forms, search, statusFilter, sort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const curPage = Math.min(page, totalPages);
  const visible = filtered.slice((curPage - 1) * limit, curPage * limit);

  const load = useCallback(async () => {
    try {
      const res = await api.listInquiryForms();
      setForms(res.forms);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load forms");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fullUrl = (f: InquiryForm) => `${window.location.origin}${f.path}`;

  const copy = async (f: InquiryForm) => {
    try {
      await navigator.clipboard.writeText(fullUrl(f));
      setCopiedId(f._id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      window.prompt("Copy this link", fullUrl(f));
    }
  };

  const toggle = async (f: InquiryForm) => {
    setError("");
    try {
      await api.updateInquiryForm(f._id, { isActive: !f.isActive });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the form");
    }
  };

  const remove = async (f: InquiryForm) => {
    if (!window.confirm(`Delete "${f.subject}" and all ${f.responseCount} of its responses? This can't be undone.`)) return;
    setError("");
    try {
      await api.deleteInquiryForm(f._id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the form");
    }
  };

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Inquiry forms</h1>
      <p className={dashboardStyles.pageSubtitle}>
        {readOnly
          ? "Read the responses students have sent and add the right people to your leads."
          : "Build a form, share its link with students, and see every response in one place."}
      </p>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.sectionTitle}>Your forms</h2>
            <p className={styles.sectionSubtitle}>{forms.length} total</p>
          </div>
          {!readOnly && (
            <Link href={`${base}/new`} className={styles.primaryButton}>
              + Create inquiry form
            </Link>
          )}
        </div>

        {error && <p className={styles.messageError}>{error}</p>}
        {loading && <p className={styles.empty}>Loading forms…</p>}

        {forms.length > 0 && (
          <ListToolbar
            search={search}
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search forms by subject…"
            filters={[
              {
                key: "status",
                label: "Status",
                value: statusFilter,
                options: [
                  { value: "all", label: "All statuses" },
                  { value: "open", label: "Accepting responses" },
                  { value: "closed", label: "Closed" },
                ],
                onChange: (v) => {
                  setStatusFilter(v);
                  setPage(1);
                },
              },
            ]}
            sort={{
              key: "sort",
              label: "Sort by",
              value: sort,
              options: [
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
                { value: "responses", label: "Most responses" },
                { value: "subject", label: "Subject A–Z" },
              ],
              onChange: (v) => {
                setSort(v);
                setPage(1);
              },
            }}
            onClear={() => {
              setSearch("");
              setStatusFilter("all");
              setSort("newest");
              setPage(1);
            }}
            total={filtered.length}
          />
        )}

        {forms.length > 0 && filtered.length === 0 && (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateText}>No forms match your search.</p>
          </div>
        )}

        {!loading && forms.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyStateIcon} aria-hidden="true">📝</span>
            <p className={styles.emptyStateText}>
              {readOnly ? "No inquiry forms yet." : "No forms yet — create your first inquiry form."}
            </p>
          </div>
        )}

        {visible.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Responses</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Link</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((f) => (
                  <tr key={f._id}>
                    <td style={{ overflowWrap: "anywhere", minWidth: 160 }}>{f.subject}</td>
                    <td>{f.responseCount}</td>
                    <td>
                      <span className={f.isActive ? styles.badgeSuccess : styles.badgeInactive}>
                        {f.isActive ? "Accepting" : "Closed"}
                      </span>
                    </td>
                    <td>{new Date(f.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className={b.linkRow}>
                        <button className={styles.smallButton} onClick={() => copy(f)}>
                          {copiedId === f._id ? "Copied!" : "Copy link"}
                        </button>
                        <a className={styles.smallButton} href={f.path} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      </div>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <Link
                          href={readOnly ? `${base}/${f._id}` : `${base}/${f._id}/responses`}
                          className={styles.primaryButton}
                        >
                          Responses
                        </Link>
                        {!readOnly && (
                          <>
                            <Link href={`${base}/${f._id}`} className={styles.smallButton}>
                              Edit
                            </Link>
                            <button className={styles.smallButton} onClick={() => toggle(f)}>
                              {f.isActive ? "Close" : "Reopen"}
                            </button>
                            <button className={styles.dangerButton} onClick={() => remove(f)}>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={curPage}
          totalPages={totalPages}
          total={filtered.length}
          onPageChange={setPage}
          limit={limit}
          onLimitChange={(n) => {
            setPage(1);
            setLimit(n);
          }}
        />
      </section>
    </div>
  );
}
