"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError, InquiryForm } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "./admin.module.css";
import b from "./inquiry.module.css";

// role="telecaller" is the view-only version for callers: they can copy the
// link and read responses (and add people to leads), but not build or change forms.
export default function AdminInquiryForms({ role = "admin" }: { role?: "admin" | "telecaller" }) {
  const { institute } = useParams<{ institute: string }>();
  const base = `/${institute}/dashboard/${role}/inquiry-forms`;
  const readOnly = role === "telecaller";

  const [forms, setForms] = useState<InquiryForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.listInquiryForms();
      setForms(res.forms);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load forms");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fullUrl = (f: InquiryForm) => `${window.location.origin}${f.path}`;

  const copy = async (f: InquiryForm) => {
    try {
      await navigator.clipboard.writeText(fullUrl(f));
      setCopiedId(f._id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      window.prompt("Copy this link", fullUrl(f));
    }
  };

  const toggle = async (f: InquiryForm) => {
    setError("");
    try {
      await api.updateInquiryForm(f._id, { isActive: !f.isActive });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the form");
    }
  };

  const remove = async (f: InquiryForm) => {
    if (!window.confirm(`Delete "${f.subject}" and all ${f.responseCount} of its responses? This can't be undone.`)) return;
    setError("");
    try {
      await api.deleteInquiryForm(f._id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the form");
    }
  };

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Inquiry forms</h1>
      <p className={dashboardStyles.pageSubtitle}>
        {readOnly
          ? "Read the responses students have sent and add the right people to your leads."
          : "Build a form, share its link with students, and see every response in one place."}
      </p>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.sectionTitle}>Your forms</h2>
            <p className={styles.sectionSubtitle}>{forms.length} total</p>
          </div>
          {!readOnly && (
            <Link href={`${base}/new`} className={styles.primaryButton}>
              + Create inquiry form
            </Link>
          )}
        </div>

        {error && <p className={styles.messageError}>{error}</p>}

        {!loading && forms.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyStateIcon} aria-hidden="true">📝</span>
            <p className={styles.emptyStateText}>
              {readOnly ? "No inquiry forms yet." : "No forms yet — create your first inquiry form."}
            </p>
          </div>
        )}

        {forms.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Responses</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Link</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {forms.map((f) => (
                  <tr key={f._id}>
                    <td>{f.subject}</td>
                    <td>{f.responseCount}</td>
                    <td>
                      <span className={f.isActive ? styles.badgeSuccess : styles.badgeInactive}>
                        {f.isActive ? "Accepting" : "Closed"}
                      </span>
                    </td>
                    <td>{new Date(f.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className={b.linkRow}>
                        <button className={styles.smallButton} onClick={() => copy(f)}>
                          {copiedId === f._id ? "Copied!" : "Copy link"}
                        </button>
                        <a className={styles.smallButton} href={f.path} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      </div>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <Link
                          href={readOnly ? `${base}/${f._id}` : `${base}/${f._id}/responses`}
                          className={styles.primaryButton}
                        >
                          Responses
                        </Link>
                        {!readOnly && (
                          <>
                            <Link href={`${base}/${f._id}`} className={styles.smallButton}>
                              Edit
                            </Link>
                            <button className={styles.smallButton} onClick={() => toggle(f)}>
                              {f.isActive ? "Close" : "Reopen"}
                            </button>
                            <button className={styles.dangerButton} onClick={() => remove(f)}>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
