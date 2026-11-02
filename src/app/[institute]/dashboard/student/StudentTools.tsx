"use client";

import { useEffect, useState, useCallback } from "react";
import { api, Tool } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import StudentEmptyState from "./StudentEmptyState";
import StudentLoading from "./StudentLoading";
import Pagination from "../Pagination";
import ListToolbar from "../admin/ListToolbar";
import { useDebounced } from "../admin/useDebounced";



export default function StudentTools() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const q = useDebounced(search);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    return api
      .studentTools({ page, limit, q, sort })
      .then((res) => {
        setTools(res.tools);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [page, limit, q, sort]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Tools</h1>
      <p className={dashboardStyles.pageSubtitle}>Tools your admin has shared with you.</p>

      <section className={adminStyles.section}>
        <ListToolbar
          search={search}
          onSearch={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search tools by name or link"
          sort={{
            key: "sort",
            label: "Sort by",
            value: sort,
            options: [
              { value: "name", label: "Name (A-Z)" },
              { value: "newest", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
            ],
            onChange: (v) => { setSort(v); setPage(1); },
          }}
          onClear={() => { setSearch(""); setSort("name"); setPage(1); }}
          total={total}
        />
        {loading && <StudentLoading />}
        {!loading && tools.length === 0 && (
          <StudentEmptyState title={q ? "No matching tools" : "No tools yet"} hint={q ? "Try a different search." : "Your admin hasn't added any tools yet."} />
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
                    <td style={{ overflowWrap: "anywhere" }}>{t.name}</td>
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

        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} limit={limit} onLimitChange={(n) => { setLimit(n); setPage(1); }} />
      </section>
    </div>
  );
}
