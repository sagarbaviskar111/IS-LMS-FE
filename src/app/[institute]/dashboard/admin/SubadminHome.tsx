"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "./admin.module.css";

// Where each area lives, so a sub-admin lands on a page that only shows what they can use.
const AREAS: { key: string; label: string; path: string }[] = [
  { key: "leads", label: "Leads & inquiry forms", path: "leads" },
  { key: "students", label: "Students", path: "students" },
  { key: "team", label: "Teachers & telecallers", path: "teachers" },
  { key: "academics", label: "Courses & batches", path: "courses" },
  { key: "fees", label: "Student fees", path: "students" },
  { key: "finance", label: "Finance", path: "finance" },
  { key: "certificates", label: "Certificates", path: "certificates" },
  { key: "placements", label: "Job placements", path: "placements" },
  { key: "tools", label: "Tools", path: "tools" },
  { key: "announcements", label: "Send notifications", path: "notifications" },
];

export default function SubadminHome() {
  const { user } = useAuth();
  const { institute } = useParams<{ institute: string }>();
  const perms = user?.subadmin?.permissions || {};
  const areas = AREAS.filter((a) => perms[a.key]);

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Welcome, {user?.name}</h1>
      <p className={dashboardStyles.pageSubtitle}>
        You are helping {user?.subadmin?.adminName || "the admin"}. These are the areas you can use.
      </p>
      <div className={dashboardStyles.cardGrid}>
        {areas.map((a) => (
          <Link key={a.key} href={`/${institute}/dashboard/admin/${a.path}`} className={dashboardStyles.card}>
            <p className={dashboardStyles.cardLabel}>{a.label}</p>
            <p className={dashboardStyles.cardValue} style={{ fontSize: "1rem" }}>
              <span className={perms[a.key] === "manage" ? adminStyles.badgeSuccess : adminStyles.badgePending}>
                {perms[a.key] === "manage" ? "View & change" : "View only"}
              </span>
            </p>
          </Link>
        ))}
      </div>
      {areas.length === 0 && <p>No access has been given yet.</p>}
      <p className={adminStyles.sectionSubtitle} style={{ marginTop: 20 }}>
        Settings, online payment keys, sender email and fee rules are only for the admin. What you change is recorded.
      </p>
    </div>
  );
}
