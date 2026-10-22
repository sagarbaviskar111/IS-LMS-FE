"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api, Role } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import BrandLogo from "@/components/BrandLogo";
import BrandStyle from "@/components/BrandStyle";
import ProfileEditModal from "./ProfileEditModal";
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
      return [
        {
          items: [
            { href: `${base}/dashboard/superadmin`, label: "Overview" },
            { href: `${base}/dashboard/superadmin/job-emails`, label: "Job Email Contacts" },
          ],
        },
        {
          title: "Settings",
          items: [{ href: `${base}/dashboard/superadmin/email`, label: "Email Settings" }],
        },
        { items: [notifications] },
      ];
    case "admin":
      return [
        { items: [{ href: `${base}/dashboard/admin`, label: "Overview" }] },
        {
          title: "Students",
          items: [
            { href: `${base}/dashboard/admin/leads`, label: "Leads" },
            { href: `${base}/dashboard/admin/inquiry-forms`, label: "Inquiry Forms" },
            { href: `${base}/dashboard/admin/students`, label: "Students" },
            { href: `${base}/dashboard/admin/groups`, label: "Student Groups" },
            { href: `${base}/dashboard/admin/placements`, label: "Job Placements" },
          ],
        },
        {
          items: [
            { href: `${base}/dashboard/admin/teachers`, label: "Teachers" },
            { href: `${base}/dashboard/admin/telecallers`, label: "Telecallers" },
            { href: `${base}/dashboard/admin/courses`, label: "Courses" },
            { href: `${base}/dashboard/admin/batches`, label: "Batches" },
            { href: `${base}/dashboard/admin/pending`, label: "Pending Approvals", badge: pendingCount },
            { href: `${base}/dashboard/admin/tools`, label: "Tools" },
          ],
        },
        {
          items: [
            { href: `${base}/dashboard/admin/settings`, label: "Settings" },
            notifications,
          ],
        },
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
            { href: `${base}/dashboard/teacher/tools`, label: "Tools" },
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
            { href: `${base}/dashboard/student/placements`, label: "Job Placements" },
            { href: `${base}/dashboard/student/tools`, label: "Tools" },
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
            { href: `${base}/dashboard/telecaller/inquiry-forms`, label: "Inquiry Forms" },
            notifications,
            { href: `${base}/dashboard/telecaller/quick-messages`, label: "Quick Messages" },
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  // Modals render in a portal on <body>, outside this shell — scope the brand
  // palette to <body> too so they pick up the institute colours.
  const hasBrand = !!institute?.brandColor;
  useEffect(() => {
    if (!hasBrand) return;
    document.body.setAttribute("data-brand-scope", "");
    return () => document.body.removeAttribute("data-brand-scope");
  }, [hasBrand]);

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

  const sidebarContent = (
    <>
      <div className={styles.brand}>
        <BrandLogo height={32} />
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

      <div className={styles.userBlock}>
        <button
          type="button"
          className={styles.userRow}
          onClick={() => setProfileOpen(true)}
          title="Edit profile"
        >
          <div className={styles.avatar}>
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={user.name} />
            ) : (
              initials
            )}
          </div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user.name}</div>
            <div className={styles.userRole}>{user.role}</div>
          </div>
        </button>
        <button className={styles.logoutButton} onClick={logout}>
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className={styles.pageShell} data-brand-scope="">
      <BrandStyle color={institute?.brandColor} />
      <header className={styles.topBrandBar}>
        <div className={styles.topBrandSide}>
          <BrandLogo height={28} />
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
            <BrandLogo height={26} className={styles.topbarBrand} />
            <div className={styles.topbarActions}>
              <ThemeToggle />
              <button
                type="button"
                className={styles.avatarButton}
                onClick={() => setProfileOpen(true)}
                title="Edit profile"
                aria-label="Edit profile"
              >
                <div className={styles.avatar}>
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatarUrl} alt={user.name} />
                  ) : (
                    initials
                  )}
                </div>
              </button>
            </div>
          </div>

          <main className={styles.main}>{children}</main>
        </div>
      </div>

      {profileOpen && <ProfileEditModal user={user} onClose={() => setProfileOpen(false)} />}
    </div>
  );
}
