"use client";

import { useMemo, useState } from "react";
import { ClassPerson } from "@/lib/api";
import adminStyles from "./admin/admin.module.css";
import ListToolbar from "./admin/ListToolbar";
import Pagination from "./Pagination";

function Group({
  label,
  people,
  unreadBySender,
  onOpenChat,
}: {
  label: string;
  people: ClassPerson[];
  unreadBySender: Record<string, number>;
  onOpenChat: (person: ClassPerson) => void;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = people.filter(
      (p) => !q || p.name.toLowerCase().includes(q) || (p.email || "").toLowerCase().includes(q)
    );
    list.sort((a, b) => {
      if (sort === "unread") {
        const d = (unreadBySender[b._id] || 0) - (unreadBySender[a._id] || 0);
        if (d) return d;
      }
      return sort === "name_desc" ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
    });
    return list;
  }, [people, search, sort, unreadBySender]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * limit, safePage * limit);

  return (
    <section className={adminStyles.section} style={{ marginBottom: 16 }}>
      <div className={adminStyles.sectionHead}>
        <div>
          <h2 className={adminStyles.sectionTitle}>{label}</h2>
          <p className={adminStyles.sectionSubtitle}>{people.length} in your batch</p>
        </div>
      </div>

      {people.length === 0 ? (
        <p className={adminStyles.empty}>No one here yet.</p>
      ) : (
        <>
          <ListToolbar
            search={search}
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder={`Search ${label.toLowerCase()} by name or email...`}
            sort={{
              key: "sort",
              label: "Sort",
              value: sort,
              onChange: (v) => {
                setSort(v);
                setPage(1);
              },
              options: [
                { value: "name", label: "Name A–Z" },
                { value: "name_desc", label: "Name Z–A" },
                { value: "unread", label: "Unread first" },
              ],
            }}
            onClear={() => {
              setSearch("");
              setSort("name");
              setPage(1);
            }}
            total={filtered.length}
          />

          {filtered.length === 0 ? (
            <p className={adminStyles.empty}>No one matches your search.</p>
          ) : (
            <div className={adminStyles.tableWrap}>
              <table className={adminStyles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => {
                    const unread = unreadBySender[p._id] || 0;
                    return (
                      <tr key={p._id}>
                        <td style={{ wordBreak: "break-word" }}>{p.name}</td>
                        <td style={{ wordBreak: "break-all" }}>{p.email}</td>
                        <td>
                          <button className={adminStyles.smallButton} type="button" onClick={() => onOpenChat(p)}>
                            Message
                            {unread > 0 && (
                              <span className={adminStyles.badgePending} style={{ marginLeft: 6 }}>
                                {unread}
                              </span>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            page={safePage}
            totalPages={totalPages}
            total={filtered.length}
            onPageChange={setPage}
            limit={limit}
            onLimitChange={(n) => {
              setLimit(n);
              setPage(1);
            }}
          />
        </>
      )}
    </section>
  );
}

export default function ClassNetworkDirectory({
  teachers,
  students,
  unreadBySender,
  onOpenChat,
}: {
  teachers: ClassPerson[];
  students: ClassPerson[];
  unreadBySender: Record<string, number>;
  onOpenChat: (person: ClassPerson) => void;
}) {
  return (
    <div>
      <Group label="Teachers" people={teachers} unreadBySender={unreadBySender} onOpenChat={onOpenChat} />
      <Group label="Students" people={students} unreadBySender={unreadBySender} onOpenChat={onOpenChat} />
    </div>
  );
}
