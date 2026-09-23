"use client";

import { useEffect, useState } from "react";
import { api, Batch, Session, StudentAttendance } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import studentStyles from "./student.module.css";
import StudentEmptyState from "./StudentEmptyState";

function weekdayLabel(dateStr: string): string {
  return new Date(dateStr.slice(0, 10) + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
  });
}

function dayMonthLabel(dateStr: string): string {
  return new Date(dateStr.slice(0, 10) + "T00:00:00").toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function percentageClass(pct: number | null): string {
  if (pct === null) return adminStyles.badgeInactive;
  if (pct >= 75) return studentStyles.badgeSuccess;
  if (pct >= 50) return adminStyles.badgePending;
  return studentStyles.badgeDanger;
}

export default function StudentOverview() {
  const [batch, setBatch] = useState<Batch | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendance, setAttendance] = useState<StudentAttendance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.myStudentBatch(), api.studentSessions(), api.studentAttendance()])
      .then(([batchRes, sessionsRes, attendanceRes]) => {
        setBatch(batchRes.batch);
        setSessions(sessionsRes.sessions);
        setAttendance(attendanceRes);
      })
      .finally(() => setLoading(false));
  }, []);

  if (!loading && !batch) {
    return (
      <div>
        <h1 className={dashboardStyles.pageTitle}>Student dashboard</h1>
        <StudentEmptyState
          title="You're not assigned to a batch yet"
          hint="Ask your admin to assign you one to see your classes and progress here."
        />
      </div>
    );
  }

  const missedCount = attendance?.sessions.filter((s) => s.status === "absent").length ?? 0;

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Student dashboard</h1>
      <p className={dashboardStyles.pageSubtitle}>{batch ? batch.name : "Your classes and progress."}</p>

      <div className={dashboardStyles.cardGrid} style={{ marginBottom: 20 }}>
        <div className={dashboardStyles.card}>
          <p className={dashboardStyles.cardLabel}>My Batch</p>
          <p className={dashboardStyles.cardValue}>{batch?.name || "—"}</p>
        </div>
        <div className={dashboardStyles.card}>
          <p className={dashboardStyles.cardLabel}>Upcoming Sessions</p>
          <p className={dashboardStyles.cardValue}>{loading ? "…" : sessions.length}</p>
        </div>
        <div className={dashboardStyles.card}>
          <p className={dashboardStyles.cardLabel}>Attendance</p>
          <p className={dashboardStyles.cardValue}>
            {loading ? "…" : attendance?.percentage === null || attendance?.percentage === undefined
              ? "No data"
              : `${attendance.percentage}%`}
          </p>
        </div>
        <div className={dashboardStyles.card}>
          <p className={dashboardStyles.cardLabel}>Sessions Missed</p>
          <p className={dashboardStyles.cardValue}>{loading ? "…" : missedCount}</p>
        </div>
      </div>

      <section className={adminStyles.section} style={{ marginBottom: 20 }}>
        <div className={adminStyles.sectionHead}>
          <div>
            <h2 className={adminStyles.sectionTitle}>Attendance record</h2>
            <p className={adminStyles.sectionSubtitle}>
              {attendance ? `${attendance.present} of ${attendance.total} sessions attended` : ""}
            </p>
          </div>
          <span className={percentageClass(attendance?.percentage ?? null)}>
            {attendance?.percentage === null || attendance?.percentage === undefined
              ? "No data"
              : `${attendance.percentage}%`}
          </span>
        </div>

        {!loading && (!attendance || attendance.sessions.length === 0) && (
          <StudentEmptyState title="No attendance has been marked yet" />
        )}

        {attendance && attendance.sessions.length > 0 && (
          <div className={`${adminStyles.tableWrap} table-scroll`}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Topic</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.sessions.map((row, i) => (
                  <tr key={row.session?._id || i}>
                    <td>
                      {row.session ? `${weekdayLabel(row.session.date)} ${dayMonthLabel(row.session.date)}` : "—"}
                    </td>
                    <td>{row.session ? `${row.session.startTime} - ${row.session.endTime}` : "—"}</td>
                    <td>{row.session?.topic || "—"}</td>
                    <td>
                      <span
                        className={row.status === "present" ? studentStyles.badgeSuccess : studentStyles.badgeDanger}
                      >
                        {row.status === "present" ? "Present" : "Missed"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={adminStyles.section}>
        <div className={adminStyles.sectionHead}>
          <div>
            <h2 className={adminStyles.sectionTitle}>Upcoming sessions</h2>
            <p className={adminStyles.sectionSubtitle}>Classes scheduled for {batch?.name || "your batch"}.</p>
          </div>
        </div>

        {!loading && sessions.length === 0 && (
          <StudentEmptyState title="No upcoming sessions scheduled yet" />
        )}

        {sessions.length > 0 && (
          <div className={`${adminStyles.tableWrap} table-scroll`}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Topic</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s._id}>
                    <td>
                      {weekdayLabel(s.date)} {dayMonthLabel(s.date)}
                    </td>
                    <td>
                      {s.startTime} - {s.endTime}
                    </td>
                    <td>{s.topic}</td>
                    <td>{s.notes || "—"}</td>
                    <td>
                      {s.meetingLink ? (
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
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
