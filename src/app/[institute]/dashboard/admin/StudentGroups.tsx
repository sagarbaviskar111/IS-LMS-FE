"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError, StudentGroup, User } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "./admin.module.css";

export default function StudentGroups() {
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: "",
    studentIds: [] as string[],
  });
  const [formError, setFormError] = useState("");
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
        api.listStudentGroups(),
        // Full roster for the assignment picker below — not the browsable page.
        api.listUsers({ role: "student", status: "team", limit: 500 }),
      ]);
      setGroups(groupsRes.groups);
      setStudents(studentsRes.users);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      await api.createStudentGroup(form);
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
            </div>
          </div>

          <form className={styles.form} onSubmit={handleCreate}>
            <label className={styles.label}>
              Name
              <input
                className={styles.input}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Scholarship Batch"
                required
              />
            </label>

            {students.length > 0 && (
              <div className={styles.label} style={{ gridColumn: "1 / -1" }}>
                Students
                <div className={styles.tabs}>
                  {students.map((s) => (
                    <button
                      key={s._id}
                      type="button"
                      className={form.studentIds.includes(s._id) ? styles.tabActive : styles.tab}
                      onClick={() => setForm({ ...form, studentIds: toggle(form.studentIds, s._id) })}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.formActions}>
              <button className={styles.primaryButton} type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create group"}
              </button>
              {formError && <p className={styles.messageError}>{formError}</p>}
            </div>
          </form>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>All groups</h2>
              <p className={styles.sectionSubtitle}>{groups.length} total</p>
            </div>
          </div>

          {rowError && <p className={styles.messageError}>{rowError}</p>}

          {!loading && groups.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyStateIcon} aria-hidden="true">🗂️</span>
              <p className={styles.emptyStateText}>No student groups yet — create one above.</p>
            </div>
          )}

          {groups.map((g) =>
            editingId === g._id ? (
              <div key={g._id} className={styles.section} style={{ marginBottom: 12 }}>
                <div className={styles.form}>
                  <label className={styles.label}>
                    Name
                    <input
                      className={styles.input}
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </label>

                  <div className={styles.label} style={{ gridColumn: "1 / -1" }}>
                    Students
                    <div className={styles.tabs}>
                      {students.map((s) => (
                        <button
                          key={s._id}
                          type="button"
                          className={
                            editForm.studentIds.includes(s._id) ? styles.tabActive : styles.tab
                          }
                          onClick={() =>
                            setEditForm({ ...editForm, studentIds: toggle(editForm.studentIds, s._id) })
                          }
                        >
                          {s.name}
                        </button>
                      ))}
                      {students.length === 0 && <span className={styles.empty}>No students yet</span>}
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button
                      className={styles.primaryButton}
                      type="button"
                      disabled={savingId === g._id}
                      onClick={() => saveEdit(g._id)}
                    >
                      {savingId === g._id ? "Saving..." : "Save"}
                    </button>
                    <button className={styles.smallButton} type="button" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : null
          )}

          {groups.length > 0 && (
            <div className={styles.tableWrap}>
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
                        <td>{g.name}</td>
                        <td>{g.students.length} students</td>
                        <td>
                          <div className={styles.rowActions}>
                            <button className={styles.smallButton} onClick={() => startEdit(g)}>
                              Edit
                            </button>
                            <button className={styles.dangerButton} onClick={() => removeGroup(g)}>
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
        </section>
      </div>
    </div>
  );
}
