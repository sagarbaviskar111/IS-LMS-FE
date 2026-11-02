"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError, AdminPaymentStudent, Payment, User } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "./admin.module.css";
import Modal from "../Modal";
import Pagination from "../Pagination";
import ReceiptModal from "../ReceiptModal";

const PAGE_SIZE = 10;

// <input type="datetime-local"> wants local time as YYYY-MM-DDTHH:mm.
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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

  const [editForm, setEditForm] = useState({ installmentAmount: "", balanceDue: "", nextDueDate: "" });
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [dateEdits, setDateEdits] = useState<Record<string, string>>({});
  const [savingItem, setSavingItem] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState("");

  const [concKind, setConcKind] = useState<"scholarship" | "discount" | "sibling">("scholarship");
  const [concMode, setConcMode] = useState<"percent" | "flat">("percent");
  const [concValue, setConcValue] = useState("");
  const [concNote, setConcNote] = useState("");
  const [concError, setConcError] = useState("");
  const [concSuccess, setConcSuccess] = useState("");
  const [concSubmitting, setConcSubmitting] = useState(false);

  const [extendDays, setExtendDays] = useState("");
  const [extendError, setExtendError] = useState("");
  const [extendSuccess, setExtendSuccess] = useState("");
  const [extendSubmitting, setExtendSubmitting] = useState(false);

  const [reactivateDays, setReactivateDays] = useState("3");
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
        nextDueDate: res.student.nextDueDate ? res.student.nextDueDate.slice(0, 10) : "",
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
        nextDueDate: editForm.nextDueDate ? new Date(editForm.nextDueDate).toISOString() : undefined,
      });
      setEditSuccess("Payment details updated.");
      load();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Could not update payment details");
    } finally {
      setEditSubmitting(false);
    }
  };

  const saveInstallmentDate = async (itemId: string) => {
    setScheduleError("");
    setSavingItem(itemId);
    try {
      await api.editInstallment(student._id, itemId, { dueDate: new Date(dateEdits[itemId]).toISOString() });
      setDateEdits((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      load();
      onChanged();
    } catch (err) {
      setScheduleError(err instanceof ApiError ? err.message : "Could not update the due date");
    } finally {
      setSavingItem(null);
    }
  };

  const submitConcession = async () => {
    setConcError("");
    setConcSuccess("");
    const value = Number(concValue);
    if (concKind !== "sibling" && !(value > 0)) {
      setConcError(concMode === "percent" ? "Enter a percentage" : "Enter an amount");
      return;
    }
    setConcSubmitting(true);
    try {
      await api.addConcession(student._id, {
        kind: concKind,
        mode: concKind === "sibling" ? undefined : concMode,
        value: concKind === "sibling" ? undefined : value,
        note: concNote.trim() || undefined,
      });
      setConcSuccess("Applied. The unpaid fee is now lower.");
      setConcValue("");
      setConcNote("");
      load();
      onChanged();
    } catch (err) {
      setConcError(err instanceof ApiError ? err.message : "Could not apply the discount");
    } finally {
      setConcSubmitting(false);
    }
  };

  const submitExtend = async () => {
    setExtendError("");
    setExtendSuccess("");
    const days = Number(extendDays);
    if (!days || days <= 0) {
      setExtendError("Enter the number of extra days");
      return;
    }
    setExtendSubmitting(true);
    try {
      await api.extendPaymentDeadline(student._id, days);
      setExtendSuccess("Deadline extended.");
      setExtendDays("");
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
      await api.reactivateStudent(student._id, Number(reactivateDays) || 3);
      load();
      onChanged();
    } catch (err) {
      setReactivateError(err instanceof ApiError ? err.message : "Could not reactivate account");
    } finally {
      setReactivateSubmitting(false);
    }
  };

  const hasSchedule = !!summary?.schedule && summary.schedule.length > 0;

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
            <span>Amount (₹)<span className={adminStyles.required}>*</span></span>
            <input
              className={adminStyles.input}
              type="number"
              min={1}
              inputMode="numeric"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              required
            />
          </label>
          <label className={adminStyles.label}>
            Note (optional)
            <input
              className={adminStyles.input}
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              placeholder="e.g. cash received at the counter"
            />
          </label>
          <div className={adminStyles.formActions}>
            <button className={adminStyles.primaryButton} type="submit" disabled={paySubmitting}>
              {paySubmitting ? "Saving…" : "Record payment"}
            </button>
            {payError && <p className={adminStyles.messageError}>{payError}</p>}
            {paySuccess && <p className={adminStyles.messageSuccess}>{paySuccess}</p>}
          </div>
        </form>
      </section>

      {hasSchedule && (
        <section className={adminStyles.section} style={{ marginTop: 16 }}>
          <h3 className={adminStyles.sectionTitle} style={{ fontSize: "0.95rem" }}>
            Installment schedule
          </h3>
          <p className={adminStyles.sectionSubtitle}>
            Change a due date and save. Once an installment is paid, the next one becomes the due date.
          </p>
          <div className={adminStyles.tableWrap}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  <th>Installment</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Due date &amp; time</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {summary?.schedule?.map((it) => (
                  <tr key={it._id}>
                    <td>{it.label}</td>
                    <td>
                      ₹{it.amount}
                      {!!it.fine && <span className={adminStyles.sectionSubtitle}> (incl. ₹{it.fine} late fee)</span>}
                    </td>
                    <td>
                      <span className={it.status === "paid" ? adminStyles.badgeSuccess : adminStyles.badgePending}>
                        {it.status === "paid" ? "Paid" : `₹${it.paid} paid`}
                      </span>
                    </td>
                    <td>
                      {it.status === "paid" ? (
                        new Date(it.dueDate).toLocaleString()
                      ) : (
                        <input
                          className={adminStyles.input}
                          type="datetime-local"
                          value={dateEdits[it._id] ?? toLocalInput(it.dueDate)}
                          onChange={(e) => setDateEdits({ ...dateEdits, [it._id]: e.target.value })}
                        />
                      )}
                    </td>
                    <td>
                      {it.status !== "paid" && dateEdits[it._id] !== undefined && (
                        <button
                          className={adminStyles.smallButton}
                          type="button"
                          disabled={savingItem === it._id}
                          onClick={() => saveInstallmentDate(it._id)}
                        >
                          {savingItem === it._id ? "Saving…" : "Save"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {scheduleError && <p className={adminStyles.messageError}>{scheduleError}</p>}
        </section>
      )}

      {!hasSchedule && (
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
          <label className={adminStyles.label}>
            Next due date
            <input
              className={adminStyles.input}
              type="date"
              value={editForm.nextDueDate}
              onChange={(e) => setEditForm({ ...editForm, nextDueDate: e.target.value })}
            />
          </label>
          <div className={adminStyles.formActions}>
            <button className={adminStyles.primaryButton} type="submit" disabled={editSubmitting}>
              {editSubmitting ? "Saving…" : "Save details"}
            </button>
            {editError && <p className={adminStyles.messageError}>{editError}</p>}
            {editSuccess && <p className={adminStyles.messageSuccess}>{editSuccess}</p>}
          </div>
        </form>
      </section>

      )}

      <section className={adminStyles.section} style={{ marginTop: 16 }}>
        <h3 className={adminStyles.sectionTitle} style={{ fontSize: "0.95rem" }}>
          Extend deadline
        </h3>
        <p className={adminStyles.sectionSubtitle}>
          Extra days are added on top of the due date and your {summary?.graceDays ?? 3} grace days.
          {summary?.paymentDeadline
            ? ` Account is blocked after ${new Date(summary.paymentDeadline).toLocaleString()} if unpaid.`
            : ""}
        </p>
        <div className={adminStyles.inviteRow}>
          <input
            className={adminStyles.input}
            type="number"
            min={1}
            placeholder="Extra days"
            aria-label="Extra days"
            inputMode="numeric"
            value={extendDays}
            onChange={(e) => setExtendDays(e.target.value)}
          />
          <button
            className={adminStyles.smallButton}
            type="button"
            onClick={submitExtend}
            disabled={extendSubmitting}
          >
            {extendSubmitting ? "Extending…" : "Extend"}
          </button>
        </div>
        {extendError && <p className={adminStyles.messageError}>{extendError}</p>}
        {extendSuccess && <p className={adminStyles.messageSuccess}>{extendSuccess}</p>}
      </section>

      <section className={adminStyles.section} style={{ marginTop: 16 }}>
        <h3 className={adminStyles.sectionTitle} style={{ fontSize: "0.95rem" }}>
          Discounts &amp; scholarship
        </h3>
        <p className={adminStyles.sectionSubtitle}>
          Takes money off what is still unpaid{hasSchedule ? ", spread over the remaining installments" : " (of one installment, for every cycle from now on)"}.
        </p>
        <div className={adminStyles.inviteRow} style={{ flexWrap: "wrap", alignItems: "center" }}>
          <select className={adminStyles.select} aria-label="Type of concession" value={concKind} onChange={(e) => setConcKind(e.target.value as typeof concKind)}>
            <option value="scholarship">Scholarship</option>
            <option value="discount">Discount</option>
            <option value="sibling">Sibling discount (institute %)</option>
          </select>
          {concKind !== "sibling" && (
            <>
              <select className={adminStyles.select} aria-label="Concession mode" value={concMode} onChange={(e) => setConcMode(e.target.value as typeof concMode)}>
                <option value="percent">Percent (%)</option>
                <option value="flat">Amount (₹)</option>
              </select>
              <input
                className={adminStyles.input}
                type="number"
                min={1}
                placeholder={concMode === "percent" ? "e.g. 10" : "e.g. 2000"}
            aria-label="Concession value"
            inputMode="decimal"
                value={concValue}
                onChange={(e) => setConcValue(e.target.value)}
              />
            </>
          )}
          <input
            className={adminStyles.input}
            placeholder="Reason (optional)"
            aria-label="Reason"
            value={concNote}
            onChange={(e) => setConcNote(e.target.value)}
          />
          <button className={adminStyles.smallButton} type="button" onClick={submitConcession} disabled={concSubmitting}>
            {concSubmitting ? "Applying…" : "Apply"}
          </button>
        </div>
        {concError && <p className={adminStyles.messageError}>{concError}</p>}
        {concSuccess && <p className={adminStyles.messageSuccess}>{concSuccess}</p>}
        {!!summary?.adjustments?.length && (
          <ul className={adminStyles.sectionSubtitle} style={{ marginTop: 8, paddingLeft: 18 }}>
            {summary.adjustments.map((a, i) => (
              <li key={a._id || i}>
                {a.amount < 0 ? "−" : "+"}₹{Math.abs(a.amount)} · {a.note || a.kind.replace("_", " ")} ·{" "}
                {new Date(a.createdAt).toLocaleDateString()}
              </li>
            ))}
          </ul>
        )}
      </section>

      {summary && !summary.isActive && (
        <section className={adminStyles.section} style={{ marginTop: 16 }}>
          <h3 className={adminStyles.sectionTitle} style={{ fontSize: "0.95rem" }}>
            Reactivate account
          </h3>
          <p className={adminStyles.sectionSubtitle}>
            Reopens the account for the number of days below; if the dues are still unpaid after that, it is
            deactivated again.
          </p>
          <div className={adminStyles.rowActions}>
            <input
              className={adminStyles.input}
              type="number"
              min={1}
              inputMode="numeric"
              style={{ maxWidth: 90 }}
              value={reactivateDays}
              onChange={(e) => setReactivateDays(e.target.value)}
              aria-label="Days to reactivate for"
            />
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
                  <th>Receipt</th>
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
                    <td>
                      <button className={adminStyles.smallButton} type="button" onClick={() => setReceiptId(p._id)}>
                        View
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
      {receiptId && <ReceiptModal load={() => api.adminReceipt(receiptId)} onClose={() => setReceiptId(null)} />}
    </Modal>
  );
}
