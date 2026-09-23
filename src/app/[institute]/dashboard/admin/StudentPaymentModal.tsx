"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError, AdminPaymentStudent, Payment, User } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "./admin.module.css";
import Modal from "../Modal";
import Pagination from "../Pagination";

const PAGE_SIZE = 10;

function who(ref: { name: string; role: string } | string | null | undefined): string {
  if (!ref) return "—";
  return typeof ref === "object" ? ref.name : ref;
}

export default function StudentPaymentModal({
  student,
  onClose,
  onChanged,
}: {
  student: User;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [summary, setSummary] = useState<AdminPaymentStudent | null>(null);
  const [history, setHistory] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState("");

  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payError, setPayError] = useState("");
  const [paySuccess, setPaySuccess] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);

  const [editForm, setEditForm] = useState({ installmentAmount: "", balanceDue: "" });
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [extendUntil, setExtendUntil] = useState("");
  const [extendError, setExtendError] = useState("");
  const [extendSuccess, setExtendSuccess] = useState("");
  const [extendSubmitting, setExtendSubmitting] = useState(false);

  const [reactivateError, setReactivateError] = useState("");
  const [reactivateSubmitting, setReactivateSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await api.getStudentPayment(student._id, { page, limit: PAGE_SIZE });
      setSummary(res.student);
      setHistory(res.history);
      setTotalPages(res.totalPages);
      setTotal(res.total);
      setEditForm({
        installmentAmount: String(res.student.installmentAmount ?? 0),
        balanceDue: String(res.student.balanceDue ?? 0),
      });
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Could not load payment info");
    } finally {
      setLoading(false);
    }
  }, [student._id, page]);

  useEffect(() => {
    load();
  }, [load]);

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayError("");
    setPaySuccess("");
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      setPayError("Enter a valid amount");
      return;
    }
    setPaySubmitting(true);
    try {
      await api.recordPayment(student._id, { amount, note: payNote || undefined });
      setPaySuccess("Payment recorded.");
      setPayAmount("");
      setPayNote("");
      setPage(1);
      load();
    } catch (err) {
      setPayError(err instanceof ApiError ? err.message : "Could not record payment");
    } finally {
      setPaySubmitting(false);
    }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    setEditSuccess("");
    setEditSubmitting(true);
    try {
      await api.updateStudentPayment(student._id, {
        installmentAmount: editForm.installmentAmount === "" ? undefined : Number(editForm.installmentAmount),
        balanceDue: editForm.balanceDue === "" ? undefined : Number(editForm.balanceDue),
      });
      setEditSuccess("Payment details updated.");
      load();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Could not update payment details");
    } finally {
      setEditSubmitting(false);
    }
  };

  const submitExtend = async () => {
    setExtendError("");
    setExtendSuccess("");
    if (!extendUntil) {
      setExtendError("Pick a date");
      return;
    }
    setExtendSubmitting(true);
    try {
      await api.extendPaymentDeadline(student._id, new Date(extendUntil).toISOString());
      setExtendSuccess("Deadline extended.");
      setExtendUntil("");
      load();
    } catch (err) {
      setExtendError(err instanceof ApiError ? err.message : "Could not extend deadline");
    } finally {
      setExtendSubmitting(false);
    }
  };

  const submitReactivate = async () => {
    setReactivateError("");
    setReactivateSubmitting(true);
    try {
      await api.reactivateStudent(student._id);
      load();
      onChanged();
    } catch (err) {
      setReactivateError(err instanceof ApiError ? err.message : "Could not reactivate account");
    } finally {
      setReactivateSubmitting(false);
    }
  };

  const statusBadge = () => {
    if (!summary) return null;
    if (summary.deactivatedForPayment) {
      return <span className={adminStyles.badgePending}>Deactivated — payment due</span>;
    }
    if (!summary.isActive) {
      return <span className={adminStyles.badgeInactive}>Inactive</span>;
    }
    return <span className={adminStyles.badgeSuccess}>Active</span>;
  };

  return (
    <Modal onClose={onClose}>
      <div className={dashboardStyles.modalHead}>
        <div>
          <h2 className={adminStyles.sectionTitle}>{student.name}</h2>
          <p className={adminStyles.sectionSubtitle}>{student.email}</p>
        </div>
        <button className={dashboardStyles.modalCloseButton} type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      {loadError && <p className={adminStyles.messageError}>{loadError}</p>}

      {summary && (
        <section className={adminStyles.section} style={{ marginTop: 16 }}>
          <h3 className={adminStyles.sectionTitle} style={{ fontSize: "0.95rem" }}>
            Payment summary
          </h3>
          <div className={adminStyles.inviteRow} style={{ marginBottom: 8 }}>
            {statusBadge()}
          </div>
          <p className={adminStyles.sectionSubtitle}>
            Installment amount: ₹{summary.installmentAmount ?? 0}
          </p>
          <p
            className={adminStyles.sectionSubtitle}
            style={summary.balanceDue > 0 ? { color: "var(--danger)", fontWeight: 700 } : undefined}
          >
            Balance due: ₹{summary.balanceDue ?? 0}
          </p>
          <p className={adminStyles.sectionSubtitle}>
            Next due date: {summary.nextDueDate ? new Date(summary.nextDueDate).toLocaleDateString() : "—"}
          </p>
          {summary.paymentGraceUntil && (
            <p className={adminStyles.sectionSubtitle}>
              Grace until: {new Date(summary.paymentGraceUntil).toLocaleDateString()}
            </p>
          )}
        </section>
      )}

      <section className={adminStyles.section} style={{ marginTop: 16 }}>
        <h3 className={adminStyles.sectionTitle} style={{ fontSize: "0.95rem" }}>
          Record a payment
        </h3>
        <form className={adminStyles.form} onSubmit={submitPayment}>
          <label className={adminStyles.label}>
            Amount (₹)
            <input
              className={adminStyles.input}
              type="number"
              min={1}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              required
            />
          </label>
          <label className={adminStyles.label}>
            Note
            <input
              className={adminStyles.input}
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              placeholder="optional"
            />
          </label>
          <div className={adminStyles.formActions}>
            <button className={adminStyles.primaryButton} type="submit" disabled={paySubmitting}>
              {paySubmitting ? "Saving..." : "Record payment"}
            </button>
            {payError && <p className={adminStyles.messageError}>{payError}</p>}
            {paySuccess && <p className={adminStyles.messageSuccess}>{paySuccess}</p>}
          </div>
        </form>
      </section>

      <section className={adminStyles.section} style={{ marginTop: 16 }}>
        <h3 className={adminStyles.sectionTitle} style={{ fontSize: "0.95rem" }}>
          Edit payment details
        </h3>
        <form className={adminStyles.form} onSubmit={submitEdit}>
          <label className={adminStyles.label}>
            Installment amount (₹)
            <input
              className={adminStyles.input}
              type="number"
              min={0}
              value={editForm.installmentAmount}
              onChange={(e) => setEditForm({ ...editForm, installmentAmount: e.target.value })}
            />
          </label>
          <label className={adminStyles.label}>
            Balance due (₹)
            <input
              className={adminStyles.input}
              type="number"
              min={0}
              value={editForm.balanceDue}
              onChange={(e) => setEditForm({ ...editForm, balanceDue: e.target.value })}
            />
          </label>
          <div className={adminStyles.formActions}>
            <button className={adminStyles.primaryButton} type="submit" disabled={editSubmitting}>
              {editSubmitting ? "Saving..." : "Save details"}
            </button>
            {editError && <p className={adminStyles.messageError}>{editError}</p>}
            {editSuccess && <p className={adminStyles.messageSuccess}>{editSuccess}</p>}
          </div>
        </form>
      </section>

      <section className={adminStyles.section} style={{ marginTop: 16 }}>
        <h3 className={adminStyles.sectionTitle} style={{ fontSize: "0.95rem" }}>
          Extend deadline
        </h3>
        <div className={adminStyles.inviteRow}>
          <input
            className={adminStyles.input}
            type="date"
            value={extendUntil}
            onChange={(e) => setExtendUntil(e.target.value)}
          />
          <button
            className={adminStyles.smallButton}
            type="button"
            onClick={submitExtend}
            disabled={extendSubmitting}
          >
            {extendSubmitting ? "Extending..." : "Extend"}
          </button>
        </div>
        {extendError && <p className={adminStyles.messageError}>{extendError}</p>}
        {extendSuccess && <p className={adminStyles.messageSuccess}>{extendSuccess}</p>}
      </section>

      {summary && !summary.isActive && (
        <section className={adminStyles.section} style={{ marginTop: 16 }}>
          <h3 className={adminStyles.sectionTitle} style={{ fontSize: "0.95rem" }}>
            Reactivate account
          </h3>
          <div className={adminStyles.rowActions}>
            <button
              className={adminStyles.primaryButton}
              type="button"
              onClick={submitReactivate}
              disabled={reactivateSubmitting}
            >
              {reactivateSubmitting ? "Reactivating..." : "Reactivate account"}
            </button>
          </div>
          {reactivateError && <p className={adminStyles.messageError}>{reactivateError}</p>}
        </section>
      )}

      <section className={adminStyles.section} style={{ marginTop: 16 }}>
        <h3 className={adminStyles.sectionTitle} style={{ fontSize: "0.95rem" }}>
          Payment history
        </h3>
        {!loading && history.length === 0 && <p className={adminStyles.empty}>No payments recorded yet.</p>}
        {history.length > 0 && (
          <div className={adminStyles.tableWrap}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Note</th>
                  <th>Recorded by</th>
                </tr>
              </thead>
              <tbody>
                {history.map((p) => (
                  <tr key={p._id}>
                    <td>{new Date(p.createdAt).toLocaleString()}</td>
                    <td>₹{p.amount}</td>
                    <td>{p.method}</td>
                    <td>{p.note || "—"}</td>
                    <td>{who(p.recordedBy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </section>
    </Modal>
  );
}
