"use client";

import { useEffect, useState, useCallback } from "react";
import { api, Tool } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import styles from "./teacher.module.css";
import Pagination from "../Pagination";

const PAGE_SIZE = 10;

export default function Tools() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    return api
      .teacherTools({ page, limit: PAGE_SIZE })
      .then((res) => {
        setTools(res.tools);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Tools</h1>
      <p className={dashboardStyles.pageSubtitle}>Tools your admin has shared with you.</p>

      <section className={adminStyles.section}>
        {!loading && tools.length === 0 && (
          <div className={styles.emptyBlock}>
            <span className={styles.emptyIcon} aria-hidden="true" />
            <p className={styles.emptyText}>No tools have been added yet.</p>
          </div>
        )}

        {tools.length > 0 && (
          <div className={`${adminStyles.tableWrap} ${styles.tableHoverWrap}`}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tools.map((t) => (
                  <tr key={t._id}>
                    <td>{t.name}</td>
                    <td>
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={adminStyles.smallButton}
                        style={{ display: "inline-block", textDecoration: "none" }}
                      >
                        Open
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </section>
    </div>
  );
}
