"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError, CertificateVerification } from "@/lib/api";
import styles from "./verify.module.css";

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default function VerifyCertificatePage() {
  const { code } = useParams<{ code: string }>();
  const [data, setData] = useState<CertificateVerification | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    api
      .verifyCertificate(code)
      .then(setData)
      .catch((err) =>
        setError(err instanceof ApiError && err.status === 404 ? "notfound" : "Could not check this certificate right now.")
      )
      .finally(() => setLoading(false));
  }, [code]);

  const valid = data?.status === "active";

  const download = async () => {
    if (!data) return;
    setDownloading(true);
    setDownloadError("");
    try {
      const blob = await api.verifyCertificatePdf(code);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.certificateNo.replace(/[^\w.-]+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err instanceof ApiError ? err.message : "Could not download the certificate");
    } finally {
      setDownloading(false);
    }
  };
  const rows: [string, string][] = data
    ? [
        ["Awarded to", data.studentName],
        ["Course", data.course],
        ["Grade", data.grade],
        ["Issue date", fmt(data.date)],
        ["Certificate no.", data.certificateNo],
        ["Issued by", data.institute.name],
      ]
    : [];

  const notFound = !loading && error === "notfound";

  return (
    <main className={styles.page}>
      <span className={styles.brand}>InstituteSathi certificate check</span>
      <div className={`${styles.card} ${data ? (valid ? styles.ok : styles.bad) : notFound ? styles.bad : ""}`}>
        {loading && (
          <div className={styles.skeleton} aria-busy="true" aria-label="Checking certificate">
            <span />
            <span />
            <span />
            <span />
          </div>
        )}
        {notFound && (
          <>
            <div className={styles.status}>
              <span className={styles.icon} aria-hidden="true">✕</span>
              <h1 className={styles.title}>Certificate not found</h1>
            </div>
            <p className={styles.text}>
              No certificate matches this code. It may be forged, or the link was copied wrongly.
            </p>
          </>
        )}
        {!loading && error && error !== "notfound" && <p className={styles.error}>{error}</p>}
        {data && (
          <>
            <div className={styles.status}>
              <span className={styles.icon} aria-hidden="true">{valid ? "✓" : "✕"}</span>
              <h1 className={styles.title}>{valid ? "Genuine certificate" : "This certificate has been revoked"}</h1>
            </div>
            {!valid && data.revokedReason && <p className={styles.text}>Reason: {data.revokedReason}</p>}
            {valid && (
              <>
                <button type="button" onClick={download} disabled={downloading} className={styles.download}>
                  {downloading ? "Preparing PDF…" : "Download certificate (PDF)"}
                </button>
                {downloadError && <p className={styles.error} role="alert">{downloadError}</p>}
              </>
            )}
            <dl className={styles.list}>
              {rows
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className={styles.row}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
            </dl>
          </>
        )}
      </div>
    </main>
  );
}
