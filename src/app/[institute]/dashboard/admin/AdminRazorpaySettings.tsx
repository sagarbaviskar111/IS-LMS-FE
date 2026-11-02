"use client";

import { useEffect, useState } from "react";
import { api, ApiError, RazorpaySettings } from "@/lib/api";
import adminStyles from "./admin.module.css";

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "";

// Every institute collects fees into its own Razorpay account: the admin pastes
// their own key pair here. Students' online payments (registration fee, dues,
// installments) then go straight to that account.
export default function AdminRazorpaySettings() {
  const [settings, setSettings] = useState<RazorpaySettings | null>(null);
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api
      .getRazorpaySettings()
      .then((r) => setSettings(r.razorpay))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load the settings"));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const r = await api.saveRazorpaySettings({ keyId: keyId.trim(), keySecret: keySecret.trim() });
      setSettings(r.razorpay);
      setKeyId("");
      setKeySecret("");
      setShowForm(false);
      setNotice(r.razorpay.mode === "test" ? "Connected in test mode. No real money moves until you add live keys." : "Connected. Students can now pay online.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the keys");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Disconnect Razorpay? Students will not be able to pay online until you add keys again.")) return;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const r = await api.removeRazorpaySettings();
      setSettings(r.razorpay);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not disconnect");
    } finally {
      setBusy(false);
    }
  };

  const connected = !!settings?.configured;

  return (
    <section className={adminStyles.section} style={{ display: "grid", gap: 20 }}>
      <div>
        <h2 className={adminStyles.sectionTitle}>Online payments (Razorpay)</h2>
        <p className={adminStyles.sectionSubtitle} style={{ marginTop: 6 }}>
          Fees your students pay online (course registration, dues, installments) go straight into <strong>your own</strong> Razorpay
          account. InstituteSathi never holds the money.
        </p>
      </div>

      {settings && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            padding: "14px 16px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            background: "var(--surface-alt)",
          }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <span>
              {connected ? (
                <span className={adminStyles.badgeSuccess}>Connected · {settings.mode === "test" ? "Test mode" : "Live mode"}</span>
              ) : (
                <span className={adminStyles.badgeInactive}>Not connected</span>
              )}
            </span>
            {connected && (
              <span className={adminStyles.sectionSubtitle} style={{ margin: 0 }}>
                Key ID <code>{settings.keyId}</code> · connected {when(settings.connectedAt)}
              </span>
            )}
            {!connected && (
              <span className={adminStyles.sectionSubtitle} style={{ margin: 0 }}>
                Until you connect, students cannot pay online. You can still record cash / UPI payments yourself.
              </span>
            )}
          </div>
          <div className={adminStyles.rowActions}>
            <button className={adminStyles.smallButton} type="button" onClick={() => setShowForm((v) => !v)}>
              {connected ? "Change keys" : "Add keys"}
            </button>
            {connected && (
              <button className={adminStyles.dangerButton} type="button" onClick={remove} disabled={busy}>
                Disconnect
              </button>
            )}
          </div>
        </div>
      )}

      {notice && <p className={adminStyles.messageSuccess}>{notice}</p>}
      {error && <p className={adminStyles.messageError}>{error}</p>}

      {(showForm || (settings && !connected)) && (
        <form className={adminStyles.form} onSubmit={save} autoComplete="off">
          <label className={adminStyles.label}>
            <span>Key ID<span className={adminStyles.required}>*</span></span>
            <input
              className={adminStyles.input}
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              placeholder="rzp_test_xxxxxxxxxxxxxx"
              spellCheck={false}
              required
            />
          </label>
          <label className={adminStyles.label}>
            <span>Key Secret<span className={adminStyles.required}>*</span></span>
            <input
              className={adminStyles.input}
              type="password"
              value={keySecret}
              onChange={(e) => setKeySecret(e.target.value)}
              placeholder="Shown only once in Razorpay"
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="new-password"
              required
            />
          </label>
          <div className={`${adminStyles.formActions} ${adminStyles.fullRow}`}>
            <button className={adminStyles.primaryButton} disabled={busy}>
              {busy ? "Checking keys…" : "Save and verify"}
            </button>
            {connected && (
              <button type="button" className={adminStyles.smallButton} onClick={() => setShowForm(false)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      <div style={{ display: "grid", gap: 8, fontSize: "0.9rem", lineHeight: 1.55 }}>
        <strong>How to get your keys</strong>
        <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 4 }}>
          <li>Log in to your Razorpay Dashboard (create a free account if you don&apos;t have one).</li>
          <li>
            Open <em>Account &amp; Settings → API Keys → Generate Key</em>.
          </li>
          <li>Copy the Key ID and the Key Secret into the boxes above.</li>
        </ol>
        <span className={adminStyles.sectionSubtitle} style={{ margin: 0 }}>
          Start with <strong>test keys</strong> (they begin with <code>rzp_test_</code>) to try a payment safely, then switch to live keys
          (<code>rzp_live_</code>) once your Razorpay account is activated. The secret is stored encrypted and is never shown again.
        </span>
      </div>
    </section>
  );
}
