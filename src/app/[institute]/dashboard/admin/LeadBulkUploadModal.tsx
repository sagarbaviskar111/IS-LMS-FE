"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { api, ApiError, LeadBulkResult, User } from "@/lib/api";
import { normalizeEmail, normalizePhone } from "@/lib/validate";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "./admin.module.css";
import Modal from "../Modal";

const MAX_ROWS = 500;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface ParsedRow {
  name: string;
  phone: string;
  email: string;
  notes: string;
  telecaller: string;
}

// Column headers people actually use — matched case-insensitively.
const ALIASES: Record<keyof ParsedRow | "firstName" | "lastName", string[]> = {
  name: ["name", "full name", "fullname", "lead name", "student name", "customer name"],
  firstName: ["first name", "firstname", "first"],
  lastName: ["last name", "lastname", "surname", "last"],
  phone: ["phone", "mobile", "phone number", "mobile number", "contact", "contact number", "whatsapp", "whatsapp number"],
  email: ["email", "e-mail", "email address", "email id"],
  notes: ["notes", "note", "remarks", "remark", "comment", "comments", "message"],
  telecaller: ["telecaller", "telecaller email", "assign to", "assigned to", "caller", "caller email"],
};

const pick = (row: Record<string, string>, field: keyof typeof ALIASES) => {
  for (const a of ALIASES[field]) if (row[a]) return row[a];
  return "";
};

async function parseFile(file: File): Promise<ParsedRow[]> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return raw
    .map((r) => {
      const n: Record<string, string> = {};
      for (const [k, v] of Object.entries(r)) n[k.trim().toLowerCase()] = String(v ?? "").trim();
      const name = pick(n, "name") || [pick(n, "firstName"), pick(n, "lastName")].filter(Boolean).join(" ");
      return {
        name,
        phone: pick(n, "phone"),
        email: pick(n, "email"),
        notes: pick(n, "notes"),
        telecaller: pick(n, "telecaller"),
      };
    })
    // Fully blank spreadsheet rows (trailing formatting) aren't leads.
    .filter((r) => Object.values(r).some(Boolean));
}

// Same checks the server runs, so the preview tells the truth before uploading.
function rowProblems(rows: ParsedRow[], telecallerEmails: Set<string>): (string | null)[] {
  const seen = new Set<string>();
  return rows.map((r) => {
    if (r.name.trim().length < 2) return "Name is required";
    if (!r.phone.trim()) return "Phone is required";
    const phone = normalizePhone(r.phone);
    if (!phone) return "Invalid phone number";
    if (r.email.trim() && !normalizeEmail(r.email)) return "Invalid email address";
    if (seen.has(phone)) return "Duplicate phone in this file";
    seen.add(phone);
    const caller = r.telecaller.trim().toLowerCase();
    if (caller && !telecallerEmails.has(caller)) return "Telecaller email not found";
    return null;
  });
}

const SAMPLE_HEADERS = ["Name", "Phone", "Email", "Notes", "Telecaller Email"];
const SAMPLE_ROWS = [
  ["Rahul Sharma", "9876543210", "rahul@example.com", "Interested in Full-Stack course", ""],
  ["Priya Singh", "9123456780", "priya@example.com", "Call after 6 pm", ""],
  ["Amit Verma", "9988776655", "", "", ""],
];

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadSampleCsv() {
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [SAMPLE_HEADERS, ...SAMPLE_ROWS].map((r) => r.map(q).join(",")).join("\r\n");
  // BOM so Excel opens the file as UTF-8 (names in any language stay intact).
  save(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }), "leads-sample.csv");
}

function downloadSampleExcel() {
  const wb = XLSX.utils.book_new();
  const leads = XLSX.utils.aoa_to_sheet([SAMPLE_HEADERS, ...SAMPLE_ROWS]);
  leads["!cols"] = [{ wch: 22 }, { wch: 16 }, { wch: 28 }, { wch: 36 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, leads, "Leads");

  const help = XLSX.utils.aoa_to_sheet([
    ["Column", "Required?", "What to enter"],
    ["Name", "Yes", "The person's name (at least 2 characters)."],
    ["Phone", "Yes", "10-digit mobile number (+91 / 0 prefix is fine). Other countries: start with + and the country code."],
    ["Email", "No", "A valid email address, like name@example.com."],
    ["Notes", "No", "Anything the caller should know."],
    ["Telecaller Email", "No", "Email of one of your telecallers to assign this lead to. Leave blank to spread leads evenly."],
    [],
    ["Tips", "", "Keep the header row. Delete the sample rows. Up to 500 leads per file. Numbers already in your leads are skipped."],
  ]);
  help["!cols"] = [{ wch: 18 }, { wch: 12 }, { wch: 95 }];
  XLSX.utils.book_append_sheet(wb, help, "How to fill");

  XLSX.writeFile(wb, "leads-sample.xlsx");
}

export default function LeadBulkUploadModal({
  telecallers,
  onClose,
  onChanged,
}: {
  telecallers: User[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<LeadBulkResult | null>(null);

  const problems = useMemo(
    () => (rows ? rowProblems(rows, new Set(telecallers.filter((t) => t.isActive).map((t) => t.email.toLowerCase()))) : []),
    [rows, telecallers]
  );
  const validCount = problems.filter((p) => !p).length;

  const handleFile = async (file: File | null) => {
    setResult(null);
    setError("");
    setRows(null);
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setError("That file is too large (5 MB max).");
      return;
    }
    setFileName(file.name);
    try {
      const parsed = await parseFile(file);
      if (parsed.length === 0) return setError("No rows found in that file.");
      if (parsed.length > MAX_ROWS) return setError(`That file has ${parsed.length} rows — upload at most ${MAX_ROWS} at a time.`);
      setRows(parsed);
    } catch {
      setError("Could not read that file — make sure it's a CSV or Excel (.xlsx) file.");
    }
  };

  const upload = async () => {
    if (!rows || validCount === 0) return;
    setUploading(true);
    setError("");
    try {
      const res = await api.bulkCreateLeads({ fileName, rows });
      setResult(res);
      setRows(null);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal onClose={onClose} dialogStyle={{ maxWidth: 820 }}>
      <div className={dashboardStyles.modalHead}>
        <div>
          <h2 className={adminStyles.sectionTitle}>Upload leads</h2>
          <p className={adminStyles.sectionSubtitle}>Add many leads at once from an Excel or CSV file.</p>
        </div>
        <button className={dashboardStyles.modalCloseButton} type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      {result ? (
        <section className={adminStyles.section} style={{ marginTop: 16 }}>
          <p className={adminStyles.messageSuccess}>
            {result.created.length} lead{result.created.length === 1 ? "" : "s"} added.
          </p>
          {result.noTelecallers && result.created.length > 0 && (
            <p className={adminStyles.sectionSubtitle}>
              You have no active telecallers yet, so these leads are unassigned. Add a telecaller and reassign them.
            </p>
          )}

          {result.skipped.length > 0 && (
            <>
              <h3 className={adminStyles.sectionTitle} style={{ fontSize: "0.9rem", marginTop: 16 }}>
                {result.skipped.length} row{result.skipped.length === 1 ? "" : "s"} skipped
              </h3>
              <div className={adminStyles.tableWrap} style={{ maxHeight: 260, overflowY: "auto" }}>
                <table className={adminStyles.table}>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.skipped.map((s) => (
                      <tr key={s.row}>
                        <td>{s.row}</td>
                        <td>{s.name || "—"}</td>
                        <td>{s.phone || "—"}</td>
                        <td style={{ color: "var(--danger)" }}>{s.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className={adminStyles.formActions} style={{ marginTop: 16 }}>
            <button className={adminStyles.primaryButton} type="button" onClick={onClose}>
              Done
            </button>
          </div>
        </section>
      ) : (
        <section className={adminStyles.section} style={{ marginTop: 16 }}>
          <p className={adminStyles.sectionSubtitle}>
            Columns: <strong>Name</strong> and <strong>Phone</strong> (required); <strong>Email</strong>, <strong>Notes</strong> and{" "}
            <strong>Telecaller Email</strong> (optional — leave it blank and leads are shared out evenly among your telecallers).
            Numbers already in your leads are skipped.
          </p>

          <div className={adminStyles.inviteRow} style={{ margin: "12px 0 16px", flexWrap: "wrap" }}>
            <span className={adminStyles.sectionSubtitle} style={{ margin: 0 }}>
              Not sure how it should look?
            </span>
            <button className={adminStyles.smallButton} type="button" onClick={downloadSampleExcel}>
              Download sample Excel (.xlsx)
            </button>
            <button className={adminStyles.smallButton} type="button" onClick={downloadSampleCsv}>
              Download sample CSV
            </button>
          </div>

          <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
            Excel or CSV file
            <input
              className={adminStyles.fileInput}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
          </label>

          {error && <p className={adminStyles.messageError}>{error}</p>}

          {rows && (
            <>
              <p className={adminStyles.sectionSubtitle} style={{ marginTop: 12 }}>
                {fileName} — {rows.length} row{rows.length === 1 ? "" : "s"} found,{" "}
                <strong>{validCount} ready</strong>
                {rows.length - validCount > 0 && (
                  <span style={{ color: "var(--danger)" }}> · {rows.length - validCount} will be skipped</span>
                )}
              </p>

              <div className={adminStyles.tableWrap} style={{ maxHeight: 280, overflowY: "auto" }}>
                <table className={adminStyles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Check</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} style={problems[i] ? { opacity: 0.65 } : undefined}>
                        <td>{i + 2}</td>
                        <td>{r.name || "—"}</td>
                        <td>{r.phone || "—"}</td>
                        <td>{r.email || "—"}</td>
                        <td>
                          {problems[i] ? (
                            <span style={{ color: "var(--danger)" }}>{problems[i]}</span>
                          ) : (
                            <span className={adminStyles.badgeSuccess}>Ready</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={adminStyles.formActions} style={{ marginTop: 16 }}>
                <button className={adminStyles.primaryButton} type="button" onClick={upload} disabled={uploading || validCount === 0}>
                  {uploading ? "Uploading…" : `Upload ${validCount} lead${validCount === 1 ? "" : "s"}`}
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </Modal>
  );
}
