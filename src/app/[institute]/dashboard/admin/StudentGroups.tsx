"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError, StudentGroup, User } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "./admin.module.css";
import Pagination from "../Pagination";
import ListToolbar from "./ListToolbar";
import { useDebounced } from "./useDebounced";

// A searchable, scrollable list of students to tick, with a running count.
function StudentPicker({
  students,
  selected,
  onChange,
}: {
  students: User[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [term, setTerm] = useState("");
  const t = term.trim().toLowerCase();
  const visible = t ? students.filter((s) => `${s.name} ${s.email}`.toLowerCase().includes(t)) : students;
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <input
          className={styles.input}
          style={{ flex: "1 1 180px", minWidth: 0 }}
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search students by name or email"
          aria-label="Search students"
        />
        <span className={styles.hint}>{selected.length} selected</span>
        <button
          type="button"
          className={styles.smallButton}
          onClick={() => onChange([...new Set([...selected, ...visible.map((s) => s._id)])])}
          disabled={visible.length === 0}
        >
          Select {t ? "shown" : "all"}
        </button>
        <button type="button" className={styles.smallButton} onClick={() => onChange([])} disabled={selected.length === 0}>
          Clear
        </button>
      </div>
      <div
        style={{
          maxHeight: 220,
          overflowY: "auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 8,
          padding: 2,
        }}
      >
        {visible.map((s) => (
          <label key={s._id} className={styles.checkRow} style={{ minWidth: 0 }}>
            <input type="checkbox" checked={selected.includes(s._id)} onChange={() => toggle(s._id)} />
            <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
              {s.name}
              <span className={styles.hint} style={{ display: "block" }}>
                {s.email}
              </span>
            </span>
          </label>
        ))}
        {visible.length === 0 && <span className={styles.hint}>{students.length === 0 ? "No students yet." : "No students match."}</span>}
      </div>
    </div>
  );
}

export default function StudentGroups() {
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const q = useDebounced(search, 300);
  const [sort, setSort] = useState("name_asc");

  const [form, setForm] = useState({
    name: "",
    studentIds: [] as string[],
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    studentIds: [] as string[],
  });
  const [rowError, setRowError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [groupsRes, studentsRes] = await Promise.all([
        api.listStudentGroups({ page, limit, q, sort }),
        // Full roster for the assignment picker below — not the browsable page.
        api.listUsers({ role: "student", status: "team", limit: 500 }),
      ]);
      setGroups(groupsRes.groups);
      setTotalPages(groupsRes.totalPages);
      setTotal(groupsRes.total);
      setStudents(studentsRes.users);
    } finally {
      setLoading(false);
    }
  }, [page, limit, q, sort]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setSubmitting(true);
    try {
      await api.createStudentGroup(form);
      setFormSuccess(`Group "${form.name}" created.`);
      setForm({ name: "", studentIds: [] });
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not create group");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (g: StudentGroup) => {
    setEditingId(g._id);
    setEditForm({
      name: g.name,
      studentIds: g.students.map((s) => s._id),
    });
    setRowError("");
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    setRowError("");
    setSavingId(id);
    try {
      await api.updateStudentGroup(id, {
        name: editForm.name,
        studentIds: editForm.studentIds,
      });
      setEditingId(null);
      load();
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : "Could not save changes");
    } finally {
      setSavingId(null);
    }
  };

  const removeGroup = async (g: StudentGroup) => {
    if (!window.confirm(`Delete "${g.name}"? This cannot be undone.`)) return;
    setRowError("");
    try {
      await api.deleteStudentGroup(g._id);
      load();
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : "Could not delete group");
    }
  };

  const filtering = !!q.trim();

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Student Groups</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Create named, reusable groups of students to make assigning them elsewhere faster.
      </p>

      <div className={styles.grid}>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Create a group</h2>
              <p className={styles.sectionSubtitle}>Pick a name, then tick the students who belong in it.</p>
            </div>
          </div>

          <form className={styles.form} onSubmit={handleCreate}>
            <label className={`${styles.label} ${styles.fullRow}`}>
              <span>
                Group name<span className={styles.required}>*</span>
              </span>
              <input
                className={styles.input}
                value={form.name}
                maxLength={100}
                autoComplete="off"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Scholarship Batch"
                required
              />
            </label>

            <div className={`${styles.label} ${styles.fullRow}`}>
              Students
              <StudentPicker
                students={students}
                selected={form.studentIds}
                onChange={(studentIds) => setForm({ ...form, studentIds })}
              />
            </div>

            <div className={`${styles.formActions} ${styles.fullRow}`}>
              <button className={styles.primaryButton} type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create group"}
              </button>
              {formError && <p className={styles.messageError} role="alert">{formError}</p>}
              {formSuccess && <p className={styles.messageSuccess} role="status">{formSuccess}</p>}
            </div>
          </form>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>All groups</h2>
              <p className={styles.sectionSubtitle}>{total} total</p>
            </div>
          </div>

          <ListToolbar
            search={search}
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search groups by name"
            sort={{
              key: "sort",
              label: "Sort by",
              value: sort,
              options: [
                { value: "name_asc", label: "Name A–Z" },
                { value: "name_desc", label: "Name Z–A" },
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
              ],
              onChange: (v) => {
                setSort(v);
                setPage(1);
              },
            }}
            onClear={() => {
              setSearch("");
              setSort("name_asc");
              setPage(1);
            }}
            total={total}
          />

          {rowError && <p className={styles.messageError} role="alert">{rowError}</p>}
          {loading && groups.length === 0 && <p className={styles.sectionSubtitle}>Loading…</p>}

          {!loading && groups.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyStateIcon} aria-hidden="true">🗂️</span>
              <p className={styles.emptyStateText}>
                {filtering ? "No groups match your search." : "No student groups yet — create one above."}
              </p>
            </div>
          )}

          {groups.map((g) =>
            editingId === g._id ? (
              <div key={g._id} className={styles.section} style={{ marginBottom: 12 }}>
                <div className={styles.form}>
                  <label className={`${styles.label} ${styles.fullRow}`}>
                    <span>
                      Group name<span className={styles.required}>*</span>
                    </span>
                    <input
                      className={styles.input}
                      value={editForm.name}
                      maxLength={100}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </label>

                  <div className={`${styles.label} ${styles.fullRow}`}>
                    Students
                    <StudentPicker
                      students={students}
                      selected={editForm.studentIds}
                      onChange={(studentIds) => setEditForm({ ...editForm, studentIds })}
                    />
                  </div>

                  <div className={`${styles.formActions} ${styles.fullRow}`}>
                    <button
                      className={styles.primaryButton}
                      type="button"
                      disabled={savingId === g._id || !editForm.name.trim()}
                      onClick={() => saveEdit(g._id)}
                    >
                      {savingId === g._id ? "Saving…" : "Save"}
                    </button>
                    <button className={styles.smallButton} type="button" onClick={cancelEdit} disabled={savingId === g._id}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : null
          )}

          {groups.some((g) => g._id !== editingId) && (
            <div className={`${styles.tableWrap} table-scroll`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Students</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {groups
                    .filter((g) => g._id !== editingId)
                    .map((g) => (
                      <tr key={g._id}>
                        <td style={{ overflowWrap: "anywhere" }}>
                          <strong>{g.name}</strong>
                        </td>
                        <td>
                          {g.students.length} student{g.students.length === 1 ? "" : "s"}
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            <button className={styles.smallButton} type="button" onClick={() => startEdit(g)}>
                              Edit
                            </button>
                            <button className={styles.dangerButton} type="button" onClick={() => removeGroup(g)}>
                              Delete
                            </button>
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
            onLimitChange={(n) => {
              setLimit(n);
              setPage(1);
            }}
          />
        </section>
      </div>
    </div>
  );
}
