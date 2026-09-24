"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "./admin.module.css";

export default function AdminPasswordResetSettings() {
  const [allowSelfPasswordReset, setAllowSelfPasswordReset] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
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
      <h1 className={dashboardStyles.pageTitle}>Password Resets</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Choose how teachers, students and telecallers get a new password when they forget theirs.
      </p>

      <section className={adminStyles.section}>
        {loading ? (
          <p className={adminStyles.empty}>Loading...</p>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <input
                id="allowSelfPasswordReset"
                type="checkbox"
                checked={allowSelfPasswordReset}
                onChange={toggle}
                disabled={saving}
                style={{ width: 18, height: 18, marginTop: 3, accentColor: "var(--brand)" }}
              />
              <label htmlFor="allowSelfPasswordReset" style={{ cursor: "pointer" }}>
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
              </label>
            </div>

            {error && <p className={adminStyles.messageError} style={{ marginTop: 12 }}>{error}</p>}
            {notice && <p className={adminStyles.messageSuccess} style={{ marginTop: 12 }}>{notice}</p>}
          </>
        )}
      </section>
    </div>
  );
}
