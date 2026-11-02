"use client";

import { useCallback, useEffect, useState } from "react";
import {
  api,
  ApiError,
  Subadmin,
  SubadminActivityRow,
  SubadminModule,
  SubadminPreset,
} from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "./admin.module.css";
import subStyles from "./AdminSubadmins.module.css";
import ListToolbar from "./ListToolbar";
import Modal from "../Modal";
import Pagination from "../Pagination";

type Perms = Subadmin["permissions"];
type Form = { name: string; email: string; phone: string; password: string; permissions: Perms };

const EMPTY: Form = { name: "", email: "", phone: "", password: "", permissions: {} };

const VERB: Record<string, string> = { POST: "Added / ran", PATCH: "Changed", PUT: "Changed", DELETE: "Removed" };

function summarize(perms: Perms, modules: SubadminModule[]): string {
  const parts = modules.filter((m) => perms[m.key]).map((m) => `${m.label} (${perms[m.key] === "manage" ? "change" : "view"})`);
  return parts.length ? parts.join(", ") : "No access";
}

function PermissionPicker({
  modules,
  presets,
  value,
  onChange,
}: {
  modules: SubadminModule[];
  presets: SubadminPreset[];
  value: Perms;
  onChange: (next: Perms) => void;
}) {
  const set = (key: string, level: string) => {
    const next = { ...value };
    if (level === "") delete next[key];
    else next[key] = level as "view" | "manage";
    onChange(next);
  };
  const granted = Object.keys(value).length;
  return (
    <div>
      <p className={adminStyles.hint} style={{ marginBottom: 8 }}>
        Start from a ready-made set, then adjust any area below.
      </p>
      <div className={subStyles.presets} style={{ marginBottom: 14 }}>
        {presets.map((p) => (
          <button key={p.key} type="button" className={adminStyles.smallButton} onClick={() => onChange({ ...p.permissions })}>
            {p.label}
          </button>
        ))}
        <button type="button" className={adminStyles.smallButton} onClick={() => onChange({})}>
          Clear all
        </button>
      </div>
      <div className={subStyles.matrix}>
        <div className={subStyles.matrixHead}>
          <span>Area</span>
          <span>Access</span>
        </div>
        {modules.map((m) => {
          const cur = value[m.key] || "";
          const opts: [string, string, string?][] = [
            ["", "No access", subStyles.none],
            ["view", "View"],
            ["manage", "View & change"],
          ];
          return (
            <div key={m.key} className={subStyles.matrixRow} role="radiogroup" aria-labelledby={`perm-${m.key}`}>
              <div>
                <span id={`perm-${m.key}`} className={subStyles.areaName}>
                  {m.label}
                </span>
                <span className={subStyles.areaHint}>{m.hint}</span>
              </div>
              <div className={subStyles.segment}>
                {opts.map(([v, text, cls]) => (
                  <label key={v || "none"}>
                    <input type="radio" name={`perm-${m.key}`} checked={cur === v} onChange={() => set(m.key, v)} />
                    <span className={cls}>{text}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className={adminStyles.hint} style={{ marginTop: 8 }}>
        {granted} of {modules.length} areas enabled. Settings, online payment keys, sender email, fee rules and sub-admins always stay with you.
      </p>
    </div>
  );
}

export default function AdminSubadmins() {
  const [people, setPeople] = useState<Subadmin[]>([]);
  const [modules, setModules] = useState<SubadminModule[]>([]);
  const [presets, setPresets] = useState<SubadminPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState<Subadmin | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [activity, setActivity] = useState<SubadminActivityRow[]>([]);
  const [actPage, setActPage] = useState(1);
  const [actPages, setActPages] = useState(1);
  const [actTotal, setActTotal] = useState(0);
  const [actWho, setActWho] = useState("");

  const load = useCallback(async () => {
    try {
      const [meta, list] = await Promise.all([api.subadminModules(), api.listSubadmins()]);
      setModules(meta.modules);
      setPresets(meta.presets);
      setPeople(list.subadmins);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load sub-admins");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api
      .subadminActivity({ page: actPage, subadmin: actWho || undefined })
      .then((res) => {
        setActivity(res.activity);
        setActPages(res.totalPages);
        setActTotal(res.total);
      })
      .catch(() => {});
  }, [actPage, actWho, people.length]);

  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const shown = people
    .filter((p) => {
      const t = q.trim().toLowerCase();
      if (t && !`${p.name} ${p.email} ${p.phone || ""}`.toLowerCase().includes(t)) return false;
      if (statusF === "active") return p.isActive;
      if (statusF === "blocked") return !p.isActive;
      return true;
    })
    .sort((a, b) =>
      sortBy === "access"
        ? Object.keys(b.permissions).length - Object.keys(a.permissions).length
        : a.name.localeCompare(b.name)
    );

  const openNew = () => {
    setForm(EMPTY);
    setFormError("");
    setEditing("new");
  };

  const openEdit = (p: Subadmin) => {
    setForm({ name: p.name, email: p.email, phone: p.phone, password: "", permissions: { ...p.permissions } });
    setFormError("");
    setEditing(p);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (Object.keys(form.permissions).length === 0) {
      setFormError("Choose at least one area this sub-admin can use.");
      return;
    }
    setSaving(true);
    try {
      if (editing === "new") {
        await api.createSubadmin({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
          permissions: form.permissions,
        });
      } else if (editing) {
        await api.updateSubadmin(editing._id, {
          name: form.name,
          phone: form.phone,
          permissions: form.permissions,
          ...(form.password ? { password: form.password } : {}),
        });
      }
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: Subadmin) => {
    setError("");
    try {
      await api.updateSubadmin(p._id, { isActive: !p.isActive });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update");
    }
  };

  const remove = async (p: Subadmin) => {
    if (!window.confirm(`Remove ${p.name}? They can no longer log in. What they already changed stays as it is.`)) return;
    setError("");
    try {
      await api.deleteSubadmin(p._id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove");
    }
  };

  const moduleLabel = (key: string | null) => modules.find((m) => m.key === key)?.label || key || "—";

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Sub-admins</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Give a trusted helper their own login and choose exactly what they can see and change. Everything they change is
        recorded below.
      </p>

      {error && <p className={adminStyles.messageError}>{error}</p>}

      <section className={adminStyles.section}>
        <div className={adminStyles.sectionHead}>
          <div>
            <h2 className={adminStyles.sectionTitle}>Your sub-admins</h2>
            <p className={adminStyles.sectionSubtitle}>They log in on the normal login page with the email and password you set.</p>
          </div>
          <button className={adminStyles.primaryButton} type="button" onClick={openNew}>
            + Add sub-admin
          </button>
        </div>

        {loading && <p className={adminStyles.sectionSubtitle}>Loading…</p>}
        {!loading && people.length === 0 && (
          <div className={adminStyles.emptyState}>
            <span className={adminStyles.emptyStateIcon} aria-hidden="true">🤝</span>
            <p className={adminStyles.emptyStateText}>No sub-admins yet. Add one to share the work.</p>
          </div>
        )}

        {people.length > 1 && (
          <ListToolbar
            search={q}
            onSearch={setQ}
            placeholder="Search name, email or phone"
            filters={[
              {
                key: "status",
                label: "Status",
                value: statusF,
                onChange: setStatusF,
                options: [
                  { value: "all", label: "All" },
                  { value: "active", label: "Active" },
                  { value: "blocked", label: "Blocked" },
                ],
              },
            ]}
            sort={{
              key: "sort",
              label: "Sort by",
              value: sortBy,
              onChange: setSortBy,
              options: [
                { value: "name", label: "Name (A-Z)" },
                { value: "access", label: "Most access" },
              ],
            }}
            onClear={() => {
              setQ("");
              setStatusF("all");
              setSortBy("name");
            }}
            total={shown.length}
          />
        )}
        {people.length > 0 && shown.length === 0 && (
          <p className={adminStyles.sectionSubtitle}>No sub-admins match your search.</p>
        )}

        {shown.length > 0 && (
          <div className={`${adminStyles.tableWrap} table-scroll`}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Can use</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <strong>{p.name}</strong>
                      <br />
                      <span className={adminStyles.sectionSubtitle}>{p.email}</span>
                    </td>
                    <td className={subStyles.cellWrap}>{summarize(p.permissions, modules)}</td>
                    <td>
                      <span className={p.isActive ? adminStyles.badgeSuccess : adminStyles.badgeInactive}>
                        {p.isActive ? "Active" : "Blocked"}
                      </span>
                    </td>
                    <td>
                      <div className={adminStyles.rowActions} style={{ flexWrap: "wrap" }}>
                        <button className={adminStyles.primaryButton} type="button" onClick={() => openEdit(p)}>
                          Edit access
                        </button>
                        <button className={adminStyles.smallButton} type="button" onClick={() => toggleActive(p)}>
                          {p.isActive ? "Block" : "Unblock"}
                        </button>
                        <button className={adminStyles.smallButton} type="button" onClick={() => remove(p)}>
                          Remove
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

      <section className={adminStyles.section}>
        <div className={adminStyles.sectionHead}>
          <div>
            <h2 className={adminStyles.sectionTitle}>What they changed</h2>
            <p className={adminStyles.sectionSubtitle}>Every add, edit and delete by a sub-admin, kept for 90 days. {actTotal} entries.</p>
          </div>
          {people.length > 1 && (
            <select
              className={adminStyles.select}
              value={actWho}
              onChange={(e) => {
                setActWho(e.target.value);
                setActPage(1);
              }}
              aria-label="Show activity of"
            >
              <option value="">Everyone</option>
              {people.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
        {activity.length === 0 ? (
          <p className={adminStyles.sectionSubtitle}>Nothing yet.</p>
        ) : (
          <div className={`${adminStyles.tableWrap} table-scroll`}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>Area</th>
                  <th>What</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((a) => (
                  <tr key={a._id}>
                    <td>{new Date(a.at).toLocaleString()}</td>
                    <td>{a.who}</td>
                    <td>{a.module === "people" ? "Students / team" : moduleLabel(a.module)}</td>
                    <td>
                      {VERB[a.method] || a.method} · <code>{a.path.replace(/^\/api\//, "")}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={actPage} totalPages={actPages} total={actTotal} onPageChange={setActPage} />
      </section>

      {editing && (
        <Modal onClose={() => setEditing(null)}>
          <div className={dashboardStyles.modalHead}>
            <h2 className={adminStyles.sectionTitle}>{editing === "new" ? "Add a sub-admin" : `Access for ${editing.name}`}</h2>
            <button className={dashboardStyles.modalCloseButton} type="button" onClick={() => setEditing(null)} aria-label="Close">
              ✕
            </button>
          </div>
          <form className={adminStyles.form} onSubmit={save}>
            <fieldset className={adminStyles.formSection}>
              <legend className={adminStyles.formSectionTitle}>Login details</legend>
              <label className={adminStyles.label}>
                <span>
                  Full name<span className={adminStyles.required}>*</span>
                </span>
                <input
                  className={adminStyles.input}
                  value={form.name}
                  autoComplete="off"
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </label>
              <label className={adminStyles.label}>
                <span>
                  Email<span className={adminStyles.required}>*</span>
                </span>
                <input
                  className={adminStyles.input}
                  type="email"
                  autoComplete="off"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={editing !== "new"}
                  required
                />
                <span className={adminStyles.hint}>
                  {editing === "new" ? "They log in with this email." : "The login email cannot be changed."}
                </span>
              </label>
              <label className={adminStyles.label}>
                Phone
                <input
                  className={adminStyles.input}
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>
              <label className={adminStyles.label}>
                <span>
                  {editing === "new" ? "Password" : "New password"}
                  {editing === "new" && <span className={adminStyles.required}>*</span>}
                </span>
                <input
                  className={adminStyles.input}
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={editing === "new"}
                />
                <span className={adminStyles.hint}>
                  {editing === "new" ? "At least 6 characters." : "Leave empty to keep the current password."}
                </span>
              </label>
            </fieldset>

            <fieldset className={adminStyles.formSection} style={{ gridTemplateColumns: "1fr" }}>
              <legend className={adminStyles.formSectionTitle}>What they can do</legend>
              <PermissionPicker
                modules={modules}
                presets={presets}
                value={form.permissions}
                onChange={(permissions) => setForm({ ...form, permissions })}
              />
            </fieldset>

            <div className={adminStyles.modalFooter}>
              {formError && (
                <p className={adminStyles.messageError} role="alert" style={{ margin: 0, marginRight: "auto" }}>
                  {formError}
                </p>
              )}
              <button className={adminStyles.smallButton} type="button" onClick={() => setEditing(null)} disabled={saving}>
                Cancel
              </button>
              <button className={adminStyles.primaryButton} type="submit" disabled={saving}>
                {saving ? "Saving…" : editing === "new" ? "Create sub-admin" : "Save changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
