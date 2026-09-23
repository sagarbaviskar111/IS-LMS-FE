"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError, Batch, StudentGroup, User } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "./admin.module.css";
import Pagination from "../Pagination";

const PAGE_SIZE = 10;

export default function Batches() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [form, setForm] = useState({
    name: "",
    description: "",
    studentIds: [] as string[],
    teacherIds: [] as string[],
    defaultFee: "",
    paymentCycleDays: "30",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    studentIds: [] as string[],
    teacherIds: [] as string[],
    defaultFee: "",
    paymentCycleDays: "30",
  });
  const [rowError, setRowError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [batchesRes, studentsRes, teachersRes, groupsRes] = await Promise.all([
        api.listBatches({ page, limit: PAGE_SIZE }),
        // Full rosters for the assignment pickers below — not the browsable page.
        api.listUsers({ role: "student", status: "team", limit: 500 }),
        api.listUsers({ role: "teacher", status: "team", limit: 500 }),
        api.listStudentGroups(),
      ]);
      setBatches(batchesRes.batches);
      setTotalPages(batchesRes.totalPages);
      setTotal(batchesRes.total);
      setStudents(studentsRes.users);
      setTeachers(teachersRes.users);
      setGroups(groupsRes.groups);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  // Merges a saved group's members into the current picker selection —
  // students already picked, or not in the group, are left untouched.
  const addGroup = (current: string[], groupId: string) => {
    const group = groups.find((g) => g._id === groupId);
    if (!group) return current;
    return [...new Set([...current, ...group.students.map((s) => s._id)])];
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      await api.createBatch({
        ...form,
        defaultFee: form.defaultFee === "" ? undefined : Number(form.defaultFee),
        paymentCycleDays: form.paymentCycleDays === "" ? undefined : Number(form.paymentCycleDays),
      });
      setForm({ name: "", description: "", studentIds: [], teacherIds: [], defaultFee: "", paymentCycleDays: "30" });
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not create batch");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (b: Batch) => {
    setEditingId(b._id);
    setEditForm({
      name: b.name,
      description: b.description || "",
      studentIds: students.filter((s) => s.batch === b._id).map((s) => s._id),
      teacherIds: teachers.filter((t) => t.batches?.includes(b._id)).map((t) => t._id),
      defaultFee: b.defaultFee !== undefined ? String(b.defaultFee) : "",
      paymentCycleDays: b.paymentCycleDays !== undefined ? String(b.paymentCycleDays) : "30",
    });
    setRowError("");
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    setRowError("");
    setSavingId(id);
    try {
      await Promise.all([
        api.updateBatch(id, {
          name: editForm.name,
          description: editForm.description,
          defaultFee: editForm.defaultFee === "" ? undefined : Number(editForm.defaultFee),
          paymentCycleDays: editForm.paymentCycleDays === "" ? undefined : Number(editForm.paymentCycleDays),
        }),
        api.updateBatchMembers(id, {
          studentIds: editForm.studentIds,
          teacherIds: editForm.teacherIds,
        }),
      ]);
      setEditingId(null);
      load();
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : "Could not save changes");
    } finally {
      setSavingId(null);
    }
  };

  const removeBatch = async (b: Batch) => {
    if (
      !window.confirm(
        `Delete "${b.name}"? Students and teachers assigned to it will be unassigned.`
      )
    )
      return;
    setRowError("");
    try {
      await api.deleteBatch(b._id);
      load();
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : "Could not delete batch");
    }
  };

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Batches</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Create batches and assign students and teachers here — students belong to one batch at a
        time, teachers can be in several.
      </p>

      <div className={styles.grid}>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Create a batch</h2>
            </div>
          </div>

          <form className={styles.form} onSubmit={handleCreate}>
            <label className={styles.label}>
              Name
              <input
                className={styles.input}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Morning Batch A"
                required
              />
            </label>

            <label className={styles.label}>
              Description
              <input
                className={styles.input}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="optional"
              />
            </label>

            <label className={styles.label}>
              Default fee (₹)
              <input
                className={styles.input}
                type="number"
                min={0}
                value={form.defaultFee}
                onChange={(e) => setForm({ ...form, defaultFee: e.target.value })}
                placeholder="0"
              />
              <span style={{ fontWeight: 400, textTransform: "none" }}>
                Applied to a student only if they don&apos;t already have a fee set from registration
              </span>
            </label>

            <label className={styles.label}>
              Payment cycle (days)
              <input
                className={styles.input}
                type="number"
                min={1}
                value={form.paymentCycleDays}
                onChange={(e) => setForm({ ...form, paymentCycleDays: e.target.value })}
                placeholder="30"
              />
            </label>

            {students.length > 0 && (
              <div className={styles.label} style={{ gridColumn: "1 / -1" }}>
                Students{" "}
                <span style={{ fontWeight: 400, textTransform: "none" }}>
                  (picking one here moves them off any other batch)
                </span>
                {groups.length > 0 && (
                  <select
                    className={styles.select}
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      setForm({ ...form, studentIds: addGroup(form.studentIds, e.target.value) });
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

            {teachers.length > 0 && (
              <div className={styles.label} style={{ gridColumn: "1 / -1" }}>
                Teachers
                <div className={styles.tabs}>
                  {teachers.map((t) => (
                    <button
                      key={t._id}
                      type="button"
                      className={form.teacherIds.includes(t._id) ? styles.tabActive : styles.tab}
                      onClick={() => setForm({ ...form, teacherIds: toggle(form.teacherIds, t._id) })}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.formActions}>
              <button className={styles.primaryButton} type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create batch"}
              </button>
              {formError && <p className={styles.messageError}>{formError}</p>}
            </div>
          </form>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>All batches</h2>
              <p className={styles.sectionSubtitle}>{total} total</p>
            </div>
          </div>

          {rowError && <p className={styles.messageError}>{rowError}</p>}

          {!loading && batches.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyStateIcon} aria-hidden="true">📚</span>
              <p className={styles.emptyStateText}>No batches yet — create one above.</p>
            </div>
          )}

          {batches.map((b) =>
            editingId === b._id ? (
              <div key={b._id} className={styles.section} style={{ marginBottom: 12 }}>
                <div className={styles.form}>
                  <label className={styles.label}>
                    Name
                    <input
                      className={styles.input}
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </label>
                  <label className={styles.label}>
                    Description
                    <input
                      className={styles.input}
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    />
                  </label>

                  <label className={styles.label}>
                    Default fee (₹)
                    <input
                      className={styles.input}
                      type="number"
                      min={0}
                      value={editForm.defaultFee}
                      onChange={(e) => setEditForm({ ...editForm, defaultFee: e.target.value })}
                      placeholder="0"
                    />
                    <span style={{ fontWeight: 400, textTransform: "none" }}>
                      Applied to a student only if they don&apos;t already have a fee set from registration
                    </span>
                  </label>

                  <label className={styles.label}>
                    Payment cycle (days)
                    <input
                      className={styles.input}
                      type="number"
                      min={1}
                      value={editForm.paymentCycleDays}
                      onChange={(e) => setEditForm({ ...editForm, paymentCycleDays: e.target.value })}
                      placeholder="30"
                    />
                  </label>

                  <div className={styles.label} style={{ gridColumn: "1 / -1" }}>
                    Students
                    {groups.length > 0 && (
                      <select
                        className={styles.select}
                        value=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          setEditForm({ ...editForm, studentIds: addGroup(editForm.studentIds, e.target.value) });
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

                  <div className={styles.label} style={{ gridColumn: "1 / -1" }}>
                    Teachers
                    <div className={styles.tabs}>
                      {teachers.map((t) => (
                        <button
                          key={t._id}
                          type="button"
                          className={
                            editForm.teacherIds.includes(t._id) ? styles.tabActive : styles.tab
                          }
                          onClick={() =>
                            setEditForm({ ...editForm, teacherIds: toggle(editForm.teacherIds, t._id) })
                          }
                        >
                          {t.name}
                        </button>
                      ))}
                      {teachers.length === 0 && <span className={styles.empty}>No teachers yet</span>}
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button
                      className={styles.primaryButton}
                      type="button"
                      disabled={savingId === b._id}
                      onClick={() => saveEdit(b._id)}
                    >
                      {savingId === b._id ? "Saving..." : "Save"}
                    </button>
                    <button className={styles.smallButton} type="button" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : null
          )}

          {batches.length > 0 && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Students</th>
                    <th>Teachers</th>
                    <th>Fee / Cycle</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {batches
                    .filter((b) => b._id !== editingId)
                    .map((b) => (
                      <tr key={b._id}>
                        <td>{b.name}</td>
                        <td>{b.description || "—"}</td>
                        <td>{b.studentCount ?? 0}</td>
                        <td>{b.teacherCount ?? 0}</td>
                        <td>
                          ₹{b.defaultFee ?? 0} / {b.paymentCycleDays ?? 30}d
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            <button className={styles.smallButton} onClick={() => startEdit(b)}>
                              Edit / Assign
                            </button>
                            <button className={styles.dangerButton} onClick={() => removeBatch(b)}>
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

          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </section>
      </div>
    </div>
  );
}
