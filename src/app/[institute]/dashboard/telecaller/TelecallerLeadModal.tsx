"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, ApiError, CallResponse, Lead, QuickMessage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  CALL_OUTCOMES,
  CLOSED_OUTCOMES,
  STATUS_LABELS,
  fillTemplate,
  followUpState,
  formatFollowUp,
  localInputValue,
  mailUrl,
  smsUrl,
  telUrl,
  whatsappUrl,
} from "@/lib/leadStatus";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import Modal from "../Modal";
import LeadConversion from "../admin/LeadConversion";

function who(ref: { name: string } | string | null | undefined): string {
  if (!ref) return "—";
  return typeof ref === "object" ? ref.name : ref;
}

export default function TelecallerLeadModal({
  lead,
  onClose,
  onChanged,
}: {
  lead: Lead;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { user, institute } = useAuth();
  const [response, setResponse] = useState<CallResponse>("no_answer");
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [message, setMessage] = useState("");
  const [numberCopied, setNumberCopied] = useState(false);
  const [quick, setQuick] = useState<QuickMessage[]>([]);
  const { institute: slug } = useParams<{ institute: string }>();

  useEffect(() => {
    api
      .getQuickMessages()
      .then((res) => setQuick(res.messages))
      .catch(() => {
        // the built-in templates still work
      });
  }, []);
  const [callError, setCallError] = useState("");
  const [callSubmitting, setCallSubmitting] = useState(false);

  const converted = !!lead.convertedStudent;
  const closing = CLOSED_OUTCOMES.includes(response);
  const fuState = followUpState(lead);

  const tplVars = { name: lead.name, caller: user?.name || "", institute: institute?.name || "our institute" };
  const inHours = (h: number) => localInputValue(new Date(Date.now() + h * 60 * 60 * 1000));
  const daysAt = (days: number, hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return localInputValue(d);
  };
  const chooseOutcome = (r: CallResponse) => {
    setResponse(r);
    // "Call back later" with no time yet: suggest tomorrow morning.
    if (r === "call_back_later" && !followUp) setFollowUp(daysAt(1, 10));
  };
  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(lead.phone);
      setNumberCopied(true);
      setTimeout(() => setNumberCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  };
  const clearFollowUp = async () => {
    try {
      await api.setLeadFollowUp(lead._id, null);
      onChanged();
    } catch {
      // the reminder simply stays if this fails
    }
  };

  const submitCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setCallError("");
    setCallSubmitting(true);
    try {
      await api.logCall(lead._id, {
        response,
        notes,
        followUpAt: !closing && followUp ? new Date(followUp).toISOString() : undefined,
      });
      setNotes("");
      setFollowUp("");
      onChanged();
    } catch (err) {
      setCallError(err instanceof ApiError ? err.message : "Could not log call");
    } finally {
      setCallSubmitting(false);
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
          <p style={{ margin: "6px 0 0", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span className={adminStyles.badgePending}>{STATUS_LABELS[lead.status]}</span>
            {lead.followUpAt && fuState && (
              <>
                <span className={fuState === "overdue" ? adminStyles.badgeInactive : adminStyles.badgeSuccess}>
                  {fuState === "overdue" ? "Overdue · " : "Follow up · "}
                  {formatFollowUp(lead.followUpAt)}
                </span>
                <button type="button" className={adminStyles.linkButton} onClick={clearFollowUp}>
                  Clear reminder
                </button>
              </>
            )}
          </p>
        </div>
        <button className={dashboardStyles.modalCloseButton} type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      {lead.notes && <p className={adminStyles.sectionSubtitle}>{lead.notes}</p>}

      <section className={adminStyles.section} style={{ marginTop: 16 }}>
        <h3 className={adminStyles.sectionTitle} style={{ fontSize: "0.95rem" }}>
          Reach out
        </h3>
        <div className={adminStyles.rowActions} style={{ marginBottom: 12, flexWrap: "wrap" }}>
          <a className={adminStyles.primaryButton} href={telUrl(lead.phone)}>
            📞 Call
          </a>
          <a className={adminStyles.smallButton} href={whatsappUrl(lead.phone, message)} target="_blank" rel="noreferrer">
            💬 WhatsApp
          </a>
          <a className={adminStyles.smallButton} href={smsUrl(lead.phone, message)}>
            ✉️ SMS
          </a>
          {lead.email ? (
            <a className={adminStyles.smallButton} href={mailUrl(lead.email, `${tplVars.institute} — your enquiry`, message)}>
              📧 Email
            </a>
          ) : (
            <span className={adminStyles.smallButton} style={{ opacity: 0.5, cursor: "not-allowed" }} title="This lead has no email">
              📧 Email
            </span>
          )}
          <button type="button" className={adminStyles.smallButton} onClick={copyNumber}>
            {numberCopied ? "Copied!" : "Copy number"}
          </button>
        </div>
        <div className={adminStyles.label}>
          Message (used for WhatsApp, SMS and Email)
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "4px 0 6px", alignItems: "center" }}>
            {quick.map((q) => (
              <button
                key={q._id || q.label}
                type="button"
                className={adminStyles.smallButton}
                title={q.text}
                onClick={() => setMessage(fillTemplate(q.text, tplVars))}
              >
                {q.label}
              </button>
            ))}
            <Link href={`/${slug}/dashboard/telecaller/quick-messages`} className={adminStyles.linkButton}>
              {quick.length === 0 ? "Add quick messages" : "Edit quick messages"}
            </Link>
          </div>
          <textarea
            className={adminStyles.input}
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tap a quick message above or type your own…"
          />
        </div>
      </section>

      {!converted && (
        <section className={adminStyles.section} style={{ marginTop: 16 }}>
          <h3 className={adminStyles.sectionTitle} style={{ fontSize: "0.95rem" }}>
            Log a call
          </h3>
          <form className={adminStyles.form} onSubmit={submitCall}>
            <label className={adminStyles.label}>
              Call outcome (becomes the lead&apos;s status)
              <select className={adminStyles.select} value={response} onChange={(e) => chooseOutcome(e.target.value as CallResponse)}>
                {CALL_OUTCOMES.map((r) => (
                  <option key={r} value={r}>
                    {STATUS_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            {!closing && (
              <label className={adminStyles.label}>
                Follow up on
                <input
                  className={adminStyles.input}
                  type="datetime-local"
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  <button type="button" className={adminStyles.smallButton} onClick={() => setFollowUp(inHours(1))}>
                    In 1 hour
                  </button>
                  <button type="button" className={adminStyles.smallButton} onClick={() => setFollowUp(daysAt(1, 10))}>
                    Tomorrow 10 am
                  </button>
                  <button type="button" className={adminStyles.smallButton} onClick={() => setFollowUp(daysAt(3, 10))}>
                    In 3 days
                  </button>
                </div>
              </label>
            )}
            <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
              Notes
              <input
                className={adminStyles.input}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="optional"
              />
            </label>
            <div className={adminStyles.formActions}>
              <button className={adminStyles.primaryButton} type="submit" disabled={callSubmitting}>
                {callSubmitting ? "Saving..." : "Log call"}
              </button>
              {callError && <p className={adminStyles.messageError}>{callError}</p>}
            </div>
          </form>
        </section>
      )}

      <LeadConversion lead={lead} role="telecaller" onChanged={onChanged} />

      <section className={adminStyles.section} style={{ marginTop: 16 }}>
        <h3 className={adminStyles.sectionTitle} style={{ fontSize: "0.95rem" }}>
          Call history
        </h3>
        {lead.callLogs.length === 0 && <p className={adminStyles.empty}>No calls logged yet.</p>}
        {lead.callLogs.length > 0 && (
          <div className={`${adminStyles.tableWrap} table-scroll`}>
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
    </Modal>
  );
}
