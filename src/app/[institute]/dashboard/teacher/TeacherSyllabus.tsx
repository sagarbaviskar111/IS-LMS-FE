"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTeacherBatch } from "@/context/TeacherBatchContext";
import { api, ApiError, SyllabusView } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import styles from "../syllabus.module.css";
import BatchSwitcher from "./BatchSwitcher";

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";

// Same view with one topic flipped, so the tick shows instantly.
const withTopic = (v: SyllabusView, topicId: string, done: boolean): SyllabusView => {
  const units = v.units.map((u) => ({
    ...u,
    items: u.items.map((t) => (t._id === topicId ? { ...t, done, completedAt: done ? new Date().toISOString() : null } : t)),
  }));
  const all = units.flatMap((u) => u.items);
  const doneCount = all.filter((t) => t.done).length;
  const next = all.find((t) => !t.done);
  return {
    ...v,
    units,
    done: doneCount,
    percent: all.length ? Math.round((doneCount / all.length) * 100) : 0,
    nextTopic: next ? { _id: next._id, title: next.title, unit: units.find((u) => u.items.includes(next))?.name || "" } : null,
  };
};

export default function TeacherSyllabus() {
  const { activeBatchId, activeBatch, loading: batchesLoading, batches } = useTeacherBatch();
  const [view, setView] = useState<SyllabusView | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<Set<string>>(new Set());
  // Refs, not state, so a fast double click is rejected before React re-renders.
  const inFlight = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!activeBatchId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.teacherSyllabus(activeBatchId);
      setView(res.syllabus);
      setMessage(res.message || "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load the syllabus");
    } finally {
      setLoading(false);
    }
  }, [activeBatchId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (topicId: string, done: boolean) => {
    if (!activeBatchId || !view || inFlight.current.has(topicId)) return;
    inFlight.current.add(topicId);
    setBusy(new Set(inFlight.current));
    setError("");
    const before = view;
    setView(withTopic(view, topicId, done));
    try {
      const res = await api.teacherMarkTopic(activeBatchId, topicId, done);
      setView(res.syllabus);
    } catch (err) {
      setView(before);
      setError(err instanceof ApiError ? err.message : "Could not save. Please try again.");
    } finally {
      inFlight.current.delete(topicId);
      setBusy(new Set(inFlight.current));
    }
  };

  const markUnit = async (ids: string[], done: boolean) => {
    for (const id of ids) await toggle(id, done);
  };

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Syllabus</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Tick topics as you finish teaching them. Students in {activeBatch?.name || "your batch"} see this progress.
      </p>

      <BatchSwitcher />

      {error && <p className={adminStyles.messageError}>{error}</p>}
      {(batchesLoading || loading) && <p className={adminStyles.empty} role="status">Loading syllabus…</p>}

      {!batchesLoading && batches.length === 0 && (
        <p className={adminStyles.empty}>You are not assigned to any batch yet.</p>
      )}
      {!batchesLoading && batches.length > 1 && !activeBatchId && (
        <p className={adminStyles.empty}>Choose a batch above to see its syllabus.</p>
      )}

      {!loading && activeBatchId && !view && !error && (
        <p className={adminStyles.empty}>
          {message || "This batch has no course linked yet."} Ask your admin to link a course to this batch.
        </p>
      )}

      {!loading && view && (
        <>
          <section className={styles.summary}>
            <div className={styles.summaryTop}>
              <h2 className={styles.courseName}>{view.course.name}</h2>
              <p className={styles.counts}>
                {view.done} of {view.total} topics covered
              </p>
            </div>
            <div className={styles.barRow}>
              <div className={styles.track} role="progressbar" aria-valuenow={view.percent} aria-valuemin={0} aria-valuemax={100}>
                <div className={styles.fill} style={{ width: `${view.percent}%` }} />
              </div>
              <span className={styles.pct}>{view.percent}%</span>
            </div>
            {view.nextTopic ? (
              <div className={styles.nextRow}>
                <span className={styles.pill}>Next up</span>
                <span>{view.nextTopic.title}</span>
              </div>
            ) : view.total > 0 ? (
              <div className={styles.nextRow}>
                <span className={styles.pill}>Complete</span>
                <span>Every topic is covered.</span>
              </div>
            ) : null}
          </section>

          {view.total === 0 && (
            <section className={adminStyles.section}>
              <p className={adminStyles.sectionSubtitle}>
                The admin has not broken this course down into topics yet, so there is nothing to tick.
              </p>
              {view.syllabusText && <p className={styles.textBlock}>{view.syllabusText}</p>}
            </section>
          )}

          {view.units.map((u, ui) => {
            const doneInUnit = u.items.filter((t) => t.done).length;
            const pending = u.items.filter((t) => !t.done).map((t) => t._id);
            return (
              <details key={`${u.name}-${ui}`} className={styles.unit} open>
                <summary className={styles.unitHead}>
                  <span>{u.name || "Topics"}</span>
                  <span className={styles.unitActions}>
                    {pending.length > 0 && (
                      <button
                        type="button"
                        className={styles.linkBtn}
                        disabled={busy.size > 0}
                        onClick={(e) => {
                          e.preventDefault();
                          markUnit(pending, true);
                        }}
                      >
                        Mark all done
                      </button>
                    )}
                    <span className={styles.unitMeta}>
                      {doneInUnit}/{u.items.length}
                    </span>
                  </span>
                </summary>
                <ul className={styles.topics}>
                  {u.items.map((t) => (
                    <li
                      key={t._id}
                      className={`${styles.topic} ${t.done ? styles.topicDone : ""} ${view.nextTopic?._id === t._id ? styles.topicNext : ""}`}
                    >
                      <input
                        id={`topic-${t._id}`}
                        type="checkbox"
                        className={styles.checkbox}
                        checked={t.done}
                        disabled={busy.has(t._id)}
                        onChange={(e) => toggle(t._id, e.target.checked)}
                      />
                      <label htmlFor={`topic-${t._id}`} className={styles.topicLabel}>
                        {t.title}
                      </label>
                      {t.done && t.completedAt && <span className={styles.date}>{fmt(t.completedAt)}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </>
      )}
    </div>
  );
}
