"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { api, ApiError, Batch, CertSheetRow, CertTemplate, IssueResult, User } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "./admin.module.css";
import Modal from "../Modal";
import { useDebounced } from "./useDebounced";
import { errMsg, pdfName, saveBlob, ymd } from "./certificateUtils";

type Mode = "pick" | "sheet";

const ALIASES: Record<Exclude<keyof CertSheetRow, "row">, string[]> = {
  name: ["name", "student name", "full name", "fullname", "recipient", "candidate name", "student"],
  email: ["email", "e-mail", "email id", "email address"],
  phone: ["phone", "mobile", "mobile no", "mobile number", "phone number", "contact", "contact no"],
  course: ["course", "course name", "program", "programme"],
  grade: ["grade", "result", "marks", "percentage", "score"],
  date: ["date", "certificate date", "issue date", "completion date"],
  certificateNo: ["certificate no", "certificate no.", "certificate number", "certificate_no", "cert no", "number"],
  batch: ["batch", "batch name"],
};

const pick = (row: Record<string, string>, key: keyof typeof ALIASES) => {
  for (const a of ALIASES[key]) if (row[a]) return row[a];
  return "";
};

// Excel dates arrive as Date objects, text dates as dd/mm/yyyy or yyyy-mm-dd.
function toIsoDate(v: unknown): string {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return new Date(`${ymd(v)}T12:00:00`).toISOString();
  const s = String(v ?? "").trim();
  if (!s) return "";
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (dmy) {
    const d = new Date(`${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}T12:00:00`);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T12:00:00` : s);
  return Number.isNaN(d.getTime()) ? s : d.toISOString();
}

async function parseSheet(file: File): Promise<CertSheetRow[]> {
  // CSV: keep every cell as typed text (otherwise 05/03/2026 is read as a US date and 92% becomes 0.92).
  const isCsv = /.csv$/i.test(file.name);
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true, raw: isCsv });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  // Same cells as displayed in Excel ("92%", "A+", leading zeros); dates are read from the raw pass above.
  const shown = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  return raw
    .map((r, i) => {
      const n: Record<string, string> = {};
      for (const [k, v] of Object.entries(shown[i] ?? r)) {
        n[k.trim().toLowerCase()] = String(v ?? "").trim();
      }
      const dateKey = Object.keys(r).find((k) => ALIASES.date.includes(k.trim().toLowerCase()));
      return {
        row: i + 2,
        name: pick(n, "name"),
        email: pick(n, "email"),
        phone: pick(n, "phone"),
        course: pick(n, "course"),
        grade: pick(n, "grade"),
        date: dateKey ? toIsoDate(r[dateKey]) : "",
        certificateNo: pick(n, "certificateNo"),
        batch: pick(n, "batch"),
      };
    })
    .filter((r) => r.name || r.email || r.phone || r.course);
}

function downloadSample() {
  const rows = [
    ["Name", "Email", "Phone", "Course", "Grade", "Date", "Certificate No", "Batch"],
    ["Aarav Sharma", "aarav@example.com", "9998887766", "Full Stack Web Development", "A+", "31/10/2026", "", "Morning Batch"],
    ["Priya Verma", "", "9876543210", "Digital Marketing", "92%", "31/10/2026", "", ""],
  ];
  const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
  saveBlob(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }), "certificate-recipients-sample.csv");
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

const card: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  background: "var(--surface)",
  padding: 18,
};

const stepTitle: React.CSSProperties = { margin: "0 0 12px", fontSize: "0.95rem", fontWeight: 700 };

export default function CertificateIssueModal({
  templates,
  initialId,
  onClose,
  onDone,
}: {
  templates: CertTemplate[];
  initialId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<Mode>("pick");
  const [templateId, setTemplateId] = useState(initialId || templates[0]?._id || "");

  // shared details
  const [course, setCourse] = useState("");
  const [date, setDate] = useState(ymd(new Date()));
  const [grade, setGrade] = useState("");
  const [number, setNumber] = useState("");
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  // pick students
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batch, setBatch] = useState("");
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [students, setStudents] = useState<User[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [picked, setPicked] = useState<Map<string, string>>(new Map());

  // sheet
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<CertSheetRow[]>([]);
  const [parseError, setParseError] = useState("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<IssueResult | null>(null);

  const batchName = useMemo(() => new Map(batches.map((b) => [b._id, b.name])), [batches]);

  useEffect(() => {
    api
      .listBatches({ limit: 200 })
      .then((r) => setBatches(r.batches))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (mode !== "pick") return;
    let live = true;
    setLoadingStudents(true);
    api
      .listUsers({ role: "student", batch: batch || undefined, q: debounced, limit: 200, sort: "name" })
      .then((r) => live && setStudents(r.users))
      .catch(() => live && setStudents([]))
      .finally(() => live && setLoadingStudents(false));
    return () => {
      live = false;
    };
  }, [mode, batch, debounced]);

  const toggle = (u: User) =>
    setPicked((m) => {
      const next = new Map(m);
      if (next.has(u._id)) next.delete(u._id);
      else next.set(u._id, u.name);
      return next;
    });

  const allShown = students.length > 0 && students.every((u) => picked.has(u._id));
  const toggleAll = () =>
    setPicked((m) => {
      const next = new Map(m);
      if (allShown) students.forEach((u) => next.delete(u._id));
      else students.forEach((u) => next.set(u._id, u.name));
      return next;
    });

  const onFile = async (file: File | null) => {
    setParseError("");
    setRows([]);
    setFileName("");
    if (!file) return;
    try {
      const parsed = await parseSheet(file);
      if (!parsed.length) {
        setParseError("No rows found. The first sheet needs a header row with at least a Name column.");
        return;
      }
      if (parsed.length > 500) {
        setParseError("That sheet has more than 500 rows. Please split it into smaller files.");
        return;
      }
      setRows(parsed);
      setFileName(file.name);
    } catch {
      setParseError("Could not read that file. Upload an .xlsx, .xls or .csv file.");
    }
  };

  const count = mode === "pick" ? picked.size : rows.length;
  const dateIso = new Date(`${date}T12:00:00`).toISOString();

  const submit = async () => {
    setError("");
    if (!templateId) return setError("Choose a template");
    if (!count) return setError(mode === "pick" ? "Select at least one student" : "Upload a sheet with recipients");
    setBusy(true);
    try {
      const r =
        mode === "pick"
          ? await api.issueCertificates({
              templateId,
              studentIds: [...picked.keys()],
              course: course.trim() || undefined,
              date: dateIso,
              grade: grade.trim() || undefined,
              certificateNo: picked.size === 1 && number.trim() ? number.trim() : undefined,
              allowDuplicate,
            })
          : await api.issueCertificatesSheet({
              templateId,
              rows,
              defaults: { course: course.trim() || undefined, grade: grade.trim() || undefined, date: dateIso },
              allowDuplicate,
            });
      setResult(r);
      onDone();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("Everyone selected already has this certificate. Tick “Issue again anyway” to create another copy.");
      } else if (err instanceof ApiError && Array.isArray(err.data?.invalid) && err.data.invalid.length) {
        const first = err.data.invalid[0] as { row: number; reason: string };
        setError(`${err.message}. Row ${first.row}: ${first.reason}`);
      } else setError(errMsg(err, "Could not issue certificates"));
    } finally {
      setBusy(false);
    }
  };

  const downloadAll = async () => {
    if (!result) return;
    setBusy(true);
    setError("");
    try {
      const ids = result.certificates.map((c) => c._id);
      saveBlob(await api.certificatesPdf(ids), ids.length === 1 ? pdfName(result.certificates[0].certificateNo) : "certificates.pdf");
    } catch (err) {
      setError(errMsg(err, "Could not download"));
    } finally {
      setBusy(false);
    }
  };

  const templateName = templates.find((t) => t._id === templateId)?.name;

  /* ---------------------------------------------------------- result view */
  if (result) {
    return (
      <Modal onClose={onClose} dialogStyle={{ maxWidth: 720, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
        <div className={dashboardStyles.modalHead}>
          <h2 className={adminStyles.sectionTitle}>Certificates issued</h2>
          <button className={dashboardStyles.modalCloseButton} type="button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              ...card,
              background: "var(--success-soft)",
              borderColor: "transparent",
              color: "var(--success)",
              fontWeight: 600,
            }}
          >
            {result.certificates.length} certificate{result.certificates.length === 1 ? "" : "s"} created from “{templateName}”.
          </div>
          <p className={adminStyles.sectionSubtitle} style={{ margin: 0 }}>
            Students with an account were notified and can download theirs from <em>My Certificates</em>. Download the PDF to
            print or share the rest.
          </p>

          <div className={adminStyles.tableWrap}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Name</th>
                  <th>Course</th>
                </tr>
              </thead>
              <tbody>
                {result.certificates.map((c) => (
                  <tr key={c._id}>
                    <td>{c.certificateNo}</td>
                    <td>{c.studentName}</td>
                    <td>{c.course || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.skipped.length > 0 && (
            <div style={{ ...card, background: "var(--warning-soft)", borderColor: "transparent" }}>
              <strong style={{ color: "var(--warning)" }}>Skipped — already issued ({result.skipped.length})</strong>
              <p style={{ margin: "6px 0 0", fontSize: "0.88rem" }}>{result.skipped.map((s) => s.name).join(", ")}</p>
            </div>
          )}
          {!!result.invalid?.length && (
            <div style={{ ...card, background: "var(--danger-soft)", borderColor: "transparent" }}>
              <strong style={{ color: "var(--danger)" }}>Rows not used ({result.invalid.length})</strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: "0.88rem", display: "grid", gap: 4 }}>
                {result.invalid.map((r) => (
                  <li key={`${r.row}-${r.reason}`}>
                    Row {r.row}
                    {r.name ? ` (${r.name})` : ""}: {r.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className={adminStyles.messageError}>{error}</p>}
          <div className={adminStyles.formActions}>
            <button className={adminStyles.smallButton} onClick={onClose}>
              Done
            </button>
            <button className={adminStyles.primaryButton} onClick={downloadAll} disabled={busy}>
              {busy ? "Preparing…" : "Download PDF"}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  /* ------------------------------------------------------------ form view */
  const detailsForm = (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: mode === "sheet" ? "repeat(auto-fit, minmax(220px, 1fr))" : "1fr" }}>
      <label className={adminStyles.label}>
        <span>Course name <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span></span>
        <input
          className={adminStyles.input}
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          placeholder={mode === "pick" ? "Auto from student's course" : "Used when a row has no course"}
          maxLength={120}
        />
      </label>
      <label className={adminStyles.label}>
        Certificate date
        <input className={adminStyles.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>
      <label className={adminStyles.label}>
        <span>Grade / result <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span></span>
        <input className={adminStyles.input} value={grade} onChange={(e) => setGrade(e.target.value)} maxLength={40} placeholder="e.g. A+ or 92%" />
      </label>
      {mode === "pick" && (
        <label className={adminStyles.label}>
          Certificate number
          <input
            className={adminStyles.input}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            disabled={picked.size !== 1}
            placeholder={picked.size === 1 ? "Leave empty for automatic" : "Automatic"}
            maxLength={40}
          />
        </label>
      )}
      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: "0.88rem", lineHeight: 1.4 }}>
        <input style={{ marginTop: 3 }} type="checkbox" checked={allowDuplicate} onChange={(e) => setAllowDuplicate(e.target.checked)} />
        Issue again even if the person already has this certificate
      </label>
    </div>
  );

  return (
    <Modal onClose={onClose} dialogStyle={{ maxWidth: 1000, width: "96vw", maxHeight: "94vh", overflowY: "auto" }}>
      <div className={dashboardStyles.modalHead}>
        <h2 className={adminStyles.sectionTitle}>Issue certificates</h2>
        <button className={dashboardStyles.modalCloseButton} type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <div style={{ display: "grid", gap: 20 }}>
        {/* 1. template + 2. who */}
        <section style={card}>
          <h3 style={stepTitle}>1 · Which certificate?</h3>
          <select className={adminStyles.select} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            {templates.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
        </section>

        <section style={card}>
          <h3 style={stepTitle}>2 · Who is it for?</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {(
              [
                ["pick", "Choose students", "Pick from your registered students — by batch or search."],
                ["sheet", "Upload Excel / CSV", "A sheet with names (and optionally course, grade, date). No account needed."],
              ] as [Mode, string, string][]
            ).map(([m, title, hint]) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                style={{
                  textAlign: "left",
                  padding: "14px 16px",
                  borderRadius: "var(--radius-md)",
                  border: `2px solid ${mode === m ? "var(--brand)" : "var(--border)"}`,
                  background: mode === m ? "var(--brand-soft)" : "var(--surface)",
                  color: "var(--foreground)",
                  cursor: "pointer",
                  display: "grid",
                  gap: 4,
                }}
              >
                <strong>{title}</strong>
                <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{hint}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 3. people + details */}
        <div style={{ display: "grid", gridTemplateColumns: mode === "sheet" ? "minmax(0, 1fr)" : "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, alignItems: "start" }}>
          <section style={{ ...card, display: "grid", gap: 14 }}>
            <h3 style={{ ...stepTitle, margin: 0 }}>3 · {mode === "pick" ? "Select students" : "Upload your sheet"}</h3>

            {mode === "pick" ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                  <select className={adminStyles.select} value={batch} onChange={(e) => setBatch(e.target.value)} aria-label="Batch">
                    <option value="">All batches</option>
                    {batches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className={adminStyles.input}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name or email"
                    aria-label="Search students"
                  />
                </div>

                <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      background: "var(--surface-alt)",
                      borderBottom: "1px solid var(--border)",
                      cursor: students.length ? "pointer" : "default",
                    }}
                  >
                    <input type="checkbox" checked={allShown} onChange={toggleAll} disabled={!students.length} />
                    <strong style={{ fontSize: "0.9rem" }}>Select all {students.length ? `(${students.length})` : ""}</strong>
                  </label>
                  <div style={{ maxHeight: 360, overflowY: "auto" }}>
                    {loadingStudents && <p className={adminStyles.empty}>Loading…</p>}
                    {!loadingStudents && students.length === 0 && <p className={adminStyles.empty}>No students found.</p>}
                    {students.map((u) => {
                      const on = picked.has(u._id);
                      const sub = [
                        typeof u.course === "object" && u.course ? u.course.name : "",
                        u.batch ? batchName.get(u.batch) : "",
                      ]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <label
                          key={u._id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            padding: "12px 16px",
                            borderBottom: "1px solid var(--border)",
                            background: on ? "var(--brand-soft)" : "transparent",
                            cursor: "pointer",
                          }}
                        >
                          <input type="checkbox" checked={on} onChange={() => toggle(u)} />
                          <span
                            aria-hidden="true"
                            style={{
                              width: 36,
                              height: 36,
                              flex: "none",
                              borderRadius: "50%",
                              display: "grid",
                              placeItems: "center",
                              background: "var(--surface-alt)",
                              color: "var(--brand-dark)",
                              fontWeight: 700,
                              fontSize: "0.8rem",
                            }}
                          >
                            {initials(u.name)}
                          </span>
                          <span style={{ minWidth: 0, display: "grid", gap: 2 }}>
                            <strong style={{ fontSize: "0.92rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {u.name}
                            </strong>
                            <span style={{ fontSize: "0.8rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {sub || u.email}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {picked.size > 0 && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <strong style={{ fontSize: "0.9rem" }}>{picked.size} selected</strong>
                      <button type="button" className={adminStyles.smallButton} onClick={() => setPicked(new Map())}>
                        Clear
                      </button>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 110, overflowY: "auto" }}>
                      {[...picked].map(([id, name]) => (
                        <span
                          key={id}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 6px 4px 12px",
                            borderRadius: 999,
                            background: "var(--brand-soft)",
                            color: "var(--brand-dark)",
                            fontSize: "0.82rem",
                          }}
                        >
                          {name}
                          <button
                            type="button"
                            aria-label={`Remove ${name}`}
                            onClick={() =>
                              setPicked((m) => {
                                const next = new Map(m);
                                next.delete(id);
                                return next;
                              })
                            }
                            style={{ border: 0, background: "transparent", cursor: "pointer", color: "inherit", fontSize: "0.9rem" }}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <label
                  style={{
                    display: "grid",
                    gap: 6,
                    placeItems: "center",
                    textAlign: "center",
                    padding: "28px 16px",
                    border: "2px dashed var(--border)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--surface-alt)",
                    cursor: "pointer",
                  }}
                >
                  <strong>{fileName || "Choose an Excel or CSV file"}</strong>
                  <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                    {fileName ? `${rows.length} recipients found — click to change` : ".xlsx, .xls or .csv · up to 500 rows"}
                  </span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                    style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
                  />
                </label>
                {parseError && <p className={adminStyles.messageError}>{parseError}</p>}

                <div style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.6 }}>
                  <strong style={{ color: "var(--foreground)" }}>Columns:</strong> Name (required), Email, Phone, Course, Grade,
                  Date, Certificate No, Batch. If an Email or Phone matches one of your students, the certificate also appears in
                  their account.{" "}
                  <button type="button" onClick={downloadSample} className={adminStyles.smallButton}>
                    Download sample sheet
                  </button>
                </div>

                {rows.length > 0 && (
                  <div className={adminStyles.tableWrap} style={{ maxHeight: 280, overflowY: "auto" }}>
                    <table className={adminStyles.table}>
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Name</th>
                          <th>Course</th>
                          <th>Grade</th>
                          <th>Email / phone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 50).map((r) => {
                          const noName = !r.name && !r.email && !r.phone;
                          return (
                            <tr key={r.row}>
                              <td>{r.row}</td>
                              <td style={noName ? { color: "var(--danger)" } : undefined}>{r.name || (noName ? "Missing" : "From account")}</td>
                              <td>{r.course || "—"}</td>
                              <td>{r.grade || "—"}</td>
                              <td>{r.email || r.phone || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {rows.length > 50 && <p className={adminStyles.sectionSubtitle}>Showing first 50 of {rows.length} rows.</p>}
                  </div>
                )}
              </>
            )}
          </section>

          <section style={card}>
            <h3 style={stepTitle}>4 · Certificate details</h3>
            {detailsForm}
          </section>
        </div>

        {error && <p className={adminStyles.messageError}>{error}</p>}
        <div
          className={adminStyles.formActions}
          style={{
            position: "sticky",
            bottom: -28,
            margin: "0 -28px -28px",
            padding: "14px 28px",
            background: "var(--surface)",
            borderTop: "1px solid var(--border)",
            justifyContent: "flex-end",
          }}
        >
          <button type="button" className={adminStyles.smallButton} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={adminStyles.primaryButton} onClick={submit} disabled={busy || count === 0}>
            {busy ? "Issuing…" : count ? `Issue ${count} certificate${count === 1 ? "" : "s"}` : "Issue certificates"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
