"use client";

import { useEffect, useState } from "react";
import { api, Tool } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import StudentEmptyState from "./StudentEmptyState";
import StudentLoading from "./StudentLoading";

export default function StudentTools() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .studentTools()
      .then((res) => setTools(res.tools))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Tools</h1>
      <p className={dashboardStyles.pageSubtitle}>Tools your admin has shared with you.</p>

      <section className={adminStyles.section}>
        {loading && <StudentLoading />}
        {!loading && tools.length === 0 && (
          <StudentEmptyState title="No tools yet" hint="Your admin hasn't added any tools yet." />
        )}

        {tools.length > 0 && (
          <div className={`${adminStyles.tableWrap} table-scroll`}>
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
      </section>
    </div>
  );
}
