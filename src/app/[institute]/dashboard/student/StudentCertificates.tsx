"use client";

import { useEffect, useState } from "react";
import { api, ApiError, Certificate } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import StudentEmptyState from "./StudentEmptyState";
import StudentLoading from "./StudentLoading";

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default function StudentCertificates() {
  const [items, setItems] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    api
      .myCertificates()
      .then((r) => setItems(r.certificates))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load certificates"))
      .finally(() => setLoading(false));
  }, []);

  const download = async (c: Certificate) => {
    setBusy(c._id);
    setError("");
    try {
      const blob = await api.myCertificatePdf(c._id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${c.certificateNo.replace(/[^\w.-]+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not download");
    } finally {
      setBusy("");
    }
  };

  if (loading) return <StudentLoading />;

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>My Certificates</h1>
      <p className={dashboardStyles.pageSubtitle}>Download your certificates. Each has a QR code that proves it is genuine.</p>
      {error && <p className={adminStyles.messageError}>{error}</p>}
      {items.length === 0 && !error && (
        <StudentEmptyState title="No certificates yet" hint="When your institute issues one, it will appear here." />
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))", gap: 16, marginTop: 16 }}>
        {items.map((c) => (
          <div key={c._id} className={dashboardStyles.card}>
            <p className={dashboardStyles.cardLabel}>{c.templateName}</p>
            <p className={dashboardStyles.cardValue} style={{ fontSize: "1.05rem", overflowWrap: "anywhere" }}>
              {c.course || "Certificate"}
            </p>
            <p style={{ margin: "6px 0", color: "var(--muted)", fontSize: "0.85rem" }}>
              No. {c.certificateNo}
              <br />
              Issued {fmt(c.date)}
              {c.grade ? ` · Grade ${c.grade}` : ""}
            </p>
            <button className={adminStyles.primaryButton} onClick={() => download(c)} disabled={busy === c._id}>
              {busy === c._id ? "Preparing…" : "Download PDF"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
