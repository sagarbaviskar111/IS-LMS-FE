"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError, User, VideoFlow } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "../admin/admin.module.css";
import localStyles from "./SuperAdminDashboard.module.css";
import Pagination from "../Pagination";
import ListToolbar from "../admin/ListToolbar";
import { useDebounced } from "../admin/useDebounced";

export default function SuperAdminDashboard() {
  const [admins, setAdmins] = useState<User[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const q = useDebounced(search);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [allCount, setAllCount] = useState(0);

  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [formError, setFormError] = useState("");
  const [created, setCreated] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoadingList(true);
    try {
      const [res, activeRes, allRes] = await Promise.all([
        api.listUsers({
          role: "admin",
          page,
          limit,
          q,
          sort,
          active: statusFilter === "active" ? "1" : statusFilter === "disabled" ? "0" : undefined,
        }),
        api.listUsers({ role: "admin", status: "active", limit: 1 }),
        api.listUsers({ role: "admin", limit: 1 }),
      ]);
      setAdmins(res.users);
      setTotalPages(res.totalPages);
      setTotal(res.total);
      setAllCount(allRes.total);
      setActiveCount(activeRes.total);
    } finally {
      setLoadingList(false);
    }
  }, [page, limit, q, sort, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async (admin: User) => {
    await api.updateUser(admin._id, { isActive: !admin.isActive });
    load();
  };

  const changeFlow = async (admin: User, flow: VideoFlow) => {
    if (flow === (admin.videoFlow || "youtube")) return;
    await api.setAdminVideoFlow(admin._id, flow);
    load();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setCreated(null);
    setSubmitting(true);
    try {
      const res = await api.createUser({ ...form, role: "admin" });
      setCreated(res.user);
      setForm({ name: "", email: "", password: "", phone: "" });
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not create admin");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Super admin dashboard</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Create and manage the coaching class admins on the platform.
      </p>

      <div className={dashboardStyles.cardGrid} style={{ marginBottom: 20 }}>
        <div className={dashboardStyles.card}>
          <p className={dashboardStyles.cardLabel}>Total Admins</p>
          <p className={dashboardStyles.cardValue}>{allCount}</p>
        </div>
        <div className={dashboardStyles.card}>
          <p className={dashboardStyles.cardLabel}>Active Admins</p>
          <p className={dashboardStyles.cardValue}>{activeCount}</p>
        </div>
      </div>

      <div className={styles.grid}>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Create a coaching class admin</h2>
              <p className={styles.sectionSubtitle}>
                No email is sent yet — after creating, share the email and password with them
                yourself.
              </p>
            </div>
          </div>

          <form className={styles.form} onSubmit={handleCreate}>
            <label className={styles.label}>
              <span>
                Coaching class / admin name<span className={styles.required}>*</span>
              </span>
              <input
                className={styles.input}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoComplete="off"
                placeholder="e.g. Sunrise Classes"
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
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="off"
                inputMode="email"
                required
              />
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
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
                minLength={6}
                required
              />
              <span className={styles.hint}>At least 6 characters.</span>
            </label>

            <div className={`${styles.formActions} ${styles.fullRow}`}>
              <button className={styles.primaryButton} type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create admin"}
              </button>
              {formError && <p className={styles.messageError}>{formError}</p>}
            </div>
          </form>

          {created && (
            <div style={{ marginTop: 16 }}>
              <div className={styles.inviteRow} style={{ marginBottom: 6 }}>
                <span className={styles.badge}>Created</span>
                <span className={styles.linkBox}>{created.email} — share this login with them</span>
              </div>
              <p className={dashboardStyles.pageSubtitle} style={{ margin: "8px 0 4px" }}>
                Their per-role invite codes (visible on their own dashboard too):
              </p>
              <div className={styles.inviteRow}>
                <span className={styles.codeBox}>Student: {created.studentInviteCode}</span>
                <span className={styles.codeBox}>Teacher: {created.teacherInviteCode}</span>
                <span className={styles.codeBox}>Telecaller: {created.telecallerInviteCode}</span>
              </div>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Coaching class admins</h2>
              <p className={styles.sectionSubtitle}>All admins created on the platform.</p>
            </div>
          </div>

          <ListToolbar
            search={search}
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search by name, email or phone"
            total={total}
            filters={[
              {
                key: "status",
                label: "Status",
                value: statusFilter,
                options: [
                  { value: "all", label: "All" },
                  { value: "active", label: "Active" },
                  { value: "disabled", label: "Disabled" },
                ],
                onChange: (v) => {
                  setStatusFilter(v);
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
                { value: "email_asc", label: "Email A–Z" },
              ],
              onChange: (v) => {
                setSort(v);
                setPage(1);
              },
            }}
            onClear={() => {
              setSearch("");
              setStatusFilter("all");
              setSort("newest");
              setPage(1);
            }}
          />

          {loadingList && admins.length === 0 && (
            <div className={localStyles.loadingState}>
              <span className={localStyles.spinner} aria-hidden="true" />
              Loading admins…
            </div>
          )}

          {!loadingList && admins.length === 0 && (
            <div className={localStyles.emptyState}>
              <span className={localStyles.emptyIcon} aria-hidden="true">
                🏫
              </span>
              <p className={localStyles.emptyTitle}>
                {q || statusFilter !== "all" ? "No admins match your search" : "No admins created yet"}
              </p>
            </div>
          )}

          {admins.length > 0 && (
            <div className={`${styles.tableWrap} table-scroll`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Invite codes (student / teacher / telecaller)</th>
                    <th>Recording flow</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((a) => (
                    <tr key={a._id} className={localStyles.row}>
                      <td style={{ overflowWrap: "anywhere" }}>{a.name}</td>
                      <td style={{ overflowWrap: "anywhere" }}>{a.email}</td>
                      <td style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: "0.8rem" }}>
                        {a.studentInviteCode} / {a.teacherInviteCode} / {a.telecallerInviteCode}
                      </td>
                      <td>
                        <select
                          className={styles.select}
                          aria-label={`Recording flow for ${a.name}`}
                          value={a.videoFlow || "youtube"}
                          onChange={(e) => changeFlow(a, e.target.value as VideoFlow)}
                          title="Where this institute's session recordings are stored"
                        >
                          <option value="youtube">YouTube (their channel)</option>
                          <option value="storage">Own storage (AWS S3 / Cloudflare R2)</option>
                        </select>
                      </td>
                      <td>
                        <span className={a.isActive ? localStyles.badgeActive : styles.badgeInactive}>
                          {a.isActive ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td>
                        <button className={styles.smallButton} onClick={() => toggleActive(a)}>
                          {a.isActive ? "Disable" : "Enable"}
                        </button>
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
