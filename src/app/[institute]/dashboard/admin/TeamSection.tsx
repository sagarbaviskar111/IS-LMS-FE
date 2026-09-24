"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError, Batch, User } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "./admin.module.css";
import Pagination from "../Pagination";
import StudentPaymentModal from "./StudentPaymentModal";
import StudentAccessModal from "./StudentAccessModal";
import ResetPasswordModal from "./ResetPasswordModal";

const PAGE_SIZE = 10;

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

  const [team, setTeam] = useState<User[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [page, setPage] = useState(1);
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

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const code = (user?.[INVITE_FIELDS[role]] as string | undefined) || "—";
  const link = origin && code !== "—" ? `${origin}/${institute}/signup?code=${code}` : "";

  const batchName = (id: string) => batches.find((b) => b._id === id)?.name || "Unknown batch";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [teamRes, batchesRes] = await Promise.all([
        api.listUsers({ role, status: "team", page, limit: PAGE_SIZE }),
        // Full batch list for name lookups below — not the browsable page.
        usesBatches ? api.listBatches({ limit: 500 }) : Promise.resolve({ batches: [] as Batch[] }),
      ]);
      setTeam(teamRes.users);
      setTotalPages(teamRes.totalPages);
      setTotal(teamRes.total);
      setBatches(batchesRes.batches);
    } finally {
      setLoading(false);
    }
  }, [role, usesBatches, page]);

  useEffect(() => {
    load();
  }, [load]);

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

  const removeMember = async (u: User) => {
    if (!window.confirm(`Delete ${u.name}? This cannot be undone.`)) return;
    setRowError("");
    try {
      await api.deleteUser(u._id);
      load();
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : "Could not delete account");
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
      <h1 className={dashboardStyles.pageTitle}>{label}</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Manage {label.toLowerCase()} in your coaching class.
        {usesBatches && " Batch assignment happens in the Batches section."}
      </p>

      <div className={styles.grid}>
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
          </div>

          <form className={styles.form} onSubmit={handleCreate}>
            <label className={styles.label}>
              Full name
              <input
                className={styles.input}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>

            <label className={styles.label}>
              Email
              <input
                className={styles.input}
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </label>

            <label className={styles.label}>
              Phone
              <input
                className={styles.input}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>

            <label className={styles.label}>
              Password
              <input
                className={styles.input}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={6}
                required
              />
            </label>

            <div className={styles.formActions}>
              <button className={styles.primaryButton} type="submit" disabled={submitting}>
                {submitting ? "Creating..." : `Create ${singular.toLowerCase()}`}
              </button>
              {formError && <p className={styles.messageError}>{formError}</p>}
              {formSuccess && <p className={styles.messageSuccess}>{formSuccess}</p>}
            </div>
          </form>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>All {label.toLowerCase()}</h2>
              <p className={styles.sectionSubtitle}>{total} total, active and deactivated.</p>
            </div>
          </div>

          {rowError && <p className={styles.messageError}>{rowError}</p>}

          {!loading && team.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyStateIcon} aria-hidden="true">👤</span>
              <p className={styles.emptyStateText}>
                No {label.toLowerCase()} yet — add one using the form above, or share the invite
                link.
              </p>
            </div>
          )}

          {team.length > 0 && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    {usesBatches && <th>{role === "student" ? "Batch" : "Batches"}</th>}
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {team.map((u) =>
                    editingId === u._id ? (
                      <tr key={u._id}>
                        <td>
                          <input
                            className={styles.input}
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          />
                        </td>
                        <td>{u.email}</td>
                        <td>
                          <input
                            className={styles.input}
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          />
                        </td>
                        {usesBatches && (
                          <td>
                            {role === "student"
                              ? u.batch
                                ? batchName(u.batch)
                                : "Unassigned"
                              : u.batches && u.batches.length > 0
                              ? u.batches.map(batchName).join(", ")
                              : "Unassigned"}
                          </td>
                        )}
                        <td>
                          <span className={u.isActive ? styles.badgeSuccess : styles.badgeInactive}>
                            {u.isActive ? "Active" : "Inactive"}
                          </span>
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
                        <td>
                          <div className={styles.rowActions}>
                            <button className={styles.primaryButton} onClick={() => saveEdit(u._id)}>
                              Save
                            </button>
                            <button className={styles.smallButton} onClick={cancelEdit}>
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={u._id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.phone || "—"}</td>
                        {usesBatches && (
                          <td>
                            {role === "student"
                              ? u.batch
                                ? batchName(u.batch)
                                : "Unassigned"
                              : u.batches && u.batches.length > 0
                              ? u.batches.map(batchName).join(", ")
                              : "Unassigned"}
                          </td>
                        )}
                        <td>
                          <span className={u.isActive ? styles.badgeSuccess : styles.badgeInactive}>
                            {u.isActive ? "Active" : "Inactive"}
                          </span>
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
                        <td>
                          <div className={styles.rowActions}>
                            <button className={styles.smallButton} onClick={() => startEdit(u)}>
                              Edit
                            </button>
                            {role === "student" && (
                              <button className={styles.smallButton} onClick={() => setPaymentStudent(u)}>
                                Payments
                              </button>
                            )}
                            {role === "student" && (
                              <button className={styles.smallButton} onClick={() => setAccessStudent(u)}>
                                Access
                              </button>
                            )}
                            <button className={styles.smallButton} onClick={() => setResetPasswordUser(u)}>
                              Reset Password
                            </button>
                            <button className={styles.smallButton} onClick={() => toggleActive(u)}>
                              {u.isActive ? "Deactivate" : "Activate"}
                            </button>
                            <button className={styles.dangerButton} onClick={() => removeMember(u)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
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
