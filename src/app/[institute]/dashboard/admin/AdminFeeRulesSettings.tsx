"use client";

import { useEffect, useState } from "react";
import { api, ApiError, FeeRules, FeeRulesPreview } from "@/lib/api";
import adminStyles from "./admin.module.css";

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" });

type Draft = { graceDays: string; mode: FeeRules["lateFee"]["mode"]; amount: string; maxAmount: string; sibling: string };

const toDraft = (r: FeeRules): Draft => ({
  graceDays: String(r.graceDays),
  mode: r.lateFee.mode,
  amount: r.lateFee.amount ? String(r.lateFee.amount) : "",
  maxAmount: r.lateFee.maxAmount ? String(r.lateFee.maxAmount) : "",
  sibling: r.siblingDiscountPercent ? String(r.siblingDiscountPercent) : "",
});

const toRules = (d: Draft): FeeRules => ({
  graceDays: Number(d.graceDays),
  lateFee: { mode: d.mode, amount: Number(d.amount) || 0, maxAmount: Number(d.maxAmount) || 0 },
  siblingDiscountPercent: Number(d.sibling) || 0,
});

export default function AdminFeeRulesSettings() {
  const [saved, setSaved] = useState<Draft | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [preview, setPreview] = useState<FeeRulesPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api.getFeeRules().then((res) => {
      const d = toDraft(res.rules);
      setSaved(d);
      setDraft(d);
    });
  }, []);

  if (!draft || !saved) return <section className={adminStyles.section}>Loading…</section>;

  const set = (patch: Partial<Draft>) => {
    setDraft({ ...draft, ...patch });
    setPreview(null);
    setNotice("");
    setError("");
  };
  const changed = JSON.stringify(draft) !== JSON.stringify(saved);

  const run = async (confirm: boolean) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (!confirm) {
        // First look: who would be affected? Nothing is saved while students would be locked out.
        const res = await api.previewFeeRules(toRules(draft));
        if (res.preview.deactivatedCount === 0) {
          await api.saveFeeRules(toRules(draft), true);
          setSaved(draft);
          setPreview(res.preview);
          setNotice("Fee rules saved.");
        } else {
          setPreview(res.preview);
        }
      } else {
        await api.saveFeeRules(toRules(draft), true);
        setSaved(draft);
        setNotice("Fee rules saved. The students listed above will be deactivated at the next fee check.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the fee rules");
    } finally {
      setBusy(false);
    }
  };

  const needsConfirm = !!preview && preview.deactivatedCount > 0 && changed;

  return (
    <div>
      <section className={adminStyles.section}>
        <div className={adminStyles.sectionHead}>
          <div>
            <h2 className={adminStyles.sectionTitle}>Grace period</h2>
            <p className={adminStyles.sectionSubtitle}>
              How many days after the due date an unpaid student can still log in. After that the account is
              deactivated until the fee is paid.
            </p>
          </div>
        </div>
        <div className={adminStyles.form}>
          <label className={adminStyles.label}>
            Grace days
            <input
              className={adminStyles.input}
              type="number"
              min={0}
              max={60}
              value={draft.graceDays}
              onChange={(e) => set({ graceDays: e.target.value })}
            />
          </label>
        </div>
      </section>

      <section className={adminStyles.section}>
        <div className={adminStyles.sectionHead}>
          <div>
            <h2 className={adminStyles.sectionTitle}>Late fee</h2>
            <p className={adminStyles.sectionSubtitle}>
              Added to the student&apos;s dues once an installment is overdue. It shows on their payments page and in
              the reminder email.
            </p>
          </div>
        </div>
        <div className={adminStyles.form}>
          <label className={adminStyles.label}>
            Late fee type
            <select
              className={adminStyles.select}
              value={draft.mode}
              onChange={(e) => set({ mode: e.target.value as Draft["mode"] })}
            >
              <option value="none">No late fee</option>
              <option value="flat">One fixed fine when the due date passes</option>
              <option value="daily">A fine for every day overdue</option>
            </select>
          </label>
          {draft.mode !== "none" && (
            <label className={adminStyles.label}>
              {draft.mode === "flat" ? "Fine amount (₹)" : "Fine per day (₹)"}
              <input
                className={adminStyles.input}
                type="number"
                min={0}
                value={draft.amount}
                onChange={(e) => set({ amount: e.target.value })}
              />
            </label>
          )}
          {draft.mode === "daily" && (
            <label className={adminStyles.label}>
              Highest total fine (₹) — leave empty for no limit
              <input
                className={adminStyles.input}
                type="number"
                min={0}
                value={draft.maxAmount}
                onChange={(e) => set({ maxAmount: e.target.value })}
              />
            </label>
          )}
        </div>
      </section>

      <section className={adminStyles.section}>
        <div className={adminStyles.sectionHead}>
          <div>
            <h2 className={adminStyles.sectionTitle}>Sibling discount</h2>
            <p className={adminStyles.sectionSubtitle}>
              The percentage off the unpaid fee when you give a student the sibling discount (Students → Payments →
              Discounts). Scholarships and other discounts are set per student and need no rule here.
            </p>
          </div>
        </div>
        <div className={adminStyles.form}>
          <label className={adminStyles.label}>
            Sibling discount (%)
            <input
              className={adminStyles.input}
              type="number"
              min={0}
              max={100}
              value={draft.sibling}
              onChange={(e) => set({ sibling: e.target.value })}
            />
          </label>
        </div>
      </section>

      {needsConfirm && preview && (
        <section className={adminStyles.section}>
          <h2 className={adminStyles.sectionTitle}>
            {preview.deactivatedCount} student{preview.deactivatedCount === 1 ? "" : "s"} will be deactivated
          </h2>
          <p className={adminStyles.sectionSubtitle}>
            Under these rules their grace period is already over. They are locked out at the next fee check (every few
            minutes) until they pay. Nothing is saved yet.
          </p>
          <div className={`${adminStyles.tableWrap} table-scroll`}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Owes</th>
                  <th>Was due</th>
                  <th>Grace ended</th>
                </tr>
              </thead>
              <tbody>
                {preview.deactivated.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <strong>{s.name}</strong>
                      <br />
                      <span className={adminStyles.sectionSubtitle}>{s.email}</span>
                    </td>
                    <td>₹{s.balanceDue}</td>
                    <td>{formatDate(s.dueDate)}</td>
                    <td>{formatDate(s.deadline)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.deactivatedCount > preview.deactivated.length && (
            <p className={adminStyles.sectionSubtitle}>
              Showing the first {preview.deactivated.length} of {preview.deactivatedCount}.
            </p>
          )}
        </section>
      )}

      {preview && preview.lateFee.students > 0 && (
        <p className={adminStyles.sectionSubtitle}>
          With the late fee, {preview.lateFee.students} overdue student{preview.lateFee.students === 1 ? "" : "s"} will
          be charged ₹{preview.lateFee.total} in total at the next fee check.
        </p>
      )}
      {preview && preview.alreadyDue > 0 && (
        <p className={adminStyles.sectionSubtitle}>
          {preview.alreadyDue} more student{preview.alreadyDue === 1 ? " is" : "s are"} past the grace period already,
          whatever you choose.
        </p>
      )}

      <div className={adminStyles.formActions}>
        {needsConfirm ? (
          <>
            <button className={adminStyles.primaryButton} type="button" disabled={busy} onClick={() => run(true)}>
              {busy ? "Saving…" : `Yes, save and deactivate ${preview!.deactivatedCount}`}
            </button>
            <button className={adminStyles.smallButton} type="button" disabled={busy} onClick={() => setPreview(null)}>
              Go back
            </button>
          </>
        ) : (
          <button className={adminStyles.primaryButton} type="button" disabled={busy || !changed} onClick={() => run(false)}>
            {busy ? "Checking…" : "Review and save"}
          </button>
        )}
        {error && <p className={adminStyles.messageError}>{error}</p>}
        {notice && <p className={adminStyles.messageSuccess}>{notice}</p>}
      </div>
    </div>
  );
}
