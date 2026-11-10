"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError, Course, CourseLevel, CourseMode, CourseRegistrationRow, DurationUnit, SyllabusItem } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "./admin.module.css";
import Modal from "../Modal";
import Pagination from "../Pagination";
import ListToolbar from "./ListToolbar";
import RowMenu from "./RowMenu";
import { useDebounced } from "./useDebounced";
import SyllabusEditor from "./SyllabusEditor";
import CourseProgress from "./CourseProgress";



const MODE_LABELS: Record<CourseMode, string> = { online: "Online", offline: "Offline", hybrid: "Hybrid" };
const LEVEL_LABELS: Record<CourseLevel, string> = {
  all: "All levels",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

type InstallmentDraft = { label: string; amount: string; dueAfterDays: string };

type FormState = {
  name: string;
  description: string;
  mode: CourseMode;
  level: CourseLevel;
  language: string;
  durationValue: string;
  durationUnit: DurationUnit;
  prerequisites: string;
  oneTimeEnabled: boolean;
  oneTimeAmount: string;
  installmentEnabled: boolean;
  installments: InstallmentDraft[];
  installmentCharge: string;
  syllabus: string;
  syllabusItems: SyllabusItem[];
  terms: string;
  isActive: boolean;
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

// Splits a total into `count` instalments, putting any leftover paise in the last one.
function splitEvenly(total: number, count: number): number[] {
  const each = Math.floor((total / count) * 100) / 100;
  const parts = Array(count).fill(each);
  parts[count - 1] = Math.round((total - each * (count - 1)) * 100) / 100;
  return parts;
}

const emptyForm = (): FormState => ({
  name: "",
  description: "",
  mode: "online",
  level: "all",
  language: "",
  durationValue: "",
  durationUnit: "months",
  prerequisites: "",
  oneTimeEnabled: true,
  oneTimeAmount: "",
  installmentEnabled: false,
  installments: [],
  installmentCharge: "",
  syllabus: "",
  syllabusItems: [],
  terms: "",
  isActive: true,
});

const fromCourse = (c: Course): FormState => ({
  name: c.name,
  description: c.description || "",
  mode: c.mode,
  level: c.level,
  language: c.language || "",
  durationValue: c.durationValue ? String(c.durationValue) : "",
  durationUnit: c.durationUnit,
  prerequisites: c.prerequisites || "",
  oneTimeEnabled: c.oneTimeEnabled,
  oneTimeAmount: c.oneTimeAmount ? String(c.oneTimeAmount) : "",
  installmentEnabled: c.installmentEnabled,
  installments: c.installments.map((i) => ({
    label: i.label,
    amount: String(i.amount),
    dueAfterDays: String(i.dueAfterDays),
  })),
  installmentCharge: c.installmentCharge ? String(c.installmentCharge) : "",
  syllabus: c.syllabus || "",
  syllabusItems: (c.syllabusItems || []).map((t) => ({ _id: t._id, unit: t.unit, title: t.title })),
  terms: c.terms || "",
  isActive: c.isActive,
});

const durationText = (c: Course) =>
  c.durationValue ? `${c.durationValue} ${c.durationUnit === "days" && c.durationValue === 1 ? "day" : c.durationUnit}` : null;

export default function AdminCourses() {
  const { institute } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState("");

  const [editing, setEditing] = useState<Course | "new" | null>(null);
  const [viewing, setViewing] = useState<Course | null>(null);
  const [notice, setNotice] = useState("");

  // search / filters / sorting
  const [search, setSearch] = useState("");
  const q = useDebounced(search, 300);
  const [modeF, setModeF] = useState("all");
  const [stateF, setStateF] = useState("all");
  const [sort, setSort] = useState("newest");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [regsFor, setRegsFor] = useState<Course | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listCourses({
        page,
        limit,
        q,
        sort,
        mode: modeF !== "all" ? modeF : undefined,
        active: stateF === "active" ? "1" : stateF === "inactive" ? "0" : undefined,
      });
      setCourses(res.courses);
      setTotalPages(res.totalPages);
      setTotal(res.total);
      setLoadError("");
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Could not load courses");
    } finally {
      setLoading(false);
    }
  }, [page, limit, q, sort, modeF, stateF]);

  useEffect(() => {
    load();
  }, [load]);

  const copyLink = async (c: Course) => {
    // Includes the institute name in the path so students recognise and trust the link.
    const link = `${window.location.origin}/${institute?.slug ?? ""}/enroll/${c.registrationToken}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt("Copy this registration link:", link); // clipboard blocked (e.g. plain http)
    }
    setCopiedId(c._id);
    setTimeout(() => setCopiedId((id) => (id === c._id ? null : id)), 2000);
  };

  const remove = async (c: Course) => {
    if (!window.confirm(`Delete the course "${c.name}"? This cannot be undone.`)) return;
    try {
      await api.deleteCourse(c._id);
      setNotice("Course deleted.");
      load();
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Could not delete");
    }
  };

  const toggleActive = async (c: Course) => {
    try {
      await api.updateCourse(c._id, { isActive: !c.isActive });
      load();
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Could not update");
    }
  };

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Courses</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Create the courses your institute offers — with fees, payment plan, schedule and syllabus.
      </p>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.sectionTitle}>All courses ({total})</h2>
          </div>
          <button className={styles.primaryButton} type="button" onClick={() => setEditing("new")}>
            + Create course
          </button>
        </div>

        <ListToolbar
          search={search}
          onSearch={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search courses by name"
          filters={[
            {
              key: "mode",
              label: "Mode",
              value: modeF,
              options: [
                { value: "all", label: "All modes" },
                { value: "online", label: "Online" },
                { value: "offline", label: "Offline" },
                { value: "hybrid", label: "Hybrid" },
              ],
              onChange: (v) => {
                setModeF(v);
                setPage(1);
              },
            },
            {
              key: "state",
              label: "Status",
              value: stateF,
              options: [
                { value: "all", label: "All statuses" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ],
              onChange: (v) => {
                setStateF(v);
                setPage(1);
              },
            },
          ]}
          sort={{
            key: "sort",
            label: "Sort by",
            value: sort,
            options: [
              { value: "newest", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
              { value: "name_asc", label: "Name A–Z" },
              { value: "name_desc", label: "Name Z–A" },
              { value: "fee_asc", label: "Fee: low to high" },
              { value: "fee_desc", label: "Fee: high to low" },
            ],
            onChange: (v) => {
              setSort(v);
              setPage(1);
            },
          }}
          onClear={() => {
            setSearch("");
            setModeF("all");
            setStateF("all");
            setSort("newest");
            setPage(1);
          }}
          total={total}
        />

        {notice && <p className={styles.messageSuccess} role="status">{notice}</p>}
        {loadError && <p className={styles.messageError} role="alert">{loadError}</p>}
        {loading && courses.length === 0 && <p className={styles.sectionSubtitle}>Loading…</p>}

        {!loading && courses.length === 0 && !loadError && (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📚</div>
            <p className={styles.emptyStateText}>
              {q.trim() || modeF !== "all" || stateF !== "all"
                ? "No courses match your search or filters."
                : "No courses yet. Create your first course to get started."}
            </p>
          </div>
        )}

        {courses.length > 0 && (
          <div className={`${styles.tableWrap} table-scroll`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Mode</th>
                  <th>Fee</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <strong style={{ overflowWrap: "anywhere" }}>{c.name}</strong>
                      <div className={styles.sectionSubtitle} style={{ margin: 0 }}>
                        {LEVEL_LABELS[c.level]}
                        {durationText(c) ? ` · ${durationText(c)}` : ""}
                      </div>
                    </td>
                    <td>{MODE_LABELS[c.mode]}</td>
                    <td>
                      {c.oneTimeEnabled && <div>{inr(c.oneTimeAmount)} one-time</div>}
                      {c.installmentEnabled && (
                        <div className={styles.sectionSubtitle} style={{ margin: 0 }}>
                          {c.installments.length} installments · {inr(c.installments.reduce((s, i) => s + i.amount, 0) + (c.installmentCharge || 0))}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={c.isActive ? `${styles.badge} ${styles.badgeSuccess}` : `${styles.badge} ${styles.badgeInactive}`}>
                        {c.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.rowActions} style={{ flexWrap: "nowrap", alignItems: "center" }}>
                        <button className={styles.primaryButton} type="button" onClick={() => setViewing(c)}>
                          View
                        </button>
                        <button className={styles.smallButton} type="button" onClick={() => copyLink(c)}>
                          {copiedId === c._id ? "Link copied ✓" : "Copy link"}
                        </button>
                        <RowMenu
                          items={[
                            { label: "Registrations", onClick: () => setRegsFor(c) },
                            { label: "Edit course", onClick: () => setEditing(c) },
                            { label: c.isActive ? "Deactivate" : "Activate", onClick: () => toggleActive(c) },
                            { label: "Delete course", onClick: () => remove(c), danger: true },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          limit={limit}
          limitOptions={[12, 24, 48, 100]}
          onLimitChange={(n) => {
            setLimit(n);
            setPage(1);
          }}
        />
      </section>

      {editing && (
        <CourseFormModal
          course={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null);
            setNotice(msg);
            load();
          }}
        />
      )}
      {viewing && <CourseDetailModal course={viewing} onClose={() => setViewing(null)} />}
      {regsFor && <RegistrationsModal course={regsFor} onClose={() => setRegsFor(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function CourseFormModal({
  course,
  onClose,
  onSaved,
}: {
  course: Course | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [f, setF] = useState<FormState>(() => (course ? fromCourse(course) : emptyForm()));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [splitCount, setSplitCount] = useState("3");

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setF((prev) => ({ ...prev, [key]: value }));

  const setInstallment = (i: number, patch: Partial<InstallmentDraft>) =>
    set(
      "installments",
      f.installments.map((it, idx) => (idx === i ? { ...it, ...patch } : it))
    );

  const installmentSum = f.installments.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const installmentCharge = Number(f.installmentCharge) || 0;
  const installmentTotal = installmentSum + installmentCharge;

  // Quick start: N equal instalments of the one-time amount, spaced a month apart.
  // The admin can still change every amount and due day afterwards.
  const autoSplit = () => {
    const count = Math.max(2, Math.min(24, parseInt(splitCount, 10) || 0));
    const base = Number(f.oneTimeAmount) || installmentSum;
    if (!(base > 0)) return setError("Enter the one-time amount first, then split it into installments");
    setError("");
    const amounts = splitEvenly(base, count);
    set(
      "installments",
      amounts.map((a, i) => ({ label: `Installment ${i + 1}`, amount: String(a), dueAfterDays: String(i * 30) }))
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!f.name.trim()) return setError("Give the course a name");
    if (!f.oneTimeEnabled && !f.installmentEnabled) return setError("Turn on at least one payment option");
    if (f.oneTimeEnabled && !(Number(f.oneTimeAmount) > 0)) return setError("Enter the one-time payment amount");
    if (f.installmentEnabled && f.installments.length < 2) return setError("Add at least 2 installments");

    const payload = {
      name: f.name.trim(),
      description: f.description.trim(),
      mode: f.mode,
      level: f.level,
      language: f.language.trim(),
      durationValue: Number(f.durationValue) || 0,
      durationUnit: f.durationUnit,
      prerequisites: f.prerequisites.trim(),
      oneTimeEnabled: f.oneTimeEnabled,
      oneTimeAmount: f.oneTimeEnabled ? Number(f.oneTimeAmount) : 0,
      installmentEnabled: f.installmentEnabled,
      installments: f.installmentEnabled
        ? f.installments.map((i) => ({
            label: i.label.trim(),
            amount: Number(i.amount),
            dueAfterDays: Number(i.dueAfterDays) || 0,
          }))
        : [],
      installmentCharge: f.installmentEnabled ? installmentCharge : 0,
      syllabus: f.syllabus.trim(),
      syllabusItems: f.syllabusItems,
      terms: f.terms.trim(),
      isActive: f.isActive,
    };

    setBusy(true);
    try {
      if (course) {
        await api.updateCourse(course._id, payload);
        onSaved("Course updated.");
      } else {
        await api.createCourse(payload);
        onSaved("Course created.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the course");
    } finally {
      setBusy(false);
    }
  };

  const full = { gridColumn: "1 / -1" } as const;
  const block = { border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 12, display: "grid", gap: 10 } as const;

  return (
    <Modal onClose={onClose} dialogStyle={{ maxWidth: 780, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
      <h2 className={styles.sectionTitle}>{course ? "Edit course" : "Create course"}</h2>
      <form className={styles.form} onSubmit={submit}>
        {/* ---- basics ---- */}
        <h3 className={styles.formSectionTitle} style={{ ...full, padding: 0, marginTop: 6, borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
          Course details
        </h3>
        <label className={styles.label} style={full}>
          <span>Course name<span className={styles.required}>*</span></span>
          <input className={styles.input} value={f.name} maxLength={120} autoFocus placeholder="e.g. Full-Stack Web Development" onChange={(e) => set("name", e.target.value)} />
        </label>
        <label className={styles.label} style={full}>
          <span>About this course <span className={styles.hint}>(optional)</span></span>
          <textarea className={styles.input} rows={3} value={f.description} maxLength={3000} placeholder="What students will learn and who it is for" onChange={(e) => set("description", e.target.value)} />
        </label>
        <label className={styles.label}>
          Mode
          <select className={styles.select} value={f.mode} onChange={(e) => set("mode", e.target.value as CourseMode)}>
            {(Object.keys(MODE_LABELS) as CourseMode[]).map((m) => (
              <option key={m} value={m}>
                {MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.label}>
          Level
          <select className={styles.select} value={f.level} onChange={(e) => set("level", e.target.value as CourseLevel)}>
            {(Object.keys(LEVEL_LABELS) as CourseLevel[]).map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABELS[l]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.label}>
          <span>Language <span className={styles.hint}>(optional)</span></span>
          <input className={styles.input} value={f.language} maxLength={40} placeholder="e.g. Hindi / English" onChange={(e) => set("language", e.target.value)} />
        </label>

        {/* ---- duration ---- */}
        <h3 className={styles.formSectionTitle} style={{ ...full, padding: 0, marginTop: 6, borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
          Duration
        </h3>
        <label className={styles.label}>
          Duration
          <input className={styles.input} type="number" inputMode="decimal" min={0} step="any" value={f.durationValue} placeholder="e.g. 6" onChange={(e) => set("durationValue", e.target.value)} />
        </label>
        <label className={styles.label}>
          Duration unit
          <select className={styles.select} value={f.durationUnit} onChange={(e) => set("durationUnit", e.target.value as DurationUnit)}>
            <option value="days">Days</option>
            <option value="weeks">Weeks</option>
            <option value="months">Months</option>
          </select>
        </label>
        <label className={styles.label} style={full}>
          <span>Prerequisites <span className={styles.hint}>(optional)</span></span>
          <input className={styles.input} value={f.prerequisites} maxLength={500} placeholder="e.g. Basic computer knowledge" onChange={(e) => set("prerequisites", e.target.value)} />
        </label>

        {/* ---- payment ---- */}
        <h3 className={styles.formSectionTitle} style={{ ...full, padding: 0, marginTop: 6, borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
          Fees &amp; payment plan
        </h3>
        <div style={{ ...full, ...block }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 600 }}>
            <input type="checkbox" checked={f.oneTimeEnabled} onChange={(e) => set("oneTimeEnabled", e.target.checked)} />
            One-time payment
          </label>
          {f.oneTimeEnabled && (
            <label className={styles.label}>
              Full amount (₹)
              <input className={styles.input} type="number" inputMode="decimal" min={0} step="any" value={f.oneTimeAmount} placeholder="e.g. 30000" onChange={(e) => set("oneTimeAmount", e.target.value)} />
            </label>
          )}
        </div>

        <div style={{ ...full, ...block }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={f.installmentEnabled}
              onChange={(e) => {
                set("installmentEnabled", e.target.checked);
                if (e.target.checked && f.installments.length === 0) {
                  set("installments", [
                    { label: "Installment 1", amount: "", dueAfterDays: "0" },
                    { label: "Installment 2", amount: "", dueAfterDays: "30" },
                  ]);
                }
              }}
            />
            Pay in installments
          </label>

          {f.installmentEnabled && (
            <>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                <label className={styles.label} style={{ maxWidth: 160 }}>
                  Split equally into
                  <input className={styles.input} type="number" min={2} max={24} value={splitCount} onChange={(e) => setSplitCount(e.target.value)} />
                </label>
                <button className={styles.smallButton} type="button" onClick={autoSplit}>
                  Auto-fill amounts
                </button>
                <span className={styles.sectionSubtitle} style={{ margin: 0 }}>
                  Based on the one-time amount. You can change every amount below.
                </span>
              </div>

              {f.installments.map((it, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr)) auto", gap: 8, alignItems: "end" }}>
                  <label className={styles.label}>
                    Name
                    <input className={styles.input} value={it.label} maxLength={60} placeholder={`Installment ${i + 1}`} onChange={(e) => setInstallment(i, { label: e.target.value })} />
                  </label>
                  <label className={styles.label}>
                    Amount (₹)
                    <input className={styles.input} type="number" inputMode="decimal" min={0} step="any" value={it.amount} onChange={(e) => setInstallment(i, { amount: e.target.value })} />
                  </label>
                  <label className={styles.label}>
                    Due after (days)
                    <input className={styles.input} type="number" inputMode="numeric" min={0} step={1} value={it.dueAfterDays} onChange={(e) => setInstallment(i, { dueAfterDays: e.target.value })} />
                  </label>
                  <button
                    className={styles.dangerButton}
                    type="button"
                    disabled={f.installments.length <= 2}
                    onClick={() => set("installments", f.installments.filter((_, idx) => idx !== i))}
                  >
                    Remove
                  </button>
                </div>
              ))}

              <label className={styles.label} style={{ maxWidth: 260 }}>
                Installment charge (₹, optional)
                <input className={styles.input} type="number" min={0} step="any" value={f.installmentCharge} placeholder="e.g. 1000" onChange={(e) => set("installmentCharge", e.target.value)} />
                <span className={styles.hint}>Extra amount for paying in installments — added to the total fees.</span>
              </label>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <button
                  className={styles.smallButton}
                  type="button"
                  disabled={f.installments.length >= 24}
                  onClick={() =>
                    set("installments", [
                      ...f.installments,
                      { label: `Installment ${f.installments.length + 1}`, amount: "", dueAfterDays: String(f.installments.length * 30) },
                    ])
                  }
                >
                  + Add installment
                </button>
                <strong>
                  Total in installments: {inr(installmentTotal)}
                  {installmentCharge > 0 && (
                    <span className={styles.sectionSubtitle} style={{ fontWeight: 400 }}>
                      {" "}
                      ({inr(installmentSum)} + {inr(installmentCharge)} charge)
                    </span>
                  )}
                  {f.oneTimeEnabled && Number(f.oneTimeAmount) > 0 && installmentTotal !== Number(f.oneTimeAmount) && (
                    <span className={styles.sectionSubtitle} style={{ fontWeight: 400 }}>
                      {" "}
                      (one-time: {inr(Number(f.oneTimeAmount))})
                    </span>
                  )}
                </strong>
              </div>
            </>
          )}
        </div>

        {/* ---- syllabus topics (tracked per batch) ---- */}
        <h3 className={styles.formSectionTitle} style={{ ...full, padding: 0, marginTop: 6, borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
          Syllabus topics — tracked per batch
        </h3>
        <div style={full}>
          <SyllabusEditor value={f.syllabusItems} onChange={(items) => set("syllabusItems", items)} />
        </div>

        {/* ---- syllabus ---- */}
        <h3 className={styles.formSectionTitle} style={{ ...full, padding: 0, marginTop: 6, borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
          Syllabus — what will be covered
        </h3>
        <label className={styles.label} style={full}>
          Paste the syllabus here
          <textarea
            className={styles.input}
            rows={10}
            value={f.syllabus}
            maxLength={30000}
            placeholder={"Module 1 - HTML & CSS\n- Tags and elements\n- Flexbox\n\nModule 2 - JavaScript\n..."}
            onChange={(e) => set("syllabus", e.target.value)}
          />
        </label>

        <h3 className={styles.formSectionTitle} style={{ ...full, padding: 0, marginTop: 6, borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
          Terms &amp; conditions
        </h3>
        <label className={styles.label} style={full}>
          Shown to students before they sign (leave blank to use the standard terms)
          <textarea
            className={styles.input}
            rows={6}
            value={f.terms}
            maxLength={20000}
            placeholder="Paste your own terms and conditions here"
            onChange={(e) => set("terms", e.target.value)}
          />
        </label>

        <label className={`${styles.checkRow} ${styles.fullRow}`}>
          <input type="checkbox" checked={f.isActive} onChange={(e) => set("isActive", e.target.checked)} />
          Course is active (open for admissions)
        </label>

        <div className={styles.modalFooter}>
          {error && (
            <p className={styles.messageError} role="alert" style={{ margin: 0, marginRight: "auto" }}>
              {error}
            </p>
          )}
          <button className={styles.smallButton} type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className={styles.primaryButton} type="submit" disabled={busy}>
            {busy ? "Saving…" : course ? "Save changes" : "Create course"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function CourseDetailModal({ course: c, onClose }: { course: Course; onClose: () => void }) {
  const row = (label: string, value: React.ReactNode) =>
    value ? (
      <div style={{ display: "flex", gap: "2px 12px", flexWrap: "wrap" }}>
        <span className={styles.sectionSubtitle} style={{ minWidth: 120, margin: 0 }}>
          {label}
        </span>
        <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{value}</span>
      </div>
    ) : null;

  return (
    <Modal onClose={onClose} dialogStyle={{ maxWidth: 640, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
      <h2 className={styles.sectionTitle}>{c.name}</h2>
      {c.description && <p className={styles.sectionSubtitle} style={{ whiteSpace: "pre-wrap" }}>{c.description}</p>}

      <div style={{ display: "grid", gap: 6, margin: "12px 0" }}>
        {row("Mode", MODE_LABELS[c.mode])}
        {row("Level", LEVEL_LABELS[c.level])}
        {row("Language", c.language)}
        {row("Duration", durationText(c))}
        {row("Prerequisites", c.prerequisites)}
      </div>

      <h3 className={styles.sectionTitle} style={{ fontSize: "1rem" }}>
        Fees
      </h3>
      <div style={{ display: "grid", gap: 6, margin: "8px 0 12px" }}>
        {c.oneTimeEnabled && row("One-time", inr(c.oneTimeAmount))}
        {c.installmentEnabled && (
          <div className={`${styles.tableWrap} table-scroll`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Installment</th>
                  <th>Amount</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {c.installments.map((it, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{it.label || `Installment ${i + 1}`}</td>
                    <td>{inr(it.amount)}</td>
                    <td>{it.dueAfterDays === 0 ? "At joining" : `After ${it.dueAfterDays} days`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {c.installmentCharge > 0 && <p className={styles.sectionSubtitle}>Installment charge: {inr(c.installmentCharge)}</p>}
            <p className={styles.sectionSubtitle}>Total in installments: {inr(c.installments.reduce((s, i) => s + i.amount, 0) + (c.installmentCharge || 0))}</p>
          </div>
        )}
      </div>

      <h3 className={styles.sectionTitle} style={{ fontSize: "1rem" }}>
        Syllabus
      </h3>
      {(c.syllabusItems || []).length > 0 && (
        <>
          {Array.from(new Set((c.syllabusItems || []).map((t) => t.unit))).map((unit) => (
            <div key={unit || "_"} style={{ marginBottom: 8 }}>
              {unit && <strong>{unit}</strong>}
              <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
                {(c.syllabusItems || []).filter((t) => t.unit === unit).map((t) => (
                  <li key={t._id || t.title}>{t.title}</li>
                ))}
              </ul>
            </div>
          ))}
          <CourseProgress courseId={c._id} hasTopics />
        </>
      )}
      {c.syllabus ? (
        <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{c.syllabus}</p>
      ) : (c.syllabusItems || []).length ? null : (
        <p className={styles.empty}>No syllabus added yet.</p>
      )}

      <div className={styles.modalFooter}>
        <button className={styles.smallButton} type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

type ProofKind = "id1" | "id2" | "selfie" | "signature";
const PROOFS: { kind: ProofKind; label: string }[] = [
  { kind: "id1", label: "ID proof 1" },
  { kind: "id2", label: "ID proof 2" },
  { kind: "selfie", label: "Live photo" },
  { kind: "signature", label: "Signature" },
];

// Who registered through the course link, with their verification files.
function RegistrationsModal({ course, onClose }: { course: Course; onClose: () => void }) {
  const [rows, setRows] = useState<CourseRegistrationRow[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [term, setTerm] = useState("");
  const t = term.trim().toLowerCase();
  const shownRows = (rows || []).filter((r) => !t || `${r.name} ${r.email} ${r.phone}`.toLowerCase().includes(t));

  useEffect(() => {
    api
      .listCourseRegistrations(course._id)
      .then((res) => setRows(res.registrations))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load registrations"));
  }, [course._id]);

  return (
    <Modal onClose={onClose} dialogStyle={{ maxWidth: 760, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
      <h2 className={styles.sectionTitle}>Registrations — {course.name}</h2>
      {error && <p className={styles.messageError}>{error}</p>}
      {!rows && !error && <p className={styles.sectionSubtitle}>Loading…</p>}
      {rows && rows.length === 0 && <p className={styles.empty}>No one has registered through the link yet.</p>}
      {rows && rows.length > 3 && (
        <input className={styles.input} style={{ margin: "12px 0" }} type="search" aria-label="Search registrations" placeholder="Search by name, email or phone" value={term} onChange={(e) => setTerm(e.target.value)} />
      )}
      {rows && rows.length > 0 && shownRows.length === 0 && <p className={styles.sectionSubtitle}>No registrations match your search.</p>}
      {rows && shownRows.length > 0 && (
        <div style={{ display: "grid", gap: 10 }}>
          {shownRows.map((r) => (
            <div key={r._id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <strong style={{ overflowWrap: "anywhere" }}>{r.name}</strong>
                  <div className={styles.sectionSubtitle} style={{ margin: 0 }}>
                    {r.email} · {r.phone}
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: 0 }}>
                  <div>
                    Paid {inr(r.amountPaid)} of {inr(r.planTotal)}
                  </div>
                  <div className={styles.sectionSubtitle} style={{ margin: 0 }}>
                    {r.plan === "one_time" ? "One-time" : "Installments"} · {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <button className={styles.smallButton} type="button" style={{ marginTop: 8 }} onClick={() => setOpen(open === r._id ? null : r._id)}>
                {open === r._id ? "Hide documents" : "View documents"}
              </button>
              {open === r._id && <ProofGallery reg={r} />}
            </div>
          ))}
        </div>
      )}
      <div className={styles.modalFooter}>
        <button className={styles.smallButton} type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}

export function ProofGallery({ reg }: { reg: CourseRegistrationRow }) {
  const labels: Record<ProofKind, string> = {
    id1: reg.idProofs?.[0]?.docType || "ID proof 1",
    id2: reg.idProofs?.[1]?.docType || "ID proof 2",
    selfie: "Live facial verification",
    signature: "Signature",
  };
  const [urls, setUrls] = useState<Partial<Record<ProofKind, { url: string; pdf: boolean } | "error">>>({});

  useEffect(() => {
    let alive = true;
    const made: string[] = [];
    PROOFS.forEach(async ({ kind }) => {
      try {
        const blob = await api.courseRegistrationFile(reg._id, kind);
        const url = URL.createObjectURL(blob);
        made.push(url);
        if (alive) setUrls((u) => ({ ...u, [kind]: { url, pdf: blob.type === "application/pdf" } }));
      } catch {
        if (alive) setUrls((u) => ({ ...u, [kind]: "error" }));
      }
    });
    return () => {
      alive = false;
      made.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [reg._id]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 10 }}>
      {PROOFS.map(({ kind }) => {
        const label = labels[kind];
        const item = urls[kind];
        return (
          <div key={kind}>
            <div className={styles.sectionSubtitle} style={{ margin: "0 0 4px" }}>
              {label}
            </div>
            {!item && <p className={styles.empty}>Loading...</p>}
            {item === "error" && <p className={styles.messageError}>Not available</p>}
            {item && item !== "error" &&
              (item.pdf ? (
                <a href={item.url} target="_blank" rel="noreferrer" className={styles.linkButton}>
                  Open PDF
                </a>
              ) : (
                <a href={item.url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={label} style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)", background: "#fff" }} />
                </a>
              ))}
          </div>
        );
      })}
    </div>
  );
}
