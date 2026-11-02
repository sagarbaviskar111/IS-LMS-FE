"use client";

import styles from "./admin/admin.module.css";

// Page numbers with "…" gaps: always the first, the last and a window around the current page.
const pageList = (page: number, totalPages: number): (number | "gap")[] => {
  const wanted = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => wanted.add(n));
  if (page >= totalPages - 2) [totalPages - 1, totalPages - 2, totalPages - 3].forEach((n) => wanted.add(n));
  const nums = [...wanted].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
};

export default function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
  limit,
  limitOptions = [10, 15, 25, 50, 100],
  onLimitChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  // Optional: pass both to let the user choose how many rows each page shows.
  limit?: number;
  limitOptions?: number[];
  onLimitChange?: (limit: number) => void;
}) {
  const canChooseLimit = !!onLimitChange && !!limit && total > Math.min(...limitOptions);
  if (totalPages <= 1 && !canChooseLimit) return null;

  const info =
    limit && total > 0
      ? `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`
      : `Page ${page} of ${totalPages} · ${total} total`;

  return (
    <div className={styles.paginationRow}>
      <span className={styles.paginationInfo}>{info}</span>

      {canChooseLimit && (
        <label className={`${styles.paginationInfo} ${styles.paginationLimit}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          Rows per page
          <select
            className={styles.select}
            style={{ width: "auto", padding: "4px 8px" }}
            value={limit}
            onChange={(e) => onLimitChange?.(Number(e.target.value))}
            aria-label="Rows per page"
          >
            {limitOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}

      {totalPages > 1 && (
        <div className={styles.paginationButtons}>
          <button className={styles.smallButton} type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            Previous
          </button>
          <span className={styles.pageStatus} aria-live="polite">
            Page {page} of {totalPages}
          </span>
          {limit &&
            pageList(page, totalPages).map((n, i) =>
              n === "gap" ? (
                <span key={`gap-${i}`} className={`${styles.paginationInfo} ${styles.pageGap}`} aria-hidden="true">
                  …
                </span>
              ) : (
                <button
                  key={n}
                  type="button"
                  className={`${n === page ? styles.primaryButton : styles.smallButton} ${styles.pageNumber}`}
                  onClick={() => onPageChange(n)}
                  aria-current={n === page ? "page" : undefined}
                  aria-label={`Page ${n}`}
                  style={{ minWidth: 34 }}
                >
                  {n}
                </button>
              )
            )}
          <button className={styles.smallButton} type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
