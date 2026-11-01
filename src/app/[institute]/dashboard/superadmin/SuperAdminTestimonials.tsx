"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, Testimonial } from "@/lib/api";
import { DEFAULT_TESTIMONIALS } from "@/lib/defaultTestimonials";
import dashboardStyles from "../dashboard.module.css";
import styles from "../admin/admin.module.css";
import Modal from "../Modal";

const errMsg = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

export default function SuperAdminTestimonials() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Testimonial | "new" | null>(null);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      setItems((await api.manageTestimonials()).testimonials);
    } catch (err) {
      setError(errMsg(err, "Could not load reviews"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError("");
    try {
      await fn();
      await load();
    } catch (err) {
      setError(errMsg(err, "Something went wrong"));
    } finally {
      setBusy("");
    }
  };

  // Rewrites every row's position so moving never depends on old order values.
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (!items[i] || !items[j]) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    run(items[i]._id, () => Promise.all(next.map((t, idx) => (t.order === idx ? null : api.updateTestimonial(t._id, { order: idx })))));
  };

  const remove = (t: Testimonial) => {
    if (!window.confirm(`Delete the review by ${t.name}?`)) return;
    run(t._id, () => api.deleteTestimonial(t._id));
  };

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Landing Reviews</h1>
      <p className={dashboardStyles.pageSubtitle}>
        The reviews shown on the public landing page. Add, edit, hide or reorder them here.
      </p>

      {error && <p className={styles.messageError}>{error}</p>}

      <section className={styles.section} style={{ marginTop: 16 }}>
        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.sectionTitle}>Reviews ({items.length})</h2>
            <p className={styles.sectionSubtitle}>Shown in this order. Hidden reviews stay saved but are not shown.</p>
          </div>
          <button className={styles.primaryButton} onClick={() => setEditing("new")}>
            + Add review
          </button>
        </div>

        {loading && <p className={styles.empty}>Loading…</p>}

        {!loading && items.length === 0 && (
          <div style={{ display: "grid", gap: 14 }}>
            <p className={styles.sectionSubtitle} style={{ margin: 0 }}>
              No reviews added yet, so the landing page is showing its {DEFAULT_TESTIMONIALS.length} built-in reviews. The
              moment you add your first one here, only your reviews are shown.
            </p>
            <div>
              <button
                className={styles.smallButton}
                disabled={busy === "import"}
                onClick={() => run("import", () => api.importTestimonials(DEFAULT_TESTIMONIALS))}
              >
                {busy === "import" ? "Importing…" : "Copy the built-in reviews here so I can edit them"}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gap: 14 }}>
          {items.map((t, i) => (
            <article
              key={t._id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: 18,
                display: "grid",
                gap: 12,
                opacity: t.isActive ? 1 : 0.6,
                background: "var(--surface)",
              }}
            >
              <p style={{ margin: 0, lineHeight: 1.6 }}>“{t.quote}”</p>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <strong>{t.name}</strong>
                  <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                    {[t.role, t.city].filter(Boolean).join(" · ") || "—"}
                    {!t.isActive && " · Hidden"}
                  </div>
                </div>
                <div className={styles.rowActions}>
                  <button className={styles.smallButton} disabled={i === 0 || !!busy} onClick={() => move(i, -1)} aria-label="Move up">
                    ↑
                  </button>
                  <button
                    className={styles.smallButton}
                    disabled={i === items.length - 1 || !!busy}
                    onClick={() => move(i, 1)}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    className={styles.smallButton}
                    disabled={!!busy}
                    onClick={() => run(t._id, () => api.updateTestimonial(t._id, { isActive: !t.isActive }))}
                  >
                    {t.isActive ? "Hide" : "Show"}
                  </button>
                  <button className={styles.smallButton} onClick={() => setEditing(t)}>
                    Edit
                  </button>
                  <button className={styles.dangerButton} disabled={!!busy} onClick={() => remove(t)}>
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {editing && (
        <ReviewModal
          review={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ReviewModal({ review, onClose, onSaved }: { review: Testimonial | null; onClose: () => void; onSaved: () => void }) {
  const [quote, setQuote] = useState(review?.quote ?? "");
  const [name, setName] = useState(review?.name ?? "");
  const [role, setRole] = useState(review?.role ?? "");
  const [city, setCity] = useState(review?.city ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { quote: quote.trim(), name: name.trim(), role: role.trim(), city: city.trim() };
      if (review) await api.updateTestimonial(review._id, payload);
      else await api.createTestimonial(payload);
      onSaved();
    } catch (err) {
      setError(errMsg(err, "Could not save the review"));
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} dialogStyle={{ maxWidth: 560, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
      <div className={dashboardStyles.modalHead}>
        <h2 className={styles.sectionTitle}>{review ? "Edit review" : "Add review"}</h2>
        <button className={dashboardStyles.modalCloseButton} type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <form className={styles.form} onSubmit={submit}>
        <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
          <span>
            Review <span style={{ color: "var(--muted)", fontWeight: 400 }}>({quote.length}/600)</span>
          </span>
          <textarea
            className={styles.input}
            style={{ minHeight: 130, resize: "vertical", lineHeight: 1.5 }}
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            maxLength={600}
            required
          />
        </label>
        <label className={styles.label}>
          Name
          <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
        </label>
        <label className={styles.label}>
          City
          <input className={styles.input} value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} />
        </label>
        <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
          Role / institute
          <input
            className={styles.input}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            maxLength={120}
            placeholder="e.g. Founder, Sunrise Classes"
          />
        </label>
        {error && (
          <p className={styles.messageError} style={{ gridColumn: "1 / -1" }}>
            {error}
          </p>
        )}
        <div className={styles.formActions}>
          <button className={styles.primaryButton} disabled={saving}>
            {saving ? "Saving…" : "Save review"}
          </button>
          <button type="button" className={styles.smallButton} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
