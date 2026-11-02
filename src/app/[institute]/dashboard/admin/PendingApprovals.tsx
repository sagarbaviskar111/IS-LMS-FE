"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError, User } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "./admin.module.css";
import Pagination from "../Pagination";
import ListToolbar from "./ListToolbar";
import { useDebounced } from "./useDebounced";

export default function PendingApprovals() {
  const [pending, setPending] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const q = useDebounced(search, 300);
  const [sort, setSort] = useState("newest");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listUsers({ status: "pending", page, limit, q, sort });
      setPending(res.users);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page, limit, q, sort]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (p: User) => {
    setError("");
    setBusyId(p._id);
    try {
      await api.updateUser(p._id, { isActive: true });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not approve this request");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (p: User) => {
    if (!window.confirm(`Reject and delete the signup request from ${p.name}?`)) return;
    setError("");
    setBusyId(p._id);
    try {
      await api.deleteUser(p._id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reject this request");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Pending approvals</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Accounts created via self-signup, waiting on your review.
      </p>

      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.sectionTitle}>Signup requests</h2>
            <p className={styles.sectionSubtitle}>Approve to let them log in, or reject to delete the request.</p>
          </div>
        </div>

        {(total > 0 || !!q.trim()) && (
          <ListToolbar
            search={search}
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search by name, email or phone"
            sort={{
              key: "sort",
              label: "Sort by",
              value: sort,
              options: [
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
                { value: "name_asc", label: "Name A–Z" },
                { value: "name_desc", label: "Name Z–A" },
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
            total={total}
          />
        )}

        {error && <p className={styles.messageError} role="alert">{error}</p>}
        {loading && pending.length === 0 && <p className={styles.sectionSubtitle}>Loading…</p>}

        {!loading && pending.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyStateIcon} aria-hidden="true">✓</span>
            <p className={styles.emptyStateText}>
              {q.trim() ? "No requests match your search." : "Nothing waiting on you right now."}
            </p>
          </div>
        )}

        {pending.length > 0 && (
          <div className={`${styles.tableWrap} table-scroll`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => (
                  <tr key={p._id}>
                    <td style={{ overflowWrap: "anywhere" }}>
                      <strong>{p.name}</strong>
                    </td>
                    <td style={{ overflowWrap: "anywhere" }}>{p.email}</td>
                    <td>{p.phone || "—"}</td>
                    <td>
                      <span className={styles.badgePending}>{p.role}</span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button className={styles.primaryButton} type="button" disabled={busyId === p._id} onClick={() => approve(p)}>
                          {busyId === p._id ? "Working…" : "Approve"}
                        </button>
                        <button className={styles.dangerButton} type="button" disabled={busyId === p._id} onClick={() => reject(p)}>
                          Reject
                        </button>
                      </div>
                    </td>
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
      </div>
    </div>
  );
}
