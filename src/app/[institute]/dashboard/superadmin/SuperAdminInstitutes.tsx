"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, BillingInterval, BillingPlan, InstituteSubscriptionRow, SubscriptionsOverview } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "../admin/admin.module.css";
import Modal from "../Modal";

const errMsg = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const date = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");

type State = InstituteSubscriptionRow["state"];
const STATE_LABEL: Record<State, string> = { legacy: "Legacy", trial: "Trial", active: "Active", expired: "Expired", cancelled: "Cancelled" };
const stateClass = (s: State) =>
  s === "active" ? styles.badgeSuccess : s === "trial" ? styles.badge : s === "expired" || s === "cancelled" ? styles.badgePending : styles.badgeInactive;

export default function SuperAdminInstitutes() {
  const [data, setData] = useState<SubscriptionsOverview | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | State>("all");
  const [managing, setManaging] = useState<InstituteSubscriptionRow | null>(null);

  const load = useCallback(async () => {
    try {
      const [d, p] = await Promise.all([api.saSubscriptions(), api.saBillingPlans()]);
      setData(d);
      setPlans(p.plans);
    } catch (err) {
      setError(errMsg(err, "Could not load institutes"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.institutes ?? []).filter(
      (r) =>
        (filter === "all" || r.state === filter) &&
        (!q || [r.name, r.email, r.slug, r.phone].some((v) => (v || "").toLowerCase().includes(q)))
    );
  }, [data, search, filter]);

  const s = data?.summary;
  const cards: [string, string][] = s
    ? [
        ["Institutes", String(s.institutes)],
        ["On trial", String(s.trial)],
        ["Paid / active", String(s.active)],
        ["Expired", String(s.expired)],
        ["Legacy (free)", String(s.legacy)],
        ["Revenue this month", inr(s.revenueThisMonth)],
        ["Total revenue", inr(s.revenueTotal)],
      ]
    : [];

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Institutes &amp; Billing</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Every institute on the platform, where it stands on its plan, and what it has paid. Amounts include GST.
      </p>

      {error && <p className={styles.messageError}>{error}</p>}
      {loading && <p className={styles.empty}>Loading…</p>}

      {s && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: 16 }}>
          {cards.map(([label, value]) => (
            <div key={label} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 14, background: "var(--surface)" }}>
              <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{label}</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: 4 }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {data && (
        <section className={styles.section} style={{ marginTop: 16 }}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Institutes ({rows.length})</h2>
              <p className={styles.sectionSubtitle}>Legacy means the institute joined before billing and is never limited.</p>
            </div>
          </div>
          <div className={styles.form} style={{ marginBottom: 14 }}>
            <input
              className={styles.input}
              placeholder="Search name, email, phone or link"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className={styles.input} value={filter} onChange={(e) => setFilter(e.target.value as "all" | State)}>
              <option value="all">All states</option>
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="legacy">Legacy</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {rows.length === 0 ? (
            <p className={styles.empty}>No institutes match.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Institute</th>
                    <th>State</th>
                    <th>Plan</th>
                    <th>Students</th>
                    <th>Ends</th>
                    <th>Paid</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.adminId}>
                      <td>
                        <strong>{r.name}</strong>
                        <div style={{ color: "var(--muted)", fontSize: "0.82rem", overflowWrap: "anywhere" }}>
                          {r.email}
                          {r.slug && ` · /${r.slug}`}
                        </div>
                      </td>
                      <td>
                        <span className={stateClass(r.state)}>{STATE_LABEL[r.state]}</span>
                      </td>
                      <td>
                        {r.planName || "—"}
                        {r.interval && <span style={{ color: "var(--muted)" }}> · {r.interval}</span>}
                        {r.customPrice !== null && <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Custom {inr(r.customPrice)}</div>}
                      </td>
                      <td>
                        {r.students}
                        {r.state !== "legacy" && ` / ${r.limit ? r.limit : "∞"}`}
                      </td>
                      <td>{date(r.end)}</td>
                      <td>{inr(r.paidTotal)}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <button className={styles.smallButton} onClick={() => setManaging(r)}>
                            Manage
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {data && (
        <section className={styles.section} style={{ marginTop: 16 }}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Recent payments</h2>
          </div>
          {data.recentPayments.length === 0 ? (
            <p className={styles.empty}>No payments received yet.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Institute</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Paid on</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentPayments.map((p) => (
                    <tr key={p._id}>
                      <td>{p.institute}</td>
                      <td>
                        {p.planName} · {p.interval}
                      </td>
                      <td>
                        {inr(p.total)}
                        {p.mode === "dev" && <span className={styles.badgeInactive} style={{ marginLeft: 8 }}>Test</span>}
                      </td>
                      <td>{date(p.paidAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {managing && (
        <ManageModal
          row={managing}
          plans={plans}
          onClose={() => setManaging(null)}
          onSaved={() => {
            setManaging(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ManageModal({
  row,
  plans,
  onClose,
  onSaved,
}: {
  row: InstituteSubscriptionRow;
  plans: BillingPlan[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [planId, setPlanId] = useState(row.planId ?? "");
  const [interval, setInterval_] = useState<BillingInterval>(row.interval ?? "monthly");
  const [status, setStatus] = useState<"trial" | "active" | "cancelled">(
    row.state === "trial" ? "trial" : row.state === "cancelled" ? "cancelled" : "active"
  );
  const [extendDays, setExtendDays] = useState("");
  const [customPrice, setCustomPrice] = useState(row.customPrice === null ? "" : String(row.customPrice));
  const [limitOverride, setLimitOverride] = useState(row.studentLimitOverride === null ? "" : String(row.studentLimitOverride));
  const [note, setNote] = useState(row.note);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    setError("");
    try {
      const days = extendDays.trim() === "" ? 0 : Number(extendDays);
      if (!Number.isFinite(days)) throw new Error("Extend days must be a number");
      await api.saUpdateSubscription(row.adminId, {
        planId: planId || null,
        interval,
        status,
        ...(days !== 0 ? { extendDays: days } : {}),
        customPrice: customPrice.trim() === "" ? null : Number(customPrice),
        studentLimitOverride: limitOverride.trim() === "" ? null : Number(limitOverride),
        note,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : errMsg(err, "Could not update the institute"));
      lock.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} dialogStyle={{ maxWidth: 560, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
      <div className={dashboardStyles.modalHead}>
        <h2 className={styles.sectionTitle}>{row.name}</h2>
        <button className={dashboardStyles.modalCloseButton} type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <p className={styles.sectionSubtitle} style={{ marginTop: 0 }}>
        {row.email} · {row.students} students · {STATE_LABEL[row.state]}
        {row.end && ` · ends ${date(row.end)}`}
      </p>
      <form className={styles.form} onSubmit={submit}>
        <label className={styles.label}>
          Plan
          <select className={styles.input} value={planId} onChange={(e) => setPlanId(e.target.value)}>
            <option value="">No plan</option>
            {plans.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
                {!p.isActive ? " (hidden)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.label}>
          Billing cycle
          <select className={styles.input} value={interval} onChange={(e) => setInterval_(e.target.value as BillingInterval)}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>
        <label className={styles.label}>
          Status
          <select className={styles.input} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="trial">Trial</option>
            <option value="active">Active (paid)</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className={styles.label}>
          Extend by (days)
          <input className={styles.input} type="number" value={extendDays} onChange={(e) => setExtendDays(e.target.value)} placeholder="e.g. 7 or -3" />
          <span className={styles.hint}>Adds to the trial or paid period. Negative shortens it.</span>
        </label>
        <label className={styles.label}>
          Special price per cycle (₹, before GST)
          <input className={styles.input} type="number" min={0} value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} />
          <span className={styles.hint}>Leave empty to use the normal price.</span>
        </label>
        <label className={styles.label}>
          Student limit override
          <input className={styles.input} type="number" min={0} value={limitOverride} onChange={(e) => setLimitOverride(e.target.value)} />
          <span className={styles.hint}>Empty uses the plan limit. 0 means unlimited.</span>
        </label>
        <label className={`${styles.label} ${styles.fullRow}`}>
          Note (only you see this)
          <textarea className={styles.input} style={{ minHeight: 70 }} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        </label>
        {row.state === "legacy" && (
          <p className={`${styles.hint} ${styles.fullRow}`}>
            This institute has no subscription yet. Saving creates one, and from then on its limits apply.
          </p>
        )}
        {error && <p className={`${styles.messageError} ${styles.fullRow}`}>{error}</p>}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.smallButton} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.primaryButton} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
