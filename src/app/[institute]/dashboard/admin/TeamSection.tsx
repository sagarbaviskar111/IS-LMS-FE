"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError, Batch, Course, User } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "./admin.module.css";
import Pagination from "../Pagination";
import StudentPaymentModal from "./StudentPaymentModal";
import StudentAccessModal from "./StudentAccessModal";
import ResetPasswordModal from "./ResetPasswordModal";
import BulkUploadModal from "./BulkUploadModal";
import RegisterStudentModal from "./RegisterStudentModal";
import StudentDetailsModal from "./StudentDetailsModal";
import ListToolbar from "./ListToolbar";
import RowMenu, { MenuItem } from "./RowMenu";
import { useDebounced } from "./useDebounced";
import { can } from "@/lib/permissions";



type TeamRole = "student" | "teacher" | "telecaller";

const INVITE_FIELDS: Record<TeamRole, keyof User> = {
  student: "studentInviteCode",
  teacher: "teacherInviteCode",
  telecaller: "telecallerInviteCode",
};

export default function TeamSection({ role, label }: { role: TeamRole; label: string }) {
  const { user } = useAuth();
  const { institute } = useParams<{ institute: string }>();
  const singular = label.slice(0, -1);
  const usesBatches = role === "student" || role === "teacher";
  // A sub-admin with view-only access sees the list but not the change buttons.
  const canChange = can(user, role === "student" ? "students" : "team", "manage");
  const canSeeFees = can(user, "fees");

  const [team, setTeam] = useState<User[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  // search / filters / sorting
  const [search, setSearch] = useState("");
  const q = useDebounced(search, 300);
  const [stateF, setStateF] = useState("all");
  const [courseF, setCourseF] = useState("all");
  const [batchF, setBatchF] = useState("all");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "" });
  const [rowError, setRowError] = useState("");
  const [paymentStudent, setPaymentStudent] = useState<User | null>(null);
  const [accessStudent, setAccessStudent] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [detailsStudent, setDetailsStudent] = useState<User | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const code = (user?.[INVITE_FIELDS[role]] as string | undefined) || "—";
  const link = origin && code !== "—" ? `${origin}/${institute}/signup?code=${code}` : "";

  const batchName = (id: string) => batches.find((b) => b._id === id)?.name || "Unknown batch";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [teamRes, batchesRes, coursesRes] = await Promise.all([
        api.listUsers({
          role,
          status: "team",
          page,
          limit,
          q,
          sort,
          active: stateF === "active" ? "1" : stateF === "inactive" ? "0" : undefined,
          registration: stateF === "pending" ? "pending" : undefined,
          archived: stateF === "archived" || undefined,
          course: courseF !== "all" ? courseF : undefined,
          batch: batchF !== "all" ? batchF : undefined,
        }),
        // Full batch list for name lookups below — not the browsable page.
        usesBatches ? api.listBatches({ limit: 500 }) : Promise.resolve({ batches: [] as Batch[] }),
        role === "student" ? api.listCourses({ limit: 500 }) : Promise.resolve({ courses: [] as Course[] }),
      ]);
      setTeam(teamRes.users);
      setTotalPages(teamRes.totalPages);
      setTotal(teamRes.total);
      setBatches(batchesRes.batches);
      setCourses(coursesRes.courses);
    } finally {
      setLoading(false);
    }
  }, [role, usesBatches, page, limit, q, sort, stateF, courseF, batchF]);

  useEffect(() => {
    load();
  }, [load]);

  // Changing any filter goes back to the first page.
  const onFilter = (set: (v: string) => void) => (v: string) => {
    set(v);
    setPage(1);
  };
  const filtering = !!q.trim() || stateF !== "all" || courseF !== "all" || batchF !== "all";
  const clearFilters = () => {
    setSearch("");
    setStateF("all");
    setCourseF("all");
    setBatchF("all");
    setSort("newest");
    setPage(1);
  };
  const courseName = (u: User) => (u.course && typeof u.course === "object" ? u.course.name : "—");

  const statusOptions = [
    { value: "all", label: "All statuses" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    ...(role === "student"
      ? [
          { value: "pending", label: "Registration pending" },
          { value: "archived", label: "Archived" },
        ]
      : []),
  ];

  const menuFor = (u: User): MenuItem[] => {
    if (u.archivedAt) return [{ label: "Restore student", onClick: () => restoreMember(u) }];
    const incomplete = role === "student" && u.registrationComplete === false;
    return [
      { label: "Edit name / phone", onClick: () => startEdit(u), hidden: role === "student" ? !canChange : true },
      { label: "Payments", onClick: () => setPaymentStudent(u), hidden: role !== "student" || !canSeeFees },
      { label: "Access & recordings", onClick: () => setAccessStudent(u), hidden: role !== "student" || !canChange },
      { label: "Reset password", onClick: () => setResetPasswordUser(u), hidden: !canChange },
      { label: u.isActive ? "Deactivate" : "Activate", onClick: () => toggleActive(u), hidden: incomplete || !canChange },
      { label: role === "student" ? "Archive" : "Delete", onClick: () => removeMember(u), danger: true, hidden: !canChange },
    ];
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setSubmitting(true);
    try {
      await api.createUser({ ...form, role });
      setFormSuccess(
        usesBatches
          ? `${singular} account created and active. Assign a batch from the Batches section.`
          : `${singular} account created and active.`
      );
      setForm({ name: "", email: "", password: "", phone: "" });
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not create account");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (u: User) => {
    setRowError("");
    try {
      await api.updateUser(u._id, { isActive: !u.isActive });
      load();
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : "Could not update account");
    }
  };

  const startEdit = (u: User) => {
    setEditingId(u._id);
    setEditForm({ name: u.name, phone: u.phone || "" });
    setRowError("");
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    setRowError("");
    try {
      await api.updateUser(id, { name: editForm.name, phone: editForm.phone });
      setEditingId(null);
      load();
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : "Could not save changes");
    }
  };

  const restoreMember = async (u: User) => {
    setRowError("");
    try {
      await api.restoreUser(u._id);
      load();
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : "Could not restore student");
    }
  };

  const removeMember = async (u: User) => {
    const msg =
      role === "student"
        ? `Archive ${u.name}? They are hidden and can no longer log in, but their attendance, submissions and notifications are kept. You can restore them from the Archived filter.`
        : `Delete ${u.name}? This cannot be undone.`;
    if (!window.confirm(msg)) return;
    setRowError("");
    try {
      await api.deleteUser(u._id);
      load();
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : role === "student" ? "Could not archive student" : "Could not delete account");
    }
  };

  return (
    <div>
      {paymentStudent && (
        <StudentPaymentModal
          student={paymentStudent}
          onClose={() => setPaymentStudent(null)}
          onChanged={load}
        />
      )}
      {accessStudent && (
        <StudentAccessModal
          student={accessStudent}
          onClose={() => setAccessStudent(null)}
          onChanged={load}
        />
      )}
      {resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          onChanged={load}
        />
      )}
      {registerOpen && (
        <RegisterStudentModal
          onClose={() => setRegisterOpen(false)}
          onRegistered={(student) => {
            setRegisterOpen(false);
            load();
            setDetailsStudent(student); // straight on to making their registration link
          }}
        />
      )}
      {detailsStudent && (
        <StudentDetailsModal student={detailsStudent} onClose={() => setDetailsStudent(null)} onChanged={load} />
      )}
      {bulkUploadOpen && (
        <BulkUploadModal
          role={role}
          label={label}
          onClose={() => setBulkUploadOpen(false)}
          onChanged={load}
        />
      )}
      <h1 className={dashboardStyles.pageTitle}>{label}</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Manage {label.toLowerCase()} in your coaching class.
        {usesBatches && " Batch assignment happens in the Batches section."}
      </p>

      <div className={styles.grid}>
        {role !== "student" && canChange && (
          <>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>{singular} invite link</h2>
              <p className={styles.sectionSubtitle}>
                Anyone who signs up with this link is locked into the {singular.toLowerCase()} role.
              </p>
            </div>
          </div>
          <div className={styles.inviteRow}>
            <span className={styles.codeBox}>{code}</span>
            <span className={styles.linkBox}>{link}</span>
            <button className={styles.primaryButton} type="button" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Add a {singular.toLowerCase()}</h2>
              <p className={styles.sectionSubtitle}>Created here, they&apos;re active immediately.</p>
            </div>
            <button className={styles.smallButton} type="button" onClick={() => setBulkUploadOpen(true)}>
              Bulk upload
            </button>
          </div>

          <form className={styles.form} onSubmit={handleCreate}>
            <label className={styles.label}>
              <span>
                Full name<span className={styles.required}>*</span>
              </span>
              <input
                className={styles.input}
                value={form.name}
                autoComplete="off"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>

            <label className={styles.label}>
              <span>
                Email<span className={styles.required}>*</span>
              </span>
              <input
                className={styles.input}
                type="email"
                autoComplete="off"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <span className={styles.hint}>They log in with this email.</span>
            </label>

            <label className={styles.label}>
              Phone
              <input
                className={styles.input}
                type="tel"
                inputMode="tel"
                autoComplete="off"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>

            <label className={styles.label}>
              <span>
                Password<span className={styles.required}>*</span>
              </span>
              <input
                className={styles.input}
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={6}
                required
              />
              <span className={styles.hint}>At least 6 characters.</span>
            </label>

            <div className={`${styles.formActions} ${styles.fullRow}`}>
              <button className={styles.primaryButton} type="submit" disabled={submitting}>
                {submitting ? "Creating…" : `Create ${singular.toLowerCase()}`}
              </button>
              {formError && <p className={styles.messageError} role="alert">{formError}</p>}
              {formSuccess && <p className={styles.messageSuccess} role="status">{formSuccess}</p>}
            </div>
          </form>
        </section>

          </>
        )}

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>All {label.toLowerCase()}</h2>
              <p className={styles.sectionSubtitle}>
                {stateF === "archived" ? `${total} archived. Restore a student from the row menu.` : `${total} total, active and deactivated.`}
              </p>
            </div>
            {role === "student" && canChange && (
              <div className={styles.rowActions}>
                <button className={styles.smallButton} type="button" onClick={() => setBulkUploadOpen(true)}>
                  Bulk upload
                </button>
                <button className={styles.primaryButton} type="button" onClick={() => setRegisterOpen(true)}>
                  + Register student
                </button>
              </div>
            )}
          </div>

          <ListToolbar
            search={search}
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder={`Search ${label.toLowerCase()} by name, email or phone...`}
            filters={[
              { key: "state", label: "Status", value: stateF, options: statusOptions, onChange: onFilter(setStateF) },
              ...(role === "student"
                ? [
                    {
                      key: "course",
                      label: "Course",
                      value: courseF,
                      options: [{ value: "all", label: "All courses" }, ...courses.map((c) => ({ value: c._id, label: c.name }))],
                      onChange: onFilter(setCourseF),
                    },
                  ]
                : []),
              ...(usesBatches
                ? [
                    {
                      key: "batch",
                      label: "Batch",
                      value: batchF,
                      options: [
                        { value: "all", label: "All batches" },
                        { value: "none", label: "Unassigned" },
                        ...batches.map((b) => ({ value: b._id, label: b.name })),
                      ],
                      onChange: onFilter(setBatchF),
                    },
                  ]
                : []),
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
                { value: "email_asc", label: "Email A–Z" },
              ],
              onChange: onFilter(setSort),
            }}
            onClear={clearFilters}
            total={total}
          />

          {rowError && <p className={styles.messageError} role="alert">{rowError}</p>}
          {loading && team.length === 0 && <p className={styles.sectionSubtitle}>Loading…</p>}

          {!loading && team.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyStateIcon} aria-hidden="true">👤</span>
              <p className={styles.emptyStateText}>
                {filtering
                  ? "No results match your search or filters."
                  : role === "student"
                  ? "No students yet — use Register student to add the first one."
                  : `No ${label.toLowerCase()} yet — add one using the form above, or share the invite link.`}
              </p>
            </div>
          )}

          {team.length > 0 && (
            <div className={`${styles.tableWrap} table-scroll`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    {role === "student" ? (
                      <th>Course</th>
                    ) : (
                      <>
                        <th>Phone</th>
                        {role === "teacher" && <th>Batches</th>}
                      </>
                    )}
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {team.map((u) => {
                    const statusCell = (
                      <td>
                        <span className={u.isActive ? styles.badgeSuccess : styles.badgeInactive}>
                          {u.archivedAt ? "Archived" : u.isActive ? "Active" : "Inactive"}
                        </span>
                        {role === "student" && u.registrationComplete === false && (
                          <span className={styles.badgePending} style={{ marginLeft: 6 }}>
                            Registration pending
                          </span>
                        )}
                        {role === "student" && u.deactivatedForPayment && (
                          <span className={styles.badgePending} style={{ marginLeft: 6 }}>
                            Payment due
                          </span>
                        )}
                        {role === "student" && u.recordingBlockFrom && (
                          <span className={styles.badgePending} style={{ marginLeft: 6 }}>
                            Recordings blocked
                          </span>
                        )}
                      </td>
                    );
                    const batchesCell =
                      u.batches && u.batches.length > 0 ? u.batches.map(batchName).join(", ") : "Unassigned";

                    if (editingId === u._id) {
                      return (
                        <tr key={u._id}>
                          <td>
                            <input
                              className={styles.input}
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              aria-label="Name"
                            />
                            {role === "student" && (
                              <input
                                className={styles.input}
                                style={{ marginTop: 6 }}
                                value={editForm.phone}
                                placeholder="Phone"
                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                aria-label="Phone"
                              />
                            )}
                          </td>
                          <td style={{ overflowWrap: "anywhere" }}>{u.email}</td>
                          {role === "student" ? (
                            <td>{courseName(u)}</td>
                          ) : (
                            <>
                              <td>
                                <input
                                  className={styles.input}
                                  value={editForm.phone}
                                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                  aria-label="Phone"
                                />
                              </td>
                              {role === "teacher" && <td>{batchesCell}</td>}
                            </>
                          )}
                          {statusCell}
                          <td>
                            <div className={styles.rowActions} style={{ flexWrap: "nowrap" }}>
                              <button className={styles.primaryButton} onClick={() => saveEdit(u._id)}>
                                Save
                              </button>
                              <button className={styles.smallButton} onClick={cancelEdit}>
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={u._id}>
                        <td>
                          <strong style={{ overflowWrap: "anywhere" }}>{u.name}</strong>
                        </td>
                        <td style={{ overflowWrap: "anywhere" }}>{u.email}</td>
                        {role === "student" ? (
                          <td>{courseName(u)}</td>
                        ) : (
                          <>
                            <td>{u.phone || "—"}</td>
                            {role === "teacher" && <td>{batchesCell}</td>}
                          </>
                        )}
                        {statusCell}
                        <td>
                          <div className={styles.rowActions} style={{ flexWrap: "nowrap", alignItems: "center" }}>
                            {role === "student" ? (
                              <button className={styles.primaryButton} onClick={() => setDetailsStudent(u)}>
                                Details
                              </button>
                            ) : (
                              <button className={styles.smallButton} onClick={() => startEdit(u)}>
                                Edit
                              </button>
                            )}
                            <RowMenu items={menuFor(u)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
