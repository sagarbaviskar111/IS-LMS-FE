"use client";

import { useCallback, useEffect, useState } from "react";
import {
  api,
  ApiError,
  FinanceMethod,
  FinanceRow,
  FinanceSummary,
  FinanceType,
} from "@/lib/api";
import { dayEndISO, dayStartISO } from "@/lib/dates";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "./admin.module.css";
import Modal from "../Modal";
import Pagination from "../Pagination";
import PaymentsAttention from "./PaymentsAttention";
import SenderEmailWarning from "./SenderEmailWarning";
import { useDebounced } from "./useDebounced";

const PAGE_SIZE = 15;
const METHODS: FinanceMethod[] = ["cash", "upi", "bank", "card", "cheque", "other"];
const SUGGESTED = {
  credit: ["Registration fee", "Donation", "Course sale", "Other income"],
  debit: ["Salary", "Rent", "Electricity & internet", "Marketing", "Equipment", "Refund", "Software", "Other expense"],
};

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

type Preset = "month" | "last" | "year" | "all" | "custom";

function presetRange(p: Preset): { from: string; to: string } {
  const now = new Date();
  if (p === "month") return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymd(now) };
  if (p === "last") {
    return {
      from: ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: ymd(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }
  if (p === "year") return { from: ymd(new Date(now.getFullYear(), 0, 1)), to: ymd(now) };
  return { from: "", to: "" };
}

const monthLabel = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
};

const methodLabel = (m: string) => (m === "upi" ? "UPI" : m.charAt(0).toUpperCase() + m.slice(1));

function BreakdownList({
  title,
  rows,
  total,
  color,
}: {
  title: string;
  rows: { category: string; total: number; count: number }[];
  total: number;
  color: string;
}) {
  return (
    <section className={adminStyles.section}>
      <h3 className={adminStyles.sectionTitle} style={{ fontSize: "0.95rem" }}>
        {title}
      </h3>
      {rows.length === 0 && <p className={adminStyles.empty}>Nothing in this period.</p>}
      <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
        {rows.map((r) => (
          <div key={r.category}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: "0.9rem" }}>
              <span>
                {r.category} <span style={{ color: "var(--muted)" }}>· {r.count}</span>
              </span>
              <strong>{inr(r.total)}</strong>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "var(--border)", marginTop: 4 }}>
              <div
                style={{
                  width: `${total > 0 ? Math.max(2, (r.total / total) * 100) : 0}%`,
                  height: "100%",
                  borderRadius: 3,
                  background: color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AdminFinance() {
  const [preset, setPreset] = useState<Preset>("month");
  const [range, setRange] = useState(presetRange("month"));

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [rows, setRows] = useState<FinanceRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [typeFilter, setTypeFilter] = useState<FinanceType | "">("");
  const [sourceFilter, setSourceFilter] = useState<"manual" | "payment" | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);

  const [used, setUsed] = useState<{ credit: string[]; debit: string[] }>({ credit: [], debit: [] });
  const [editing, setEditing] = useState<FinanceRow | "new" | null>(null);

  const dateQuery = {
    from: range.from ? dayStartISO(range.from) : undefined,
    to: range.to ? dayEndISO(range.to) : undefined,
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = {
        from: range.from ? dayStartISO(range.from) : undefined,
        to: range.to ? dayEndISO(range.to) : undefined,
      };
      const [s, list, cats] = await Promise.all([
        api.financeSummary(q),
        api.financeEntries({
          ...q,
          type: typeFilter,
          source: sourceFilter,
          category: categoryFilter,
          q: debouncedSearch,
          page,
          limit: PAGE_SIZE,
        }),
        api.financeCategories(),
      ]);
      setSummary(s);
      setRows(list.entries);
      setTotalPages(list.totalPages);
      setTotal(list.total);
      setUsed(cats);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load the finance records");
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, typeFilter, sourceFilter, categoryFilter, debouncedSearch, page]);

  useEffect(() => {
    load();
  }, [load]);

  const choosePreset = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") setRange(presetRange(p));
    setPage(1);
  };

  const allCategories = Array.from(
    new Set([...(summary?.credits ?? []).map((c) => c.category), ...(summary?.debits ?? []).map((c) => c.category)])
  ).sort();

  const remove = async (row: FinanceRow) => {
    if (!window.confirm(`Delete "${row.title}" (${inr(row.amount)})?`)) return;
    try {
      await api.deleteFinanceEntry(row._id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the entry");
    }
  };

  const exportCsv = async () => {
    try {
      const blob = await api.financeExport({
        ...dateQuery,
        type: typeFilter,
        source: sourceFilter,
        category: categoryFilter,
        q: debouncedSearch,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "finance-ledger.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not export");
    }
  };

  const maxMonth = Math.max(1, ...(summary?.monthly ?? []).map((m) => Math.max(m.credit, m.debit)));

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Finance</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Every rupee in and out. Student fee payments are added automatically; record everything else here.
      </p>

      <SenderEmailWarning />
      <PaymentsAttention />

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        {(
          [
            ["month", "This month"],
            ["last", "Last month"],
            ["year", "This year"],
            ["all", "All time"],
            ["custom", "Custom"],
          ] as [Preset, string][]
        ).map(([p, label]) => (
          <button
            key={p}
            type="button"
            className={preset === p ? adminStyles.primaryButton : adminStyles.smallButton}
            onClick={() => choosePreset(p)}
          >
            {label}
          </button>
        ))}
        {preset === "custom" && (
          <>
            <input
              className={adminStyles.input}
              style={{ maxWidth: 160 }}
              type="date"
              value={range.from}
              max={range.to || undefined}
              onChange={(e) => {
                setRange({ ...range, from: e.target.value });
                setPage(1);
              }}
            />
            <span>to</span>
            <input
              className={adminStyles.input}
              style={{ maxWidth: 160 }}
              type="date"
              value={range.to}
              min={range.from || undefined}
              onChange={(e) => {
                setRange({ ...range, to: e.target.value });
                setPage(1);
              }}
            />
          </>
        )}
      </div>

      {error && <p className={adminStyles.messageError}>{error}</p>}

      <div className={dashboardStyles.cardGrid} style={{ marginBottom: 20 }}>
        <div className={dashboardStyles.card}>
          <p className={dashboardStyles.cardLabel}>Total credit (money in)</p>
          <p className={dashboardStyles.cardValue} style={{ color: "var(--success)" }}>
            {summary ? inr(summary.credit) : "…"}
          </p>
        </div>
        <div className={dashboardStyles.card}>
          <p className={dashboardStyles.cardLabel}>Total debit (money out)</p>
          <p className={dashboardStyles.cardValue} style={{ color: "var(--danger)" }}>
            {summary ? inr(summary.debit) : "…"}
          </p>
        </div>
        <div className={dashboardStyles.card}>
          <p className={dashboardStyles.cardLabel}>Net balance</p>
          <p
            className={dashboardStyles.cardValue}
            style={{ color: summary && summary.net < 0 ? "var(--danger)" : undefined }}
          >
            {summary ? inr(summary.net) : "…"}
          </p>
        </div>
        <div className={dashboardStyles.card}>
          <p className={dashboardStyles.cardLabel}>Fees still to collect</p>
          <p className={dashboardStyles.cardValue}>{summary ? inr(summary.receivable) : "…"}</p>
          {summary && summary.receivableStudents > 0 && (
            <p className={adminStyles.sectionSubtitle} style={{ margin: 0 }}>
              from {summary.receivableStudents} student{summary.receivableStudents > 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {summary && summary.monthly.length > 0 && (
        <section className={adminStyles.section} style={{ marginBottom: 20 }}>
          <h2 className={adminStyles.sectionTitle}>Month by month</h2>
          <div style={{ display: "flex", gap: 14, fontSize: "0.8rem", margin: "6px 0 10px" }}>
            <span>
              <span style={{ display: "inline-block", width: 10, height: 10, background: "var(--success)", marginRight: 4 }} />
              Credit
            </span>
            <span>
              <span style={{ display: "inline-block", width: 10, height: 10, background: "var(--danger)", marginRight: 4 }} />
              Debit
            </span>
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-end", overflowX: "auto", paddingBottom: 4 }}>
            {summary.monthly.map((m) => (
              <div key={m.month} style={{ textAlign: "center", minWidth: 64 }}>
                <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 120, justifyContent: "center" }}>
                  <div
                    title={`Credit ${inr(m.credit)}`}
                    style={{ width: 18, height: `${(m.credit / maxMonth) * 100}%`, minHeight: m.credit ? 2 : 0, background: "var(--success)", borderRadius: "3px 3px 0 0" }}
                  />
                  <div
                    title={`Debit ${inr(m.debit)}`}
                    style={{ width: 18, height: `${(m.debit / maxMonth) * 100}%`, minHeight: m.debit ? 2 : 0, background: "var(--danger)", borderRadius: "3px 3px 0 0" }}
                  />
                </div>
                <div style={{ fontSize: "0.75rem", marginTop: 4 }}>{monthLabel(m.month)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className={adminStyles.grid} style={{ marginBottom: 20 }}>
        <BreakdownList title="Where money came from" rows={summary?.credits ?? []} total={summary?.credit ?? 0} color="var(--success)" />
        <BreakdownList title="Where money went" rows={summary?.debits ?? []} total={summary?.debit ?? 0} color="var(--danger)" />
      </div>

      <section className={adminStyles.section}>
        <div className={adminStyles.sectionHead}>
          <div>
            <h2 className={adminStyles.sectionTitle}>Ledger</h2>
            <p className={adminStyles.sectionSubtitle}>{total} entr{total === 1 ? "y" : "ies"} in this view</p>
          </div>
          <div className={adminStyles.rowActions}>
            <button className={adminStyles.smallButton} type="button" onClick={exportCsv}>
              Export CSV
            </button>
            <button className={adminStyles.primaryButton} type="button" onClick={() => setEditing("new")}>
              + Add entry
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <select
            className={adminStyles.select}
            style={{ maxWidth: 150 }}
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as FinanceType | "");
              setPage(1);
            }}
          >
            <option value="">Credit &amp; debit</option>
            <option value="credit">Credit only</option>
            <option value="debit">Debit only</option>
          </select>
          <select
            className={adminStyles.select}
            style={{ maxWidth: 170 }}
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value as "manual" | "payment" | "");
              setPage(1);
            }}
          >
            <option value="">All sources</option>
            <option value="payment">Student payments</option>
            <option value="manual">Manual entries</option>
          </select>
          <select
            className={adminStyles.select}
            style={{ maxWidth: 190 }}
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            className={adminStyles.input}
            style={{ maxWidth: 220 }}
            placeholder="Search title or note"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {!loading && rows.length === 0 && <p className={adminStyles.empty}>No entries match these filters.</p>}

        {rows.length > 0 && (
          <div className={`${adminStyles.tableWrap} table-scroll`}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Details</th>
                  <th>Category</th>
                  <th>Method</th>
                  <th style={{ textAlign: "right" }}>Credit</th>
                  <th style={{ textAlign: "right" }}>Debit</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.source}-${r._id}`}>
                    <td>{new Date(r.date).toLocaleDateString()}</td>
                    <td>
                      {r.title}
                      {r.source === "payment" && (
                        <span className={adminStyles.badgeSuccess} style={{ marginLeft: 6 }}>
                          Auto
                        </span>
                      )}
                      {r.note && (
                        <div className={adminStyles.sectionSubtitle} style={{ margin: 0 }}>
                          {r.note}
                        </div>
                      )}
                    </td>
                    <td>{r.category}</td>
                    <td>{methodLabel(r.method)}</td>
                    <td style={{ textAlign: "right", color: "var(--success)", fontWeight: 600 }}>
                      {r.type === "credit" ? inr(r.amount) : ""}
                    </td>
                    <td style={{ textAlign: "right", color: "var(--danger)", fontWeight: 600 }}>
                      {r.type === "debit" ? inr(r.amount) : ""}
                    </td>
                    <td>
                      {r.source === "manual" && (
                        <div className={adminStyles.rowActions}>
                          <button className={adminStyles.smallButton} type="button" onClick={() => setEditing(r)}>
                            Edit
                          </button>
                          <button className={adminStyles.dangerButton} type="button" onClick={() => remove(r)}>
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </section>

      {editing && (
        <EntryModal
          row={editing === "new" ? null : editing}
          used={used}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function EntryModal({
  row,
  used,
  onClose,
  onSaved,
}: {
  row: FinanceRow | null;
  used: { credit: string[]; debit: string[] };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<FinanceType>(row?.type ?? "debit");
  const [amount, setAmount] = useState(row ? String(row.amount) : "");
  const [date, setDate] = useState(row ? ymd(new Date(row.date)) : ymd(new Date()));
  const [category, setCategory] = useState(row?.category ?? "");
  const [title, setTitle] = useState(row?.title ?? "");
  const [method, setMethod] = useState<FinanceMethod>((row?.method as FinanceMethod) ?? "cash");
  const [note, setNote] = useState(row?.note ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const suggestions = Array.from(new Set([...used[type], ...SUGGESTED[type]]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const value = Number(amount);
    if (!value || value <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        type,
        amount: value,
        category: category.trim(),
        title: title.trim(),
        method,
        note: note.trim(),
        date: new Date(`${date}T12:00:00`).toISOString(),
      };
      if (row) await api.updateFinanceEntry(row._id, payload);
      else await api.createFinanceEntry(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the entry");
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} dialogStyle={{ maxWidth: 520, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
      <div className={dashboardStyles.modalHead}>
        <h2 className={adminStyles.sectionTitle}>{row ? "Edit entry" : "Add entry"}</h2>
        <button className={dashboardStyles.modalCloseButton} type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <form className={adminStyles.form} onSubmit={submit}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className={type === "credit" ? adminStyles.primaryButton : adminStyles.smallButton}
            style={{ flex: 1 }}
            onClick={() => setType("credit")}
          >
            Credit (money in)
          </button>
          <button
            type="button"
            className={type === "debit" ? adminStyles.primaryButton : adminStyles.smallButton}
            style={{ flex: 1 }}
            onClick={() => setType("debit")}
          >
            Debit (money out)
          </button>
        </div>

        <label className={adminStyles.label}>
          Amount (₹)
          <input
            className={adminStyles.input}
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label className={adminStyles.label}>
          Date
          <input className={adminStyles.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className={adminStyles.label}>
          Category
          <input
            className={adminStyles.input}
            list="finance-categories"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder={type === "credit" ? "e.g. Donation" : "e.g. Rent"}
            maxLength={60}
            required
          />
          <datalist id="finance-categories">
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label className={adminStyles.label}>
          Title
          <input
            className={adminStyles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What was this for?"
            maxLength={120}
            required
          />
        </label>
        <label className={adminStyles.label}>
          Paid via
          <select className={adminStyles.select} value={method} onChange={(e) => setMethod(e.target.value as FinanceMethod)}>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {methodLabel(m)}
              </option>
            ))}
          </select>
        </label>
        <label className={adminStyles.label}>
          Note
          <input className={adminStyles.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional" maxLength={500} />
        </label>

        <div className={adminStyles.formActions}>
          <button className={adminStyles.primaryButton} type="submit" disabled={saving}>
            {saving ? "Saving..." : row ? "Save changes" : "Add entry"}
          </button>
          {error && <p className={adminStyles.messageError}>{error}</p>}
        </div>
      </form>
    </Modal>
  );
}
