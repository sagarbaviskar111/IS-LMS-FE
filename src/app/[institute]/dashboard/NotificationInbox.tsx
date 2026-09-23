"use client";

import { useEffect, useState, useCallback } from "react";
import { api, Notification } from "@/lib/api";
import adminStyles from "./admin/admin.module.css";
import Pagination from "./Pagination";

const PAGE_SIZE = 10;

function senderLabel(n: Notification): string {
  const name = typeof n.sender === "object" ? n.sender.name : "Someone";
  return `${name} (${n.senderRole})`;
}

export default function NotificationInbox({ refreshKey }: { refreshKey?: number }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listNotifications({ page, limit: PAGE_SIZE });
      setNotifications(res.notifications);
      setTotalPages(res.totalPages);
      setTotal(res.total);
      setUnreadCount(res.unreadCount);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const markRead = async (id: string) => {
    await api.markNotificationRead(id);
    load();
  };

  const markAllRead = async () => {
    await api.markAllNotificationsRead();
    load();
  };

  return (
    <section className={adminStyles.section}>
      <div className={adminStyles.sectionHead}>
        <div>
          <h2 className={adminStyles.sectionTitle}>Notifications</h2>
          <p className={adminStyles.sectionSubtitle}>
            {total} total{unreadCount > 0 ? ` · ${unreadCount} unread` : ""}
          </p>
        </div>
        {unreadCount > 0 && (
          <button className={adminStyles.smallButton} type="button" onClick={markAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      {!loading && notifications.length === 0 && (
        <p className={adminStyles.empty}>Nothing here yet.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {notifications.map((n) => (
          <div
            key={n._id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              padding: "12px 14px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: n.read ? "var(--surface)" : "var(--brand-soft)",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: n.read ? 500 : 700, color: "var(--foreground)", margin: 0 }}>
                {n.title}
              </p>
              <p style={{ color: "var(--muted)", fontSize: "0.88rem", margin: "4px 0" }}>{n.message}</p>
              <p style={{ color: "var(--muted)", fontSize: "0.75rem", margin: 0 }}>
                From {senderLabel(n)} · {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
            {!n.read && (
              <button
                className={adminStyles.smallButton}
                style={{ flexShrink: 0, height: "fit-content" }}
                onClick={() => markRead(n._id)}
              >
                Mark read
              </button>
            )}
          </div>
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </section>
  );
}
