import styles from "./student.module.css";

export default function StudentLoading() {
  return (
    <p className={styles.loadingState}>
      <span className={styles.loadingDot} />
      <span className={styles.loadingDot} />
      <span className={styles.loadingDot} />
      Loading…
    </p>
  );
}
