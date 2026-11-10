"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, BillingAccess, BillingInterval, BillingInvoice, BillingOrder, BillingPlan, BillingQuote, BillingSettings } from "@/lib/api";
import { PaymentCancelled, payWithRazorpay } from "@/lib/razorpay";
import dashboardStyles from "../../dashboard.module.css";
import styles from "../admin.module.css";
import local from "./billing.module.css";

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "");

interface Data {
  access: BillingAccess;
  settings: BillingSettings;
  plans: BillingPlan[];
  mode: "gateway" | "dev" | "none";
  payments: BillingInvoice[];
}

function statusText(a: BillingAccess): { title: string; meta: string; bad: boolean } {
  const plan = a.plan?.name;
  if (a.state === "legacy") return { title: "Free access", meta: "Your institute joined before billing started, so there is no limit on your account.", bad: false };
  if (a.state === "trial") {
    const left = a.daysLeft ?? 0;
    return { title: "Free trial", meta: left > 0 ? `${left} day${left === 1 ? "" : "s"} left, ends ${day(a.end)}.` : "Your trial ends today.", bad: left <= 3 };
  }
  if (a.state === "expired") return { title: `${plan ? plan + " plan" : "Subscription"} ended`, meta: `Ended ${day(a.end)}. Existing data is safe, but you cannot add new students until you renew.`, bad: true };
  return { title: `${plan || "Plan"} (${a.interval === "yearly" ? "yearly" : "monthly"})`, meta: `Active until ${day(a.end)}.`, bad: false };
}

export default function AdminBilling() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [interval, setIntervalValue] = useState<BillingInterval>("monthly");
  const [quotes, setQuotes] = useState<Record<string, BillingQuote>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingTest, setPendingTest] = useState<{ order: BillingOrder; plan: BillingPlan } | null>(null);
  const lock = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await api.myBilling();
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load billing");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const perStudent = data?.settings.pricingMode === "per_student";
  const planIds = data ? (perStudent ? data.plans.slice(0, 1) : data.plans).map((p) => p._id).join(",") : "";

  useEffect(() => {
    if (!planIds) return;
    let alive = true;
    Promise.all(
      planIds.split(",").map((id) =>
        api
          .billingQuote(id, interval)
          .then((r) => [id, r.quote] as const)
          .catch(() => null)
      )
    ).then((rows) => {
      if (!alive) return;
      setQuotes(Object.fromEntries(rows.filter((r): r is readonly [string, BillingQuote] => !!r)));
    });
    return () => {
      alive = false;
    };
  }, [planIds, interval, data?.access.used]);

  const finish = async (proof: { orderId: string; paymentId?: string; signature?: string }) => {
    await api.billingVerify(proof);
    setNotice("Payment received. Your plan is active.");
    setPendingTest(null);
    await load();
  };

  const pay = async (plan: BillingPlan) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(plan._id);
    setError("");
    setNotice("");
    try {
      const order = await api.billingOrder(plan._id, interval);
      if (order.mode === "dev") {
        setPendingTest({ order, plan });
      } else {
        const proof = await payWithRazorpay(
          { orderId: order.orderId, amount: order.amount, currency: order.currency || "INR", keyId: order.keyId || "", name: order.name, email: order.email },
          { title: "InstituteSathi", description: `${plan.name} plan (${interval})` }
        );
        await finish(proof);
      }
    } catch (err) {
      if (!(err instanceof PaymentCancelled)) setError(err instanceof Error ? err.message : "Payment failed");
      else setNotice(err.message);
    } finally {
      setBusy("");
      lock.current = false;
    }
  };

  const confirmTest = async () => {
    if (!pendingTest || lock.current) return;
    lock.current = true;
    setBusy("test");
    setError("");
    try {
      await finish({ orderId: pendingTest.order.orderId });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not complete the test payment");
    } finally {
      setBusy("");
      lock.current = false;
    }
  };

  if (loading) return <p className={styles.empty}>Loading billing...</p>;
  if (!data) return <p className={styles.messageError}>{error || "Could not load billing"}</p>;

  const { access, settings, plans, mode, payments } = data;
  const st = statusText(access);
  const pct = access.limit > 0 ? Math.min(100, Math.round((access.used / access.limit) * 100)) : 0;
  const currentId = access.plan?._id;
  const visiblePlans = perStudent ? plans.slice(0, 1) : plans;

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Billing</h1>
      <p className={dashboardStyles.pageSubtitle}>Your InstituteSathi plan, student usage and invoices.</p>

      {error && <p className={styles.messageError}>{error}</p>}
      {notice && <p className={styles.messageSuccess}>{notice}</p>}

      <section className={styles.section} style={{ marginTop: 16 }}>
        <div className={local.statusRow}>
          <div>
            <h2 className={`${local.statusTitle} ${st.bad ? local.warn : ""}`}>{st.title}</h2>
            <p className={local.statusMeta}>{st.meta}</p>
          </div>
          {access.customPrice !== null && <span className={local.planTag}>Special price: {inr(access.customPrice)} + GST</span>}
        </div>
        <div className={local.bar} role="progressbar" aria-valuenow={access.used} aria-valuemax={access.limit || undefined} aria-label="Students used">
          <div className={`${local.barFill} ${pct >= 90 ? local.barFillHigh : ""}`} style={{ width: access.limit > 0 ? `${pct}%` : "0%" }} />
        </div>
        <div className={local.usageLine}>
          <span>
            {access.used} student{access.used === 1 ? "" : "s"}
          </span>
          <span>{access.limit > 0 ? `Limit ${access.limit}` : "No student limit"}</span>
        </div>
        {access.reason && <p className={styles.messageError} style={{ marginTop: 10 }}>{access.reason}</p>}
      </section>

      <section className={styles.section} style={{ marginTop: 16 }}>
        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.sectionTitle}>{perStudent ? "Pay for your students" : "Choose a plan"}</h2>
            <p className={styles.sectionSubtitle}>
              {perStudent
                ? `${inr(settings.perStudentPrice)} per student per month, billed for at least ${settings.perStudentMin} students. GST ${settings.gstPercent}% is added at checkout.`
                : `Prices are before ${settings.gstPercent}% GST. The exact total is shown on each plan.`}
            </p>
          </div>
          <div className={local.toggle} role="group" aria-label="Billing period">
            <button type="button" className={`${local.toggleBtn} ${interval === "monthly" ? local.toggleBtnOn : ""}`} onClick={() => setIntervalValue("monthly")}>
              Monthly
            </button>
            <button type="button" className={`${local.toggleBtn} ${interval === "yearly" ? local.toggleBtnOn : ""}`} onClick={() => setIntervalValue("yearly")}>
              Yearly
            </button>
          </div>
        </div>

        {mode === "none" && <p className={styles.messageError}>Online billing is unavailable right now. Please contact support to renew or change your plan.</p>}

        {visiblePlans.length === 0 && <p className={styles.empty}>No plans are available yet.</p>}

        <div className={local.plans}>
          {visiblePlans.map((p) => {
            const q = quotes[p._id];
            const isCurrent = !perStudent && currentId === p._id && access.state === "active";
            return (
              <div key={p._id} className={`${local.plan} ${isCurrent ? local.planCurrent : ""}`}>
                <div className={local.planName}>
                  {perStudent ? "Per-student billing" : p.name}
                  {!perStudent && p.isPopular && <span className={local.planTag}>Most chosen</span>}
                  {isCurrent && <span className={local.planTag}>Current</span>}
                </div>
                {!perStudent && p.tagline && <p className={local.planTagline}>{p.tagline}</p>}
                <p className={local.price}>
                  {q ? inr(q.base) : "..."} <span className={local.priceUnit}>/ {interval === "yearly" ? "year" : "month"}</span>
                </p>
                <p className={local.priceNote}>
                  {q
                    ? perStudent
                      ? `${q.students} students x ${inr(settings.perStudentPrice)}${interval === "yearly" ? `, ${settings.yearlyDiscountPercent}% off for 12 months` : ""}. Total with GST: ${inr(q.total)}`
                      : `+ ${inr(q.gst)} GST = ${inr(q.total)} to pay`
                    : "Calculating price"}
                </p>
                {!perStudent && (
                  <ul className={local.features}>
                    {p.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                )}
                <button className={local.payBtn} disabled={!!busy || mode === "none" || !q || q.total <= 0} onClick={() => pay(p)}>
                  {busy === p._id ? "Starting payment..." : isCurrent ? "Renew" : access.state === "active" ? "Switch to this plan" : "Pay and activate"}
                </button>
              </div>
            );
          })}
        </div>

        {pendingTest && (
          <div className={local.testBox} role="alertdialog" aria-label="Test mode payment">
            <strong>Test mode: no real money is charged.</strong>
            <span>
              This server has no live payment keys, so this will activate {pendingTest.plan.name} ({interval}) for {inr(pendingTest.order.total)} without a real payment.
            </span>
            <div className={local.testActions}>
              <button className={styles.primaryButton} disabled={busy === "test"} onClick={confirmTest}>
                {busy === "test" ? "Activating..." : "Confirm test payment"}
              </button>
              <button className={styles.smallButton} disabled={busy === "test"} onClick={() => setPendingTest(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <section className={styles.section} style={{ marginTop: 16 }}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Invoices</h2>
        </div>
        {payments.length === 0 ? (
          <p className={styles.empty}>No payments yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Paid on</th>
                  <th>Plan</th>
                  <th>Period</th>
                  <th>Amount</th>
                  <th>GST</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id}>
                    <td>{day(p.paidAt)}</td>
                    <td>
                      {p.planName} ({p.interval})
                      {p.mode === "dev" ? " - test" : ""}
                    </td>
                    <td>
                      {day(p.periodStart)} to {day(p.periodEnd)}
                    </td>
                    <td>{inr(p.base)}</td>
                    <td>{inr(p.gst)}</td>
                    <td>{inr(p.total)}</td>
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
