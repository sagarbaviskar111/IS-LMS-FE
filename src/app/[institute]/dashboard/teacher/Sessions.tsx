"use client";

import { useEffect, useState, useCallback } from "react";
import { useTeacherBatch } from "@/context/TeacherBatchContext";
import { api, ApiError, Session } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import styles from "./teacher.module.css";
import TodaySessions, { todayFirst } from "../TodaySessions";
import BatchSwitcher from "./BatchSwitcher";
import AttendancePanel from "./AttendancePanel";
import Pagination from "../Pagination";
import ListToolbar from "../admin/ListToolbar";
import Modal from "../Modal";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function weekdayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short" });
}

function dayMonthLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function Sessions() {
  const { activeBatchId, activeBatch } = useTeacherBatch();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const [singleForm, setSingleForm] = useState({
    date: todayStr(),
    topic: "",
    startTime: "09:00",
    endTime: "10:00",
    notes: "",
    meetingLink: "",
  });
  const [singleError, setSingleError] = useState("");
  const [singleSubmitting, setSingleSubmitting] = useState(false);

  const [bulkForm, setBulkForm] = useState({
    weekStart: todayStr(),
    topic: "",
    startTime: "09:00",
    endTime: "10:00",
    notes: "",
    meetingLink: "",
  });
  const [selectedOffsets, setSelectedOffsets] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [bulkError, setBulkError] = useState("");
  const [bulkSuccess, setBulkSuccess] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    topic: "",
    date: "",
    startTime: "",
    endTime: "",
    notes: "",
    meetingLink: "",
  });
  const [rowError, setRowError] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [attendanceSession, setAttendanceSession] = useState<Session | null>(null);

  const [q, setQ] = useState("");
  const [when, setWhen] = useState("all");
  const [marked, setMarked] = useState("all");
  const [sortBy, setSortBy] = useState("date_asc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  useEffect(() => setPage(1), [q, when, marked, sortBy, limit, activeBatchId]);

  const todayKey = todayStr();
  const filtered = todayFirst(sessions)
    .filter((s) => {
      const d = s.date.slice(0, 10);
      if (when === "upcoming" && d < todayKey) return false;
      if (when === "past" && d >= todayKey) return false;
      if (marked === "marked" && !s.attendanceMarked) return false;
      if (marked === "unmarked" && s.attendanceMarked) return false;
      const needle = q.trim().toLowerCase();
      return !needle || `${s.topic} ${s.notes || ""}`.toLowerCase().includes(needle);
    })
    .sort((a, b) => {
      if (sortBy === "topic") return a.topic.localeCompare(b.topic);
      const c = a.date.slice(0, 10).localeCompare(b.date.slice(0, 10)) || a.startTime.localeCompare(b.startTime);
      return sortBy === "date_desc" ? -c : c;
    });
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const pageRows = filtered.slice((page - 1) * limit, page * limit);

  const load = useCallback(async () => {
    if (!activeBatchId) return;
    setLoading(true);
    try {
      const res = await api.listSessions(activeBatchId);
      setSessions(res.sessions);
    } finally {
      setLoading(false);
    }
  }, [activeBatchId]);

  useEffect(() => {
    load();
  }, [load]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(bulkForm.weekStart, i));

  const toggleOffset = (offset: number) => {
    setSelectedOffsets((prev) =>
      prev.includes(offset) ? prev.filter((o) => o !== offset) : [...prev, offset]
    );
  };

  const handleSingleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBatchId) return;
    setSingleError("");
    setSingleSubmitting(true);
    try {
      await api.createSession({ ...singleForm, batch: activeBatchId });
      setSingleForm({ ...singleForm, topic: "", notes: "", meetingLink: "" });
      load();
    } catch (err) {
      setSingleError(err instanceof ApiError ? err.message : "Could not create session");
    } finally {
      setSingleSubmitting(false);
    }
  };

  const handleBulkCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBatchId) return;
    setBulkError("");
    setBulkSuccess("");

    const dates = selectedOffsets.sort((a, b) => a - b).map((o) => weekDays[o]);
    if (dates.length === 0) {
      setBulkError("Pick at least one day");
      return;
    }

    setBulkSubmitting(true);
    try {
      const res = await api.createBulkSessions({
        batch: activeBatchId,
        topic: bulkForm.topic,
        dates,
        startTime: bulkForm.startTime,
        endTime: bulkForm.endTime,
        notes: bulkForm.notes,
        meetingLink: bulkForm.meetingLink,
      });
      setBulkSuccess(`Created ${res.sessions.length} session(s) for the week.`);
      setBulkForm({ ...bulkForm, topic: "", notes: "", meetingLink: "" });
      load();
    } catch (err) {
      setBulkError(err instanceof ApiError ? err.message : "Could not create sessions");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const startEdit = (s: Session) => {
    setEditingId(s._id);
    setEditForm({
      topic: s.topic,
      date: s.date.slice(0, 10),
      startTime: s.startTime,
      endTime: s.endTime,
      notes: s.notes || "",
      meetingLink: s.meetingLink || "",
    });
    setRowError("");
    setEditError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError("");
    setEditSaving(false);
  };

  const saveEdit = async (id: string) => {
    setEditError("");
    setEditSaving(true);
    try {
      await api.updateSession(id, editForm);
      setEditingId(null);
      load();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Could not save changes");
    } finally {
      setEditSaving(false);
    }
  };

  const removeSession = async (s: Session) => {
    if (!window.confirm(`Delete the "${s.topic}" session on ${s.date.slice(0, 10)}?`)) return;
    setRowError("");
    try {
      await api.deleteSession(s._id);
      load();
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : "Could not delete session");
    }
  };

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Sessions</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Schedule sessions for {activeBatch?.name || "your batch"}.
      </p>

      <BatchSwitcher />

      <TodaySessions sessions={sessions} />

      {editingId && (
        <Modal onClose={cancelEdit} dialogStyle={{ maxWidth: 560, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
          <h2 className={adminStyles.sectionTitle}>Edit session</h2>
          <form
            className={adminStyles.form}
            onSubmit={(e) => {
              e.preventDefault();
              saveEdit(editingId);
            }}
          >
            <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
              <span>Topic<span className={adminStyles.required}>*</span></span>
              <input
                className={adminStyles.input}
                value={editForm.topic}
                autoFocus
                required
                onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })}
              />
            </label>
            <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
              <span>Date<span className={adminStyles.required}>*</span></span>
              <input
                className={adminStyles.input}
                type="date"
                required
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
              />
            </label>
            <label className={adminStyles.label}>
              <span>Start time<span className={adminStyles.required}>*</span></span>
              <input
                className={adminStyles.input}
                type="time"
                required
                value={editForm.startTime}
                onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
              />
            </label>
            <label className={adminStyles.label}>
              <span>End time<span className={adminStyles.required}>*</span></span>
              <input
                className={adminStyles.input}
                type="time"
                required
                value={editForm.endTime}
                onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
              />
            </label>
            <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
              <span>Notes <span className={adminStyles.hint}>(optional)</span></span>
              <textarea
                className={adminStyles.input}
                rows={3}
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </label>
            <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
              <span>Meeting link <span className={adminStyles.hint}>(optional)</span></span>
              <input
                className={adminStyles.input}
                type="url"
                inputMode="url"
                value={editForm.meetingLink}
                onChange={(e) => setEditForm({ ...editForm, meetingLink: e.target.value })}
                placeholder="https://..."
              />
              <span className={adminStyles.hint}>Students see a Join button when a link is set.</span>
            </label>

            <div className={adminStyles.modalFooter}>
              {editError && (
                <p className={adminStyles.messageError} role="alert" style={{ margin: 0, marginRight: "auto" }}>
                  {editError}
                </p>
              )}
              <button className={adminStyles.smallButton} type="button" onClick={cancelEdit} disabled={editSaving}>
                Cancel
              </button>
              <button className={adminStyles.primaryButton} type="submit" disabled={editSaving}>
                {editSaving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {attendanceSession && (
        <AttendancePanel
          session={attendanceSession}
          onClose={() => setAttendanceSession(null)}
          onSaved={() => {
            setAttendanceSession(null);
            load();
          }}
        />
      )}

      <div className={adminStyles.grid}>
        <section className={adminStyles.section}>
          <div className={adminStyles.sectionHead}>
            <div>
              <h2 className={adminStyles.sectionTitle}>Add a single session</h2>
            </div>
          </div>

          <form className={adminStyles.form} onSubmit={handleSingleCreate}>
            <label className={adminStyles.label}>
              <span>Date <span className={adminStyles.required}>*</span></span>
              <input
                className={adminStyles.input}
                type="date"
                value={singleForm.date}
                onChange={(e) => setSingleForm({ ...singleForm, date: e.target.value })}
                required
              />
            </label>

            <label className={adminStyles.label}>
              <span>Topic <span className={adminStyles.required}>*</span></span>
              <input
                className={adminStyles.input}
                value={singleForm.topic}
                onChange={(e) => setSingleForm({ ...singleForm, topic: e.target.value })}
                placeholder="e.g. Algebra basics"
                required
              />
            </label>

            <label className={adminStyles.label}>
              <span>Start time <span className={adminStyles.required}>*</span></span>
              <input
                className={adminStyles.input}
                type="time"
                value={singleForm.startTime}
                onChange={(e) => setSingleForm({ ...singleForm, startTime: e.target.value })}
                required
              />
            </label>

            <label className={adminStyles.label}>
              <span>End time <span className={adminStyles.required}>*</span></span>
              <input
                className={adminStyles.input}
                type="time"
                value={singleForm.endTime}
                onChange={(e) => setSingleForm({ ...singleForm, endTime: e.target.value })}
                required
              />
            </label>

            <label className={`${adminStyles.label} ${adminStyles.fullRow}`}>
              Notes
              <input
                className={adminStyles.input}
                value={singleForm.notes}
                onChange={(e) => setSingleForm({ ...singleForm, notes: e.target.value })}
                placeholder="Optional"
              />
            </label>

            <label className={`${adminStyles.label} ${adminStyles.fullRow}`}>
              Meeting link
              <input
                className={adminStyles.input}
                type="url"
                value={singleForm.meetingLink}
                onChange={(e) => setSingleForm({ ...singleForm, meetingLink: e.target.value })}
                placeholder="https://meet.google.com/... (optional)"
              />
            </label>

            <div className={adminStyles.formActions} style={{ flexWrap: "wrap" }}>
              <button className={adminStyles.primaryButton} type="submit" disabled={singleSubmitting}>
                {singleSubmitting ? "Creating…" : "Add session"}
              </button>
              {singleError && <p className={adminStyles.messageError}>{singleError}</p>}
            </div>
          </form>
        </section>

        <section className={adminStyles.section}>
          <div className={adminStyles.sectionHead}>
            <div>
              <h2 className={adminStyles.sectionTitle}>Add sessions for the week</h2>
              <p className={adminStyles.sectionSubtitle}>
                One topic and time slot, repeated on the days you pick.
              </p>
            </div>
          </div>

          <form className={adminStyles.form} onSubmit={handleBulkCreate}>
            <label className={adminStyles.label}>
              <span>Week starting <span className={adminStyles.required}>*</span></span>
              <input
                className={adminStyles.input}
                type="date"
                value={bulkForm.weekStart}
                onChange={(e) => setBulkForm({ ...bulkForm, weekStart: e.target.value })}
                required
              />
            </label>

            <label className={adminStyles.label}>
              <span>Topic <span className={adminStyles.required}>*</span></span>
              <input
                className={adminStyles.input}
                value={bulkForm.topic}
                onChange={(e) => setBulkForm({ ...bulkForm, topic: e.target.value })}
                placeholder="e.g. Daily revision"
                required
              />
            </label>

            <label className={adminStyles.label}>
              <span>Start time <span className={adminStyles.required}>*</span></span>
              <input
                className={adminStyles.input}
                type="time"
                value={bulkForm.startTime}
                onChange={(e) => setBulkForm({ ...bulkForm, startTime: e.target.value })}
                required
              />
            </label>

            <label className={adminStyles.label}>
              <span>End time <span className={adminStyles.required}>*</span></span>
              <input
                className={adminStyles.input}
                type="time"
                value={bulkForm.endTime}
                onChange={(e) => setBulkForm({ ...bulkForm, endTime: e.target.value })}
                required
              />
            </label>

            <div className={`${adminStyles.label} ${adminStyles.fullRow}`}>
              Days
              <div className={styles.weekdayRow}>
                {weekDays.map((dateStr, offset) => (
                  <button
                    key={dateStr}
                    type="button"
                    className={
                      selectedOffsets.includes(offset) ? styles.weekdayChipActive : styles.weekdayChip
                    }
                    onClick={() => toggleOffset(offset)}
                  >
                    <span>{weekdayLabel(dateStr)}</span>
                    <span className={styles.weekdayChipDate}>{dayMonthLabel(dateStr)}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className={`${adminStyles.label} ${adminStyles.fullRow}`}>
              Notes
              <input
                className={adminStyles.input}
                value={bulkForm.notes}
                onChange={(e) => setBulkForm({ ...bulkForm, notes: e.target.value })}
                placeholder="Optional"
              />
            </label>

            <label className={`${adminStyles.label} ${adminStyles.fullRow}`}>
              Meeting link
              <input
                className={adminStyles.input}
                type="url"
                value={bulkForm.meetingLink}
                onChange={(e) => setBulkForm({ ...bulkForm, meetingLink: e.target.value })}
                placeholder="https://meet.google.com/... (optional, same link for all)"
              />
            </label>

            <div className={adminStyles.formActions} style={{ flexWrap: "wrap" }}>
              <button className={adminStyles.primaryButton} type="submit" disabled={bulkSubmitting}>
                {bulkSubmitting ? "Creating…" : `Create ${selectedOffsets.length} session(s)`}
              </button>
              {bulkError && <p className={adminStyles.messageError}>{bulkError}</p>}
              {bulkSuccess && <p className={adminStyles.messageSuccess}>{bulkSuccess}</p>}
            </div>
          </form>
        </section>

        <section className={adminStyles.section}>
          <div className={adminStyles.sectionHead}>
            <div>
              <h2 className={adminStyles.sectionTitle}>Sessions</h2>
              <p className={adminStyles.sectionSubtitle}>{sessions.length} scheduled in this batch</p>
            </div>
          </div>

          <ListToolbar
            search={q}
            onSearch={setQ}
            placeholder="Search topic or notes"
            total={filtered.length}
            filters={[
              { key: "when", label: "When", value: when, onChange: setWhen, options: [{ value: "all", label: "All dates" }, { value: "upcoming", label: "Today and upcoming" }, { value: "past", label: "Past" }] },
              { key: "marked", label: "Attendance", value: marked, onChange: setMarked, options: [{ value: "all", label: "All" }, { value: "unmarked", label: "Not marked" }, { value: "marked", label: "Marked" }] },
            ]}
            sort={{ key: "sort", label: "Sort by", value: sortBy, onChange: setSortBy, options: [{ value: "date_asc", label: "Date (earliest first)" }, { value: "date_desc", label: "Date (latest first)" }, { value: "topic", label: "Topic (A-Z)" }] }}
            onClear={() => { setQ(""); setWhen("all"); setMarked("all"); setSortBy("date_asc"); }}
          />

          {loading && <p className={adminStyles.empty} role="status">Loading sessions…</p>}
          {rowError && <p className={adminStyles.messageError}>{rowError}</p>}

          {!loading && sessions.length === 0 && (
            <div className={styles.emptyBlock}>
              <span className={styles.emptyIcon} aria-hidden="true" />
              <p className={styles.emptyText}>No sessions scheduled yet.</p>
            </div>
          )}

          {filtered.length > 0 && (
            <div className={`${adminStyles.tableWrap} ${styles.tableHoverWrap}`}>
              <table className={adminStyles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Topic</th>
                    <th>Notes</th>
                    <th>Meeting</th>
                    <th>Attendance</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((s) => (
                      <tr key={s._id}>
                        <td>
                          {weekdayLabel(s.date.slice(0, 10))} {dayMonthLabel(s.date.slice(0, 10))}
                        </td>
                        <td>
                          {s.startTime} - {s.endTime}
                        </td>
                        <td style={{ overflowWrap: "anywhere", minWidth: 140 }}>{s.topic}</td>
                        <td style={{ overflowWrap: "anywhere", minWidth: 120, maxWidth: 260 }}>{s.notes || "—"}</td>
                        <td>
                          {s.meetingLink ? (
                            <a
                              className={adminStyles.primaryButton}
                              style={{ display: "inline-block", textDecoration: "none" }}
                              href={s.meetingLink}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Join
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <span
                            className={s.attendanceMarked ? adminStyles.badge : adminStyles.badgePending}
                            style={
                              s.attendanceMarked
                                ? { background: "var(--success-soft)", color: "var(--success)" }
                                : undefined
                            }
                          >
                            {s.attendanceMarked ? "Marked" : "Not marked"}
                          </span>
                        </td>
                        <td>
                          <div className={adminStyles.rowActions} style={{ flexWrap: "wrap" }}>
                            <button className={adminStyles.smallButton} onClick={() => setAttendanceSession(s)}>
                              Attendance
                            </button>
                            <button className={adminStyles.smallButton} onClick={() => startEdit(s)}>
                              Edit
                            </button>
                            <button className={adminStyles.dangerButton} onClick={() => removeSession(s)}>
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
          <Pagination page={page} totalPages={totalPages} total={filtered.length} onPageChange={setPage} limit={limit} onLimitChange={setLimit} />
          {!loading && sessions.length > 0 && filtered.length === 0 && <p className={adminStyles.empty}>No sessions match your filters.</p>}
        </section>
      </div>
    </div>
  );
}
