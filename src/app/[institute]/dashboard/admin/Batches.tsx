"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError, Batch, Course, CourseMode, StudentGroup, User } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "./admin.module.css";
import Modal from "../Modal";
import Pagination from "../Pagination";
import ListToolbar from "./ListToolbar";
import RowMenu from "./RowMenu";
import { useDebounced } from "./useDebounced";

const PAGE_SIZE = 10;

const MODE_LABELS: Record<CourseMode, string> = { online: "Online", offline: "Offline", hybrid: "Hybrid" };

const dateOnly = (iso?: string | null) => (iso ? iso.slice(0, 10) : "");
const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function Batches() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // search / filters / sorting
  const [search, setSearch] = useState("");
  const q = useDebounced(search, 300);
  const [courseF, setCourseF] = useState("all");
  const [modeF, setModeF] = useState("all");
  const [sort, setSort] = useState("newest");

  const [formFor, setFormFor] = useState<Batch | "new" | null>(null);
  const [membersFor, setMembersFor] = useState<{ batch: Batch; kind: "student" | "teacher" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [batchesRes, studentsRes, teachersRes, groupsRes, coursesRes] = await Promise.all([
        api.listBatches({
          page,
          limit: PAGE_SIZE,
          q,
          sort,
          course: courseF !== "all" ? courseF : undefined,
          mode: modeF !== "all" ? modeF : undefined,
        }),
        // Full rosters for the pickers — not the browsable page.
        api.listUsers({ role: "student", status: "team", limit: 500 }),
        api.listUsers({ role: "teacher", status: "team", limit: 500 }),
        api.listStudentGroups(),
        api.listCourses({ limit: 500 }),
      ]);
      setBatches(batchesRes.batches);
      setTotalPages(batchesRes.totalPages);
      setTotal(batchesRes.total);
      setStudents(studentsRes.users);
      setTeachers(teachersRes.users);
      setGroups(groupsRes.groups);
      setCourses(coursesRes.courses);
    } finally {
      setLoading(false);
    }
  }, [page, q, sort, courseF, modeF]);

  useEffect(() => {
    load();
  }, [load]);

  const removeBatch = async (b: Batch) => {
    if (!window.confirm(`Delete "${b.name}"? Students and teachers assigned to it will be unassigned.`)) return;
    setError("");
    setNotice("");
    try {
      await api.deleteBatch(b._id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete batch");
    }
  };

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Batches</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Every batch belongs to a course. Create the batch first, then add its students and teachers.
      </p>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.sectionTitle}>All batches</h2>
            <p className={styles.sectionSubtitle}>{total} total</p>
          </div>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={() => {
              setNotice("");
              setFormFor("new");
            }}
          >
            + Create batch
          </button>
        </div>

        <ListToolbar
          search={search}
          onSearch={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search batches by name..."
          filters={[
            {
              key: "course",
              label: "Course",
              value: courseF,
              options: [{ value: "all", label: "All courses" }, ...courses.map((c) => ({ value: c._id, label: c.name }))],
              onChange: (v) => {
                setCourseF(v);
                setPage(1);
              },
            },
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
              { value: "start_asc", label: "Start date (earliest)" },
              { value: "start_desc", label: "Start date (latest)" },
            ],
            onChange: (v) => {
              setSort(v);
              setPage(1);
            },
          }}
          onClear={() => {
            setSearch("");
            setCourseF("all");
            setModeF("all");
            setSort("newest");
            setPage(1);
          }}
          total={total}
        />

        {notice && <p className={styles.messageSuccess}>{notice}</p>}
        {error && <p className={styles.messageError}>{error}</p>}
        {loading && <p className={styles.empty}>Loading...</p>}

        {!loading && courses.length === 0 && (
          <p className={styles.messageError}>
            You have no courses yet. Create a course first (Courses in the menu) — a batch is created for a course.
          </p>
        )}

        {!loading && batches.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyStateIcon} aria-hidden="true">
              📚
            </span>
            <p className={styles.emptyStateText}>
              {q.trim() || courseF !== "all" || modeF !== "all"
                ? "No batches match your search or filters."
                : "No batches yet — create one to get started."}
            </p>
          </div>
        )}

        {batches.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Course</th>
                  <th>Mode</th>
                  <th>Dates</th>
                  <th>Students</th>
                  <th>Teachers</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b._id}>
                    <td>
                      <strong>{b.name}</strong>
                      {b.description && (
                        <div className={styles.sectionSubtitle} style={{ margin: 0 }}>
                          {b.description}
                        </div>
                      )}
                    </td>
                    <td>{b.course?.name || "—"}</td>
                    <td>{b.mode ? MODE_LABELS[b.mode] : "—"}</td>
                    <td>
                      {b.startDate || b.endDate ? `${fmtDate(b.startDate)} → ${fmtDate(b.endDate)}` : "—"}
                    </td>
                    <td>
                      {b.studentCount ?? 0}
                      {b.maxStudents ? ` / ${b.maxStudents}` : ""}
                    </td>
                    <td>{b.teacherCount ?? 0}</td>
                    <td>
                      <div className={styles.rowActions} style={{ flexWrap: "nowrap", alignItems: "center" }}>
                        <button className={styles.primaryButton} type="button" onClick={() => setMembersFor({ batch: b, kind: "student" })}>
                          Add students
                        </button>
                        <button className={styles.smallButton} type="button" onClick={() => setMembersFor({ batch: b, kind: "teacher" })}>
                          Add teachers
                        </button>
                        <RowMenu
                          items={[
                            { label: "Edit batch", onClick: () => setFormFor(b) },
                            { label: "Delete batch", onClick: () => removeBatch(b), danger: true },
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

        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </section>

      {formFor && (
        <BatchFormModal
          batch={formFor === "new" ? null : formFor}
          courses={courses}
          onClose={() => setFormFor(null)}
          onSaved={(msg) => {
            setFormFor(null);
            setNotice(msg);
            load();
          }}
        />
      )}

      {membersFor && (
        <MembersModal
          batch={membersFor.batch}
          kind={membersFor.kind}
          people={membersFor.kind === "student" ? students : teachers}
          groups={groups}
          batchNames={Object.fromEntries(batches.map((b) => [b._id, b.name]))}
          onClose={() => setMembersFor(null)}
          onSaved={(msg) => {
            setMembersFor(null);
            setNotice(msg);
            load();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function BatchFormModal({
  batch,
  courses,
  onClose,
  onSaved,
}: {
  batch: Batch | null;
  courses: Course[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [f, setF] = useState({
    course: batch?.course?._id || "",
    name: batch?.name || "",
    description: batch?.description || "",
    mode: (batch?.mode || "online") as CourseMode,
    startDate: dateOnly(batch?.startDate),
    endDate: dateOnly(batch?.endDate),
    maxStudents: batch?.maxStudents ? String(batch.maxStudents) : "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => setF((p) => ({ ...p, [key]: value }));

  // Picking a course pre-fills the mode from it (still changeable).
  const pickCourse = (id: string) => {
    const course = courses.find((c) => c._id === id);
    setF((p) => ({ ...p, course: id, mode: course ? course.mode : p.mode }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!f.course) return setError("Select a course");
    if (!f.name.trim()) return setError("Enter a batch name");
    if (f.startDate && f.endDate && f.endDate < f.startDate) return setError("End date must be after the start date");

    const payload = {
      course: f.course,
      name: f.name.trim(),
      description: f.description.trim(),
      mode: f.mode,
      startDate: f.startDate || null,
      endDate: f.endDate || null,
      maxStudents: Number(f.maxStudents) || 0,
    };
    setBusy(true);
    try {
      if (batch) {
        await api.updateBatch(batch._id, payload);
        onSaved("Batch updated.");
      } else {
        await api.createBatch(payload);
        onSaved("Batch created — now use Add students / Add teachers.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the batch");
    } finally {
      setBusy(false);
    }
  };

  const full = { gridColumn: "1 / -1" } as const;
  const selectable = courses.filter((c) => c.isActive || c._id === f.course);

  return (
    <Modal onClose={onClose} dialogStyle={{ maxWidth: 640, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
      <h2 className={styles.sectionTitle}>{batch ? "Edit batch" : "Create batch"}</h2>
      <form className={styles.form} onSubmit={submit}>
        <label className={styles.label} style={full}>
          Course *
          <select className={styles.select} value={f.course} onChange={(e) => pickCourse(e.target.value)} autoFocus>
            <option value="">Select a course...</option>
            {selectable.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.label} style={full}>
          Batch name *
          <input className={styles.input} value={f.name} maxLength={120} placeholder="e.g. Morning Batch A" onChange={(e) => set("name", e.target.value)} />
        </label>
        <label className={styles.label}>
          Start date
          <input className={styles.input} type="date" value={f.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </label>
        <label className={styles.label}>
          End date
          <input className={styles.input} type="date" value={f.endDate} min={f.startDate || undefined} onChange={(e) => set("endDate", e.target.value)} />
        </label>
        <label className={styles.label}>
          Number of students (blank = no limit)
          <input className={styles.input} type="number" min={0} value={f.maxStudents} onChange={(e) => set("maxStudents", e.target.value)} />
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
        <label className={styles.label} style={full}>
          Description
          <input className={styles.input} value={f.description} placeholder="optional" onChange={(e) => set("description", e.target.value)} />
        </label>

        {error && (
          <p className={styles.messageError} style={full}>
            {error}
          </p>
        )}
        <div className={styles.formActions} style={full}>
          <button className={styles.primaryButton} type="submit" disabled={busy}>
            {busy ? "Saving..." : batch ? "Save changes" : "Create batch"}
          </button>
          <button className={styles.smallButton} type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

// Picks the students (replace semantics, one batch each) or teachers (can be in
// several batches) of a batch. Saved with the full selection, as the API expects.
function MembersModal({
  batch,
  kind,
  people,
  groups,
  batchNames,
  onClose,
  onSaved,
}: {
  batch: Batch;
  kind: "student" | "teacher";
  people: User[];
  groups: StudentGroup[];
  batchNames: Record<string, string>;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const isStudent = kind === "student";
  const [selected, setSelected] = useState<string[]>(() =>
    people
      .filter((p) => (isStudent ? p.batch === batch._id : p.batches?.includes(batch._id)))
      .map((p) => p._id)
  );
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const max = isStudent ? batch.maxStudents || 0 : 0;
  const q = query.trim().toLowerCase();
  const shown = people.filter((p) => !q || p.name.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q));
  const full = max > 0 && selected.length >= max;

  const toggle = (id: string) => {
    setError("");
    if (selected.includes(id)) return setSelected(selected.filter((x) => x !== id));
    if (full) return setError(`This batch is limited to ${max} students`);
    setSelected([...selected, id]);
  };

  const addGroup = (groupId: string) => {
    const group = groups.find((g) => g._id === groupId);
    if (!group) return;
    const merged = [...new Set([...selected, ...group.students.map((s) => s._id)])];
    if (max > 0 && merged.length > max) return setError(`That group would take the batch over its ${max}-student limit`);
    setError("");
    setSelected(merged);
  };

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await api.updateBatchMembers(batch._id, isStudent ? { studentIds: selected } : { teacherIds: selected });
      onSaved(`${isStudent ? "Students" : "Teachers"} updated for ${batch.name}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose} dialogStyle={{ maxWidth: 560, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
      <h2 className={styles.sectionTitle}>
        {isStudent ? "Add students" : "Add teachers"} — {batch.name}
      </h2>
      <p className={styles.sectionSubtitle}>
        {selected.length} selected{max > 0 ? ` of ${max}` : ""}.{" "}
        {isStudent ? "A student can be in one batch only — picking one moves them here." : "A teacher can be in several batches."}
      </p>

      <div style={{ display: "grid", gap: 10 }}>
        <input className={styles.input} value={query} placeholder={`Search ${isStudent ? "students" : "teachers"}...`} onChange={(e) => setQuery(e.target.value)} />
        {isStudent && groups.length > 0 && (
          <select
            className={styles.select}
            value=""
            onChange={(e) => {
              if (e.target.value) addGroup(e.target.value);
            }}
          >
            <option value="">Add a saved group...</option>
            {groups.map((g) => (
              <option key={g._id} value={g._id}>
                {g.name} ({g.students.length})
              </option>
            ))}
          </select>
        )}

        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", maxHeight: 340, overflowY: "auto" }}>
          {shown.length === 0 && <p className={styles.empty} style={{ padding: 12 }}>No {isStudent ? "students" : "teachers"} found.</p>}
          {shown.map((p) => {
            const checked = selected.includes(p._id);
            const elsewhere = isStudent && p.batch && p.batch !== batch._id ? batchNames[p.batch] : null;
            return (
              <label
                key={p._id}
                style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 12px", borderBottom: "1px solid var(--border)", cursor: "pointer" }}
              >
                <input type="checkbox" checked={checked} onChange={() => toggle(p._id)} />
                <span style={{ minWidth: 0 }}>
                  {p.name}
                  <span className={styles.sectionSubtitle} style={{ margin: 0, display: "block" }}>
                    {p.email}
                    {elsewhere ? ` · currently in ${elsewhere}` : ""}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {error && <p className={styles.messageError}>{error}</p>}
      <div className={styles.formActions} style={{ marginTop: 14 }}>
        <button className={styles.primaryButton} type="button" onClick={save} disabled={busy}>
          {busy ? "Saving..." : "Save"}
        </button>
        <button className={styles.smallButton} type="button" onClick={onClose} disabled={busy}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
