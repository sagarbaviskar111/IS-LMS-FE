"use client";

import { useState } from "react";
import { api, ApiError, User } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "./admin.module.css";
import Modal from "../Modal";

export default function ResetPasswordModal({
  user,
  onClose,
  onChanged,
}: {
  user: User;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);
    try {
      await api.updateUser(user._id, { password });
      setSuccess("Password updated — share it with them directly.");
      setPassword("");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className={dashboardStyles.modalHead}>
        <div>
          <h2 className={adminStyles.sectionTitle}>{user.name}</h2>
          <p className={adminStyles.sectionSubtitle}>{user.email}</p>
        </div>
        <button className={dashboardStyles.modalCloseButton} type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <section className={adminStyles.section} style={{ marginTop: 16 }}>
        <h3 className={adminStyles.sectionTitle} style={{ fontSize: "0.95rem" }}>
          Set a new password
        </h3>
        <p className={adminStyles.sectionSubtitle}>
          Use this when they&apos;ve asked you for a password reset directly. It takes effect
          immediately — nothing is emailed automatically, so share it with them yourself.
        </p>
        <form className={adminStyles.form} onSubmit={submit}>
          <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
            New password
            <input
              className={adminStyles.input}
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              placeholder="At least 6 characters"
              required
            />
          </label>
          <div className={adminStyles.formActions}>
            <button className={adminStyles.primaryButton} type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Set password"}
            </button>
            {error && <p className={adminStyles.messageError}>{error}</p>}
            {success && <p className={adminStyles.messageSuccess}>{success}</p>}
          </div>
        </form>
      </section>
    </Modal>
  );
}
