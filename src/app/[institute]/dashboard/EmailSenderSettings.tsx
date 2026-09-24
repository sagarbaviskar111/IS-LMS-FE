"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import adminStyles from "./admin/admin.module.css";

export default function EmailSenderSettings() {
  const [address, setAddress] = useState<string | null>(null);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [loading, setLoading] = useState(true);

  const [addressInput, setAddressInput] = useState("");
  const [appPasswordInput, setAppPasswordInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = () => {
    setLoading(true);
    api
      .getEmailSettings()
      .then((res) => {
        setAddress(res.address);
        setHasCredentials(res.hasCredentials);
        setAddressInput(res.address || "");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      await api.updateEmailSettings({ address: addressInput.trim(), appPassword: appPasswordInput.trim() });
      setAppPasswordInput("");
      setNotice("Saved.");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save sender email");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={adminStyles.section}>
      <div className={adminStyles.sectionHead}>
        <div>
          <h2 className={adminStyles.sectionTitle}>Sender email</h2>
          <p className={adminStyles.sectionSubtitle}>
            Password-reset emails go out through your own Gmail account, not a shared one — so
            deliverability and sending limits are yours alone.
          </p>
        </div>
      </div>

      {loading ? (
        <p className={adminStyles.empty}>Loading...</p>
      ) : (
        <>
          {hasCredentials && (
            <p style={{ marginBottom: 16 }}>
              <span className={adminStyles.badgeSuccess}>Set up</span>
              <span style={{ color: "var(--muted)", marginLeft: 8 }}>Sending as: {address}</span>
            </p>
          )}

          <p className={adminStyles.sectionSubtitle} style={{ marginBottom: 12 }}>
            Use a Gmail <strong>App Password</strong>, not your regular password — turn on 2-Step
            Verification for the account, then create one under Google Account &gt; Security &gt;
            App Passwords.
          </p>

          <form className={adminStyles.form} onSubmit={submit}>
            <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
              Gmail address
              <input
                className={adminStyles.input}
                type="email"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="you@gmail.com"
                required
              />
            </label>
            <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
              App Password
              <input
                className={adminStyles.input}
                type="password"
                value={appPasswordInput}
                onChange={(e) => setAppPasswordInput(e.target.value)}
                placeholder={hasCredentials ? "•••••••••••••••• (enter to replace)" : "16-character app password"}
                required
              />
            </label>
            <div className={adminStyles.formActions}>
              <button className={adminStyles.primaryButton} type="submit" disabled={saving}>
                {saving ? "Saving..." : hasCredentials ? "Replace" : "Save"}
              </button>
              {error && <p className={adminStyles.messageError}>{error}</p>}
              {notice && <p className={adminStyles.messageSuccess}>{notice}</p>}
            </div>
          </form>
        </>
      )}
    </section>
  );
}
