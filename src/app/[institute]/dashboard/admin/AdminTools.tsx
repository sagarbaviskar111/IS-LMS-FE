"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError, Tool } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "./admin.module.css";
import Pagination from "../Pagination";



export default function AdminTools() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [form, setForm] = useState({ name: "", url: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", url: "" });
  const [rowError, setRowError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listTools({ page, limit });
      setTools(res.tools);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      await api.createTool(form);
      setForm({ name: "", url: "" });
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not add tool");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (t: Tool) => {
    setEditingId(t._id);
    setEditForm({ name: t.name, url: t.url });
    setRowError("");
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    setRowError("");
    setSavingId(id);
    try {
      await api.updateTool(id, editForm);
      setEditingId(null);
      load();
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : "Could not save changes");
    } finally {
      setSavingId(null);
    }
  };

  const removeTool = async (t: Tool) => {
    if (!window.confirm(`Delete "${t.name}"? This cannot be undone.`)) return;
    setRowError("");
    try {
      await api.deleteTool(t._id);
      load();
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : "Could not delete tool");
    }
  };

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Tools</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Add links to tools your teachers and students should have quick access to — each one shows
        up in their own Tools section and opens the link when clicked.
      </p>

      <div className={styles.grid}>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Add a tool</h2>
            </div>
          </div>

          <form className={styles.form} onSubmit={handleCreate}>
            <label className={styles.label}>
              <span>Name<span className={styles.required}>*</span></span>
              <input
                className={styles.input}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Zoom"
                required
              />
            </label>

            <label className={styles.label}>
              <span>Link<span className={styles.required}>*</span></span>
              <input
                className={styles.input}
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://example.com"
                autoComplete="off"
                inputMode="url"
                required
              />
            </label>

            <div className={styles.formActions}>
              <button className={styles.primaryButton} type="submit" disabled={submitting}>
                {submitting ? "Adding…" : "Add tool"}
              </button>
              {formError && <p className={styles.messageError}>{formError}</p>}
            </div>
          </form>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>All tools</h2>
              <p className={styles.sectionSubtitle}>{total} total</p>
            </div>
          </div>

          {rowError && <p className={styles.messageError}>{rowError}</p>}

          {!loading && tools.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyStateIcon} aria-hidden="true">🔗</span>
              <p className={styles.emptyStateText}>No tools yet — add one above.</p>
            </div>
          )}

          {tools.map((t) =>
            editingId === t._id ? (
              <div key={t._id} className={styles.section} style={{ marginBottom: 12 }}>
                <div className={styles.form}>
                  <label className={styles.label}>
                    <span>Name<span className={styles.required}>*</span></span>
                    <input
                      className={styles.input}
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </label>

                  <label className={styles.label}>
                    <span>Link<span className={styles.required}>*</span></span>
                    <input
                      className={styles.input}
                      type="url"
                      required
                      value={editForm.url}
                      onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                    />
                  </label>

                  <div className={styles.formActions}>
                    <button
                      className={styles.primaryButton}
                      type="button"
                      disabled={savingId === t._id}
                      onClick={() => saveEdit(t._id)}
                    >
                      {savingId === t._id ? "Saving…" : "Save"}
                    </button>
                    <button className={styles.smallButton} type="button" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : null
          )}

          {tools.length > 0 && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Link</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tools
                    .filter((t) => t._id !== editingId)
                    .map((t) => (
                      <tr key={t._id}>
                        <td style={{ overflowWrap: "anywhere", minWidth: 120 }}>{t.name}</td>
                        <td>
                          <a href={t.url} target="_blank" rel="noopener noreferrer" className={styles.linkButton} style={{ overflowWrap: "anywhere", textAlign: "left" }}>
                            {t.url}
                          </a>
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            <button className={styles.smallButton} onClick={() => startEdit(t)}>
                              Edit
                            </button>
                            <button className={styles.dangerButton} onClick={() => removeTool(t)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} limit={limit} onLimitChange={(n) => { setPage(1); setLimit(n); }} />
        </section>
      </div>
    </div>
  );
}
