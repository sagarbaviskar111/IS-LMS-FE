"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import adminStyles from "./admin.module.css";

export default function AdminPasswordResetSettings({ onOpenSenderEmail }: { onOpenSenderEmail: () => void }) {
  const [senderReady, setSenderReady] = useState<boolean | null>(null);
  const [allowSelfPasswordReset, setAllowSelfPasswordReset] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api
      .getEmailSettings()
      .then((res) => setSenderReady(res.hasCredentials))
      .catch(() => setSenderReady(null));
    api
      .getTeamSettings()
      .then((res) => setAllowSelfPasswordReset(res.allowSelfPasswordReset))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async () => {
    const next = !allowSelfPasswordReset;
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const res = await api.updateTeamSettings({ allowSelfPasswordReset: next });
      setAllowSelfPasswordReset(res.allowSelfPasswordReset);
      setNotice("Saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this setting");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <section className={adminStyles.section}>
        {senderReady === null ? null : senderReady ? (
          <p>
            <span className={adminStyles.badgeSuccess}>Sender email set up</span>
          </p>
        ) : (
          <p className={adminStyles.messageError}>
            Reset emails can&apos;t be sent until you connect your Gmail.{" "}
            <button
              type="button"
              onClick={onOpenSenderEmail}
              style={{ background: "none", border: 0, padding: 0, color: "inherit", textDecoration: "underline", cursor: "pointer", font: "inherit" }}
            >
              Set up sender email
            </button>
          </p>
        )}
      </section>

      <section className={adminStyles.section} style={{ marginTop: 16 }}>
        {loading ? (
          <p className={adminStyles.empty}>Loading...</p>
        ) : (
          <>
            <label className={adminStyles.checkRow} htmlFor="allowSelfPasswordReset">
              <input
                id="allowSelfPasswordReset"
                type="checkbox"
                checked={allowSelfPasswordReset}
                onChange={toggle}
                disabled={saving}
                style={{ width: 18, height: 18 }}
              />
              <div>
                <div style={{ fontWeight: 600, color: "var(--foreground)" }}>
                  Let my team reset their own password by email
                </div>
                <p className={adminStyles.sectionSubtitle} style={{ marginTop: 4 }}>
                  {allowSelfPasswordReset ? (
                    <>
                      <strong>On</strong> — when a teacher, student or telecaller uses &quot;Forgot
                      password?&quot;, they get an email with a reset link, same as you do.
                    </>
                  ) : (
                    <>
                      <strong>Off (default)</strong> — when a teacher, student or telecaller uses
                      &quot;Forgot password?&quot;, you get a notification instead. Use the{" "}
                      <strong>Reset Password</strong> button next to their name (in Students,
                      Teachers or Telecallers) to set a new one, then share it with them yourself.
                    </>
                  )}
                </p>
              </div>
            </label>

            {error && <p className={adminStyles.messageError} style={{ marginTop: 12 }}>{error}</p>}
            {notice && <p className={adminStyles.messageSuccess} style={{ marginTop: 12 }}>{notice}</p>}
          </>
        )}
      </section>
    </div>
  );
}
