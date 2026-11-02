"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  api,
  ApiError,
  InquiryAnswer,
  InquiryFilter,
  InquiryForm,
  InquiryQuestion,
  InquiryResponseRow,
  InquirySummary,
} from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import Modal from "../Modal";
import Pagination from "../Pagination";
import styles from "./admin.module.css";
import b from "./inquiry.module.css";


const CHOICE = ["multiple_choice", "checkboxes", "dropdown"];
const FILTERABLE = [
  "short_text",
  "paragraph",
  "name",
  "phone",
  "email",
  "multiple_choice",
  "checkboxes",
  "dropdown",
  "linear_scale",
  "lead",
  "date",
  "time",
];
const TEXT_FILTER = ["short_text", "paragraph", "name", "phone", "email"];

type Tab = "summary" | "responses";
type LeadFilter = "" | "yes" | "no";

function formatAnswer(q: InquiryQuestion, v: InquiryAnswer | undefined): string {
  if (v === undefined || v === null || v === "") return "—";
  if (q.type === "lead") return v === "yes" ? "Yes" : "No";
  if (q.type === "multiple_choice_grid" || q.type === "checkbox_grid") {
    return Object.entries(v as Record<string, string | string[]>)
      .map(([row, val]) => `${row}: ${[].concat(val as never).join(", ")}`)
      .join("\n");
  }
  return Array.isArray(v) ? v.join(", ") : String(v);
}

function FilterValueInput({
  q,
  filter,
  onChange,
}: {
  q: InquiryQuestion;
  filter: InquiryFilter;
  onChange: (f: InquiryFilter) => void;
}) {
  if (q.type === "lead") {
    return (
      <select className={styles.select} value={filter.value} onChange={(e) => onChange({ ...filter, value: e.target.value })}>
        <option value="">Choose…</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    );
  }
  if (CHOICE.includes(q.type)) {
    return (
      <select className={styles.select} value={filter.value} onChange={(e) => onChange({ ...filter, value: e.target.value })}>
        <option value="">Choose…</option>
        {(q.options || []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  if (q.type === "linear_scale") {
    const min = q.scaleMin ?? 1;
    const max = q.scaleMax ?? 5;
    return (
      <select className={styles.select} value={filter.value} onChange={(e) => onChange({ ...filter, value: e.target.value })}>
        <option value="">Choose…</option>
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    );
  }
  if (q.type === "date" || q.type === "time") {
    const type = q.type;
    return (
      <>
        <input className={styles.input} type={type} value={filter.value} onChange={(e) => onChange({ ...filter, value: e.target.value })} />
        <span>to</span>
        <input
          className={styles.input}
          type={type}
          value={filter.valueTo || ""}
          onChange={(e) => onChange({ ...filter, valueTo: e.target.value })}
        />
      </>
    );
  }
  return (
    <input
      className={styles.input}
      placeholder="contains…"
      value={filter.value}
      onChange={(e) => onChange({ ...filter, value: e.target.value })}
    />
  );
}

function SummaryBlock({ q, s }: { q: InquiryQuestion; s?: InquirySummary }) {
  const answered = s?.answered ?? 0;
  const counts = s?.counts;
  const max = counts ? Math.max(1, ...Object.values(counts)) : 1;

  return (
    <div className={b.summaryBlock}>
      <p className={b.summaryTitle}>{q.title}</p>
      <p className={b.summaryMeta}>
        {answered} response{answered === 1 ? "" : "s"}
        {s?.average != null && ` · average ${s.average}`}
      </p>
      {counts &&
        Object.entries(counts).map(([label, n]) => (
          <div key={label} className={b.barRow}>
            <span className={b.barLabel}>{q.type === "lead" ? (label === "yes" ? "Yes" : "No") : label}</span>
            <div className={b.barTrack}>
              <div className={b.barFill} style={{ width: `${(n / max) * 100}%` }} />
            </div>
            <span className={b.barCount}>
              {n} ({answered ? Math.round((n / answered) * 100) : 0}%)
            </span>
          </div>
        ))}
      {!counts && <p className={b.summaryMeta}>Open the Responses tab to read the individual answers.</p>}
    </div>
  );
}

// One response, every answer, plus the lead / delete actions.
function ResponseDetails({
  form,
  response,
  readOnly,
  canAddLead,
  busy,
  onClose,
  onAddLead,
  onDelete,
}: {
  form: InquiryForm;
  response: InquiryResponseRow;
  readOnly: boolean;
  canAddLead: boolean;
  busy: boolean;
  onClose: () => void;
  onAddLead: () => void;
  onDelete: () => void;
}) {
  const nameQ = form.questions.find((q) => q.type === "name");
  const title = (nameQ && formatAnswer(nameQ, response.answers[nameQ.id])) || "Response";

  return (
    <Modal onClose={onClose}>
      <div className={dashboardStyles.modalHead}>
        <div>
          <h2 className={styles.sectionTitle}>{title === "—" ? "Response" : title}</h2>
          <p className={styles.sectionSubtitle}>Submitted {new Date(response.createdAt).toLocaleString()}</p>
        </div>
        <button className={dashboardStyles.modalCloseButton} type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        {form.questions.map((q) => (
          <div key={q.id} className={b.qa}>
            <div className={b.qaQ}>{q.title}</div>
            <div className={b.qaA}>{formatAnswer(q, response.answers[q.id])}</div>
          </div>
        ))}
      </div>

      <div className={styles.formActions} style={{ marginTop: 16 }}>
        {response.lead ? (
          <span className={styles.badgeSuccess}>In your leads</span>
        ) : (
          <button className={styles.primaryButton} type="button" onClick={onAddLead} disabled={busy || !canAddLead}>
            {busy ? "Adding…" : "Add to leads"}
          </button>
        )}
        {!response.lead && !canAddLead && (
          <span className={styles.sectionSubtitle}>This form has no Name + Phone number question.</span>
        )}
        {!readOnly && (
          <button className={styles.dangerButton} type="button" onClick={onDelete} style={{ marginLeft: "auto" }}>
            Delete response
          </button>
        )}
      </div>
    </Modal>
  );
}

export default function InquiryResponses({ role = "admin" }: { role?: "admin" | "telecaller" }) {
  const { institute, id } = useParams<{ institute: string; id: string }>();
  const base = `/${institute}/dashboard/${role}/inquiry-forms`;
  const readOnly = role === "telecaller";

  const [form, setForm] = useState<InquiryForm | null>(null);
  const [responses, setResponses] = useState<InquiryResponseRow[]>([]);
  const [summary, setSummary] = useState<Record<string, InquirySummary>>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<Tab>("responses");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Draft = what's in the inputs; applied = what the current results use.
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [draftLead, setDraftLead] = useState<LeadFilter>("");
  const [draftFilters, setDraftFilters] = useState<InquiryFilter[]>([]);
  const [applied, setApplied] = useState<{ from: string; to: string; inLead: LeadFilter; filters: InquiryFilter[] }>({
    from: "",
    to: "",
    inLead: "",
    filters: [],
  });

  useEffect(() => {
    api
      .getInquiryForm(id)
      .then((res) => setForm({ ...res.form, path: res.path }))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load the form"));
  }, [id]);

  const query = useCallback(
    () => ({
      from: applied.from,
      to: applied.to,
      inLead: applied.inLead || undefined,
      filters: applied.filters.filter((f) => f.value !== ""),
    }),
    [applied]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.listInquiryResponses(id, { page, limit, ...query() });
      setResponses(res.responses);
      setSummary(res.summary);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load responses");
    } finally {
      setLoading(false);
    }
  }, [id, page, limit, query]);

  useEffect(() => {
    load();
  }, [load]);

  const filterable = (form?.questions || []).filter((q) => FILTERABLE.includes(q.type));
  const questionOf = (qid: string) => form?.questions.find((q) => q.id === qid);
  const filtersActive = applied.from || applied.to || applied.inLead || applied.filters.some((f) => f.value);
  // A lead needs a name and a phone to call — only offer the button if the form collects them.
  const canAddLead = !!form?.questions.some((q) => q.type === "name") && !!form?.questions.some((q) => q.type === "phone");
  // The two questions shown inline on each row; the rest live behind "Details".
  const topQuestions = (form?.questions || []).slice(0, 2);
  const active = responses.find((r) => r._id === activeId) || null;

  const apply = () => {
    setPage(1);
    setApplied({ from: draftFrom, to: draftTo, inLead: draftLead, filters: draftFilters });
  };

  const clear = () => {
    setDraftFrom("");
    setDraftTo("");
    setDraftLead("");
    setDraftFilters([]);
    setPage(1);
    setApplied({ from: "", to: "", inLead: "", filters: [] });
  };

  const exportCsv = async () => {
    try {
      const blob = await api.exportInquiryResponses(id, query());
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(form?.subject || "responses").replace(/[^a-z0-9]+/gi, "-")}-responses.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Export failed");
    }
  };

  const addToLeads = async (rid: string) => {
    setError("");
    setNotice("");
    setBusyId(rid);
    try {
      const res = await api.addInquiryResponseToLead(id, rid);
      setNotice(res.message);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add to leads");
    } finally {
      setBusyId(null);
    }
  };

  const removeResponse = async (rid: string) => {
    if (!window.confirm("Delete this response? This can't be undone.")) return;
    try {
      await api.deleteInquiryResponse(id, rid);
      setActiveId(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the response");
    }
  };

  return (
    <div>
      <p style={{ margin: "0 0 8px" }}>
        <Link href={base} className={styles.linkButton}>
          ← All forms
        </Link>
      </p>
      <h1 className={dashboardStyles.pageTitle}>{form?.subject || "Responses"}</h1>
      <p className={dashboardStyles.pageSubtitle}>
        {total} response{total === 1 ? "" : "s"}
        {filtersActive ? " match the current filters" : ""}
        {readOnly ? " · view only — you can add people to your leads" : ""}
      </p>

      {error && <p className={styles.messageError}>{error}</p>}
      {notice && <p className={styles.messageSuccess}>{notice}</p>}

      {active && form && (
        <ResponseDetails
          form={form}
          response={active}
          readOnly={readOnly}
          canAddLead={canAddLead}
          busy={busyId === active._id}
          onClose={() => setActiveId(null)}
          onAddLead={() => addToLeads(active._id)}
          onDelete={() => removeResponse(active._id)}
        />
      )}

      <section className={styles.section} style={{ marginBottom: 20 }}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Filters</h2>
        </div>

        <div className={b.filterBar}>
          <label>
            From date
            <input className={styles.input} type="date" value={draftFrom} onChange={(e) => setDraftFrom(e.target.value)} />
          </label>
          <label>
            To date
            <input className={styles.input} type="date" value={draftTo} onChange={(e) => setDraftTo(e.target.value)} />
          </label>
          <label>
            Lead status
            <select className={styles.select} value={draftLead} onChange={(e) => setDraftLead(e.target.value as LeadFilter)}>
              <option value="">All responses</option>
              <option value="yes">Already in leads</option>
              <option value="no">Not in leads yet</option>
            </select>
          </label>
        </div>

        {draftFilters.map((f, i) => {
          const q = questionOf(f.questionId);
          return (
            <div key={i} className={b.filterRow}>
              <select
                className={styles.select}
                value={f.questionId}
                onChange={(e) =>
                  setDraftFilters((fs) => fs.map((x, j) => (j === i ? { questionId: e.target.value, value: "" } : x)))
                }
              >
                {filterable.map((fq) => (
                  <option key={fq.id} value={fq.id}>
                    {fq.title}
                  </option>
                ))}
              </select>
              {q && (
                <FilterValueInput
                  q={q}
                  filter={f}
                  onChange={(nf) => setDraftFilters((fs) => fs.map((x, j) => (j === i ? nf : x)))}
                />
              )}
              <button type="button" className={styles.smallButton} onClick={() => setDraftFilters((fs) => fs.filter((_, j) => j !== i))}>
                Remove
              </button>
            </div>
          );
        })}

        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.smallButton}
            disabled={filterable.length === 0}
            onClick={() => setDraftFilters((fs) => [...fs, { questionId: filterable[0].id, value: "" }])}
          >
            + Filter by answer
          </button>
          <button type="button" className={styles.primaryButton} onClick={apply}>
            Apply filters
          </button>
          {filtersActive && (
            <button type="button" className={styles.smallButton} onClick={clear}>
              Clear
            </button>
          )}
          {!readOnly && (
            <button type="button" className={styles.smallButton} onClick={exportCsv} style={{ marginLeft: "auto" }}>
              Export CSV
            </button>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.tabs}>
          {(
            [
              ["responses", "Responses"],
              ["summary", "Summary"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`${styles.tab} ${tab === key ? styles.tabActive : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && responses.length === 0 && <p className={styles.empty}>Loading responses…</p>}
        {!loading && total === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyStateIcon} aria-hidden="true">📭</span>
            <p className={styles.emptyStateText}>
              {filtersActive ? "No responses match these filters." : "No responses yet — share the form link with students."}
            </p>
          </div>
        )}

        {total > 0 && tab === "summary" && (
          <div>
            {form?.questions.map((q) => (
              <SummaryBlock key={q.id} q={q} s={summary[q.id]} />
            ))}
          </div>
        )}

        {total > 0 && tab === "responses" && form && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Submitted</th>
                  {topQuestions.map((q) => (
                    <th key={q.id}>{q.title}</th>
                  ))}
                  <th>Lead</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {responses.map((r) => (
                  <tr key={r._id}>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                    {topQuestions.map((q) => (
                      <td key={q.id} className={b.answerCell}>
                        {formatAnswer(q, r.answers[q.id])}
                      </td>
                    ))}
                    <td>
                      {r.lead ? <span className={styles.badgeSuccess}>In leads</span> : <span style={{ color: "var(--muted)" }}>—</span>}
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button className={styles.smallButton} onClick={() => setActiveId(r._id)}>
                          Details
                        </button>
                        {!r.lead && (
                          <button
                            className={styles.primaryButton}
                            onClick={() => addToLeads(r._id)}
                            disabled={busyId === r._id || !canAddLead}
                            title={canAddLead ? "Add this person to your leads" : "This form has no Name + Phone number question"}
                          >
                            {busyId === r._id ? "Adding…" : "Add to leads"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "responses" && <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} limit={limit} limitOptions={[10, 20, 50, 100]} onLimitChange={(n) => { setPage(1); setLimit(n); }} />}
      </section>
    </div>
  );
}
