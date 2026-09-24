"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { api, ApiError } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "./admin.module.css";
import Modal from "../Modal";

type TeamRole = "student" | "teacher" | "telecaller";

interface ParsedRow {
  name: string;
  email: string;
  phone: string;
  password: string;
  batch: string;
  batches: string;
}

interface BulkResult {
  created: { row: number; name: string; email: string; password?: string }[];
  skipped: { row: number; name: string; email: string; reason: string }[];
}

const FIELD_ALIASES: Record<keyof ParsedRow, string[]> = {
  name: ["name", "full name", "fullname", "student name", "teacher name"],
  email: ["email", "e-mail", "email address"],
  phone: ["phone", "mobile", "phone number", "mobile number", "contact"],
  password: ["password"],
  batch: ["batch"],
  batches: ["batches", "batch"],
};

function getField(row: Record<string, string>, field: keyof ParsedRow): string {
  for (const alias of FIELD_ALIASES[field]) {
    if (row[alias]) return row[alias];
  }
  return "";
}

async function parseFile(file: File): Promise<ParsedRow[]> {
  const buf = await file.arrayBuffer();
  const workbook = XLSX.read(buf, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  return rawRows.map((raw) => {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
      normalized[key.trim().toLowerCase()] = String(value ?? "").trim();
    }
    return {
      name: getField(normalized, "name"),
      email: getField(normalized, "email"),
      phone: getField(normalized, "phone"),
      password: getField(normalized, "password"),
      batch: getField(normalized, "batch"),
      batches: getField(normalized, "batches"),
    };
  });
}

function downloadTemplate(role: TeamRole) {
  const headers =
    role === "student"
      ? ["Name", "Email", "Phone", "Password", "Batch"]
      : role === "teacher"
      ? ["Name", "Email", "Phone", "Password", "Batches"]
      : ["Name", "Email", "Phone", "Password"];
  const example =
    role === "student"
      ? ["Jane Doe", "jane@example.com", "9998887766", "", "Batch A"]
      : role === "teacher"
      ? ["John Smith", "john@example.com", "9998887755", "", "Batch A, Batch B"]
      : ["Amit Kumar", "amit@example.com", "9998887744", ""];

  const csv = [headers, example].map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${role}-upload-template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BulkUploadModal({
  role,
  label,
  onClose,
  onChanged,
}: {
  role: TeamRole;
  label: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const singular = label.slice(0, -1).toLowerCase();
  const usesBatch = role === "student" || role === "teacher";

  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);

  const handleFile = async (file: File | null) => {
    setResult(null);
    setParseError("");
    setRows(null);
    if (!file) return;
    setFileName(file.name);
    try {
      const parsed = await parseFile(file);
      if (parsed.length === 0) {
        setParseError("No rows found in that file.");
        return;
      }
      setRows(parsed);
    } catch {
      setParseError("Could not read that file — make sure it's a CSV or Excel (.xlsx) file.");
    }
  };

  const validRows = rows?.filter((r) => r.name && r.email) || [];
  const invalidCount = (rows?.length || 0) - validRows.length;

  const upload = async () => {
    if (!rows || validRows.length === 0) return;
    setUploading(true);
    try {
      const res = await api.bulkCreateUsers({
        role,
        rows: validRows.map((r) => ({
          name: r.name,
          email: r.email,
          phone: r.phone || undefined,
          password: r.password || undefined,
          batch: usesBatch && role === "student" ? r.batch || undefined : undefined,
          batches: role === "teacher" ? r.batches || undefined : undefined,
        })),
      });
      setResult(res);
      setRows(null);
      onChanged();
    } catch (err) {
      setParseError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className={dashboardStyles.modalHead}>
        <div>
          <h2 className={adminStyles.sectionTitle}>Bulk upload {label.toLowerCase()}</h2>
          <p className={adminStyles.sectionSubtitle}>Add many {singular}s at once from a CSV or Excel file.</p>
        </div>
        <button className={dashboardStyles.modalCloseButton} type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      {result ? (
        <section className={adminStyles.section} style={{ marginTop: 16 }}>
          <p className={adminStyles.messageSuccess}>
            {result.created.length} {singular}{result.created.length === 1 ? "" : "s"} created.
          </p>

          {result.created.some((c) => c.password) && (
            <>
              <h3 className={adminStyles.sectionTitle} style={{ fontSize: "0.9rem", marginTop: 16 }}>
                Auto-generated passwords — save these now, they won&apos;t be shown again
              </h3>
              <div className={adminStyles.tableWrap}>
                <table className={adminStyles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Password</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.created
                      .filter((c) => c.password)
                      .map((c) => (
                        <tr key={c.email}>
                          <td>{c.name}</td>
                          <td>{c.email}</td>
                          <td style={{ fontFamily: "monospace" }}>{c.password}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {result.skipped.length > 0 && (
            <>
              <h3 className={adminStyles.sectionTitle} style={{ fontSize: "0.9rem", marginTop: 16 }}>
                {result.skipped.length} row{result.skipped.length === 1 ? "" : "s"} skipped
              </h3>
              <div className={adminStyles.tableWrap}>
                <table className={adminStyles.table}>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.skipped.map((s) => (
                      <tr key={s.row}>
                        <td>{s.row}</td>
                        <td>{s.name || "—"}</td>
                        <td>{s.email || "—"}</td>
                        <td className={adminStyles.messageError} style={{ margin: 0 }}>
                          {s.reason}
                        </td>
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
            Columns: <strong>Name</strong> and <strong>Email</strong> (required),{" "}
            <strong>Phone</strong> and <strong>Password</strong> (optional — a password is
            generated and shown to you if left blank)
            {role === "student" && (
              <>
                , and <strong>Batch</strong> (optional — matched by name)
              </>
            )}
            {role === "teacher" && (
              <>
                , and <strong>Batches</strong> (optional — comma-separated names)
              </>
            )}
            .
          </p>

          <div className={adminStyles.inviteRow} style={{ marginBottom: 16 }}>
            <button className={adminStyles.smallButton} type="button" onClick={() => downloadTemplate(role)}>
              Download template
            </button>
          </div>

          <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
            CSV or Excel file
            <input
              className={adminStyles.fileInput}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
          </label>

          {parseError && <p className={adminStyles.messageError}>{parseError}</p>}

          {rows && (
            <>
              <p className={adminStyles.sectionSubtitle} style={{ marginTop: 12 }}>
                {fileName} — {rows.length} row{rows.length === 1 ? "" : "s"} found
                {invalidCount > 0 && (
                  <span style={{ color: "var(--danger)" }}>
                    {" "}
                    ({invalidCount} missing name/email, will be skipped)
                  </span>
                )}
              </p>

              <div className={adminStyles.tableWrap} style={{ maxHeight: 260, overflowY: "auto" }}>
                <table className={adminStyles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      {role === "student" && <th>Batch</th>}
                      {role === "teacher" && <th>Batches</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const invalid = !r.name || !r.email;
                      return (
                        <tr key={i} style={invalid ? { opacity: 0.5 } : undefined}>
                          <td>{r.name || "—"}</td>
                          <td>{r.email || "—"}</td>
                          <td>{r.phone || "—"}</td>
                          {role === "student" && <td>{r.batch || "—"}</td>}
                          {role === "teacher" && <td>{r.batches || "—"}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className={adminStyles.formActions} style={{ marginTop: 16 }}>
                <button
                  className={adminStyles.primaryButton}
                  type="button"
                  onClick={upload}
                  disabled={uploading || validRows.length === 0}
                >
                  {uploading ? "Uploading..." : `Upload ${validRows.length} ${singular}${validRows.length === 1 ? "" : "s"}`}
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </Modal>
  );
}
