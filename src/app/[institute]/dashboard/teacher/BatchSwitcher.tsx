"use client";

import { useTeacherBatch } from "@/context/TeacherBatchContext";
import styles from "./teacher.module.css";

export default function BatchSwitcher() {
  const { batches, activeBatchId, selectBatch } = useTeacherBatch();

  if (batches.length <= 1) return null;

  return (
    <div className={styles.switcherRow}>
      <span className={styles.switcherLabel}>Active batch:</span>
      <select
        className={styles.switcherSelect}
        value={activeBatchId || ""}
        onChange={(e) => selectBatch(e.target.value)}
      >
        {batches.map((b) => (
          <option key={b._id} value={b._id}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  );
}
