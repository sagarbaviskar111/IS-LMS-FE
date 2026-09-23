"use client";

import { useEffect, useState, useCallback } from "react";
import { useTeacherBatch } from "@/context/TeacherBatchContext";
import { api, ApiError, User } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "../admin/admin.module.css";
import NotificationInbox from "../NotificationInbox";
import BatchSwitcher from "./BatchSwitcher";

export default function TeacherNotifications() {
  const { activeBatchId, activeBatch } = useTeacherBatch();
  const [students, setStudents] = useState<User[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [broadcast, setBroadcast] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadStudents = useCallback(async () => {
    if (!activeBatchId) return;
    const res = await api.batchStudents(activeBatchId);
    setStudents(res.students);
    setRecipientId("");
    setBroadcast(false);
  }, [activeBatchId]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!activeBatchId) return;
    if (!broadcast && !recipientId) {
      setError("Pick a student, or choose to notify the whole batch");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.sendNotification({
        title,
        message,
        batchId: activeBatchId,
        broadcast,
        recipientId: broadcast ? undefined : recipientId,
      });
      setSuccess(`Sent to ${res.count} student${res.count === 1 ? "" : "s"}.`);
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
      <p className={dashboardStyles.pageSubtitle}>
        Send updates to students in {activeBatch?.name || "your batch"}.
      </p>

      <BatchSwitcher />

      <div className={styles.grid}>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Notify students</h2>
            </div>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
              Recipient
              <select
                className={styles.select}
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
                <option value="">Select a student</option>
                <option value="__all__">Everyone in this batch</option>
                {students.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
              Title
              <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>

            <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
              Message
              <input
                className={styles.input}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </label>

            <div className={styles.formActions}>
              <button className={styles.primaryButton} type="submit" disabled={submitting}>
                {submitting ? "Sending..." : "Send"}
              </button>
              {error && <p className={styles.messageError}>{error}</p>}
              {success && <p className={styles.messageSuccess}>{success}</p>}
            </div>
          </form>
        </section>

        <NotificationInbox refreshKey={refreshKey} />
      </div>
    </div>
  );
}
