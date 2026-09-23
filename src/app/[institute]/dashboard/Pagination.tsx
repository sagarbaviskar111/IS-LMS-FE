"use client";

import styles from "./admin/admin.module.css";

export default function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className={styles.paginationRow}>
      <span className={styles.paginationInfo}>
        Page {page} of {totalPages} · {total} total
      </span>
      <div className={styles.paginationButtons}>
        <button
          className={styles.smallButton}
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </button>
        <button
          className={styles.smallButton}
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
