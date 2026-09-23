"use client";

import { useState } from "react";
import { api, ApiError, CallResponse, Lead, User } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "./admin.module.css";
import Modal from "../Modal";

const RESPONSE_LABELS: Record<CallResponse, string> = {
  no_answer: "No answer",
  call_back_later: "Call back later",
  interested: "Interested",
  not_interested: "Not interested",
  wrong_number: "Wrong number",
};

function who(ref: { name: string } | string | null | undefined): string {
  if (!ref) return "—";
  return typeof ref === "object" ? ref.name : ref;
}

export default function AdminLeadModal({
  lead,
  telecallers,
  onClose,
  onChanged,
}: {
  lead: Lead;
  telecallers: User[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const currentTelecallerId = typeof lead.assignedTelecaller === "object" ? lead.assignedTelecaller?._id : lead.assignedTelecaller;

  const [reassignId, setReassignId] = useState(currentTelecallerId || "");
  const [reassignError, setReassignError] = useState("");
  const [reassignBusy, setReassignBusy] = useState(false);

  const [regForm, setRegForm] = useState({ name: lead.name, email: lead.email || "", password: "", phone: lead.phone });
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");
  const [regSubmitting, setRegSubmitting] = useState(false);

  const [feeAmount, setFeeAmount] = useState(String(lead.feeAmount ?? 0));
  const [amountPaidNow, setAmountPaidNow] = useState("0");

  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const converted = !!lead.convertedStudent;

  const submitReassign = async () => {
    if (!reassignId || reassignId === currentTelecallerId) return;
    setReassignError("");
    setReassignBusy(true);
    try {
      await api.reassignLead(lead._id, reassignId);
      onChanged();
    } catch (err) {
      setReassignError(err instanceof ApiError ? err.message : "Could not reassign");
    } finally {
      setReassignBusy(false);
    }
  };

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegSubmitting(true);
    try {
      await api.registerLead(lead._id, {
        ...regForm,
        feeAmount: feeAmount === "" ? undefined : Number(feeAmount),
        amountPaidNow: amountPaidNow === "" ? undefined : Number(amountPaidNow),
      });
      setRegSuccess("Student account created.");
      onChanged();
    } catch (err) {
      setRegError(err instanceof ApiError ? err.message : "Could not register student");
    } finally {
      setRegSubmitting(false);
    }
  };

  const generateLink = async () => {
    setLinkError("");
    setLinkBusy(true);
    try {
      const res = await api.generateLeadLink(lead._id, feeAmount === "" ? undefined : Number(feeAmount));
      setLink(`${window.location.origin}/register/${res.token}`);
    } catch (err) {
      setLinkError(err instanceof ApiError ? err.message : "Could not generate link");
    } finally {
      setLinkBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className={dashboardStyles.modalHead}>
        <div>
          <h2 className={adminStyles.sectionTitle}>{lead.name}</h2>
          <p className={adminStyles.sectionSubtitle}>
            {lead.phone} {lead.email ? `· ${lead.email}` : ""}
          </p>
        </div>
        <button className={dashboardStyles.modalCloseButton} type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      {lead.notes && <p className={adminStyles.sectionSubtitle}>{lead.notes}</p>}

      <section className={adminStyles.section} style={{ marginTop: 16 }}>
        <h3 className={adminStyles.sectionTitle} style={{ fontSize: "0.95rem" }}>
          Assigned telecaller
        </h3>
        <div className={adminStyles.inviteRow}>
          <select className={adminStyles.select} value={reassignId} onChange={(e) => setReassignId(e.target.value)}>
            {telecallers.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            className={adminStyles.smallButton}
            type="button"
            onClick={submitReassign}
            disabled={reassignBusy || reassignId === currentTelecallerId}
          >
            {reassignBusy ? "Reassigning..." : "Reassign"}
          </button>
        </div>
        {reassignError && <p className={adminStyles.messageError}>{reassignError}</p>}
      </section>

      <section className={adminStyles.section} style={{ marginTop: 16 }}>
        <h3 className={adminStyles.sectionTitle} style={{ fontSize: "0.95rem" }}>
          Call history
        </h3>
        {lead.callLogs.length === 0 && <p className={adminStyles.empty}>No calls logged yet.</p>}
        {lead.callLogs.length > 0 && (
          <div className={adminStyles.tableWrap}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Response</th>
                  <th>Notes</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {[...lead.callLogs].reverse().map((c) => (
                  <tr key={c._id}>
                    <td>{new Date(c.createdAt).toLocaleString()}</td>
                    <td>{RESPONSE_LABELS[c.response]}</td>
                    <td>{c.notes || "—"}</td>
                    <td>{who(c.calledBy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {converted ? (
        <section className={adminStyles.section} style={{ marginTop: 16 }}>
          <span className={adminStyles.badgeSuccess}>Converted — {who(lead.convertedStudent)}</span>
          <p className={adminStyles.sectionSubtitle} style={{ marginTop: 8 }}>
            {lead.convertedBy ? `Registered by ${who(lead.convertedBy)}` : "Self-registered via link"}
          </p>
        </section>
      ) : (
        <section className={adminStyles.section} style={{ marginTop: 16 }}>
          <h3 className={adminStyles.sectionTitle} style={{ fontSize: "0.95rem" }}>
            Register directly (e.g. student called you)
          </h3>

          <div className={adminStyles.form} style={{ marginBottom: 12 }}>
            <label className={adminStyles.label}>
              Fee to charge (₹)
              <input
                className={adminStyles.input}
                type="number"
                min={0}
                value={feeAmount}
                onChange={(e) => setFeeAmount(e.target.value)}
              />
            </label>
            <label className={adminStyles.label}>
              Collected now / cash (₹)
              <input
                className={adminStyles.input}
                type="number"
                min={0}
                value={amountPaidNow}
                onChange={(e) => setAmountPaidNow(e.target.value)}
                placeholder="0"
              />
            </label>
          </div>

          <div className={adminStyles.rowActions} style={{ marginBottom: 12 }}>
            <button className={adminStyles.smallButton} type="button" onClick={generateLink} disabled={linkBusy}>
              {linkBusy ? "Generating..." : "Generate registration link"}
            </button>
          </div>

          {link && (
            <div className={adminStyles.inviteRow} style={{ marginBottom: 12 }}>
              <span className={adminStyles.linkBox}>{link}</span>
              <button className={adminStyles.primaryButton} type="button" onClick={copyLink}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
          {linkError && <p className={adminStyles.messageError}>{linkError}</p>}

          <form className={adminStyles.form} onSubmit={submitRegister}>
            <label className={adminStyles.label}>
              Full name
              <input
                className={adminStyles.input}
                value={regForm.name}
                onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                required
              />
            </label>
            <label className={adminStyles.label}>
              Phone
              <input
                className={adminStyles.input}
                value={regForm.phone}
                onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
              />
            </label>
            <label className={adminStyles.label}>
              Email
              <input
                className={adminStyles.input}
                type="email"
                value={regForm.email}
                onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                required
              />
            </label>
            <label className={adminStyles.label}>
              Password
              <input
                className={adminStyles.input}
                type="password"
                value={regForm.password}
                onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                minLength={6}
                required
              />
            </label>
            <div className={adminStyles.formActions}>
              <button className={adminStyles.primaryButton} type="submit" disabled={regSubmitting}>
                {regSubmitting ? "Creating..." : "Register student"}
              </button>
              {regError && <p className={adminStyles.messageError}>{regError}</p>}
              {regSuccess && <p className={adminStyles.messageSuccess}>{regSuccess}</p>}
            </div>
          </form>
        </section>
      )}
    </Modal>
  );
}
