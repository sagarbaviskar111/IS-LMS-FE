"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { api, ApiError, YoutubeStatus } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "./admin.module.css";

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

  const load = () => {
    setLoading(true);
    api
      .getYoutubeStatus()
      .then(setStatus)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (searchParams.get("connected")) {
      setMessage({ type: "success", text: "YouTube account connected." });
      load();
      router.replace(`/${institute}/dashboard/admin/youtube`);
    } else if (searchParams.get("error")) {
      setMessage({ type: "error", text: `Couldn't connect YouTube: ${searchParams.get("error")}` });
      router.replace(`/${institute}/dashboard/admin/youtube`);
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
    setSavingCredentials(true);
    try {
      await api.saveYoutubeCredentials({ clientId: clientId.trim(), clientSecret: clientSecret.trim() });
      setClientId("");
      setClientSecret("");
      setMessage({ type: "success", text: "Google credentials saved — you can now connect a YouTube account." });
      load();
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

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>YouTube Settings</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Connect your institute&apos;s own YouTube account so teachers can upload session
        recordings straight to it. Videos are uploaded as <strong>unlisted</strong> — not
        searchable on YouTube, viewable only by students inside this dashboard.
      </p>

      {loading ? (
        <p className={adminStyles.empty}>Loading...</p>
      ) : (
        <div className={adminStyles.grid}>
          <section className={adminStyles.section}>
            <div className={adminStyles.sectionHead}>
              <div>
                <h2 className={adminStyles.sectionTitle}>1. Google Cloud credentials</h2>
                <p className={adminStyles.sectionSubtitle}>
                  Each institute uses its own Google Cloud OAuth app (YouTube upload quota is
                  allocated per app, not per channel). Create one in{" "}
                  <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">
                    Google Cloud Console
                  </a>{" "}
                  and add the redirect URI below as an authorized redirect URI on it.
                </p>
              </div>
            </div>

            {status?.redirectUri && (
              <div className={adminStyles.inviteRow} style={{ marginBottom: 16 }}>
                <span className={adminStyles.linkBox}>{status.redirectUri}</span>
                <button className={adminStyles.smallButton} type="button" onClick={copyRedirectUri}>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            )}

            {status?.hasCredentials && (
              <p style={{ marginBottom: 16 }}>
                <span className={adminStyles.badgeSuccess}>Credentials saved</span>
                {status.googleClientId && (
                  <span style={{ color: "var(--muted)", marginLeft: 8 }}>Client ID: {status.googleClientId}</span>
                )}
              </p>
            )}

            <form className={adminStyles.form} onSubmit={saveCredentials}>
              <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
                Google Client ID
                <input
                  className={adminStyles.input}
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="xxxxxxxxxx.apps.googleusercontent.com"
                  required
                />
              </label>
              <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
                Google Client Secret
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
                  {savingCredentials ? "Saving..." : status?.hasCredentials ? "Replace credentials" : "Save credentials"}
                </button>
                {credentialsError && <p className={adminStyles.messageError}>{credentialsError}</p>}
              </div>
            </form>
            {status?.hasCredentials && (
              <p className={adminStyles.sectionSubtitle} style={{ marginTop: 8 }}>
                Replacing credentials disconnects the currently connected channel — you&apos;ll need to
                reconnect afterward.
              </p>
            )}
          </section>

          <section className={adminStyles.section}>
            <div className={adminStyles.sectionHead}>
              <div>
                <h2 className={adminStyles.sectionTitle}>2. Connect a channel</h2>
              </div>
            </div>

            {status?.connected ? (
              <div>
                <p style={{ marginBottom: 4 }}>
                  <span className={adminStyles.badgeSuccess}>Connected</span>
                </p>
                <p style={{ color: "var(--foreground)", marginBottom: 16 }}>
                  Uploading to channel: <strong>{status.channelTitle || "Unknown channel"}</strong>
                </p>
                <button className={adminStyles.dangerButton} onClick={disconnect} disabled={disconnecting}>
                  {disconnecting ? "Disconnecting..." : "Disconnect"}
                </button>
              </div>
            ) : (
              <div>
                <p style={{ marginBottom: 4 }}>
                  <span className={adminStyles.badgeInactive}>Not connected</span>
                </p>
                <p style={{ color: "var(--muted)", marginBottom: 16 }}>
                  {status?.hasCredentials
                    ? "Teachers can't upload session recordings until this is connected."
                    : "Save your Google credentials above first."}
                </p>
                <button
                  className={adminStyles.primaryButton}
                  onClick={connect}
                  disabled={connecting || !status?.hasCredentials}
                >
                  {connecting ? "Redirecting..." : "Connect YouTube Account"}
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {message && (
        <p className={message.type === "error" ? adminStyles.messageError : adminStyles.messageSuccess} style={{ marginTop: 12 }}>
          {message.text}
        </p>
      )}
    </div>
  );
}
