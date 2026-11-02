"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, CertBatch, CertField, CertFieldKey, CertQr, Certificate, CertTemplate } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "./admin.module.css";
import certStyles from "./certificates.module.css";
import Modal from "../Modal";
import Pagination from "../Pagination";
import { useDebounced } from "./useDebounced";
import CertificateIssueModal from "./CertificateIssueModal";
import CertificateEmailProgress from "./CertificateEmailProgress";
import { errMsg, pdfName, saveBlob } from "./certificateUtils";

const DEFAULT_PAGE_SIZE = 15;
const LIMIT_KEY = "certificates.pageSize";

const FIELD_LABELS: Record<CertFieldKey, string> = {
  student_name: "Student name",
  certificate_no: "Certificate no.",
  course: "Course",
  date: "Date",
  grade: "Grade / result",
  batch: "Batch",
  institute_name: "Institute name",
  custom: "Custom text",
};

const SAMPLE: Record<CertFieldKey, string> = {
  student_name: "Aarav Sharma",
  certificate_no: "ABC/2026/0001",
  course: "Full Stack Web Development",
  date: "31 October 2026",
  grade: "A+",
  batch: "Morning Batch",
  institute_name: "Your Institute",
  custom: "Custom text",
};

const CSS_FONT: Record<CertField["font"], string> = {
  helvetica: "Arial, Helvetica, sans-serif",
  times: "'Times New Roman', Times, serif",
  courier: "'Courier New', monospace",
  unicode: "system-ui, sans-serif",
};

// Same rules as the PDF: text stays inside its "max width" box and 2% away from the page edge,
// and longer text is made smaller instead of running past the end.
const PAGE_MARGIN_PCT = 2;
const fitBox = (f: CertField) => {
  const room =
    f.align === "left"
      ? 100 - PAGE_MARGIN_PCT - Math.min(100 - PAGE_MARGIN_PCT, Math.max(PAGE_MARGIN_PCT, f.x))
      : f.align === "right"
        ? Math.min(100 - PAGE_MARGIN_PCT, Math.max(PAGE_MARGIN_PCT, f.x)) - PAGE_MARGIN_PCT
        : 2 * Math.min(Math.min(100 - PAGE_MARGIN_PCT, Math.max(PAGE_MARGIN_PCT, f.x)) - PAGE_MARGIN_PCT, 100 - PAGE_MARGIN_PCT - Math.min(100 - PAGE_MARGIN_PCT, Math.max(PAGE_MARGIN_PCT, f.x)));
  const width = Math.max(1, Math.min(f.maxWidth > 0 ? f.maxWidth : Infinity, room));
  const x = Math.min(100 - PAGE_MARGIN_PCT, Math.max(PAGE_MARGIN_PCT, f.x));
  const left = f.align === "left" ? x : f.align === "right" ? x - width : x - width / 2;
  return { width, left };
};

const titleCase = (t: string) => t.toLowerCase().replace(/(^|[\s.'-])(\p{L})/gu, (_m, a: string, b: string) => a + b.toUpperCase());
const shownText = (t: string, transform: CertField["transform"]) =>
  transform === "upper" ? t.toUpperCase() : transform === "title" ? titleCase(t) : t;

let measureCtx: CanvasRenderingContext2D | null = null;
const textWidthPct = (text: string, f: CertField, size: number, canvasPx: number) => {
  if (!canvasPx) return 0;
  measureCtx = measureCtx || document.createElement("canvas").getContext("2d");
  if (!measureCtx) return 0;
  const px = (size / 100) * canvasPx;
  measureCtx.font = `${f.italic ? "italic " : ""}${f.bold ? "bold " : ""}${px}px ${CSS_FONT[f.font]}`;
  return (measureCtx.measureText(text).width / canvasPx) * 100;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });


export default function AdminCertificates() {
  const [tab, setTab] = useState<"issued" | "templates">("issued");
  const [templates, setTemplates] = useState<CertTemplate[]>([]);
  const [tplLoading, setTplLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [issuing, setIssuing] = useState<string | "any" | null>(null);
  const [registerKey, setRegisterKey] = useState(0);

  const loadTemplates = useCallback(async () => {
    try {
      const { templates } = await api.certTemplates();
      setTemplates(templates);
    } catch (err) {
      setError(errMsg(err, "Could not load templates"));
    } finally {
      setTplLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const usable = templates.filter((t) => !t.archived);

  const removeTemplate = async (t: CertTemplate) => {
    const msg = t.issued
      ? `"${t.name}" has issued certificates, so it will be archived (they stay downloadable and verifiable). Continue?`
      : `Delete template "${t.name}"?`;
    if (!window.confirm(msg)) return;
    try {
      const r = await api.deleteCertTemplate(t._id);
      setNotice(r.message);
      loadTemplates();
    } catch (err) {
      setError(errMsg(err, "Could not delete the template"));
    }
  };

  const restoreTemplate = async (t: CertTemplate) => {
    try {
      await api.updateCertTemplate(t._id, { archived: false });
      loadTemplates();
    } catch (err) {
      setError(errMsg(err, "Could not restore the template"));
    }
  };

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Certificates</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Upload your own certificate design once, place the name and number on it, then issue certificates one by one or
        for a whole batch, and email them to everyone. Each one can carry a QR code that anyone can scan to verify it and download the PDF.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}>
        <button
          className={tab === "issued" ? adminStyles.primaryButton : adminStyles.smallButton}
          onClick={() => setTab("issued")}
        >
          Issued certificates
        </button>
        <button
          className={tab === "templates" ? adminStyles.primaryButton : adminStyles.smallButton}
          onClick={() => setTab("templates")}
        >
          Templates ({usable.length})
        </button>
        <span style={{ flex: 1 }} />
        <button
          className={adminStyles.primaryButton}
          onClick={() => (usable.length ? setIssuing("any") : setNewOpen(true))}
        >
          {usable.length ? "Issue certificates" : "+ Add your first template"}
        </button>
      </div>

      {error && <p className={adminStyles.messageError}>{error}</p>}
      {notice && (
        <p className={adminStyles.sectionSubtitle} role="status">
          {notice}
        </p>
      )}

      {tab === "templates" && (
        <section className={adminStyles.section}>
          <div className={adminStyles.sectionHead}>
            <h2 className={adminStyles.sectionTitle}>Your templates</h2>
            <button className={adminStyles.primaryButton} onClick={() => setNewOpen(true)}>
              + New template
            </button>
          </div>
          {tplLoading && <p className={adminStyles.empty}>Loading…</p>}
          {!tplLoading && templates.length === 0 && (
            <p className={adminStyles.empty}>
              No templates yet. Upload a PNG/JPG of your certificate design (with blank space for the name) to start.
            </p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {templates.map((t) => (
              <div key={t._id} className={dashboardStyles.card} style={{ padding: 12, opacity: t.archived ? 0.6 : 1 }}>
                {t.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.imageUrl}
                    alt={t.name}
                    style={{ width: "100%", aspectRatio: `${t.width} / ${t.height}`, objectFit: "cover", borderRadius: 6 }}
                  />
                )}
                <h3 style={{ margin: "10px 0 2px", fontSize: "1rem" }}>
                  {t.name} {t.archived && <span style={{ color: "var(--muted)", fontWeight: 400 }}>(archived)</span>}
                </h3>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>
                  {t.issued ?? 0} issued · numbering {t.numbering.prefix}
                  {t.numbering.includeYear ? "/YYYY" : ""}/{"0".repeat(Math.max(0, t.numbering.padding - 1))}1
                </p>
                <div className={adminStyles.rowActions} style={{ marginTop: 10, flexWrap: "wrap" }}>
                  {t.archived ? (
                    <button className={adminStyles.smallButton} onClick={() => restoreTemplate(t)}>
                      Restore
                    </button>
                  ) : (
                    <>
                      <button className={adminStyles.smallButton} onClick={() => setEditing(t._id)}>
                        Edit layout
                      </button>
                      <button className={adminStyles.primaryButton} onClick={() => setIssuing(t._id)}>
                        Issue
                      </button>
                      <button className={adminStyles.dangerButton} onClick={() => removeTemplate(t)}>
                        {t.issued ? "Archive" : "Delete"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "issued" && <Register key={registerKey} templates={templates} />}

      {newOpen && (
        <NewTemplateModal
          onClose={() => setNewOpen(false)}
          onCreated={(t) => {
            setNewOpen(false);
            loadTemplates();
            setTab("templates");
            setEditing(t._id);
          }}
        />
      )}
      {editing && (
        <TemplateEditor
          id={editing}
          onClose={() => {
            setEditing(null);
            loadTemplates();
          }}
        />
      )}
      {issuing && (
        <CertificateIssueModal
          templates={usable}
          initialId={issuing === "any" ? "" : issuing}
          onClose={() => setIssuing(null)}
          onDone={() => {
            setRegisterKey((k) => k + 1);
            loadTemplates();
            setTab("issued");
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------ new template */

function NewTemplateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (t: CertTemplate) => void }) {
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Choose your certificate image (PNG or JPG)");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { template } = await api.createCertTemplate({ name: name.trim(), image: file, prefix: prefix.trim() || undefined });
      onCreated(template);
    } catch (err) {
      setError(errMsg(err, "Could not save the template"));
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} dialogStyle={{ maxWidth: 480, width: "100%" }}>
      <div className={dashboardStyles.modalHead}>
        <h2 className={adminStyles.sectionTitle}>New certificate template</h2>
        <button className={dashboardStyles.modalCloseButton} type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <form className={adminStyles.form} onSubmit={submit}>
        <label className={adminStyles.label}>
          Template name
          <input
            className={adminStyles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Course Completion"
            maxLength={80}
            required
          />
        </label>
        <label className={adminStyles.label}>
          Certificate design (PNG / JPG, up to 15 MB)
          <input
            className={adminStyles.input}
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </label>
        <label className={adminStyles.label}>
          Certificate number prefix (optional)
          <input
            className={adminStyles.input}
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="e.g. ABC-CC (auto if empty)"
            maxLength={20}
          />
        </label>
        <p className={adminStyles.sectionSubtitle}>
          Tip: leave empty space where the name, course, date and number should go — you place them in the next step.
        </p>
        {error && <p className={adminStyles.messageError}>{error}</p>}
        <div className={adminStyles.formActions}>
          <button type="button" className={adminStyles.smallButton} onClick={onClose}>
            Cancel
          </button>
          <button className={adminStyles.primaryButton} disabled={saving}>
            {saving ? "Uploading…" : "Upload & place fields"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ----------------------------------------------------------------- editor */

function TemplateEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const [tpl, setTpl] = useState<CertTemplate | null>(null);
  const [name, setName] = useState("");
  const [fields, setFields] = useState<CertField[]>([]);
  const [qr, setQr] = useState<CertQr>({ enabled: true, x: 90, y: 85, size: 9 });
  const [numbering, setNumbering] = useState({ prefix: "", includeYear: true, padding: 4 });
  const [selected, setSelected] = useState<number | "qr" | null>(0);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [previewName, setPreviewName] = useState("Aarav Sharma");
  const [canvasPx, setCanvasPx] = useState(0);

  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<number | "qr" | null>(null);

  useEffect(() => {
    api
      .certTemplates()
      .then(({ templates }) => {
        const t = templates.find((x) => x._id === id);
        if (!t) {
          setError("Template not found");
          return;
        }
        setTpl(t);
        setName(t.name);
        setFields(t.fields);
        setQr(t.qr);
        setNumbering({ prefix: t.numbering.prefix, includeYear: t.numbering.includeYear, padding: t.numbering.padding });
      })
      .catch((err) => setError(errMsg(err, "Could not load the template")));
  }, [id]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const update = () => setCanvasPx(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tpl]);

  const touch = () => {
    setDirty(true);
    setMsg("");
  };

  const patchField = (i: number, patch: Partial<CertField>) => {
    setFields((fs) => fs.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
    touch();
  };

  const addField = (key: CertFieldKey) => {
    setFields((fs) => [
      ...fs,
      {
        key,
        text: key === "custom" ? "Your text" : "",
        x: 50,
        y: 50,
        fontSize: 2.4,
        maxWidth: 0,
        color: "#111111",
        align: "center",
        font: "helvetica",
        bold: false,
        italic: false,
        transform: "none",
      },
    ]);
    setSelected(fields.length);
    touch();
  };

  const removeField = (i: number) => {
    setFields((fs) => fs.filter((_, idx) => idx !== i));
    setSelected(null);
    touch();
  };

  const moveTo = (clientX: number, clientY: number) => {
    const box = canvasRef.current?.getBoundingClientRect();
    const target = drag.current;
    if (!box || target === null) return;
    const x = Math.min(100, Math.max(0, ((clientX - box.left) / box.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - box.top) / box.height) * 100));
    const r = (n: number) => Math.round(n * 10) / 10;
    if (target === "qr") setQr((q) => ({ ...q, x: r(x), y: r(y) }));
    else setFields((fs) => fs.map((f, idx) => (idx === target ? { ...f, x: r(x), y: r(y) } : f)));
    setDirty(true);
  };

  const startDrag = (target: number | "qr") => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = target;
    setSelected(target);
  };

  const save = async (): Promise<boolean> => {
    setSaving(true);
    setError("");
    try {
      const { template } = await api.updateCertTemplate(id, {
        name,
        fields,
        qr,
        numbering: { prefix: numbering.prefix, includeYear: numbering.includeYear, padding: numbering.padding },
      });
      setTpl(template);
      setFields(template.fields);
      setDirty(false);
      setMsg("Saved");
      return true;
    } catch (err) {
      setError(errMsg(err, "Could not save"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const testPdf = async () => {
    setTesting(true);
    setError("");
    try {
      const blob = await api.certTemplatePreview(id, { fields, qr });
      window.open(URL.createObjectURL(blob), "_blank");
    } catch (err) {
      setError(errMsg(err, "Could not render the test PDF"));
    } finally {
      setTesting(false);
    }
  };

  const close = () => {
    if (dirty && !window.confirm("You have unsaved changes. Close without saving?")) return;
    onClose();
  };

  const sel = typeof selected === "number" ? fields[selected] : null;
  const exampleNo = [
    numbering.prefix || "PREFIX",
    ...(numbering.includeYear ? [new Date().getFullYear()] : []),
    "1".padStart(numbering.padding, "0"),
  ].join("/");

  return (
    <Modal onClose={close} dialogStyle={{ maxWidth: 1240, width: "96vw", maxHeight: "94vh", overflowY: "auto" }}>
      <div className={dashboardStyles.modalHead}>
        <h2 className={adminStyles.sectionTitle}>Place fields on your certificate</h2>
        <button className={dashboardStyles.modalCloseButton} type="button" onClick={close} aria-label="Close">
          ✕
        </button>
      </div>

      {!tpl && !error && <p className={adminStyles.empty}>Loading…</p>}
      {tpl && (
        <div className={certStyles.editorGrid}>
          <div>
            <p className={adminStyles.sectionSubtitle}>
              Drag each item to where it should appear. Sizes follow the certificate width, so any image size works.
            </p>
            <div
              ref={canvasRef}
              onPointerMove={(e) => drag.current !== null && moveTo(e.clientX, e.clientY)}
              onPointerUp={() => (drag.current = null)}
              onPointerCancel={() => (drag.current = null)}
              style={{
                position: "relative",
                containerType: "inline-size",
                width: "100%",
                aspectRatio: `${tpl.width} / ${tpl.height}`,
                backgroundImage: `url(${tpl.imageUrl})`,
                backgroundSize: "100% 100%",
                border: "1px solid var(--border)",
                borderRadius: 6,
                userSelect: "none",
                touchAction: "none",
                overflow: "hidden",
              }}
            >
              {typeof selected === "number" && fields[selected] && (() => {
                const f = fields[selected];
                const { width, left } = fitBox(f);
                return (
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: `${left}%`,
                      width: `${width}%`,
                      top: `${f.y}%`,
                      height: `${f.fontSize * 1.9}cqw`,
                      transform: "translateY(-50%)",
                      border: "1.5px dashed #16a34a",
                      background: "rgba(22,163,74,0.08)",
                      borderRadius: 3,
                      pointerEvents: "none",
                    }}
                  >
                    <span style={{ position: "absolute", left: 2, top: -16, fontSize: 11, color: "#15803d", background: "rgba(255,255,255,0.9)", padding: "0 4px", borderRadius: 3, whiteSpace: "nowrap", fontFamily: "system-ui, sans-serif" }}>
                      Text stays inside this box
                    </span>
                  </div>
                );
              })()}
              {fields.map((f, i) => {
                const raw = f.key === "custom" ? f.text || "Custom text" : f.key === "student_name" ? previewName || SAMPLE.student_name : SAMPLE[f.key];
                const text = shownText(raw, f.transform);
                const { width: boxPct } = fitBox(f);
                const natural = textWidthPct(text, f, f.fontSize, canvasPx);
                const size = natural > boxPct && natural > 0 ? f.fontSize * (boxPct / natural) : f.fontSize;
                return (
                  <div
                    key={i}
                    onPointerDown={startDrag(i)}
                    style={{
                      position: "absolute",
                      left: `${f.x}%`,
                      top: `${f.y}%`,
                      transform: `translate(${f.align === "left" ? "0" : f.align === "right" ? "-100%" : "-50%"}, -50%)`,
                      fontSize: `${size}cqw`,
                      lineHeight: 1.1,
                      whiteSpace: "nowrap",
                      color: f.color,
                      fontFamily: CSS_FONT[f.font],
                      fontWeight: f.bold ? 700 : 400,
                      fontStyle: f.italic ? "italic" : "normal",
                      cursor: "grab",
                      outline: selected === i ? "2px solid #2563eb" : "1px dashed rgba(37,99,235,0.55)",
                      outlineOffset: 2,
                      background: "rgba(255,255,255,0.15)",
                    }}
                  >
                    {text}
                  </div>
                );
              })}
              {qr.enabled && (
                <div
                  onPointerDown={startDrag("qr")}
                  style={{
                    position: "absolute",
                    left: `${qr.x}%`,
                    top: `${qr.y}%`,
                    width: `${qr.size}cqw`,
                    aspectRatio: "1 / 1",
                    transform: "translate(-50%, -50%)",
                    display: "grid",
                    placeItems: "center",
                    background: "repeating-conic-gradient(#111 0% 25%, #fff 0% 50%) 50% / 20% 20%",
                    color: "#fff",
                    fontSize: "1.4cqw",
                    fontWeight: 700,
                    cursor: "grab",
                    outline: selected === "qr" ? "2px solid #2563eb" : "1px dashed rgba(37,99,235,0.55)",
                    outlineOffset: 2,
                  }}
                  title="QR code"
                >
                  <span style={{ background: "#111", padding: "0 4px", borderRadius: 3 }}>QR</span>
                </div>
              )}
            </div>
          </div>

          <aside className={certStyles.editorSide}>
            <label className={adminStyles.label}>
              Template name
              <input
                className={adminStyles.input}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  touch();
                }}
                maxLength={80}
              />
            </label>

            <label className={adminStyles.label}>
              Preview name
              <input
                className={adminStyles.input}
                value={previewName}
                onChange={(e) => setPreviewName(e.target.value)}
                maxLength={60}
                placeholder="Type a real (long or short) name"
              />
              <span className={adminStyles.sectionSubtitle}>Only for this screen, so you can check how a long or short name fits.</span>
            </label>

            <div>
              <strong style={{ fontSize: "0.9rem" }}>Items on certificate</strong>
              <div style={{ display: "grid", gap: 4, margin: "6px 0" }}>
                {fields.map((f, i) => (
                  <button
                    key={i}
                    type="button"
                    className={selected === i ? adminStyles.primaryButton : adminStyles.smallButton}
                    style={{ textAlign: "left" }}
                    onClick={() => setSelected(i)}
                  >
                    {FIELD_LABELS[f.key]}
                    {f.key === "custom" && f.text ? `: ${f.text.slice(0, 18)}` : ""}
                  </button>
                ))}
                <button
                  type="button"
                  className={selected === "qr" ? adminStyles.primaryButton : adminStyles.smallButton}
                  style={{ textAlign: "left" }}
                  onClick={() => setSelected("qr")}
                >
                  QR code {qr.enabled ? "" : "(off)"}
                </button>
              </div>
              <select
                className={adminStyles.select}
                value=""
                onChange={(e) => e.target.value && addField(e.target.value as CertFieldKey)}
              >
                <option value="">+ Add item…</option>
                {(Object.keys(FIELD_LABELS) as CertFieldKey[]).map((k) => (
                  <option key={k} value={k}>
                    {FIELD_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>

            {sel && typeof selected === "number" && (
              <div style={{ display: "grid", gap: 8, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                <strong style={{ fontSize: "0.9rem" }}>{FIELD_LABELS[sel.key]} — style</strong>
                {sel.key === "custom" && (
                  <label className={adminStyles.label}>
                    Text
                    <input
                      className={adminStyles.input}
                      value={sel.text}
                      maxLength={200}
                      onChange={(e) => patchField(selected, { text: e.target.value })}
                    />
                  </label>
                )}
                <div className={certStyles.twoCol}>
                  <label className={adminStyles.label}>
                    Size
                    <input
                      className={adminStyles.input}
                      type="number"
                      min="0.5"
                      max="20"
                      step="0.1"
                      value={sel.fontSize}
                      onChange={(e) => patchField(selected, { fontSize: Number(e.target.value) || 1 })}
                    />
                  </label>
                  <label className={adminStyles.label}>
                    Colour
                    <input
                      className={adminStyles.input}
                      type="color"
                      value={sel.color}
                      onChange={(e) => patchField(selected, { color: e.target.value })}
                      style={{ padding: 2, height: 38 }}
                    />
                  </label>
                  <label className={adminStyles.label}>
                    Font
                    <select
                      className={adminStyles.select}
                      value={sel.font}
                      onChange={(e) => patchField(selected, { font: e.target.value as CertField["font"] })}
                    >
                      <option value="helvetica">Sans (Helvetica)</option>
                      <option value="times">Serif (Times)</option>
                      <option value="courier">Mono (Courier)</option>
                      <option value="unicode">Noto Sans (extended)</option>
                    </select>
                  </label>
                  <label className={adminStyles.label}>
                    Align
                    <select
                      className={adminStyles.select}
                      value={sel.align}
                      onChange={(e) => patchField(selected, { align: e.target.value as CertField["align"] })}
                    >
                      <option value="center">Centre on point</option>
                      <option value="left">Start at point</option>
                      <option value="right">End at point</option>
                    </select>
                  </label>
                  <label className={adminStyles.label}>
                    Letter case
                    <select
                      className={adminStyles.select}
                      value={sel.transform}
                      onChange={(e) => patchField(selected, { transform: e.target.value as CertField["transform"] })}
                    >
                      <option value="none">As typed</option>
                      <option value="upper">UPPERCASE</option>
                      <option value="title">Title Case</option>
                    </select>
                  </label>
                  <label className={adminStyles.label}>
                    Box width %
                    <input
                      className={adminStyles.input}
                      type="number"
                      min="0"
                      max="100"
                      value={sel.maxWidth}
                      onChange={(e) => patchField(selected, { maxWidth: Number(e.target.value) || 0 })}
                      title="The width of the green box. Longer text becomes smaller to fit inside it. 0 = as wide as the page allows"
                    />
                  </label>
                </div>
                <div style={{ display: "flex", gap: 14 }}>
                  <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="checkbox" checked={sel.bold} onChange={(e) => patchField(selected, { bold: e.target.checked })} />
                    Bold
                  </label>
                  <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={sel.italic}
                      onChange={(e) => patchField(selected, { italic: e.target.checked })}
                    />
                    Italic
                  </label>
                </div>
                <button type="button" className={adminStyles.dangerButton} onClick={() => removeField(selected)}>
                  Remove this item
                </button>
              </div>
            )}

            {selected === "qr" && (
              <div style={{ display: "grid", gap: 8, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                <strong style={{ fontSize: "0.9rem" }}>QR code</strong>
                <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={qr.enabled}
                    onChange={(e) => {
                      setQr({ ...qr, enabled: e.target.checked });
                      touch();
                    }}
                  />
                  Show QR code on certificate
                </label>
                <label className={adminStyles.label}>
                  Size ({qr.size}% of width)
                  <input
                    type="range"
                    min="4"
                    max="20"
                    step="0.5"
                    value={qr.size}
                    onChange={(e) => {
                      setQr({ ...qr, size: Number(e.target.value) });
                      touch();
                    }}
                  />
                </label>
                <p className={adminStyles.sectionSubtitle}>
                  Scanning it opens a public page confirming the certificate is genuine. Keep it on a plain background.
                </p>
              </div>
            )}

            <div style={{ display: "grid", gap: 8, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              <strong style={{ fontSize: "0.9rem" }}>Certificate numbering</strong>
              <label className={adminStyles.label}>
                Prefix
                <input
                  className={adminStyles.input}
                  value={numbering.prefix}
                  maxLength={20}
                  onChange={(e) => {
                    setNumbering({ ...numbering, prefix: e.target.value });
                    touch();
                  }}
                />
              </label>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={numbering.includeYear}
                    onChange={(e) => {
                      setNumbering({ ...numbering, includeYear: e.target.checked });
                      touch();
                    }}
                  />
                  Include year
                </label>
                <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  Digits
                  <input
                    className={adminStyles.input}
                    style={{ width: 64 }}
                    type="number"
                    min="1"
                    max="8"
                    value={numbering.padding}
                    onChange={(e) => {
                      setNumbering({ ...numbering, padding: Math.min(8, Math.max(1, Number(e.target.value) || 4)) });
                      touch();
                    }}
                  />
                </label>
              </div>
              <p className={adminStyles.sectionSubtitle}>
                Example: <strong>{exampleNo}</strong>. Numbers go up automatically (currently at {tpl.numbering.counter}).
              </p>
            </div>

            {error && <p className={adminStyles.messageError}>{error}</p>}
            {msg && <p className={adminStyles.sectionSubtitle}>{msg}</p>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className={adminStyles.primaryButton} onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save layout"}
              </button>
              <button className={adminStyles.smallButton} onClick={testPdf} disabled={testing}>
                {testing ? "Rendering…" : "Test PDF"}
              </button>
            </div>
          </aside>
        </div>
      )}
      {!tpl && error && <p className={adminStyles.messageError}>{error}</p>}
    </Modal>
  );
}

/* --------------------------------------------------------------- register */

function Register({ templates }: { templates: CertTemplate[] }) {
  const [rows, setRows] = useState<Certificate[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [template, setTemplate] = useState("");
  const [status, setStatus] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [revoking, setRevoking] = useState<Certificate | null>(null);
  const [copied, setCopied] = useState("");
  const [busyId, setBusyId] = useState("");
  const [batches, setBatches] = useState<CertBatch[]>([]);
  const [batch, setBatch] = useState("");
  const [emailJobId, setEmailJobId] = useState("");
  const [notice, setNotice] = useState("");

  const loadBatches = useCallback(() => {
    api
      .certBatches()
      .then((r) => setBatches(r.batches))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // Only the newest request may fill the table, so a slow earlier one (for example
  // the first load before the saved page size is applied) cannot overwrite it.
  const latest = useRef(0);
  const load = useCallback(async () => {
    const mine = ++latest.current;
    setLoading(true);
    setError("");
    try {
      const r = await api.listCertificates({ q: debounced, template, batch, status, page, limit });
      if (mine !== latest.current) return;
      setRows(r.certificates);
      setTotal(r.total);
      setTotalPages(r.totalPages);
    } catch (err) {
      if (mine === latest.current) setError(errMsg(err, "Could not load certificates"));
    } finally {
      if (mine === latest.current) setLoading(false);
    }
  }, [debounced, template, batch, status, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => setPage(1), [debounced, template, batch, status]);

  // Remember the chosen page size in this browser.
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(LIMIT_KEY));
      if ([10, 15, 25, 50, 100].includes(saved)) setLimit(saved);
    } catch {
      // storage unavailable: keep the default
    }
  }, []);

  const changeLimit = (n: number) => {
    setLimit(n);
    setPage(1);
    try {
      localStorage.setItem(LIMIT_KEY, String(n));
    } catch {
      // ignore
    }
  };

  const download = async (c: Certificate) => {
    setBusyId(c._id);
    try {
      saveBlob(await api.certificatePdf(c._id), `${c.certificateNo.replace(/[^\w.-]+/g, "_")}.pdf`);
    } catch (err) {
      setError(errMsg(err, "Could not download"));
    } finally {
      setBusyId("");
    }
  };

  const downloadPicked = async () => {
    setBusyId("bulk");
    try {
      saveBlob(await api.certificatesPdf([...picked]), "certificates.pdf");
    } catch (err) {
      setError(errMsg(err, "Could not download"));
    } finally {
      setBusyId("");
    }
  };

  const copyLink = async (c: Certificate) => {
    try {
      await navigator.clipboard.writeText(c.verifyUrl);
      setCopied(c._id);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      window.prompt("Verification link", c.verifyUrl);
    }
  };

  const restore = async (c: Certificate) => {
    try {
      await api.restoreCertificate(c._id);
      load();
    } catch (err) {
      setError(errMsg(err, "Could not restore"));
    }
  };

  const emailOne = async (c: Certificate) => {
    setBusyId(c._id);
    setError("");
    setNotice("");
    try {
      const { certificate } = await api.emailCertificate(c._id);
      setRows((rs) => rs.map((r) => (r._id === c._id ? { ...r, ...certificate } : r)));
      setNotice(`Emailed ${c.studentName}.`);
      loadBatches();
    } catch (err) {
      setError(errMsg(err, "Could not send the email"));
      load();
    } finally {
      setBusyId("");
    }
  };

  const startEmails = async (payload: { ids?: string[]; batchId?: string; resend?: boolean }) => {
    setBusyId("email");
    setError("");
    setNotice("");
    try {
      const r = await api.emailCertificates(payload);
      setEmailJobId(r.jobId);
    } catch (err) {
      setError(errMsg(err, "Could not start emailing"));
    } finally {
      setBusyId("");
    }
  };

  const setQr = async (ids: string[], enabled: boolean) => {
    setBusyId("qr");
    setError("");
    setNotice("");
    try {
      await api.setCertificatesQr(ids, enabled);
      setNotice(`QR code ${enabled ? "added to" : "removed from"} ${ids.length} certificate${ids.length === 1 ? "" : "s"}. New PDFs and downloads will follow this.`);
      await load();
    } catch (err) {
      setError(errMsg(err, "Could not change the QR code"));
    } finally {
      setBusyId("");
    }
  };

  const currentBatch = batches.find((b) => b._id === batch);
  const unsentInBatch = currentBatch ? currentBatch.withEmail - currentBatch.emailed : 0;
  const allOnPage = rows.length > 0 && rows.every((r) => picked.has(r._id));

  return (
    <section className={adminStyles.section}>
      <div className={adminStyles.sectionHead}>
        <h2 className={adminStyles.sectionTitle}>Issued certificates ({total})</h2>
        {picked.size > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className={adminStyles.primaryButton} onClick={downloadPicked} disabled={busyId === "bulk"}>
              {busyId === "bulk" ? "Preparing…" : `Download ${picked.size} as one PDF`}
            </button>
            <button
              className={adminStyles.smallButton}
              onClick={() => startEmails({ ids: [...picked], resend: true })}
              disabled={busyId === "email" || !!emailJobId}
            >
              Email {picked.size} selected
            </button>
            <button className={adminStyles.smallButton} onClick={() => setQr([...picked], false)} disabled={busyId === "qr"}>
              Remove QR
            </button>
            <button className={adminStyles.smallButton} onClick={() => setQr([...picked], true)} disabled={busyId === "qr"}>
              Add QR
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0 12px" }}>
        <input
          className={adminStyles.input}
          style={{ maxWidth: 260 }}
          placeholder="Search name, number, course…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={adminStyles.select} style={{ maxWidth: 220 }} value={template} onChange={(e) => setTemplate(e.target.value)}>
          <option value="">All templates</option>
          {templates.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name}
            </option>
          ))}
        </select>
        <select className={adminStyles.select} style={{ maxWidth: 240 }} value={batch} onChange={(e) => setBatch(e.target.value)} aria-label="Certificate batch">
          <option value="">All certificate batches</option>
          {batches.map((b) => (
            <option key={b._id} value={b._id}>
              {b.name} ({b.total})
            </option>
          ))}
        </select>
        <select className={adminStyles.select} style={{ maxWidth: 160 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="revoked">Revoked</option>
        </select>
      </div>

      {currentBatch && (
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            padding: "12px 16px",
            marginBottom: 12,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            background: "var(--surface-alt)",
          }}
        >
          <div style={{ flex: 1, minWidth: 220 }}>
            <strong>{currentBatch.name}</strong>
            <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              {currentBatch.total} certificate{currentBatch.total === 1 ? "" : "s"} · {currentBatch.emailed} emailed · {currentBatch.withEmail - currentBatch.emailed} waiting
              {currentBatch.total > currentBatch.withEmail ? ` · ${currentBatch.total - currentBatch.withEmail} without email` : ""}
            </div>
          </div>
          <button
            className={adminStyles.primaryButton}
            onClick={() => startEmails({ batchId: currentBatch._id })}
            disabled={busyId === "email" || !!emailJobId || unsentInBatch <= 0}
            title={unsentInBatch <= 0 ? "Everyone with an email address has been emailed" : undefined}
          >
            {unsentInBatch > 0 ? `Email unsent (${unsentInBatch})` : "All emailed"}
          </button>
          <button
            className={adminStyles.smallButton}
            onClick={() => startEmails({ batchId: currentBatch._id, resend: true })}
            disabled={busyId === "email" || !!emailJobId}
          >
            Email everyone again
          </button>
        </div>
      )}

      {emailJobId && (
        <div style={{ padding: "12px 16px", marginBottom: 12, border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
          <CertificateEmailProgress
            key={emailJobId}
            jobId={emailJobId}
            onFinished={() => {
              load();
              loadBatches();
            }}
          />
          <button className={adminStyles.smallButton} style={{ marginTop: 8 }} onClick={() => setEmailJobId("")}>
            Hide
          </button>
        </div>
      )}

      {notice && (
        <p className={adminStyles.sectionSubtitle} role="status">
          {notice}
        </p>
      )}
      {error && <p className={adminStyles.messageError}>{error}</p>}
      {loading && <p className={adminStyles.empty}>Loading…</p>}
      {!loading && rows.length === 0 && <p className={adminStyles.empty}>No certificates issued yet.</p>}

      {rows.length > 0 && (
        <div className={adminStyles.tableWrap}>
          <table className={adminStyles.table}>
            <thead>
              <tr>
                <th style={{ width: 32 }}>
                  <input
                    type="checkbox"
                    checked={allOnPage}
                    onChange={() =>
                      setPicked((s) => {
                        const next = new Set(s);
                        rows.forEach((r) => (allOnPage ? next.delete(r._id) : next.add(r._id)));
                        return next;
                      })
                    }
                    aria-label="Select all on this page"
                  />
                </th>
                <th>Certificate no.</th>
                <th>Student</th>
                <th>Course</th>
                <th>Date</th>
                <th>Email</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c._id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={picked.has(c._id)}
                      onChange={() =>
                        setPicked((s) => {
                          const next = new Set(s);
                          if (next.has(c._id)) next.delete(c._id);
                          else next.add(c._id);
                          return next;
                        })
                      }
                      aria-label={`Select ${c.certificateNo}`}
                    />
                  </td>
                  <td>
                    <strong>{c.certificateNo}</strong>
                    <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                      {c.templateName}
                      {c.batchName ? ` · ${c.batchName}` : ""}
                    </div>
                    {c.qrEnabled === false && <div style={{ color: "var(--muted)", fontSize: "0.78rem" }}>No QR code</div>}
                  </td>
                  <td>{c.studentName}</td>
                  <td>
                    {c.course || "—"}
                    {c.grade && <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Grade: {c.grade}</div>}
                  </td>
                  <td>{fmtDate(c.date)}</td>
                  <td>
                    {c.emailedAt ? (
                      <span className={adminStyles.badgeSuccess} title={`Emailed ${new Date(c.emailedAt).toLocaleString()}`}>
                        Sent {fmtDate(c.emailedAt)}
                      </span>
                    ) : c.emailError ? (
                      <span title={c.emailError}>
                        <span style={{ color: "#b91c1c", fontWeight: 600 }}>Failed</span>
                        <span style={{ display: "block", maxWidth: 220, color: "var(--muted)", fontSize: "0.78rem", lineHeight: 1.35 }}>
                          {c.emailError}
                        </span>
                      </span>
                    ) : c.hasEmail ? (
                      <span style={{ color: "var(--muted)" }}>Not sent</span>
                    ) : (
                      <span style={{ color: "var(--muted)" }}>No email</span>
                    )}
                  </td>
                  <td>
                    {c.status === "active" ? (
                      <span className={adminStyles.badgeSuccess}>Active</span>
                    ) : (
                      <span title={c.revokedReason || undefined} style={{ color: "#b91c1c", fontWeight: 600 }}>
                        Revoked
                      </span>
                    )}
                  </td>
                  <td>
                    <div className={adminStyles.rowActions}>
                      <button className={adminStyles.smallButton} onClick={() => download(c)} disabled={busyId === c._id}>
                        {busyId === c._id ? "…" : "PDF"}
                      </button>
                      {c.status === "active" && c.hasEmail && (
                        <button className={adminStyles.smallButton} onClick={() => emailOne(c)} disabled={busyId === c._id}>
                          {busyId === c._id ? "Sending…" : c.emailedAt ? "Email again" : "Email"}
                        </button>
                      )}
                      <button className={adminStyles.smallButton} onClick={() => setQr([c._id], c.qrEnabled === false)} disabled={busyId === "qr"}>
                        {c.qrEnabled === false ? "Add QR" : "Remove QR"}
                      </button>
                      <button className={adminStyles.smallButton} onClick={() => copyLink(c)}>
                        {copied === c._id ? "Copied" : "Copy link"}
                      </button>
                      {c.status === "active" ? (
                        <button className={adminStyles.dangerButton} onClick={() => setRevoking(c)}>
                          Revoke
                        </button>
                      ) : (
                        <button className={adminStyles.smallButton} onClick={() => restore(c)}>
                          Restore
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
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} limit={limit} onLimitChange={changeLimit} />

      {revoking && (
        <RevokeModal
          cert={revoking}
          onClose={() => setRevoking(null)}
          onDone={() => {
            setRevoking(null);
            load();
          }}
        />
      )}
    </section>
  );
}

function RevokeModal({ cert, onClose, onDone }: { cert: Certificate; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.revokeCertificate(cert._id, reason.trim());
      onDone();
    } catch (err) {
      setError(errMsg(err, "Could not revoke"));
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose} dialogStyle={{ maxWidth: 440, width: "100%" }}>
      <div className={dashboardStyles.modalHead}>
        <h2 className={adminStyles.sectionTitle}>Revoke {cert.certificateNo}?</h2>
        <button className={dashboardStyles.modalCloseButton} type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <form className={adminStyles.form} onSubmit={submit}>
        <p className={adminStyles.sectionSubtitle}>
          {cert.studentName} will no longer see it, and its QR page will show it as revoked. You can restore it later.
        </p>
        <label className={adminStyles.label}>
          Reason (shown on the verification page)
          <input className={adminStyles.input} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
        </label>
        {error && <p className={adminStyles.messageError}>{error}</p>}
        <div className={adminStyles.formActions}>
          <button type="button" className={adminStyles.smallButton} onClick={onClose}>
            Cancel
          </button>
          <button className={adminStyles.dangerButton} disabled={busy}>
            {busy ? "Revoking…" : "Revoke"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
