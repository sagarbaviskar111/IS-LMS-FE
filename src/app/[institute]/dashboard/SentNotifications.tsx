"use client";

import { useEffect, useState, useCallback } from "react";
import { api, SentNotificationSummary, SentNotificationDetail } from "@/lib/api";
import dashboardStyles from "./dashboard.module.css";
import adminStyles from "./admin/admin.module.css";
import Modal from "./Modal";
import Pagination from "./Pagination";

const PAGE_SIZE = 10;

export default function SentNotifications({ refreshKey }: { refreshKey?: number }) {
  const [sent, setSent] = useState<SentNotificationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [detail, setDetail] = useState<SentNotificationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listSentNotifications({ page, limit: PAGE_SIZE });
      setSent(res.sent);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const openDetail = async (sendBatchId: string) => {
    setDetailLoading(true);
    try {
      const res = await api.getSentNotificationDetail(sendBatchId);
      setDetail(res);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <section className={adminStyles.section}>
      <div className={adminStyles.sectionHead}>
        <div>
          <h2 className={adminStyles.sectionTitle}>Sent notifications</h2>
          <p className={adminStyles.sectionSubtitle}>{total} sent · see who&apos;s read each one</p>
        </div>
      </div>

      {!loading && sent.length === 0 && <p className={adminStyles.empty}>You haven&apos;t sent anything yet.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sent.map((s) => (
          <button
            key={s.sendBatchId}
            type="button"
            onClick={() => openDetail(s.sendBatchId)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              cursor: "pointer",
              textAlign: "left",
              font: "inherit",
              color: "inherit",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{s.title}</p>
              <p
                style={{
                  color: "var(--muted)",
                  fontSize: "0.88rem",
                  margin: "4px 0",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {s.message}
              </p>
              <p style={{ color: "var(--muted)", fontSize: "0.75rem", margin: 0 }}>
                {new Date(s.createdAt).toLocaleString()}
              </p>
            </div>
            <span
              className={s.readCount === s.totalRecipients ? adminStyles.badge : adminStyles.badgePending}
              style={{ flexShrink: 0 }}
            >
              {s.readCount}/{s.totalRecipients} read
            </span>
          </button>
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />

      {(detail || detailLoading) && (
        <Modal onClose={() => setDetail(null)}>
          <div className={dashboardStyles.modalHead}>
            <div>
              <h2 className={adminStyles.sectionTitle}>{detailLoading ? "Loading..." : detail?.title}</h2>
              {detail && (
                <p className={adminStyles.sectionSubtitle}>
                  {detail.message} · sent {new Date(detail.createdAt).toLocaleString()}
                </p>
              )}
            </div>
            <button
              className={dashboardStyles.modalCloseButton}
              type="button"
              onClick={() => setDetail(null)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {detail && (
            <div className={adminStyles.tableWrap}>
              <table className={adminStyles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.recipients.map((r) => (
                    <tr key={r.recipient._id}>
                      <td>{r.recipient.name}</td>
                      <td style={{ textTransform: "capitalize" }}>{r.recipient.role}</td>
                      <td>
                        {r.read ? (
                          <span className={adminStyles.badge}>
                            Seen{r.readAt ? ` · ${new Date(r.readAt).toLocaleString()}` : ""}
                          </span>
                        ) : (
                          <span className={adminStyles.badgePending}>Not seen yet</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </section>
  );
}
