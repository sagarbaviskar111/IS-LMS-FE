"use client";

import { ReactNode } from "react";
import { TeacherBatchProvider, useTeacherBatch } from "@/context/TeacherBatchContext";
import styles from "./teacher.module.css";

function BatchGate({ children }: { children: ReactNode }) {
  const { batches, loading, activeBatchId, selectBatch } = useTeacherBatch();

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingRow}>
          <span className={styles.spinner} aria-hidden="true" />
          <span>Loading your batches…</span>
        </div>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyStateIcon} aria-hidden="true" />
        <h1 className={styles.emptyStateTitle}>No batches assigned yet</h1>
        <p className={styles.emptyStateText}>
          Your admin hasn&apos;t assigned you to a batch. Check back later.
        </p>
      </div>
    );
  }

  if (!activeBatchId) {
    return (
      <div className={styles.gate}>
        <h1 className={styles.gateTitle}>Select your batch</h1>
        <p className={styles.gateSubtitle}>
          Choose which batch you&apos;re working with. You can switch anytime from your dashboard.
        </p>
        <div className={styles.gateGrid}>
          {batches.map((b) => (
            <button key={b._id} className={styles.gateCard} onClick={() => selectBatch(b._id)}>
              <span className={styles.gateCardName}>{b.name}</span>
              {b.description && <span className={styles.gateCardDesc}>{b.description}</span>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return (
    <TeacherBatchProvider>
      <BatchGate>{children}</BatchGate>
    </TeacherBatchProvider>
  );
}
