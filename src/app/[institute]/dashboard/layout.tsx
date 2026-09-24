"use client";

import { CSSProperties, ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api, Role } from "@/lib/api";
import { shade } from "@/lib/color";
import ThemeToggle from "@/components/ThemeToggle";
import styles from "./dashboard.module.css";

interface NavItem {
  href: string;
  label: string;
  badge?: number;
}

interface NavSection {
  // Omitted for a section that shouldn't show a header (e.g. the lone
  // "Overview" link, or roles with too few items to bother grouping).
  title?: string;
  items: NavItem[];
}

function getNavSections(
  base: string,
  role: Role,
  pendingCount: number,
  unreadCount: number,
  chatUnreadCount: number
): NavSection[] {
  const notifications = { href: `${base}/dashboard/${role}/notifications`, label: "Notifications", badge: unreadCount };
  const network = { href: `${base}/dashboard/${role}/network`, label: "Class Network", badge: chatUnreadCount };

  switch (role) {
    case "superadmin":
      return [{ items: [{ href: `${base}/dashboard/superadmin`, label: "Overview" }, notifications] }];
    case "admin":
      return [
        { items: [{ href: `${base}/dashboard/admin`, label: "Overview" }] },
        {
          title: "Students",
          items: [
            { href: `${base}/dashboard/admin/leads`, label: "Leads" },
            { href: `${base}/dashboard/admin/students`, label: "Students" },
            { href: `${base}/dashboard/admin/groups`, label: "Student Groups" },
          ],
        },
        {
          items: [
            { href: `${base}/dashboard/admin/teachers`, label: "Teachers" },
            { href: `${base}/dashboard/admin/telecallers`, label: "Telecallers" },
            { href: `${base}/dashboard/admin/batches`, label: "Batches" },
            { href: `${base}/dashboard/admin/pending`, label: "Pending Approvals", badge: pendingCount },
          ],
        },
        {
          title: "Settings",
          items: [
            { href: `${base}/dashboard/admin/branding`, label: "Branding" },
            { href: `${base}/dashboard/admin/youtube`, label: "YouTube Settings" },
            { href: `${base}/dashboard/admin/password-resets`, label: "Password Resets" },
          ],
        },
        { items: [notifications] },
      ];
    case "teacher":
      return [
        {
          items: [
            { href: `${base}/dashboard/teacher`, label: "Overview" },
            { href: `${base}/dashboard/teacher/sessions`, label: "Sessions" },
            { href: `${base}/dashboard/teacher/attendance`, label: "Attendance" },
            { href: `${base}/dashboard/teacher/materials/study`, label: "Study Material" },
            { href: `${base}/dashboard/teacher/materials/recordings`, label: "Session Recording" },
            { href: `${base}/dashboard/teacher/exams`, label: "Exams" },
            { href: `${base}/dashboard/teacher/assignments`, label: "Assignments" },
            network,
            notifications,
          ],
        },
      ];
    case "student":
      return [
        {
          items: [
            { href: `${base}/dashboard/student`, label: "Overview" },
            { href: `${base}/dashboard/student/materials/study`, label: "Study Material" },
            { href: `${base}/dashboard/student/materials/recordings`, label: "Session Recording" },
            { href: `${base}/dashboard/student/exams`, label: "Exams" },
            { href: `${base}/dashboard/student/assignments`, label: "Assignments" },
            { href: `${base}/dashboard/student/payments`, label: "Payments" },
            network,
            notifications,
          ],
        },
      ];
    case "telecaller":
      return [
        {
          items: [
            { href: `${base}/dashboard/telecaller`, label: "Overview" },
            { href: `${base}/dashboard/telecaller/leads`, label: "My Leads" },
            notifications,
          ],
        },
      ];
    default:
      return [{ items: [{ href: `${base}/dashboard/${role}`, label: "Overview" }, notifications] }];
  }
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, institute, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ institute: string }>();
  const base = `/${params.institute}`;
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.push(`${base}/login`);
    }
  }, [loading, user, router, base]);

  useEffect(() => {
    if (user?.role !== "admin") return;
    // Only the accurate `total` is needed for the badge — smallest possible page.
    api
      .listUsers({ status: "pending", limit: 1 })
      .then((res) => setPendingCount(res.total))
      .catch(() => {});
  }, [user, pathname]);

  useEffect(() => {
    if (!user) return;
    api
      .unreadNotificationCount()
      .then((res) => setUnreadCount(res.count))
      .catch(() => {});
  }, [user, pathname]);

  useEffect(() => {
    if (user?.role !== "student" && user?.role !== "teacher") return;
    api
      .chatUnreadSummary()
      .then((res) => setChatUnreadCount(res.total))
      .catch(() => {});
  }, [user, pathname]);

  if (loading || !user) {
    return <div className={styles.loading}>Loading...</div>;
  }

  const navSections = getNavSections(base, user.role, pendingCount, unreadCount, chatUnreadCount);
  const baseHref = `${base}/dashboard/${user.role}`;

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const themeStyle = institute?.brandColor
    ? ({
        "--brand": institute.brandColor,
        "--brand-dark": shade(institute.brandColor, -12),
      } as CSSProperties)
    : undefined;

  const sidebarContent = (
    <>
      <div className={styles.brand}>
        <div className={styles.brandMark} />
        <span className={styles.brandText}>InstituteSathi</span>
      </div>

      <nav className={styles.nav}>
        {navSections.map((section, i) => (
          <div className={styles.navSection} key={section.title || `section-${i}`}>
            {section.title && <p className={styles.navSectionTitle}>{section.title}</p>}
            {section.items.map((item) => {
              const isActive =
                item.href === pathname || (item.href !== baseHref && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={isActive ? styles.navItemActive : styles.navItem}
                >
                  <span className={styles.navDot} />
                  {item.label}
                  {!!item.badge && <span className={styles.navBadge}>{item.badge}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={styles.spacer} />

      <div className={styles.userBlock}>
        <div className={styles.userRow}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user.name}</div>
            <div className={styles.userRole}>{user.role}</div>
          </div>
        </div>
        <button className={styles.logoutButton} onClick={logout}>
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className={styles.pageShell} style={themeStyle}>
      <header className={styles.topBrandBar}>
        <div className={styles.topBrandSide}>
          <div className={styles.topBrandMark} />
          <span className={styles.topBrandText}>InstituteSathi</span>
        </div>
        <div className={styles.topBrandSide}>
          {institute &&
            (institute.logoUrl ? (
              <span className={styles.instituteLogoChip}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={institute.logoUrl} alt={institute.name} className={styles.instituteLogo} />
              </span>
            ) : (
              <span className={styles.topBrandText}>{institute.name}</span>
            ))}
          <ThemeToggle />
        </div>
      </header>

      <div className={styles.shell}>
        <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}>
          {sidebarContent}
        </aside>

        {menuOpen && (
          <div className={styles.overlayOpen} onClick={() => setMenuOpen(false)} />
        )}

        <div className={styles.content}>
          <div className={styles.topbar}>
            <button
              aria-label="Toggle menu"
              className={styles.menuButton}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span />
            </button>
            <span className={styles.topbarBrand}>InstituteSathi</span>
            <div className={styles.topbarActions}>
              <ThemeToggle />
              <div className={styles.avatar}>{initials}</div>
            </div>
          </div>

          <main className={styles.main}>{children}</main>
        </div>
      </div>
    </div>
  );
}
