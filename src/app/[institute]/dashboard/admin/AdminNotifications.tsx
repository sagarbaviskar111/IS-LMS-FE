"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError, Role, User } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "./admin.module.css";
import NotificationInbox from "../NotificationInbox";

const RECIPIENT_ROLES: { value: Role; label: string }[] = [
  { value: "teacher", label: "Teachers" },
  { value: "telecaller", label: "Telecallers" },
  { value: "student", label: "Students" },
];

export default function AdminNotifications() {
  const [recipientRole, setRecipientRole] = useState<Role>("teacher");
  const [people, setPeople] = useState<User[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [broadcast, setBroadcast] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadPeople = useCallback(async () => {
    const res = await api.listUsers({ role: recipientRole, status: "active", limit: 500 });
    setPeople(res.users);
    setRecipientId("");
    setBroadcast(false);
  }, [recipientRole]);

  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!broadcast && !recipientId) {
      setError("Pick a recipient, or choose to notify everyone in this role");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.sendNotification({
        title,
        message,
        recipientRole,
        broadcast,
        recipientId: broadcast ? undefined : recipientId,
      });
      setSuccess(`Sent to ${res.count} ${res.count === 1 ? "person" : "people"}.`);
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
      <p className={dashboardStyles.pageSubtitle}>Send updates to your teachers, telecallers, or students.</p>

      <div className={styles.grid}>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Send a notification</h2>
            </div>
            <div className={styles.tabs}>
              {RECIPIENT_ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  className={recipientRole === r.value ? styles.tabActive : styles.tab}
                  onClick={() => setRecipientRole(r.value)}
                >
                  {r.label}
                </button>
              ))}
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
                <option value="">Select a person</option>
                <option value="__all__">
                  All {RECIPIENT_ROLES.find((r) => r.value === recipientRole)?.label.toLowerCase()}
                </option>
                {people.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
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
