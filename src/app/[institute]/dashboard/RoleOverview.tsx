import styles from "./dashboard.module.css";

const SUBTITLES: Record<string, string> = {
  superadmin: "Full control across all roles and modules.",
  admin: "Manage students, teachers, and telecallers.",
  student: "Your courses, attendance, and progress.",
  teacher: "Your classes and students.",
  telecaller: "Your leads and follow-ups.",
};

const STATS: Record<string, { label: string; value: string }[]> = {
  superadmin: [
    { label: "Total Admins", value: "-" },
    { label: "Total Students", value: "-" },
    { label: "Total Teachers", value: "-" },
    { label: "Total Telecallers", value: "-" },
  ],
  admin: [
    { label: "Students", value: "-" },
    { label: "Teachers", value: "-" },
    { label: "Telecallers", value: "-" },
  ],
  student: [
    { label: "Enrolled Courses", value: "-" },
    { label: "Attendance %", value: "-" },
  ],
  teacher: [
    { label: "My Classes", value: "-" },
    { label: "My Students", value: "-" },
  ],
  telecaller: [
    { label: "Open Leads", value: "-" },
    { label: "Converted Leads", value: "-" },
    { label: "Follow-ups Today", value: "-" },
  ],
};

export default function RoleOverview({ role }: { role: string }) {
  const stats = STATS[role] || [];

  return (
    <div>
      <h1 className={styles.pageTitle}>{role} dashboard</h1>
      <p className={styles.pageSubtitle}>{SUBTITLES[role]}</p>

      <div className={styles.cardGrid}>
        {stats.map((stat) => (
          <div className={styles.card} key={stat.label}>
            <p className={styles.cardLabel}>{stat.label}</p>
            <p className={styles.cardValue}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
