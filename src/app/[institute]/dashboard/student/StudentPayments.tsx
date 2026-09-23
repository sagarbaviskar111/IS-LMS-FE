"use client";

import { useEffect, useState } from "react";
import { api, Payment, StudentPaymentSummary } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import studentStyles from "./student.module.css";
import Pagination from "../Pagination";
import StudentEmptyState from "./StudentEmptyState";
import StudentLoading from "./StudentLoading";

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString();
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

export default function StudentPayments() {
  const [summary, setSummary] = useState<StudentPaymentSummary | null>(null);
  const [history, setHistory] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

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
  }, [page]);

  const balanceDue = summary?.balanceDue ?? 0;

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
          <p className={dashboardStyles.cardValue}>{loading ? "…" : formatDate(summary?.nextDueDate)}</p>
        </div>
      </div>

      {!loading && summary?.paymentGraceUntil && (
        <p className={adminStyles.sectionSubtitle} style={{ marginBottom: 20 }}>
          Extended until {formatDate(summary.paymentGraceUntil)} by your admin.
        </p>
      )}

      {!loading && balanceDue > 0 && (
        <div className={studentStyles.noticeWarning}>
          <span>
            <strong>Balance due.</strong> Contact your admin or teacher if you need more time to pay.
          </span>
        </div>
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
                </tr>
              </thead>
              <tbody>
                {history.map((p) => (
                  <tr key={p._id}>
                    <td>{formatDateTime(p.createdAt)}</td>
                    <td>₹{p.amount}</td>
                    <td>{p.method === "razorpay" ? "Online" : "Manual"}</td>
                    <td>{p.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </section>
    </div>
  );
}
