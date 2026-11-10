"use client";

import { useEffect, useState } from "react";
import { api, ApiError, SyllabusView } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import styles from "../syllabus.module.css";
import StudentEmptyState from "./StudentEmptyState";
import StudentLoading from "./StudentLoading";

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

export default function StudentSyllabus() {
  const [view, setView] = useState<SyllabusView | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .studentSyllabus()
      .then((res) => {
        setView(res.syllabus);
        setMessage(res.message || "");
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load the syllabus"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Syllabus</h1>
      <p className={dashboardStyles.pageSubtitle}>What your batch has covered so far, and what is coming next.</p>

      {error && <p className={adminStyles.messageError}>{error}</p>}
      {loading && <StudentLoading />}

      {!loading && !error && !view && (
        <StudentEmptyState title={message || "No syllabus yet"} hint="Your teacher or admin will add it soon." />
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
                <span className={styles.pill}>Teaching next</span>
                <span>{view.nextTopic.title}</span>
              </div>
            ) : view.total > 0 ? (
              <div className={styles.nextRow}>
                <span className={styles.pill}>Complete</span>
                <span>Every topic has been covered.</span>
              </div>
            ) : null}
          </section>

          {view.total === 0 &&
            (view.syllabusText ? (
              <section className={adminStyles.section}>
                <p className={styles.textBlock}>{view.syllabusText}</p>
              </section>
            ) : (
              <StudentEmptyState title="No syllabus yet" hint="Topics will show up here as your course syllabus is added." />
            ))}

          {view.units.map((u, ui) => {
            const doneInUnit = u.items.filter((t) => t.done).length;
            return (
              <details key={`${u.name}-${ui}`} className={styles.unit} open>
                <summary className={styles.unitHead}>
                  <span>{u.name || "Topics"}</span>
                  <span className={styles.unitMeta}>
                    {doneInUnit}/{u.items.length} covered
                  </span>
                </summary>
                <ul className={styles.topics}>
                  {u.items.map((t) => (
                    <li
                      key={t._id}
                      className={`${styles.topic} ${t.done ? styles.topicDone : styles.topicUpcoming} ${view.nextTopic?._id === t._id ? styles.topicNext : ""}`}
                    >
                      <span className={`${styles.mark} ${t.done ? styles.markDone : ""}`} role="img" aria-label={t.done ? "Covered" : "Not covered yet"} />
                      <span className={styles.topicLabel}>{t.title}</span>
                      {t.done && t.completedAt && <span className={styles.date}>{fmt(t.completedAt)}</span>}
                      {!t.done && view.nextTopic?._id === t._id && <span className={styles.pill}>Next</span>}
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
