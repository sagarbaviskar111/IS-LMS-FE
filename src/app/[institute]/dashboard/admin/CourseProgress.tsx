"use client";

import { useEffect, useState } from "react";
import { api, CourseProgressRow } from "@/lib/api";
import adminStyles from "./admin.module.css";
import styles from "../syllabus.module.css";

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null;

// How far each batch of a course has got through its syllabus topics.
export default function CourseProgress({ courseId, hasTopics }: { courseId: string; hasTopics: boolean }) {
  const [rows, setRows] = useState<CourseProgressRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasTopics) return;
    let live = true;
    api
      .courseProgress(courseId)
      .then((res) => live && setRows(res.batches))
      .catch(() => live && setError("Could not load batch progress"));
    return () => {
      live = false;
    };
  }, [courseId, hasTopics]);

  if (!hasTopics) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <h3 className={adminStyles.sectionTitle} style={{ fontSize: "1rem" }}>
        Progress by batch
      </h3>
      {error && <p className={styles.error}>{error}</p>}
      {!error && rows === null && <p className={adminStyles.empty}>Loading…</p>}
      {rows && rows.length === 0 && <p className={adminStyles.empty}>No batch is using this course yet.</p>}
      {rows?.map((r) => (
        <div key={r.batch._id} className={styles.batchRow}>
          <div className={styles.summaryTop}>
            <span className={styles.batchName}>{r.batch.name}</span>
            <span className={styles.counts}>
              {r.done} of {r.total} topics
            </span>
          </div>
          <div className={styles.barRow}>
            <div className={styles.track} role="progressbar" aria-valuenow={r.percent} aria-valuemin={0} aria-valuemax={100}>
              <div className={styles.fill} style={{ width: `${r.percent}%` }} />
            </div>
            <span className={styles.pct}>{r.percent}%</span>
          </div>
          <p className={styles.small}>
            {r.nextTopic ? `Next: ${r.nextTopic.title}` : r.total ? "All topics covered" : ""}
            {r.lastCompletedAt ? ` · last updated ${fmt(r.lastCompletedAt)}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}
