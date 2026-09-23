"use client";

import { useEffect, useState, useCallback } from "react";
import { api, User } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "./admin.module.css";
import Pagination from "../Pagination";

const PAGE_SIZE = 10;

export default function PendingApprovals() {
  const [pending, setPending] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listUsers({ status: "pending", page, limit: PAGE_SIZE });
      setPending(res.users);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id: string) => {
    await api.updateUser(id, { isActive: true });
    load();
  };

  const reject = async (id: string) => {
    if (!window.confirm("Reject and delete this signup request?")) return;
    await api.deleteUser(id);
    load();
  };

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Pending approvals</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Accounts created via self-signup, waiting on your review.
      </p>

      <div className={styles.section}>
        {!loading && pending.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyStateIcon} aria-hidden="true">✓</span>
            <p className={styles.emptyStateText}>Nothing waiting on you right now.</p>
          </div>
        )}

        {pending.length > 0 && (
          <div className={styles.tableWrap}>
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
                    <td>{p.name}</td>
                    <td>{p.email}</td>
                    <td>{p.phone || "—"}</td>
                    <td>
                      <span className={styles.badgePending}>{p.role}</span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button className={styles.primaryButton} onClick={() => approve(p._id)}>
                          Approve
                        </button>
                        <button className={styles.dangerButton} onClick={() => reject(p._id)}>
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

        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}
