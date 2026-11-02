"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError, User } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "../admin/admin.module.css";
import NotificationInbox from "../NotificationInbox";
import SentNotifications from "../SentNotifications";

export default function SuperAdminNotifications() {
  const [admins, setAdmins] = useState<User[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [broadcast, setBroadcast] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadAdmins = useCallback(async () => {
    const res = await api.listUsers({ role: "admin", limit: 500 });
    setAdmins(res.users);
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!broadcast && !recipientId) {
      setError("Pick an admin, or choose to notify all admins");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.sendNotification({
        title,
        message,
        broadcast,
        recipientId: broadcast ? undefined : recipientId,
      });
      setSuccess(`Sent to ${res.count} admin${res.count === 1 ? "" : "s"}.`);
      setTitle("");
      setMessage("");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send notification");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Notifications</h1>
      <p className={dashboardStyles.pageSubtitle}>Send updates to coaching class admins.</p>

      <div className={styles.grid}>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Notify admins</h2>
            </div>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={`${styles.label} ${styles.fullRow}`}>
              <span>
                Recipient<span className={styles.required}>*</span>
              </span>
              <select
                className={styles.select}
                required={!broadcast}
                value={broadcast ? "__all__" : recipientId}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__all__") {
                    setBroadcast(true);
                    setRecipientId("");
                  } else {
                    setBroadcast(false);
                    setRecipientId(v);
                  }
                }}
              >
                <option value="">Select an admin</option>
                <option value="__all__">All admins</option>
                {admins.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={`${styles.label} ${styles.fullRow}`}>
              <span>
                Title<span className={styles.required}>*</span>
              </span>
              <input
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoComplete="off"
                required
              />
            </label>

            <label className={`${styles.label} ${styles.fullRow}`}>
              <span>
                Message<span className={styles.required}>*</span>
              </span>
              <textarea
                className={styles.input}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                required
              />
              <span className={styles.hint}>Admins see this in their notification inbox.</span>
            </label>

            <div className={`${styles.formActions} ${styles.fullRow}`}>
              <button className={styles.primaryButton} type="submit" disabled={submitting}>
                {submitting ? "Sending…" : broadcast ? "Send to all admins" : "Send"}
              </button>
              {error && <p className={styles.messageError}>{error}</p>}
              {success && <p className={styles.messageSuccess}>{success}</p>}
            </div>
          </form>
        </section>

        <SentNotifications refreshKey={refreshKey} />

        <NotificationInbox refreshKey={refreshKey} />
      </div>
    </div>
  );
}
