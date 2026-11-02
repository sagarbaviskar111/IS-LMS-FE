"use client";

import { useEffect, useState } from "react";
import { api, PaymentAttention } from "@/lib/api";
import adminStyles from "./admin.module.css";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";

// Online payments the institute should look at: money received on Razorpay that
// is not recorded against a student yet, or more than was owed.
export default function PaymentsAttention() {
  const [orders, setOrders] = useState<PaymentAttention[]>([]);

  useEffect(() => {
    api
      .paymentsNeedingAttention()
      .then((r) => setOrders(r.orders))
      .catch(() => {});
  }, []);

  if (orders.length === 0) return null;

  return (
    <section className={adminStyles.section} style={{ marginBottom: 20, borderColor: "var(--warning)" }}>
      <h2 className={adminStyles.sectionTitle}>Online payments that need your attention ({orders.length})</h2>
      <p className={adminStyles.sectionSubtitle} style={{ margin: "6px 0 12px" }}>
        These payments reached your Razorpay account but are not fully recorded. Check each in your Razorpay dashboard using the payment id.
      </p>
      <div className={adminStyles.tableWrap}>
        <table className={adminStyles.table}>
          <thead>
            <tr>
              <th>Who</th>
              <th>What</th>
              <th>Amount</th>
              <th>Problem</th>
              <th>Razorpay payment id</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o._id}>
                <td style={{ overflowWrap: "anywhere" }}>{o.student ? `${o.student.name}` : o.email || "Unknown"}</td>
                <td>{o.purpose === "course_registration" ? "Course registration" : o.purpose === "dues" ? "Dues" : "Next installment"}</td>
                <td>{inr(o.amount)}</td>
                <td>
                  {o.status === "fulfilled"
                    ? `Paid ${inr(o.excess)} more than owed — adjust or refund`
                    : "Paid, but registration was not completed — the student can retry without paying again"}
                </td>
                <td>
                  <code style={{ overflowWrap: "anywhere" }}>{o.razorpayPaymentId}</code>
                  <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{when(o.paidAt)}</div>
                </td>
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
