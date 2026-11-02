"use client";

import { useEffect, useState } from "react";
import { api, MyRegistration, RegistrationDocKind } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import StudentEmptyState from "./StudentEmptyState";
import StudentLoading from "./StudentLoading";

type Loaded = { url: string; pdf: boolean } | "error";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className={dashboardStyles.card}>
      <p className={dashboardStyles.cardLabel}>{label}</p>
      <p className={dashboardStyles.cardValue} style={{ fontSize: "1rem", overflowWrap: "anywhere" }}>
        {value || "—"}
      </p>
    </div>
  );
}

// Read-only: shows what the student submitted at registration. Nothing here can be changed.
export default function StudentDocuments() {
  const [reg, setReg] = useState<MyRegistration | null>(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<Partial<Record<RegistrationDocKind, Loaded>>>({});

  useEffect(() => {
    api
      .myRegistration()
      .then((res) => setReg(res.registration))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!reg) return;
    let alive = true;
    const made: string[] = [];
    reg.documents.forEach(async ({ kind }) => {
      try {
        const blob = await api.myRegistrationFile(kind);
        const url = URL.createObjectURL(blob);
        made.push(url);
        if (alive) setFiles((f) => ({ ...f, [kind]: { url, pdf: blob.type === "application/pdf" } }));
      } catch {
        if (alive) setFiles((f) => ({ ...f, [kind]: "error" }));
      }
    });
    return () => {
      alive = false;
      made.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [reg]);

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>My Documents</h1>
      <p className={dashboardStyles.pageSubtitle}>
        The details and documents you submitted at registration. These are view-only.
      </p>

      {loading && <StudentLoading />}
      {!loading && !reg && (
        <StudentEmptyState
          title="No registration on file"
          hint="Your registration details appear here once you have registered for a course."
        />
      )}

      {reg && (
        <>
          <div className={dashboardStyles.cardGrid} style={{ marginBottom: 20 }}>
            <Field label="Full name" value={reg.name} />
            <Field label="Email" value={reg.email} />
            <Field label="Phone" value={reg.phone} />
            <Field label="Date of birth" value={reg.dateOfBirth ? new Date(reg.dateOfBirth).toLocaleDateString() : ""} />
            <Field label="Address" value={reg.address} />
            <Field label="Course" value={reg.course} />
            <Field label="Payment plan" value={reg.plan === "one_time" ? "One-time payment" : "Installments"} />
            <Field label="Course fee" value={`₹${reg.planTotal}`} />
            <Field label="Registered on" value={new Date(reg.registeredAt).toLocaleDateString()} />
          </div>

          <section className={adminStyles.section}>
            <h2 className={adminStyles.sectionTitle}>Uploaded documents</h2>
            <div
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginTop: 12 }}
            >
              {reg.documents.map((d) => {
                const item = files[d.kind];
                return (
                  <div key={d.kind}>
                    <p className={adminStyles.sectionSubtitle} style={{ marginBottom: 6 }}>
                      {d.label}
                    </p>
                    {!item && <p className={adminStyles.empty}>Loading...</p>}
                    {item === "error" && <p className={adminStyles.messageError}>Could not load</p>}
                    {item && item !== "error" && item.pdf && (
                      <a href={item.url} target="_blank" rel="noreferrer">
                        Open PDF
                      </a>
                    )}
                    {item && item !== "error" && !item.pdf && (
                      <a href={item.url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.url}
                          alt={d.label}
                          style={{ width: "100%", maxHeight: 220, objectFit: "contain", border: "1px solid var(--border)", borderRadius: 8 }}
                        />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
