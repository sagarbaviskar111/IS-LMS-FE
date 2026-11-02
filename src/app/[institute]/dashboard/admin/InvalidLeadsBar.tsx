"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import styles from "./admin.module.css";

// "Invalid leads" review mode, shared by the admin list and the telecaller's
// My Leads. Invalid = phone isn't a usable mobile number, or the email isn't a
// real address. The page owns the list and the selection; this renders the
// toggle and, in review mode, the select-all / delete controls.
export default function InvalidLeadsBar({
  invalidCount,
  active,
  onToggle,
  pageIds,
  selected,
  setSelected,
  allSelected,
  setAllSelected,
  remove,
  onDeleted,
}: {
  invalidCount: number;
  active: boolean;
  onToggle: () => void;
  pageIds: string[]; // ids of the invalid leads on the current page
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  allSelected: boolean; // "all N invalid leads" (across pages) is chosen
  setAllSelected: (v: boolean) => void;
  remove: (payload: { ids?: string[]; all?: boolean }) => Promise<{ deleted: number }>;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const pageAllChecked = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const count = allSelected ? invalidCount : selected.size;

  const togglePage = () => {
    setAllSelected(false);
    setSelected(pageAllChecked ? new Set() : new Set(pageIds));
  };

  const doDelete = async () => {
    if (count === 0) return;
    if (
      !window.confirm(
        `Permanently delete ${count} invalid lead${count === 1 ? "" : "s"}? This can't be undone.`
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await remove(allSelected ? { all: true } : { ids: [...selected] });
      setSelected(new Set());
      setAllSelected(false);
      setNotice(`Deleted ${res.deleted} lead${res.deleted === 1 ? "" : "s"}.`);
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the leads");
    } finally {
      setBusy(false);
    }
  };

  if (!active) {
    if (invalidCount === 0 && !notice) return null;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", margin: "0 0 14px" }}>
        {invalidCount > 0 && (
          <button type="button" className={styles.smallButton} onClick={onToggle}>
            Review invalid leads ({invalidCount})
          </button>
        )}
        {notice && <span className={styles.messageSuccess}>{notice}</span>}
      </div>
    );
  }

  return (
    <div
      style={{
        margin: "0 0 14px",
        padding: 14,
        border: "1px solid var(--warning)",
        background: "var(--warning-soft)",
        borderRadius: "var(--radius-md)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ fontWeight: 600, color: "var(--foreground)" }}>
        Invalid leads — phone number or email isn&apos;t valid
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={pageAllChecked || allSelected} onChange={togglePage} disabled={pageIds.length === 0} />
          Select all on this page
        </label>
        {pageAllChecked && !allSelected && invalidCount > pageIds.length && (
          <button type="button" className={styles.linkButton} onClick={() => setAllSelected(true)}>
            Select all {invalidCount} invalid leads
          </button>
        )}
        {allSelected && (
          <span style={{ color: "var(--muted)" }}>
            All {invalidCount} invalid leads selected.{" "}
            <button type="button" className={styles.linkButton} onClick={() => setAllSelected(false)}>
              Undo
            </button>
          </span>
        )}
        <span style={{ flex: 1 }} />
        <button type="button" className={styles.dangerButton} onClick={doDelete} disabled={busy || count === 0}>
          {busy ? "Deleting…" : `Delete selected (${count})`}
        </button>
        <button type="button" className={styles.smallButton} onClick={onToggle} disabled={busy}>
          Back to all leads
        </button>
      </div>
      {error && <p className={styles.messageError}>{error}</p>}
      {notice && <p className={styles.messageSuccess}>{notice}</p>}
    </div>
  );
}
