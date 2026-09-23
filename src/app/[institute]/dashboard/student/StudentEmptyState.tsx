import styles from "./student.module.css";

export default function StudentEmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyIcon} aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M4 13.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5.5M4 13.5 6.5 5h11L20 13.5M4 13.5h4.5a1 1 0 0 1 .95.68l.6 1.8a1 1 0 0 0 .95.68h1.99a1 1 0 0 0 .95-.68l.6-1.8a1 1 0 0 1 .95-.68H20"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <p className={styles.emptyTitle}>{title}</p>
      {hint && <p className={styles.emptyHint}>{hint}</p>}
    </div>
  );
}
