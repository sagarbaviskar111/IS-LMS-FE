"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api, Role, User } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "./admin.module.css";

const TEAM_ROLES: { value: Role; label: string; path: string }[] = [
  { value: "student", label: "Students", path: "students" },
  { value: "teacher", label: "Teachers", path: "teachers" },
  { value: "telecaller", label: "Telecallers", path: "telecallers" },
];

const INVITE_FIELDS: Record<string, keyof User> = {
  student: "studentInviteCode",
  teacher: "teacherInviteCode",
  telecaller: "telecallerInviteCode",
};

export default function AdminOverview() {
  const { user } = useAuth();
  const { institute } = useParams<{ institute: string }>();
  const [pendingCount, setPendingCount] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [copiedRole, setCopiedRole] = useState<Role | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Only the accurate `total` is needed here, not the records themselves —
      // request the smallest page so pagination doesn't undercount these stat cards.
      const [pendingRes, ...roleResults] = await Promise.all([
        api.listUsers({ status: "pending", limit: 1 }),
        ...TEAM_ROLES.map((r) => api.listUsers({ role: r.value, status: "team", limit: 1 })),
      ]);
      setPendingCount(pendingRes.total);
      setCounts(
        TEAM_ROLES.reduce<Record<string, number>>((acc, r, i) => {
          acc[r.value] = roleResults[i].total;
          return acc;
        }, {})
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCopy = async (role: Role, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedRole(role);
      setTimeout(() => setCopiedRole(null), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  };

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Admin dashboard</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Manage your coaching class — students, teachers, and telecallers.
      </p>

      <div className={dashboardStyles.cardGrid} style={{ marginBottom: 20 }}>
        {TEAM_ROLES.map((r) => (
          <Link href={`/${institute}/dashboard/admin/${r.path}`} key={r.value} style={{ display: "block" }}>
            <div className={dashboardStyles.card}>
              <p className={dashboardStyles.cardLabel}>{r.label}</p>
              <p className={dashboardStyles.cardValue}>{loading ? "…" : counts[r.value] ?? 0}</p>
            </div>
          </Link>
        ))}
        <Link href={`/${institute}/dashboard/admin/pending`} style={{ display: "block" }}>
          <div className={dashboardStyles.card}>
            <p className={dashboardStyles.cardLabel}>Pending Approvals</p>
            <p className={dashboardStyles.cardValue}>{loading ? "…" : pendingCount}</p>
          </div>
        </Link>
      </div>

      <div className={styles.grid}>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Invite links</h2>
              <p className={styles.sectionSubtitle}>
                Each role has its own code and link — whoever signs up with it is locked into
                that role, they can&apos;t switch it on the signup page.
              </p>
            </div>
          </div>

          {TEAM_ROLES.map((r) => {
            const code = (user?.[INVITE_FIELDS[r.value]] as string | undefined) || "—";
            const link = origin && code !== "—" ? `${origin}/${institute}/signup?code=${code}` : "";
            return (
              <div className={styles.inviteRow} key={r.value} style={{ marginBottom: 10 }}>
                <span className={dashboardStyles.cardLabel} style={{ minWidth: 90, margin: 0 }}>
                  {r.label.slice(0, -1)}
                </span>
                <span className={styles.codeBox}>{code}</span>
                <span className={styles.linkBox}>{link}</span>
                <button
                  className={styles.primaryButton}
                  type="button"
                  onClick={() => handleCopy(r.value, link)}
                >
                  {copiedRole === r.value ? "Copied!" : "Copy link"}
                </button>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
