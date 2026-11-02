"use client";

import { useState } from "react";
import { api, ApiError, Lead, User } from "@/lib/api";
import { STATUS_LABELS } from "@/lib/leadStatus";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "./admin.module.css";
import Modal from "../Modal";
import LeadConversion from "./LeadConversion";

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
                    <td>{STATUS_LABELS[c.response]}</td>
                    <td>{c.notes || "—"}</td>
                    <td>{who(c.calledBy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <LeadConversion lead={lead} role="admin" onChanged={onChanged} />
    </Modal>
  );
}
