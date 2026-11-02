import type { User } from "@/lib/api";

// Mirrors the server's module list (Backend/utils/permissions.js). The server is the one
// that enforces it; this only decides what to show.
export type ModuleKey =
  | "leads"
  | "students"
  | "team"
  | "academics"
  | "fees"
  | "finance"
  | "certificates"
  | "placements"
  | "tools"
  | "announcements";
export type Level = "view" | "manage";

const RANK: Record<Level, number> = { view: 1, manage: 2 };

// True for the admin (no limits) and for a sub-admin that has this module at this level or above.
export function can(user: User | null | undefined, module: ModuleKey | ModuleKey[], level: Level = "view"): boolean {
  if (!user) return false;
  if (!user.subadmin) return true;
  const list = Array.isArray(module) ? module : [module];
  return list.some((m) => (RANK[user.subadmin!.permissions[m] as Level] || 0) >= RANK[level]);
}

// Which module an admin page belongs to. Pages not listed are open to a sub-admin;
// "admin" means the admin only (settings, sub-admins).
const PAGE_MODULES: Record<string, ModuleKey | ModuleKey[] | "admin"> = {
  leads: "leads",
  "inquiry-forms": "leads",
  pending: ["students", "team"],
  students: "students",
  groups: "students",
  teachers: "team",
  telecallers: "team",
  courses: "academics",
  batches: "academics",
  finance: "finance",
  certificates: "certificates",
  placements: "placements",
  tools: "tools",
  settings: "admin",
  subadmins: "admin",
};

// The admin page segment of a path like /slug/dashboard/admin/students/...
export function pageModule(pathname: string): ModuleKey | ModuleKey[] | "admin" | null {
  const seg = pathname.split("/")[4];
  return (seg && PAGE_MODULES[seg]) || null;
}

export function canOpenPage(user: User | null | undefined, pathname: string): boolean {
  if (!user?.subadmin) return true;
  const m = pageModule(pathname);
  if (!m) return true;
  if (m === "admin") return false;
  return can(user, m, "view");
}
