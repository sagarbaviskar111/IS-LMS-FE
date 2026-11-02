"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError, CertificateVerification } from "@/lib/api";

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
      a.download = `${data.certificateNo.replace(/[^w.-]+/g, "_")}.pdf`;
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

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16, background: "#f4f6fb" }}>
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#fff",
          borderRadius: 14,
          padding: 28,
          boxShadow: "0 6px 30px rgba(15,23,42,0.1)",
          color: "#0f172a",
        }}
      >
        {loading && <p>Checking certificate…</p>}
        {!loading && error === "notfound" && (
          <>
            <h1 style={{ color: "#b91c1c", fontSize: "1.3rem", margin: 0 }}>✕ Certificate not found</h1>
            <p style={{ color: "#475569" }}>
              No certificate matches this code. It may be forged, or the link was copied wrongly.
            </p>
          </>
        )}
        {!loading && error && error !== "notfound" && <p style={{ color: "#b91c1c" }}>{error}</p>}
        {data && (
          <>
            <h1 style={{ color: valid ? "#15803d" : "#b91c1c", fontSize: "1.3rem", margin: 0 }}>
              {valid ? "✓ Genuine certificate" : "✕ This certificate has been revoked"}
            </h1>
            {!valid && data.revokedReason && <p style={{ color: "#475569" }}>Reason: {data.revokedReason}</p>}
            <dl style={{ margin: "18px 0 0", display: "grid", gap: 12 }}>
              {rows
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b" }}>{k}</dt>
                    <dd style={{ margin: 0, fontWeight: 600 }}>{v}</dd>
                  </div>
                ))}
            </dl>
            {valid && (
              <>
                <button
                  type="button"
                  onClick={download}
                  disabled={downloading}
                  style={{
                    marginTop: 22,
                    width: "100%",
                    padding: "12px 16px",
                    border: 0,
                    borderRadius: 10,
                    background: "#047857",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "1rem",
                    cursor: downloading ? "wait" : "pointer",
                    opacity: downloading ? 0.7 : 1,
                  }}
                >
                  {downloading ? "Preparing PDF…" : "Download certificate (PDF)"}
                </button>
                {downloadError && <p style={{ color: "#b91c1c", margin: "10px 0 0", fontSize: "0.9rem" }}>{downloadError}</p>}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
