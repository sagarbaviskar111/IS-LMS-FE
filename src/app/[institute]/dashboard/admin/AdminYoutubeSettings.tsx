"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { api, ApiError, YoutubeStatus } from "@/lib/api";
import adminStyles from "./admin.module.css";
import styles from "./VideoWizard.module.css";
import WizardSteps, { WizardStep } from "./WizardSteps";

const LINKS = {
  newProject: "https://console.cloud.google.com/projectcreate",
  enableApi: "https://console.cloud.google.com/apis/library/youtube.googleapis.com",
  consent: "https://console.cloud.google.com/apis/credentials/consent",
  credentials: "https://console.cloud.google.com/apis/credentials",
  audience: "https://console.cloud.google.com/auth/audience",
};

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className={styles.openLink} href={href} target="_blank" rel="noreferrer">
      {children} ↗
    </a>
  );
}

export default function AdminYoutubeSettings() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { institute } = useParams<{ institute: string }>();

  const [status, setStatus] = useState<YoutubeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [credentialsError, setCredentialsError] = useState("");
  const [copied, setCopied] = useState(false);

  const [step, setStep] = useState(0);
  const [showWizard, setShowWizard] = useState(false);

  const load = () => {
    api
      .getYoutubeStatus()
      .then((s) => {
        setStatus(s);
        // Resume where the admin left off: credentials saved → straight to Connect.
        setStep(s.hasCredentials ? 5 : 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (searchParams.get("connected")) {
      setMessage({ type: "success", text: "YouTube account connected." });
      load();
      router.replace(`/${institute}/dashboard/admin/settings?tab=youtube`);
    } else if (searchParams.get("error")) {
      setMessage({ type: "error", text: `Couldn't connect YouTube: ${searchParams.get("error")}` });
      router.replace(`/${institute}/dashboard/admin/settings?tab=youtube`);
    }
  }, [searchParams, router, institute]);

  const connect = async () => {
    setConnecting(true);
    setMessage(null);
    try {
      const { url } = await api.getYoutubeConnectUrl();
      window.location.href = url;
    } catch {
      setMessage({ type: "error", text: "Couldn't start the connection — try again." });
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Disconnect this YouTube account? Teachers won't be able to upload new recordings until you reconnect one.")) {
      return;
    }
    setDisconnecting(true);
    try {
      await api.disconnectYoutube();
      setMessage({ type: "success", text: "YouTube account disconnected." });
      load();
    } catch {
      setMessage({ type: "error", text: "Couldn't disconnect — try again." });
    } finally {
      setDisconnecting(false);
    }
  };

  const saveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredentialsError("");
    const id = clientId.trim();
    const secret = clientSecret.trim();
    if (!id.endsWith(".apps.googleusercontent.com")) {
      setCredentialsError("That doesn't look like a Client ID — it should end with .apps.googleusercontent.com");
      return;
    }
    if (!secret.startsWith("GOCSPX-")) {
      setCredentialsError("That doesn't look like a Client Secret — it should start with GOCSPX-");
      return;
    }
    setSavingCredentials(true);
    try {
      await api.saveYoutubeCredentials({ clientId: id, clientSecret: secret });
      setClientId("");
      setClientSecret("");
      setMessage({ type: "success", text: "Saved. Next: publish the app, then connect." });
      const s = await api.getYoutubeStatus();
      setStatus(s);
      setStep(5);
    } catch (err) {
      setCredentialsError(err instanceof ApiError ? err.message : "Could not save credentials");
    } finally {
      setSavingCredentials(false);
    }
  };

  const copyRedirectUri = async () => {
    if (!status?.redirectUri) return;
    try {
      await navigator.clipboard.writeText(status.redirectUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  };

  if (loading) return <p className={adminStyles.empty}>Loading...</p>;

  const steps: WizardStep[] = [
    {
      title: "Create a Google Cloud project",
      content: (
        <>
          <p>This is a free account area on Google where YouTube uploads are allowed. You only do this once.</p>
          <ExternalLink href={LINKS.newProject}>Open Google Cloud</ExternalLink>
          <ol>
            <li>Sign in with the Google account that owns your YouTube channel.</li>
            <li>Accept the terms if asked.</li>
            <li>Give the project any name (e.g. your institute name) and click <strong>Create</strong>.</li>
          </ol>
        </>
      ),
    },
    {
      title: "Turn on the YouTube upload service",
      content: (
        <>
          <ExternalLink href={LINKS.enableApi}>Open YouTube Data API v3</ExternalLink>
          <ol>
            <li>Make sure your new project is selected at the top of the page.</li>
            <li>Click the blue <strong>Enable</strong> button.</li>
          </ol>
        </>
      ),
    },
    {
      title: "Set up the permission screen",
      content: (
        <>
          <ExternalLink href={LINKS.consent}>Open permission screen settings</ExternalLink>
          <ol>
            <li>Click <strong>Get started</strong> (or <strong>Configure consent screen</strong>).</li>
            <li>App name: your institute name. Support email: your email.</li>
            <li>Audience: choose <strong>External</strong>. Add your email as the contact and finish.</li>
          </ol>
          <p className={styles.note}>
            <strong>Important:</strong> don&apos;t skip step 6 (publishing the app), or Google will block
            the connection.
          </p>
        </>
      ),
    },
    {
      title: "Create the access keys",
      content: (
        <>
          <ExternalLink href={LINKS.credentials}>Open Credentials</ExternalLink>
          <ol>
            <li>Click <strong>Create credentials</strong> → <strong>OAuth client ID</strong>.</li>
            <li>Application type: <strong>Web application</strong>.</li>
            <li>
              Under <strong>Authorized redirect URIs</strong> click <strong>Add URI</strong> and paste this exact address:
            </li>
          </ol>
          {status?.redirectUri && (
            <div className={adminStyles.inviteRow} style={{ marginBottom: 8 }}>
              <span className={adminStyles.linkBox}>{status.redirectUri}</span>
              <button className={adminStyles.smallButton} type="button" onClick={copyRedirectUri}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
          <ol start={4}>
            <li>Click <strong>Create</strong>. A box shows your <strong>Client ID</strong> and <strong>Client secret</strong> — keep it open for the next step.</li>
          </ol>
        </>
      ),
    },
    {
      title: "Paste your keys here",
      done: !!status?.hasCredentials,
      hideNext: true,
      content: (
        <form className={adminStyles.form} onSubmit={saveCredentials}>
          {status?.hasCredentials && (
            <p style={{ gridColumn: "1 / -1" }}>
              <span className={adminStyles.badgeSuccess}>Keys saved</span>
              {status.googleClientId && (
                <span style={{ color: "var(--muted)", marginLeft: 8 }}>Client ID: {status.googleClientId}</span>
              )}
            </p>
          )}
          <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
            Client ID
            <input
              className={adminStyles.input}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="xxxxxxxxxx.apps.googleusercontent.com"
              required
            />
          </label>
          <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
            Client secret
            <input
              className={adminStyles.input}
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder={status?.hasCredentials ? "•••••••• (enter to replace)" : "GOCSPX-..."}
              required
            />
          </label>
          <div className={adminStyles.formActions}>
            <button className={adminStyles.primaryButton} type="submit" disabled={savingCredentials}>
              {savingCredentials ? "Saving..." : status?.hasCredentials ? "Replace keys" : "Save keys"}
            </button>
            {credentialsError && <p className={adminStyles.messageError}>{credentialsError}</p>}
          </div>
          {status?.hasCredentials && (
            <p className={adminStyles.sectionSubtitle} style={{ gridColumn: "1 / -1" }}>
              Replacing keys disconnects the current channel — you&apos;ll reconnect in step 7.
            </p>
          )}
        </form>
      ),
    },
    {
      title: "Publish the app (don't skip!)",
      content: (
        <>
          <p>
            Until the app is published, Google shows <strong>&ldquo;Access blocked: app has not completed the Google
            verification process&rdquo;</strong> and the connection expires every 7 days.
          </p>
          <ExternalLink href={LINKS.audience}>Open Audience settings</ExternalLink>
          <ol>
            <li>Make sure your project is selected at the top.</li>
            <li>
              Under <strong>Publishing status</strong> (it says &ldquo;Testing&rdquo;), click{" "}
              <strong>Publish app</strong> and confirm.
            </li>
            <li>The status should now say <strong>In production</strong>.</li>
          </ol>
          <p className={styles.note}>
            After publishing, Google may say &ldquo;Google hasn&apos;t verified this app&rdquo; when you connect. That&apos;s
            normal for your own app — click <strong>Advanced</strong> → <strong>Go to (your app name)</strong>.
          </p>
          <p className={styles.note}>
            Use this <strong>same app</strong> from now on. If you ever need to reconnect, don&apos;t create a new project or
            new keys — just come back and press Connect again (or Replace keys in step 5 with this app&apos;s keys).
          </p>
        </>
      ),
    },
    {
      title: "Connect your YouTube channel",
      done: !!status?.connected,
      hideNext: true,
      content: (
        <>
          <p>
            Google will ask you to pick your channel and allow uploads. If you see &ldquo;Google hasn&apos;t verified
            this app&rdquo;, click <strong>Advanced → Go to (your app name)</strong> — it&apos;s your own app.
          </p>
          <div className={styles.nav}>
            <button
              className={adminStyles.primaryButton}
              onClick={connect}
              disabled={connecting || !status?.hasCredentials}
            >
              {connecting ? "Redirecting..." : "Connect with Google"}
            </button>
            {!status?.hasCredentials && <span style={{ color: "var(--muted)" }}>Save your keys in step 5 first, and publish the app in step 6.</span>}
          </div>
        </>
      ),
    },
  ];

  const connected = !!status?.connected;

  return (
    <div>
      <section className={adminStyles.section} style={{ marginBottom: 16 }}>
        <div className={adminStyles.sectionHead}>
          <div>
            <h2 className={adminStyles.sectionTitle}>Recordings → your YouTube channel</h2>
            <p className={adminStyles.sectionSubtitle}>
              Teachers&apos; session recordings are uploaded to your own channel as <em>unlisted</em> videos and played
              inside this app.
            </p>
          </div>
        </div>
        {connected ? (
          <div>
            <p style={{ marginBottom: 4 }}>
              <span className={adminStyles.badgeSuccess}>Connected</span>
            </p>
            <p style={{ marginBottom: 16 }}>
              Uploading to channel: <strong>{status?.channelTitle || "Unknown channel"}</strong>
            </p>
            <div className={styles.nav} style={{ marginTop: 0 }}>
              <button className={adminStyles.smallButton} onClick={() => setShowWizard((v) => !v)}>
                {showWizard ? "Hide setup steps" : "Reconnect / change account"}
              </button>
              <button className={adminStyles.dangerButton} onClick={disconnect} disabled={disconnecting}>
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ marginBottom: 4 }}>
              <span className={adminStyles.badgeInactive}>Not connected</span>
            </p>
            <p style={{ color: "var(--muted)" }}>
              Teachers can&apos;t upload recordings until you finish the 7 steps below (about 5 minutes). If you were
              connected before and uploads now say the connection expired, just run step 7 again.
            </p>
          </div>
        )}
      </section>

      {(!connected || showWizard) && (
        <section className={adminStyles.section}>
          <WizardSteps steps={steps} current={step} onChange={setStep} />
        </section>
      )}

      {message && (
        <p className={message.type === "error" ? adminStyles.messageError : adminStyles.messageSuccess} style={{ marginTop: 12 }}>
          {message.text}
        </p>
      )}
    </div>
  );
}
