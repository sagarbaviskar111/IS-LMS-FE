"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import adminStyles from "./admin/admin.module.css";
import styles from "./EmailSenderSettings.module.css";

const GMAIL = /^[^\s@]+@(gmail|googlemail)\.com$/i;

function StepNumber({ n, done }: { n: number; done?: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        fontWeight: 700,
        fontSize: "0.9rem",
        background: done ? "var(--brand)" : "var(--brand-soft)",
        color: done ? "#fff" : "var(--brand-dark)",
      }}
    >
      {done ? "✓" : n}
    </span>
  );
}

const linkButton: React.CSSProperties = { display: "inline-block", textDecoration: "none" };

// Walks an admin (or the superadmin) through connecting their own Gmail:
// address -> 2-Step Verification -> App Password -> paste and check.
export default function EmailSenderSettings() {
  const [address, setAddress] = useState<string | null>(null);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const [addressInput, setAddressInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () => {
    setLoading(true);
    api
      .getEmailSettings()
      .then((res) => {
        setAddress(res.address);
        setHasCredentials(res.hasCredentials);
        setAddressInput((cur) => cur || res.address || "");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const cleanPassword = passwordInput.replace(/\s+/g, "");
  const addressOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addressInput.trim());
  const notGmail = addressOk && !GMAIL.test(addressInput.trim());
  const passwordOk = cleanPassword.length === 16;
  const showSteps = !hasCredentials || editing;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setTestResult(null);
    setSaving(true);
    try {
      await api.updateEmailSettings({ address: addressInput.trim(), appPassword: cleanPassword });
      setPasswordInput("");
      setEditing(false);
      setNotice("Connected. Gmail accepted this address and password.");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the sender email");
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    setTestResult(null);
    setError("");
    try {
      const r = await api.sendTestEmail();
      setTestResult({ ok: true, text: r.message });
    } catch (err) {
      setTestResult({ ok: false, text: err instanceof ApiError ? err.message : "Could not send the test email" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <section className={adminStyles.section}>
      <div className={adminStyles.sectionHead}>
        <div>
          <h2 className={adminStyles.sectionTitle}>Sender email</h2>
          <p className={adminStyles.sectionSubtitle}>
            Fee reminders, certificates and password-reset links are emailed from <strong>your own Gmail</strong>, so students see your
            institute&apos;s address. It takes about 2 minutes to set up.
          </p>
        </div>
      </div>

      {loading ? (
        <p className={adminStyles.empty}>Loading...</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {/* status */}
          {hasCredentials ? (
            <div className={styles.status}>
              <div className={styles.statusInfo}>
                <span className={adminStyles.badgeSuccess}>Connected</span>
                <div style={{ marginTop: 6, fontWeight: 600 }}>Sending as {address}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Up to 90 emails a day go out from this address.</div>
              </div>
              <button className={adminStyles.primaryButton} type="button" onClick={sendTest} disabled={testing}>
                {testing ? "Sending…" : "Send me a test email"}
              </button>
              <button className={adminStyles.smallButton} type="button" onClick={() => setEditing((v) => !v)}>
                {editing ? "Cancel" : "Change Gmail or password"}
              </button>
            </div>
          ) : (
            <div style={{ padding: 16, borderRadius: "var(--radius-md)", background: "var(--warning-soft)" }}>
              <strong style={{ color: "var(--warning)" }}>Not connected yet</strong>
              <div style={{ fontSize: "0.9rem", marginTop: 4 }}>
                No emails can be sent until you finish the 4 steps below. Fee reminders will not reach students, and certificates cannot be emailed.
              </div>
            </div>
          )}

          {testResult && (
            <p className={testResult.ok ? adminStyles.messageSuccess : adminStyles.messageError} role="status" style={{ margin: 0 }}>
              {testResult.text}
            </p>
          )}
          {notice && <p className={adminStyles.messageSuccess} style={{ margin: 0 }}>{notice}</p>}

          {/* steps */}
          {showSteps && (
            <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
              <div className={styles.stepCard}>
                <StepNumber n={1} done={addressOk} />
                <div className={styles.stepBody}>
                  <strong>Your Gmail address</strong>
                  <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
                    Use a Gmail just for your institute, like <em>yourinstitute@gmail.com</em>. Students will see emails coming from it. Don&apos;t have
                    one?{" "}
                    <a href="https://accounts.google.com/signup" target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
                      Create a free Gmail
                    </a>
                    .
                  </span>
                  <input
                    className={adminStyles.input}
                    type="email"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    placeholder="yourinstitute@gmail.com"
                    autoComplete="off"
                    required
                  />
                  {notGmail && (
                    <span style={{ color: "var(--warning)", fontSize: "0.85rem" }}>
                      This is not a @gmail.com address. It only works if it is a Google Workspace account whose admin allows App Passwords.
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.stepCard}>
                <StepNumber n={2} />
                <div className={styles.stepBody}>
                  <strong>Turn on 2-Step Verification</strong>
                  <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
                    Google only gives App Passwords to accounts with 2-Step Verification on. Sign in to that Gmail, open the page below and switch
                    it on. If it already says <strong>On</strong>, go to step 3.
                  </span>
                  <div>
                    <a className={adminStyles.smallButton} style={linkButton} href="https://myaccount.google.com/signinoptions/twosv" target="_blank" rel="noreferrer">
                      Open 2-Step Verification ↗
                    </a>
                  </div>
                </div>
              </div>

              <div className={styles.stepCard}>
                <StepNumber n={3} />
                <div className={styles.stepBody}>
                  <strong>Create an App Password</strong>
                  <ol style={{ margin: 0, paddingLeft: 18, color: "var(--muted)", fontSize: "0.88rem", display: "grid", gap: 4 }}>
                    <li>Open the page below (sign in to the same Gmail if asked).</li>
                    <li>
                      Type a name, for example <strong>InstituteSathi</strong>, and click <strong>Create</strong>.
                    </li>
                    <li>
                      Google shows a <strong>16-letter password</strong> in a yellow box. Copy it. It is shown only once.
                    </li>
                  </ol>
                  <div>
                    <a className={adminStyles.smallButton} style={linkButton} href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">
                      Open App Passwords ↗
                    </a>
                  </div>
                  <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                    Page says &quot;setting isn&apos;t available&quot;? Then 2-Step Verification is not on yet (step 2), or your Google Workspace admin has
                    turned App Passwords off.
                  </span>
                </div>
              </div>

              <div className={styles.stepCard}>
                <StepNumber n={4} done={passwordOk} />
                <div className={styles.stepBody}>
                  <strong>Paste it here and connect</strong>
                  <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
                    Paste the 16-letter password. Spaces are fine, we remove them. This is <strong>not</strong> your normal Gmail password, that one will
                    not work.
                  </span>
                  <div className={styles.passwordRow}>
                    <input
                      className={adminStyles.input}
                      style={{ fontFamily: showPassword ? "var(--font-geist-mono), monospace" : undefined, letterSpacing: showPassword ? 1 : undefined }}
                      type={showPassword ? "text" : "password"}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="abcd efgh ijkl mnop"
                      autoComplete="new-password"
                      spellCheck={false}
                      required
                    />
                    <button type="button" className={adminStyles.smallButton} onClick={() => setShowPassword((v) => !v)}>
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <span style={{ fontSize: "0.82rem", color: passwordInput && !passwordOk ? "var(--danger)" : "var(--muted)" }}>
                    {passwordInput
                      ? passwordOk
                        ? "✓ 16 letters"
                        : `${cleanPassword.length} of 16 letters. An App Password is exactly 16 letters.`
                      : "16 letters, like abcd efgh ijkl mnop"}
                  </span>
                  <div className={styles.submitRow}>
                    <button className={adminStyles.primaryButton} type="submit" disabled={saving || !addressOk || !passwordOk}>
                      {saving ? "Checking with Gmail…" : hasCredentials ? "Check and replace" : "Check and connect"}
                    </button>
                    <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>We log in to Gmail once to make sure it works before saving.</span>
                  </div>
                  {error && <p className={adminStyles.messageError} style={{ margin: 0 }}>{error}</p>}
                </div>
              </div>
            </form>
          )}

          {/* help */}
          <details style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "12px 16px" }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>Something went wrong? Common problems</summary>
            <div style={{ display: "grid", gap: 12, marginTop: 12, fontSize: "0.9rem" }}>
              <div>
                <strong>&quot;Username and Password not accepted&quot; (535)</strong>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18, color: "var(--muted)" }}>
                  <li>You used your normal Gmail password. Only a 16-letter App Password works.</li>
                  <li>The App Password belongs to a different Gmail than the address above.</li>
                  <li>2-Step Verification was turned off after the App Password was made. Turn it on and create a new one.</li>
                  <li>The App Password was deleted in Google. Create a new one and paste it again.</li>
                </ul>
              </div>
              <div>
                <strong>The test email did not arrive</strong>
                <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>Check the Spam folder. It is sent to the email you log in to this dashboard with.</p>
              </div>
              <div>
                <strong>How many emails can go out?</strong>
                <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
                  Gmail allows about 100 a day. We send at most 90 reminders and certificates a day and keep the rest for password resets. Anything
                  over waits for the next day.
                </p>
              </div>
              <div>
                <strong>Is it safe?</strong>
                <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
                  The App Password is stored encrypted and never shown again. We use it only to send your institute's emails. Use a Gmail made for your institute rather than a personal one, and you
                  can delete the App Password any time at Google App Passwords to cut off access.
                </p>
              </div>
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
