"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, StudentExamSummary } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import studentStyles from "./student.module.css";
import StudentEmptyState from "./StudentEmptyState";
import StudentLoading from "./StudentLoading";
import Pagination from "../Pagination";



const STATUS_BADGE: Record<string, string> = {
  published: adminStyles.badge,
  closed: adminStyles.badgeInactive,
};

export default function StudentExams() {
  const { institute } = useParams<{ institute: string }>();
  const [exams, setExams] = useState<StudentExamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    api
      .studentListExams({ page, limit })
      .then((res) => {
        setExams(res.exams);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [page, limit]);

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Exams</h1>
      <p className={dashboardStyles.pageSubtitle}>Exams from your batch.</p>

      {loading && <StudentLoading />}
      {!loading && exams.length === 0 && (
        <StudentEmptyState title="No exams yet" hint="Exams from your batch will show up here when scheduled." />
      )}

      {exams.length > 0 && (
        <div className={`${adminStyles.tableWrap} table-scroll`}>
          <table className={adminStyles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Questions / Marks</th>
                <th>Your status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {exams.map((e) => (
                <tr key={e._id}>
                  <td style={{ overflowWrap: "anywhere", minWidth: 140 }}>{e.title}</td>
                  <td>
                    <span className={STATUS_BADGE[e.status] || adminStyles.badgePending} style={{ textTransform: "capitalize" }}>
                      {e.status}
                    </span>
                  </td>
                  <td>
                    {e.questionCount} / {e.totalMarks}
                  </td>
                  <td>
                    {e.submitted ? (
                      e.resultsAnnounced ? (
                        <span className={adminStyles.badge}>Score: {e.score}</span>
                      ) : (
                        <span className={adminStyles.badgePending}>Submitted — awaiting results</span>
                      )
                    ) : e.status === "published" ? (
                      <span className={adminStyles.badgePending}>Not attempted</span>
                    ) : (
                      <span className={studentStyles.badgeDanger}>Missed</span>
                    )}
                  </td>
                  <td>
                    <Link
                      className={adminStyles.smallButton}
                      style={{ display: "inline-block", textDecoration: "none" }}
                      href={`/${institute}/dashboard/student/exams/${e._id}`}
                    >
                      {e.submitted ? "View" : "Open"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} limit={limit} onLimitChange={(n) => { setLimit(n); setPage(1); }} />
    </div>
  );
}
