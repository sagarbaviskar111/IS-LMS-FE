"use client";

import { useEffect, useState } from "react";
import { LeadFilterState, LeadSourceOption, User } from "@/lib/api";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/leadStatus";
import styles from "./admin.module.css";
import f from "./leadFilters.module.css";

export const EMPTY_LEAD_FILTERS: LeadFilterState = {
  q: "",
  status: "",
  telecaller: "",
  source: "",
  calls: "",
  followUp: "",
  from: "",
  to: "",
  sort: "newest",
};

// Source options are encoded as "<source>|<label>" so one dropdown can pick
// both the kind (manual / integration / inquiry form) and the specific form.
export const encodeSource = (o: LeadSourceOption) => `${o.source}|${o.label || ""}`;

function sourceText(o: LeadSourceOption): string {
  if (o.source === "inquiry_form") return `Form: ${o.label || "Inquiry form"}`;
  if (o.source === "webhook") return `Integration: ${o.label || "External"}`;
  if (o.source === "import") return `Uploaded: ${o.label || "Excel/CSV"}`;
  return "Added manually";
}

// How many filters (other than sort) are narrowing the list right now.
export const activeFilterCount = (v: LeadFilterState) =>
  [v.q, v.status, v.telecaller, v.source, v.calls, v.followUp, v.from, v.to].filter(Boolean).length;

export default function LeadFilters({
  value,
  onChange,
  sources,
  telecallers,
  total,
}: {
  value: LeadFilterState;
  onChange: (next: LeadFilterState) => void;
  sources: LeadSourceOption[];
  // Admin only — callers only ever see their own leads, so no telecaller filter.
  telecallers?: User[];
  total: number;
}) {
  // Search is debounced so the list isn't refetched on every keystroke.
  const [text, setText] = useState(value.q);
  useEffect(() => setText(value.q), [value.q]);
  useEffect(() => {
    if (text === value.q) return;
    const t = setTimeout(() => onChange({ ...value, q: text }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const set = (patch: Partial<LeadFilterState>) => onChange({ ...value, ...patch });
  const active = activeFilterCount(value) + (text !== value.q && text ? 1 : 0);

  return (
    <div className={f.bar}>
      <div className={f.topRow}>
        <input
          className={`${styles.input} ${f.search}`}
          type="search"
          placeholder="Search name, phone or email…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <label className={f.inline}>
          Sort
          <select className={styles.select} value={value.sort} onChange={(e) => set({ sort: e.target.value as LeadFilterState["sort"] })}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
          </select>
        </label>
      </div>

      <div className={f.grid}>
        <label>
          Status
          <select className={styles.select} value={value.status} onChange={(e) => set({ status: e.target.value as LeadFilterState["status"] })}>
            <option value="">All statuses</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        {telecallers && (
          <label>
            Telecaller
            <select className={styles.select} value={value.telecaller} onChange={(e) => set({ telecaller: e.target.value })}>
              <option value="">All telecallers</option>
              <option value="unassigned">Unassigned</option>
              {telecallers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label>
          Source
          <select className={styles.select} value={value.source} onChange={(e) => set({ source: e.target.value })}>
            <option value="">All sources</option>
            {sources.map((o) => (
              <option key={encodeSource(o)} value={encodeSource(o)}>
                {sourceText(o)} ({o.count})
              </option>
            ))}
          </select>
        </label>

        <label>
          Calls
          <select className={styles.select} value={value.calls} onChange={(e) => set({ calls: e.target.value as LeadFilterState["calls"] })}>
            <option value="">Any</option>
            <option value="none">Never called</option>
            <option value="some">Called at least once</option>
          </select>
        </label>

        {!telecallers && (
          <label>
            Follow-up
            <select className={styles.select} value={value.followUp} onChange={(e) => set({ followUp: e.target.value as LeadFilterState["followUp"] })}>
              <option value="">Any</option>
              <option value="overdue">Overdue</option>
              <option value="today">Due today</option>
              <option value="upcoming">Upcoming</option>
              <option value="any">Has a reminder</option>
            </select>
          </label>
        )}

        <label>
          Added from
          <input className={styles.input} type="date" value={value.from} max={value.to || undefined} onChange={(e) => set({ from: e.target.value })} />
        </label>

        <label>
          Added to
          <input className={styles.input} type="date" value={value.to} min={value.from || undefined} onChange={(e) => set({ to: e.target.value })} />
        </label>
      </div>

      <div className={f.footer}>
        <span className={f.count}>
          {total} lead{total === 1 ? "" : "s"}
          {active > 0 ? ` match ${active} filter${active === 1 ? "" : "s"}` : ""}
        </span>
        {active > 0 && (
          <button type="button" className={styles.smallButton} onClick={() => onChange({ ...EMPTY_LEAD_FILTERS, sort: value.sort })}>
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
