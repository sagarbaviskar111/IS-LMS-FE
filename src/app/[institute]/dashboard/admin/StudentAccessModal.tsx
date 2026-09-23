"use client";

import { useState } from "react";
import { api, ApiError, User } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "./admin.module.css";
import Modal from "../Modal";

const toDateInputValue = (value?: string | null) => (value ? value.slice(0, 10) : "");

export default function StudentAccessModal({
  student,
  onClose,
  onChanged,
}: {
  student: User;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [current, setCurrent] = useState(student);

  const [message, setMessage] = useState(current.deactivationMessage || "");
  const [loginError, setLoginError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const [blockFrom, setBlockFrom] = useState(toDateInputValue(current.recordingBlockFrom));
  const [blockTo, setBlockTo] = useState(toDateInputValue(current.recordingBlockTo));
  const [blockError, setBlockError] = useState("");
  const [blockSuccess, setBlockSuccess] = useState("");
  const [blockSubmitting, setBlockSubmitting] = useState(false);

  const applyUser = (u: User) => {
    setCurrent(u);
    setMessage(u.deactivationMessage || "");
    setBlockFrom(toDateInputValue(u.recordingBlockFrom));
    setBlockTo(toDateInputValue(u.recordingBlockTo));
  };

  const submitDeactivate = async () => {
    setLoginError("");
    setLoginSuccess("");
    setLoginSubmitting(true);
    try {
      const { user } = await api.updateUser(current._id, {
        isActive: false,
        deactivationMessage: message.trim() || null,
      });
      applyUser(user);
      setLoginSuccess("Login deactivated.");
      onChanged();
    } catch (err) {
      setLoginError(err instanceof ApiError ? err.message : "Could not deactivate account");
    } finally {
      setLoginSubmitting(false);
    }
  };

  const submitActivate = async () => {
    setLoginError("");
    setLoginSuccess("");
    setLoginSubmitting(true);
    try {
      const { user } = await api.updateUser(current._id, { isActive: true });
      applyUser(user);
      setLoginSuccess("Login activated.");
      onChanged();
    } catch (err) {
      setLoginError(err instanceof ApiError ? err.message : "Could not activate account");
    } finally {
      setLoginSubmitting(false);
    }
  };

  const submitSaveMessage = async () => {
    setLoginError("");
    setLoginSuccess("");
    setLoginSubmitting(true);
    try {
      const { user } = await api.updateUser(current._id, { deactivationMessage: message.trim() || null });
      applyUser(user);
      setLoginSuccess("Message saved.");
      onChanged();
    } catch (err) {
      setLoginError(err instanceof ApiError ? err.message : "Could not save message");
    } finally {
      setLoginSubmitting(false);
    }
  };

  const submitBlock = async () => {
    setBlockError("");
    setBlockSuccess("");
    if (!blockFrom) {
      setBlockError("Pick a start date");
      return;
    }
    setBlockSubmitting(true);
    try {
      const { user } = await api.updateUser(current._id, {
        recordingBlockFrom: new Date(blockFrom).toISOString(),
        recordingBlockTo: blockTo ? new Date(blockTo).toISOString() : null,
      });
      applyUser(user);
      setBlockSuccess("Recording access blocked.");
      onChanged();
    } catch (err) {
      setBlockError(err instanceof ApiError ? err.message : "Could not block recording access");
    } finally {
      setBlockSubmitting(false);
    }
  };

  const submitUnblock = async () => {
    setBlockError("");
    setBlockSuccess("");
    setBlockSubmitting(true);
    try {
      const { user } = await api.updateUser(current._id, {
        recordingBlockFrom: null,
        recordingBlockTo: null,
      });
      applyUser(user);
      setBlockSuccess("Recording access unblocked.");
      onChanged();
    } catch (err) {
      setBlockError(err instanceof ApiError ? err.message : "Could not unblock recording access");
    } finally {
      setBlockSubmitting(false);
    }
  };

  const isBlocked = !!current.recordingBlockFrom;

  return (
    <Modal onClose={onClose}>
      <div className={dashboardStyles.modalHead}>
        <div>
          <h2 className={adminStyles.sectionTitle}>{current.name}</h2>
          <p className={adminStyles.sectionSubtitle}>{current.email}</p>
        </div>
        <button className={dashboardStyles.modalCloseButton} type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <section className={adminStyles.section} style={{ marginTop: 16 }}>
        <h3 className={adminStyles.sectionTitle} style={{ fontSize: "0.95rem" }}>
          Login access
        </h3>
        <div className={adminStyles.inviteRow} style={{ marginBottom: 8 }}>
          <span className={current.isActive ? adminStyles.badgeSuccess : adminStyles.badgeInactive}>
            {current.isActive ? "Can log in" : "Login deactivated"}
          </span>
        </div>
        <p className={adminStyles.sectionSubtitle}>
          Shown to the student on the login screen when their login is deactivated. Leave blank to use
          the default message (&quot;check with your teacher or admin&quot;).
        </p>
        <label className={adminStyles.label}>
          Message
          <textarea
            className={adminStyles.input}
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Your payment is due — contact the office to reactivate."
          />
        </label>
        <div className={adminStyles.formActions}>
          {current.isActive ? (
            <button
              className={adminStyles.dangerButton}
              type="button"
              onClick={submitDeactivate}
              disabled={loginSubmitting}
            >
              {loginSubmitting ? "Saving..." : "Deactivate login"}
            </button>
          ) : (
            <>
              <button
                className={adminStyles.primaryButton}
                type="button"
                onClick={submitActivate}
                disabled={loginSubmitting}
              >
                {loginSubmitting ? "Saving..." : "Activate login"}
              </button>
              <button
                className={adminStyles.smallButton}
                type="button"
                onClick={submitSaveMessage}
                disabled={loginSubmitting}
              >
                Save message
              </button>
            </>
          )}
          {loginError && <p className={adminStyles.messageError}>{loginError}</p>}
          {loginSuccess && <p className={adminStyles.messageSuccess}>{loginSuccess}</p>}
        </div>
      </section>

      <section className={adminStyles.section} style={{ marginTop: 16 }}>
        <h3 className={adminStyles.sectionTitle} style={{ fontSize: "0.95rem" }}>
          Session recording access
        </h3>
        <div className={adminStyles.inviteRow} style={{ marginBottom: 8 }}>
          <span className={isBlocked ? adminStyles.badgePending : adminStyles.badgeSuccess}>
            {isBlocked
              ? current.recordingBlockTo
                ? `Blocked ${new Date(current.recordingBlockFrom!).toLocaleDateString()} – ${new Date(
                    current.recordingBlockTo
                  ).toLocaleDateString()}`
                : `Blocked from ${new Date(current.recordingBlockFrom!).toLocaleDateString()} onward`
              : "Full access"}
          </span>
        </div>
        <p className={adminStyles.sectionSubtitle}>
          The student can still log in, but recordings for sessions in this range are hidden. Leave
          &quot;to&quot; blank to block that date and every future session (e.g. once a paid month runs
          out) — clear it once they pay to restore access.
        </p>
        <div className={adminStyles.form}>
          <label className={adminStyles.label}>
            From
            <input
              className={adminStyles.input}
              type="date"
              value={blockFrom}
              onChange={(e) => setBlockFrom(e.target.value)}
            />
          </label>
          <label className={adminStyles.label}>
            To (optional — blank = onward)
            <input
              className={adminStyles.input}
              type="date"
              value={blockTo}
              onChange={(e) => setBlockTo(e.target.value)}
            />
          </label>
        </div>
        <div className={adminStyles.formActions}>
          <button className={adminStyles.primaryButton} type="button" onClick={submitBlock} disabled={blockSubmitting}>
            {blockSubmitting ? "Saving..." : "Block recordings"}
          </button>
          {isBlocked && (
            <button className={adminStyles.smallButton} type="button" onClick={submitUnblock} disabled={blockSubmitting}>
              Unblock
            </button>
          )}
          {blockError && <p className={adminStyles.messageError}>{blockError}</p>}
          {blockSuccess && <p className={adminStyles.messageSuccess}>{blockSuccess}</p>}
        </div>
      </section>
    </Modal>
  );
}
