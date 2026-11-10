"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, DemoRequest, DemoStatus } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "../admin/admin.module.css";
import Modal from "../Modal";
import Pagination from "../Pagination";

const errMsg = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);
const when = (d: string) =>
  new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const STATUSES: { value: DemoStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "demo_scheduled", label: "Demo scheduled" },
  { value: "demo_done", label: "Demo done" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "spam", label: "Spam" },
];
const BAND_LABEL: Record<string, string> = {
  under_50: "Under 50",
  "50_150": "50 to 150",
  "150_300": "150 to 300",
  "300_750": "300 to 750",
  "750_1500": "750 to 1,500",
  "1500_plus": "1,500+",
};

// wa.me wants digits only with a country code; a bare 10-digit number is Indian.
const waLink = (phone: string) => {
  let d = phone.replace(/\D/g, "");
  if (d.length === 10) d = `91${d}`;
  return `https://wa.me/${d}`;
};
const telLink = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
const toDateInput = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

const EMPTY_COUNTS: Record<DemoStatus, number> = {
  new: 0,
  contacted: 0,
  demo_scheduled: 0,
  demo_done: 0,
  won: 0,
  lost: 0,
  spam: 0,
};

export default function SuperAdminDemoRequests() {
  const [rows, setRows] = useState<DemoRequest[]>([]);
  const [counts, setCounts] = useState<Record<DemoStatus, number>>(EMPTY_COUNTS);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState<"" | DemoStatus>("");
  const [due, setDue] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [noteFor, setNoteFor] = useState<DemoRequest | null>(null);
  const busyRef = useRef(false);

  // Debounce the search box so each keystroke does not hit the API.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    try {
      const res = await api.saDemoRequests({ status: status || undefined, q: q || undefined, page, limit, due });
      setRows(res.requests);
      setCounts({ ...EMPTY_COUNTS, ...res.counts });
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setError("");
    } catch (err) {
      setError(errMsg(err, "Could not load demo requests"));
    } finally {
      setLoading(false);
    }
  }, [status, q, page, limit, due]);

  useEffect(() => {
    load();
  }, [load]);

  // One action at a time: the lock makes a double click harmless.
  const run = async (key: string, fn: () => Promise<unknown>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(key);
    setError("");
    try {
      await fn();
      await load();
    } catch (err) {
      setError(errMsg(err, "Something went wrong"));
    } finally {
      busyRef.current = false;
      setBusy("");
    }
  };

  const setStatusOf = (r: DemoRequest, next: DemoStatus) => run(r._id, () => api.saUpdateDemoRequest(r._id, { status: next }));
  const setFollowUp = (r: DemoRequest, value: string) =>
    run(r._id, () => api.saUpdateDemoRequest(r._id, { followUpAt: value ? new Date(`${value}T09:00:00`).toISOString() : null }));
  const remove = (r: DemoRequest) => {
    if (!window.confirm(`Delete the request from ${r.name}?`)) return;
    run(r._id, () => api.saDeleteDemoRequest(r._id));
  };

  const pickStatus = (s: "" | DemoStatus) => {
    setStatus(s);
    setPage(1);
  };
  const allCount = Object.values(counts).reduce((t, n) => t + n, 0);
  const overdue = (r: DemoRequest) =>
    !!r.followUpAt && new Date(r.followUpAt).getTime() <= Date.now() && !["won", "lost", "spam"].includes(r.status);

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Demo Requests</h1>
      <p className={dashboardStyles.pageSubtitle}>
        People who asked for a demo from the website. Call or WhatsApp them, then keep the status and follow-up date current.
      </p>

      {error && <p className={styles.messageError}>{error}</p>}

      <section className={styles.section} style={{ marginTop: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <button className={status === "" ? styles.primaryButton : styles.smallButton} onClick={() => pickStatus("")}>
            All ({allCount})
          </button>
          {STATUSES.map((s) => (
            <button
              key={s.value}
              className={status === s.value ? styles.primaryButton : styles.smallButton}
              onClick={() => pickStatus(s.value)}
            >
              {s.label} ({counts[s.value]})
            </button>
          ))}
        </div>

        <div className={styles.form} style={{ marginBottom: 14, alignItems: "center" }}>
          <input
            className={styles.input}
            placeholder="Search name, phone, email, institute or city"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.9rem" }}>
            <input
              type="checkbox"
              checked={due}
              onChange={(e) => {
                setDue(e.target.checked);
                setPage(1);
              }}
            />
            Follow-up due
          </label>
        </div>

        {loading && <p className={styles.empty}>Loading requests…</p>}
        {!loading && rows.length === 0 && <p className={styles.empty}>No demo requests match.</p>}

        {rows.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Received</th>
                  <th>Contact</th>
                  <th>Institute</th>
                  <th>Uses now</th>
                  <th>Status</th>
                  <th>Follow-up</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} style={r.status === "new" ? { background: "var(--brand-soft)" } : undefined}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {when(r.createdAt)}
                      {r.source && r.source !== "website" && (
                        <div style={{ color: "var(--muted)", fontSize: "0.78rem" }}>{r.source}</div>
                      )}
                    </td>
                    <td>
                      <strong>{r.name}</strong>
                      <div style={{ fontSize: "0.85rem" }}>
                        <a href={telLink(r.phone)}>{r.phone}</a>
                        {" · "}
                        <a href={waLink(r.phone)} target="_blank" rel="noopener noreferrer">
                          WhatsApp
                        </a>
                      </div>
                      {r.email && (
                        <div style={{ fontSize: "0.82rem", color: "var(--muted)", overflowWrap: "anywhere" }}>
                          <a href={`mailto:${r.email}`}>{r.email}</a>
                        </div>
                      )}
                      {r.preferredTime && (
                        <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Prefers: {r.preferredTime}</div>
                      )}
                    </td>
                    <td>
                      {r.instituteName || "—"}
                      <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                        {[r.city, r.studentCount ? `${BAND_LABEL[r.studentCount]} students` : ""].filter(Boolean).join(" · ")}
                      </div>
                    </td>
                    <td>{r.currentTool || "—"}</td>
                    <td>
                      <select
                        className={styles.input}
                        value={r.status}
                        disabled={busy === r._id}
                        onChange={(e) => setStatusOf(r, e.target.value as DemoStatus)}
                        aria-label={`Status for ${r.name}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className={styles.input}
                        type="date"
                        value={toDateInput(r.followUpAt)}
                        disabled={busy === r._id}
                        onChange={(e) => setFollowUp(r, e.target.value)}
                        aria-label={`Follow-up date for ${r.name}`}
                        style={overdue(r) ? { borderColor: "var(--danger, #b42318)" } : undefined}
                      />
                      {overdue(r) && <div style={{ fontSize: "0.78rem", color: "var(--danger, #b42318)" }}>Due</div>}
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button className={styles.smallButton} disabled={busy === r._id} onClick={() => setNoteFor(r)}>
                          {r.note ? "Note" : "Add note"}
                        </button>
                        <button className={styles.smallButton} disabled={busy === r._id} onClick={() => remove(r)}>
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

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          limit={limit}
          onLimitChange={(n) => {
            setLimit(n);
            setPage(1);
          }}
        />
      </section>

      {noteFor && (
        <NoteModal
          request={noteFor}
          onClose={() => setNoteFor(null)}
          onSaved={() => {
            setNoteFor(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function NoteModal({ request, onClose, onSaved }: { request: DemoRequest; onClose: () => void; onSaved: () => void }) {
  const [note, setNote] = useState(request.note);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    setError("");
    try {
      await api.saUpdateDemoRequest(request._id, { note });
      onSaved();
    } catch (err) {
      setError(errMsg(err, "Could not save the note"));
      lock.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} dialogStyle={{ maxWidth: 520, width: "100%" }}>
      <div className={dashboardStyles.modalHead}>
        <h2 className={styles.sectionTitle}>{request.name}</h2>
        <button className={dashboardStyles.modalCloseButton} type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <p className={styles.sectionSubtitle} style={{ marginTop: 0 }}>
        {request.instituteName}
        {request.city && ` · ${request.city}`}
      </p>
      <form className={styles.form} onSubmit={save}>
        <label className={`${styles.label} ${styles.fullRow}`}>
          Note (only you see this)
          <textarea
            className={styles.input}
            style={{ minHeight: 120 }}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            autoFocus
          />
        </label>
        {error && <p className={`${styles.messageError} ${styles.fullRow}`}>{error}</p>}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.smallButton} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.primaryButton} disabled={saving}>
            {saving ? "Saving…" : "Save note"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
