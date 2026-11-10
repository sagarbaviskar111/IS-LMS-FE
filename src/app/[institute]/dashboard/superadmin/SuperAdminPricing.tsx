"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, BillingPlan, BillingSettings } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "../admin/admin.module.css";
import Modal from "../Modal";

const errMsg = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

type RazorpayInfo = { mode: "gateway" | "dev" | "none"; configured: boolean };

export default function SuperAdminPricing() {
  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [razorpay, setRazorpay] = useState<RazorpayInfo | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<BillingPlan | "new" | null>(null);
  const [busy, setBusy] = useState("");
  // Synchronous guard: state updates are async, so a fast double click could
  // otherwise fire the same request twice before `busy` re-renders.
  const lock = useRef(false);

  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([api.saBillingSettings(), api.saBillingPlans()]);
      setSettings(s.settings);
      setRazorpay(s.razorpay);
      setPlans(p.plans);
    } catch (err) {
      setError(errMsg(err, "Could not load pricing"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (key: string, fn: () => Promise<unknown>, done?: string) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(key);
    setError("");
    setNotice("");
    try {
      await fn();
      await load();
      if (done) setNotice(done);
    } catch (err) {
      setError(errMsg(err, "Something went wrong"));
    } finally {
      lock.current = false;
      setBusy("");
    }
  };

  const set = <K extends keyof BillingSettings>(key: K, value: BillingSettings[K]) =>
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  const setNum = (key: keyof BillingSettings, raw: string) => set(key, (raw === "" ? 0 : Number(raw)) as never);

  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    run("settings", () => api.saUpdateBillingSettings(settings), "Pricing settings saved.");
  };

  const removePlan = (p: BillingPlan) => {
    if (!window.confirm(`Delete the plan "${p.name}"?`)) return;
    run(p._id, () => api.saDeleteBillingPlan(p._id), "Plan deleted.");
  };

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Plans &amp; Pricing</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Decide how institutes pay for the platform: fixed plans with a student cap, or a rate per student.
      </p>

      {error && <p className={styles.messageError}>{error}</p>}
      {notice && <p className={styles.messageSuccess}>{notice}</p>}
      {loading && <p className={styles.empty}>Loading…</p>}

      {razorpay && (
        <section className={styles.section} style={{ marginTop: 16 }}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Payment gateway</h2>
              <p className={styles.sectionSubtitle}>The platform&apos;s own Razorpay account, used to collect subscription fees.</p>
            </div>
            <span className={razorpay.mode === "gateway" ? styles.badgeSuccess : styles.badgePending}>
              {razorpay.mode === "gateway" ? "Razorpay keys set" : razorpay.mode === "dev" ? "Test mode (simulated)" : "Not available"}
            </span>
          </div>
          {razorpay.mode === "gateway" ? (
            <p className={styles.sectionSubtitle} style={{ margin: 0 }}>
              Subscription payments go through Razorpay checkout. Keys are read from Backend/.env.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              <p className={styles.sectionSubtitle} style={{ margin: 0 }}>
                {razorpay.mode === "dev"
                  ? "No keys found, so payments are simulated on this development machine and no money moves."
                  : "No keys found and this is not a development machine, so institutes cannot pay online."}
              </p>
              <p className={styles.sectionSubtitle} style={{ margin: 0 }}>
                To go live, add these two lines to <code>Backend/.env</code> and restart the backend:
              </p>
              <pre
                style={{
                  margin: 0,
                  padding: 12,
                  background: "var(--surface-alt)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.85rem",
                  overflowX: "auto",
                }}
              >
                {"RAZORPAY_KEY_ID=rzp_test_xxxxxxxx\nRAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx"}
              </pre>
              <p className={styles.hint} style={{ margin: 0 }}>
                Use test keys first. Switch to rzp_live keys when you start taking real payments.
              </p>
            </div>
          )}
        </section>
      )}

      {settings && (
        <section className={styles.section} style={{ marginTop: 16 }}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Pricing model</h2>
              <p className={styles.sectionSubtitle}>Applies to every institute that does not have its own price override.</p>
            </div>
          </div>
          <form className={styles.form} onSubmit={saveSettings}>
            <label className={`${styles.label} ${styles.fullRow}`}>
              Charge by
              <select
                className={styles.input}
                value={settings.pricingMode}
                onChange={(e) => set("pricingMode", e.target.value as BillingSettings["pricingMode"])}
              >
                <option value="plan">Fixed plans (student cap per plan)</option>
                <option value="per_student">Per student (price follows active student count)</option>
              </select>
              <span className={styles.hint}>
                {settings.pricingMode === "plan"
                  ? "Institutes pick one of the plans below. The plan sets the student limit."
                  : "Plans below are ignored for pricing. Bill = students × rate, no student cap."}
              </span>
            </label>

            {settings.pricingMode === "per_student" && (
              <>
                <label className={styles.label}>
                  Rate per student / month (₹)
                  <input className={styles.input} type="number" min={0} value={settings.perStudentPrice} onChange={(e) => setNum("perStudentPrice", e.target.value)} />
                </label>
                <label className={styles.label}>
                  Minimum billed students
                  <input className={styles.input} type="number" min={0} value={settings.perStudentMin} onChange={(e) => setNum("perStudentMin", e.target.value)} />
                </label>
                <label className={styles.label}>
                  Yearly discount (%)
                  <input className={styles.input} type="number" min={0} max={90} value={settings.yearlyDiscountPercent} onChange={(e) => setNum("yearlyDiscountPercent", e.target.value)} />
                </label>
              </>
            )}

            <label className={styles.label}>
              Free trial (days)
              <input className={styles.input} type="number" min={0} max={365} value={settings.trialDays} onChange={(e) => setNum("trialDays", e.target.value)} />
            </label>
            <label className={styles.label}>
              Student limit during trial
              <input className={styles.input} type="number" min={0} value={settings.trialStudentLimit} onChange={(e) => setNum("trialStudentLimit", e.target.value)} />
              <span className={styles.hint}>0 means unlimited.</span>
            </label>
            <label className={styles.label}>
              GST (%)
              <input className={styles.input} type="number" min={0} max={40} value={settings.gstPercent} onChange={(e) => setNum("gstPercent", e.target.value)} />
              <span className={styles.hint}>Added on top of the prices shown.</span>
            </label>

            <label className={`${styles.label} ${styles.fullRow}`} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <input type="checkbox" checked={settings.enforceLimits} onChange={(e) => set("enforceLimits", e.target.checked)} />
              <span>Enforce limits: block adding students when the trial/plan has ended or the cap is reached</span>
            </label>
            <label className={`${styles.label} ${styles.fullRow}`} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <input type="checkbox" checked={settings.signupOpen} onChange={(e) => set("signupOpen", e.target.checked)} />
              <span>Public signup is open (new institutes can start a trial)</span>
            </label>

            <div className={`${styles.formActions} ${styles.fullRow}`}>
              <button className={styles.primaryButton} disabled={!!busy}>
                {busy === "settings" ? "Saving…" : "Save pricing settings"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className={styles.section} style={{ marginTop: 16 }}>
        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.sectionTitle}>Plans ({plans.length})</h2>
            <p className={styles.sectionSubtitle}>
              Prices are before GST. Hidden plans can&apos;t be bought, but current subscribers keep them.
              {settings?.pricingMode === "per_student" && " Per-student pricing is active, so plan prices are not used right now."}
            </p>
          </div>
          <button className={styles.primaryButton} disabled={!!busy} onClick={() => setEditing("new")}>
            + Add plan
          </button>
        </div>

        {!loading && plans.length === 0 && <p className={styles.empty}>No plans yet.</p>}

        {plans.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Monthly</th>
                  <th>Yearly</th>
                  <th>Students</th>
                  <th>Subscribers</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p._id} style={{ opacity: p.isActive ? 1 : 0.6 }}>
                    <td>
                      <strong>{p.name}</strong>
                      {p.isPopular && <span className={styles.badge} style={{ marginLeft: 8 }}>Most chosen</span>}
                      <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{p.tagline || "—"}</div>
                    </td>
                    <td>{inr(p.priceMonthly)}</td>
                    <td>{inr(p.priceYearly)}</td>
                    <td>{p.studentLimit === 0 ? "Unlimited" : p.studentLimit}</td>
                    <td>{p.subscribers ?? 0}</td>
                    <td>
                      <span className={p.isActive ? styles.badgeSuccess : styles.badgeInactive}>{p.isActive ? "Visible" : "Hidden"}</span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          className={styles.smallButton}
                          disabled={!!busy}
                          onClick={() => run(p._id, () => api.saUpdateBillingPlan(p._id, { isActive: !p.isActive }))}
                        >
                          {busy === p._id ? "Saving…" : p.isActive ? "Hide" : "Show"}
                        </button>
                        <button className={styles.smallButton} disabled={!!busy} onClick={() => setEditing(p)}>
                          Edit
                        </button>
                        <button className={styles.dangerButton} disabled={!!busy} onClick={() => removePlan(p)}>
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
      </section>

      {editing && (
        <PlanModal
          plan={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setNotice("Plan saved.");
            load();
          }}
        />
      )}
    </div>
  );
}

function PlanModal({ plan, onClose, onSaved }: { plan: BillingPlan | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(plan?.name ?? "");
  const [tagline, setTagline] = useState(plan?.tagline ?? "");
  const [priceMonthly, setPriceMonthly] = useState(String(plan?.priceMonthly ?? 0));
  const [priceYearly, setPriceYearly] = useState(String(plan?.priceYearly ?? 0));
  const [studentLimit, setStudentLimit] = useState(String(plan?.studentLimit ?? 0));
  const [order, setOrder] = useState(String(plan?.order ?? 0));
  const [features, setFeatures] = useState((plan?.features ?? []).join("\n"));
  const [isPopular, setIsPopular] = useState(plan?.isPopular ?? false);
  const [isActive, setIsActive] = useState(plan?.isActive ?? true);
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
      const payload = {
        name: name.trim(),
        tagline: tagline.trim(),
        priceMonthly: Number(priceMonthly) || 0,
        priceYearly: Number(priceYearly) || 0,
        studentLimit: Number(studentLimit) || 0,
        order: Number(order) || 0,
        features: features.split("\n").map((f) => f.trim()).filter(Boolean),
        isPopular,
        isActive,
      };
      if (plan) await api.saUpdateBillingPlan(plan._id, payload);
      else await api.saCreateBillingPlan(payload);
      onSaved();
    } catch (err) {
      setError(errMsg(err, "Could not save the plan"));
      lock.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} dialogStyle={{ maxWidth: 600, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
      <div className={dashboardStyles.modalHead}>
        <h2 className={styles.sectionTitle}>{plan ? "Edit plan" : "Add plan"}</h2>
        <button className={dashboardStyles.modalCloseButton} type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <form className={styles.form} onSubmit={submit}>
        <label className={styles.label}>
          <span>
            Name<span className={styles.required}>*</span>
          </span>
          <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required autoComplete="off" />
        </label>
        <label className={styles.label}>
          Sort order
          <input className={styles.input} type="number" value={order} onChange={(e) => setOrder(e.target.value)} />
          <span className={styles.hint}>Lower comes first.</span>
        </label>
        <label className={`${styles.label} ${styles.fullRow}`}>
          Tagline
          <input className={styles.input} value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={160} autoComplete="off" />
        </label>
        <label className={styles.label}>
          Monthly price (₹)
          <input className={styles.input} type="number" min={0} value={priceMonthly} onChange={(e) => setPriceMonthly(e.target.value)} />
        </label>
        <label className={styles.label}>
          Yearly price (₹)
          <input className={styles.input} type="number" min={0} value={priceYearly} onChange={(e) => setPriceYearly(e.target.value)} />
        </label>
        <label className={`${styles.label} ${styles.fullRow}`}>
          Student limit
          <input className={styles.input} type="number" min={0} value={studentLimit} onChange={(e) => setStudentLimit(e.target.value)} />
          <span className={styles.hint}>0 means unlimited.</span>
        </label>
        <label className={`${styles.label} ${styles.fullRow}`}>
          Features (one per line)
          <textarea className={styles.input} style={{ minHeight: 140 }} value={features} onChange={(e) => setFeatures(e.target.value)} />
        </label>
        <label className={`${styles.label} ${styles.fullRow}`} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <input type="checkbox" checked={isPopular} onChange={(e) => setIsPopular(e.target.checked)} />
          <span>Highlight as &quot;Most chosen&quot; (only one plan can be)</span>
        </label>
        <label className={`${styles.label} ${styles.fullRow}`} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <span>Visible and available to buy</span>
        </label>
        {error && <p className={`${styles.messageError} ${styles.fullRow}`}>{error}</p>}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.smallButton} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.primaryButton} disabled={saving}>
            {saving ? "Saving…" : "Save plan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
