"use client";

import { useEffect, useState } from "react";
import { api, ApiError, PaidReceipt, Payment, StudentPaymentSummary } from "@/lib/api";
import { payWithRazorpay, PaymentOrder, RazorpayProof } from "@/lib/razorpay";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import studentStyles from "./student.module.css";
import Pagination from "../Pagination";
import ReceiptModal from "../ReceiptModal";
import StudentEmptyState from "./StudentEmptyState";
import StudentLoading from "./StudentLoading";

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString();
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

const DAY = 24 * 60 * 60 * 1000;

function splitRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

// Live fee timer. Three phases: before the due date, the grace period after it
// (account still open, daily reminders), and past the deadline (about to be
// deactivated). The countdown always targets whichever moment matters next.
function FeeCountdown({
  now,
  dueMs,
  deadlineMs,
  balanceDue,
  paying,
  onPay,
}: {
  now: number;
  dueMs: number;
  deadlineMs: number | null;
  balanceDue: number;
  paying: boolean;
  onPay: () => void;
}) {
  const overdue = now >= dueMs;
  const pastDeadline = deadlineMs !== null && now >= deadlineMs;
  const target = !overdue ? dueMs : deadlineMs;
  const { d, h, m, s } = splitRemaining(target ? target - now : 0);

  let heading: string;
  let detail: string;
  if (!overdue) {
    heading = "Fee due soon";
    detail = `Pay before ${new Date(dueMs).toLocaleString()} to keep your account active.`;
  } else if (!pastDeadline && deadlineMs !== null) {
    const totalDays = Math.max(1, Math.round((deadlineMs - dueMs) / DAY));
    const day = Math.min(totalDays, Math.floor((now - dueMs) / DAY) + 1);
    heading = `Payment overdue — extra day ${day} of ${totalDays}`;
    detail = `Your account will be deactivated on ${new Date(deadlineMs).toLocaleString()} if the dues are not paid.`;
  } else {
    heading = "Account is being deactivated";
    detail = "The grace period is over. Pay now to keep your access.";
  }

  const urgent = overdue;
  const color = urgent ? "var(--danger)" : "var(--text)";
  const units: [number, string][] = [
    [d, "Days"],
    [h, "Hours"],
    [m, "Min"],
    [s, "Sec"],
  ];

  return (
    <div className={studentStyles.noticeWarning} style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>
      <div>
        <strong>
          {heading} — ₹{balanceDue}
        </strong>
        <div style={{ opacity: 0.85, fontSize: "0.9rem" }}>{detail}</div>
      </div>
      {!pastDeadline && (
        <div style={{ display: "flex", gap: 10 }}>
          {units.map(([value, label]) => (
            <div key={label} style={{ textAlign: "center", minWidth: 56 }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>
                {String(value).padStart(2, "0")}
              </div>
              <div style={{ fontSize: "0.7rem", textTransform: "uppercase", opacity: 0.7 }}>{label}</div>
            </div>
          ))}
        </div>
      )}
      <div>
        <button className={adminStyles.primaryButton} type="button" onClick={onPay} disabled={paying}>
          {paying ? "Processing..." : `Pay ₹${balanceDue} now`}
        </button>
      </div>
    </div>
  );
}

export default function StudentPayments() {
  const [summary, setSummary] = useState<StudentPaymentSummary | null>(null);
  const [history, setHistory] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [paidNotice, setPaidNotice] = useState<{ payment: PaidReceipt; excess: number } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .myPayments({ page, limit: 10 })
      .then((res) => {
        setSummary(res.summary);
        setHistory(res.history);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [page, reloadKey]);

  // Opens Razorpay, then asks the server to confirm and record the payment. If the
  // money was taken but the confirmation did not reach us, say so clearly: the
  // server finishes it in the background, so the student must not pay twice.
  const runPayment = async (
    open: () => Promise<PaymentOrder>,
    confirm: (proof?: RazorpayProof) => Promise<{ payment: PaidReceipt; excess: number }>,
    description: string
  ) => {
    setPayError("");
    setPaidNotice(null);
    setPaying(true);
    let proof: RazorpayProof | undefined;
    try {
      const order = await open();
      if (order.mode === "gateway") {
        proof = await payWithRazorpay(order, { title: "Fee payment", description });
      }
      const res = await confirm(proof);
      setPaidNotice({ payment: res.payment, excess: res.excess });
      setPage(1);
      setReloadKey((k) => k + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed. Please try again.";
      if (proof) {
        setPayError(
          `Your payment went through on Razorpay, but we could not confirm it just yet (${message}). Please do NOT pay again — it will be recorded automatically within a few minutes. Reference: ${proof.paymentId}`
        );
        setReloadKey((k) => k + 1);
      } else {
        setPayError(message);
      }
    } finally {
      setPaying(false);
    }
  };

  const handlePay = () => runPayment(() => api.createDuesOrder(), (proof) => api.payDues(undefined, proof), "Dues");

  const handlePayNext = () =>
    runPayment(() => api.createNextInstallmentOrder(), (proof) => api.payNextInstallment(proof), "Next installment");

  const balanceDue = summary?.balanceDue ?? 0;
  const fullyPaid = !!summary?.feeStatus?.fullyPaid;
  const dueMs = summary?.nextDueDate ? new Date(summary.nextDueDate).getTime() : null;
  const deadlineMs = summary?.paymentDeadline ? new Date(summary.paymentDeadline).getTime() : null;

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Payments</h1>
      <p className={dashboardStyles.pageSubtitle}>Your installment plan and payment history.</p>

      <div className={dashboardStyles.cardGrid} style={{ marginBottom: 20 }}>
        <div className={dashboardStyles.card}>
          <p className={dashboardStyles.cardLabel}>Installment Amount</p>
          <p className={dashboardStyles.cardValue}>
            {loading ? "…" : summary?.installmentAmount ? `₹${summary.installmentAmount}` : "—"}
          </p>
        </div>
        <div className={dashboardStyles.card}>
          <p className={dashboardStyles.cardLabel}>Balance Due</p>
          <p className={dashboardStyles.cardValue}>
            {loading ? (
              "…"
            ) : balanceDue > 0 ? (
              <span className={adminStyles.badgePending}>₹{balanceDue}</span>
            ) : (
              <span className={studentStyles.badgeSuccess}>Fully paid</span>
            )}
          </p>
        </div>
        <div className={dashboardStyles.card}>
          <p className={dashboardStyles.cardLabel}>Next Due Date</p>
          <p className={dashboardStyles.cardValue}>
            {loading ? "…" : summary?.nextDueDate ? formatDateTime(summary.nextDueDate) : "—"}
          </p>
        </div>
      </div>

      {!loading && summary?.paymentGraceUntil && (
        <p className={adminStyles.sectionSubtitle} style={{ marginBottom: 20 }}>
          Extended until {formatDate(summary.paymentGraceUntil)} by your admin.
        </p>
      )}

      {!loading && fullyPaid && summary?.feeStatus && (
        <div className={studentStyles.noticeSuccess} style={{ marginBottom: 20 }}>
          <span>
            <strong>Course payment complete ✓</strong> You have paid the full course fee (₹
            {summary.feeStatus.totalPaid}). No further payments are due.
          </span>
        </div>
      )}
      {!loading && !fullyPaid && balanceDue > 0 && dueMs !== null && (
        <FeeCountdown
          now={now}
          dueMs={dueMs}
          deadlineMs={deadlineMs}
          balanceDue={balanceDue}
          paying={paying}
          onPay={handlePay}
        />
      )}
      {!loading && !fullyPaid && balanceDue > 0 && dueMs === null && (
        <div className={studentStyles.noticeWarning}>
          <span>
            <strong>Balance due: ₹{balanceDue}.</strong> Contact your admin or teacher for the due date.
          </span>
          <button className={adminStyles.primaryButton} type="button" onClick={handlePay} disabled={paying}>
            {paying ? "Processing..." : `Pay ₹${balanceDue} now`}
          </button>
        </div>
      )}
      {!loading && !fullyPaid && balanceDue === 0 && !!summary?.installmentAmount && summary.nextInstallmentDueDate && (
        <div className={studentStyles.noticeWarning} style={{ marginBottom: 20 }}>
          <span>
            <strong>Pay your next installment early — ₹{summary.installmentAmount}.</strong> Your next due date
            will move to {formatDateTime(summary.nextInstallmentDueDate)}.
          </span>
          <button className={adminStyles.primaryButton} type="button" onClick={handlePayNext} disabled={paying}>
            {paying ? "Processing..." : `Pay next installment (₹${summary.installmentAmount})`}
          </button>
        </div>
      )}
      {!loading && summary?.onlinePayment === false && (
        <p className={adminStyles.sectionSubtitle} style={{ marginBottom: 16 }}>
          Online payment isn&apos;t set up by your institute yet. Please pay at the institute — they will record it for you.
        </p>
      )}
      {paidNotice && (
        <div className={studentStyles.noticeSuccess} style={{ marginBottom: 20 }}>
          <span>
            <strong>Payment received — ₹{paidNotice.payment.amount}.</strong> Receipt {paidNotice.payment.receiptNo}. It is saved in your payment
            history below.
            {paidNotice.excess > 0 &&
              ` You paid ₹${paidNotice.excess} more than was due — your institute will adjust or refund it.`}
          </span>
          <button className={adminStyles.smallButton} type="button" onClick={() => setReceiptId(paidNotice.payment._id)}>
            View receipt
          </button>
        </div>
      )}
      {payError && <p className={adminStyles.messageError}>{payError}</p>}

      {!loading && summary?.schedule && summary.schedule.length > 0 && (
        <section className={adminStyles.section} style={{ marginBottom: 20 }}>
          <div className={adminStyles.sectionHead}>
            <div>
              <h2 className={adminStyles.sectionTitle}>Your installments</h2>
              <p className={adminStyles.sectionSubtitle}>Each installment and the date it is due.</p>
            </div>
          </div>
          <div className={`${adminStyles.tableWrap} table-scroll`}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  <th>Installment</th>
                  <th>Amount</th>
                  <th>Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {summary.schedule.map((it) => (
                  <tr key={it._id}>
                    <td>{it.label}</td>
                    <td>₹{it.amount}</td>
                    <td>{formatDateTime(it.dueDate)}</td>
                    <td>
                      {it.status === "paid" ? (
                        <span className={studentStyles.badgeSuccess}>Paid</span>
                      ) : it.status === "partial" ? (
                        <span className={adminStyles.badgePending}>₹{it.amount - it.paid} left</span>
                      ) : (
                        <span className={adminStyles.badgePending}>Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className={adminStyles.section}>
        <div className={adminStyles.sectionHead}>
          <div>
            <h2 className={adminStyles.sectionTitle}>Payment history</h2>
            <p className={adminStyles.sectionSubtitle}>All payments recorded against your account.</p>
          </div>
        </div>

        {loading && <StudentLoading />}
        {!loading && history.length === 0 && (
          <StudentEmptyState title="No payments recorded yet" hint="Your payment history will show up here." />
        )}

        {history.length > 0 && (
          <div className={`${adminStyles.tableWrap} table-scroll`}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Note</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {history.map((p) => (
                  <tr key={p._id}>
                    <td>{formatDateTime(p.createdAt)}</td>
                    <td>₹{p.amount}</td>
                    <td>{p.method === "manual" ? "Manual" : "Online"}</td>
                    <td>{p.note || "—"}</td>
                    <td>
                      <button className={adminStyles.smallButton} type="button" onClick={() => setReceiptId(p._id)}>
                        View / Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </section>

      {receiptId && <ReceiptModal load={() => api.studentReceipt(receiptId)} onClose={() => setReceiptId(null)} />}
    </div>
  );
}
