"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { api, YoutubeStatus } from "@/lib/api";
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

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>YouTube Settings</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Connect your institute&apos;s YouTube account so teachers can upload session recordings
        straight to it. Videos are uploaded as <strong>unlisted</strong> — not searchable on
        YouTube, viewable only by students inside this dashboard.
      </p>

      <section className={adminStyles.section}>
        {loading ? (
          <p className={adminStyles.empty}>Loading...</p>
        ) : status?.connected ? (
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
              Teachers can&apos;t upload session recordings until this is connected.
            </p>
            <button className={adminStyles.primaryButton} onClick={connect} disabled={connecting}>
              {connecting ? "Redirecting..." : "Connect YouTube Account"}
            </button>
          </div>
        )}

        {message && (
          <p className={message.type === "error" ? adminStyles.messageError : adminStyles.messageSuccess} style={{ marginTop: 12 }}>
            {message.text}
          </p>
        )}
      </section>
    </div>
  );
}
