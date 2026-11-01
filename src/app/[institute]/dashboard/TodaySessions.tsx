"use client";

import { Session } from "@/lib/api";
import dashboardStyles from "./dashboard.module.css";
import adminStyles from "./admin/admin.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

// Session dates are calendar days ("YYYY-MM-DD…"); compare against the viewer's local today.
export function todayKey(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function isToday(s: Session): boolean {
  return s.date.slice(0, 10) === todayKey();
}

// Today's sessions first (by start time), then upcoming soonest-first, then past ones most-recent-first.
export function todayFirst(sessions: Session[]): Session[] {
  const today = todayKey();
  const rank = (s: Session) => (s.date.slice(0, 10) === today ? 0 : s.date.slice(0, 10) > today ? 1 : 2);
  return [...sessions].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    const byDate = a.date.slice(0, 10).localeCompare(b.date.slice(0, 10));
    if (byDate !== 0) return ra === 2 ? -byDate : byDate;
    return a.startTime.localeCompare(b.startTime);
  });
}

function state(s: Session, now: Date): "live" | "later" | "ended" {
  const hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  if (hm >= s.endTime) return "ended";
  if (hm >= s.startTime) return "live";
  return "later";
}

// Highlighted card at the top of the page for the sessions happening today.
export default function TodaySessions({ sessions }: { sessions: Session[] }) {
  const now = new Date();
  const today = todayFirst(sessions.filter(isToday));
  if (today.length === 0) return null;

  return (
    <section className={adminStyles.section} style={{ marginBottom: 20, borderColor: "var(--accent, var(--border))" }}>
      <h2 className={adminStyles.sectionTitle}>Today&apos;s session{today.length > 1 ? "s" : ""}</h2>
      <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
        {today.map((s) => {
          const st = state(s, now);
          return (
            <div
              key={s._id}
              className={dashboardStyles.card}
              style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, justifyContent: "space-between" }}
            >
              <div>
                <strong>{s.topic}</strong>
                <div className={adminStyles.sectionSubtitle} style={{ margin: 0 }}>
                  {s.startTime} - {s.endTime}
                  {" · "}
                  {st === "live" ? "Live now" : st === "later" ? "Starts today" : "Ended"}
                </div>
              </div>
              {s.meetingLink && st !== "ended" ? (
                <a
                  className={adminStyles.primaryButton}
                  style={{ display: "inline-block", textDecoration: "none" }}
                  href={s.meetingLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  Join
                </a>
              ) : (
                <span className={adminStyles.sectionSubtitle} style={{ margin: 0 }}>
                  {st === "ended" ? "" : "No meeting link yet"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
