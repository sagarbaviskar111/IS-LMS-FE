"use client";

import { useState } from "react";
import { ApiError, ReviewDecision } from "@/lib/api";
import Modal from "../Modal";
import RichTextEditor from "../RichTextEditor";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";

// Reviewing one student's work. Two shapes:
//  - assignment: set the points awarded (stepper with +/-, or type a number)
//  - exam: add or remove points on top of the auto-graded score
export type ReviewTarget =
  | { kind: "assignment"; studentName: string; points: number | null; review: string; decision: ReviewDecision; resubmitUntil: string | null }
  | { kind: "exam"; studentName: string; autoScore: number; totalMarks: number; adjustment: number; review: string };

export default function ReviewModal({
  target,
  onSave,
  onClose,
}: {
  target: ReviewTarget;
  onSave: (payload: {
    points?: number | null;
    adjustment?: number;
    review: string;
    decision?: ReviewDecision;
    resubmitUntil?: string;
  }) => Promise<void>;
  onClose: () => void;
}) {
  const isExam = target.kind === "exam";
  const [value, setValue] = useState(
    isExam ? String(target.adjustment) : target.points === null ? "" : String(target.points)
  );
  const [review, setReview] = useState(target.review);
  const [decision, setDecision] = useState<ReviewDecision>(target.kind === "assignment" ? target.decision : "");
  const [until, setUntil] = useState(() => {
    const d = target.kind === "assignment" && target.resubmitUntil ? new Date(target.resubmitUntil) : new Date(Date.now() + 3 * 86400000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const num = Number(value);
  const step = (delta: number) => {
    const current = Number.isFinite(num) && value !== "" ? num : 0;
    const next = isExam ? current + delta : Math.max(0, current + delta);
    setValue(String(Math.round(next * 100) / 100));
  };

  const finalScore = isExam
    ? Math.min(target.totalMarks, Math.max(0, target.autoScore + (Number.isFinite(num) ? num : 0)))
    : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (isExam && (value === "" || !Number.isFinite(num))) {
      setError("Enter a number — use a minus sign to remove points");
      return;
    }
    if (!isExam && value !== "" && (!Number.isFinite(num) || num < 0)) {
      setError("Points must be 0 or more");
      return;
    }
    setSaving(true);
    try {
      if (isExam) await onSave({ adjustment: num, review });
      else {
        if (decision === "resubmit" && new Date(until).getTime() <= Date.now()) {
          setError("Pick a resubmission deadline in the future");
          setSaving(false);
          return;
        }
        await onSave({
          points: value === "" ? null : num,
          review,
          decision,
          ...(decision === "resubmit" ? { resubmitUntil: new Date(until).toISOString() } : {}),
        });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the review");
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} dialogStyle={{ maxWidth: 560, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
      <div className={dashboardStyles.modalHead}>
        <div>
          <h2 className={adminStyles.sectionTitle}>Review</h2>
          <p className={adminStyles.sectionSubtitle}>{target.studentName}</p>
        </div>
        <button className={dashboardStyles.modalCloseButton} type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <form className={adminStyles.form} onSubmit={submit}>
        <label className={adminStyles.label}>
          {isExam ? "Add / remove points" : "Points"}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className={adminStyles.smallButton} type="button" onClick={() => step(-1)} aria-label="Remove a point">
              −
            </button>
            <input
              className={adminStyles.input}
              style={{ maxWidth: 120, textAlign: "center" }}
              type="number"
              step="any"
              value={value}
              placeholder={isExam ? "0" : "Not graded"}
              onChange={(e) => setValue(e.target.value)}
            />
            <button className={adminStyles.smallButton} type="button" onClick={() => step(1)} aria-label="Add a point">
              +
            </button>
          </div>
        </label>
        {isExam && (
          <p className={adminStyles.sectionSubtitle} style={{ margin: 0 }}>
            Auto-graded {target.autoScore} {num >= 0 ? "+" : "−"} {Math.abs(Number.isFinite(num) ? num : 0)} → final{" "}
            <strong>
              {finalScore} / {target.totalMarks}
            </strong>{" "}
            (kept between 0 and {target.totalMarks})
          </p>
        )}

        {!isExam && (
          <div className={adminStyles.label}>
            Decision
            <div style={{ display: "grid", gap: 6 }}>
              {(
                [
                  ["", "No decision yet"],
                  ["approved", "Approve — work is accepted"],
                  ["resubmit", "Ask to submit again"],
                  ["rejected", "Reject — no resubmission allowed"],
                ] as [ReviewDecision, string][]
              ).map(([v, label]) => (
                <label key={v || "none"} style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 400 }}>
                  <input type="radio" name="decision" checked={decision === v} onChange={() => setDecision(v)} />
                  {label}
                </label>
              ))}
            </div>
            {decision === "resubmit" && (
              <label className={adminStyles.label} style={{ marginTop: 8 }}>
                Student can resubmit until
                <input
                  className={adminStyles.input}
                  type="datetime-local"
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                />
              </label>
            )}
            {decision === "rejected" && (
              <p className={adminStyles.sectionSubtitle} style={{ margin: "6px 0 0" }}>
                The student will be told the submission was not accepted and won&apos;t be able to upload again.
              </p>
            )}
          </div>
        )}

        <div className={adminStyles.label}>
          Review
          <RichTextEditor value={target.review} onChange={setReview} placeholder="Write feedback for the student…" />
        </div>

        <div className={adminStyles.formActions}>
          <button className={adminStyles.primaryButton} type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save review"}
          </button>
          {error && <p className={adminStyles.messageError}>{error}</p>}
        </div>
      </form>
    </Modal>
  );
}
