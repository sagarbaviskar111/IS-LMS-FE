"use client";

import { ClassPerson } from "@/lib/api";
import adminStyles from "./admin/admin.module.css";

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
  const renderGroup = (label: string, people: ClassPerson[]) => (
    <section className={adminStyles.section} style={{ marginBottom: 16 }}>
      <div className={adminStyles.sectionHead}>
        <div>
          <h2 className={adminStyles.sectionTitle}>{label}</h2>
          <p className={adminStyles.sectionSubtitle}>{people.length} in your batch</p>
        </div>
      </div>

      {people.length === 0 && <p className={adminStyles.empty}>No one here yet.</p>}

      {people.length > 0 && (
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
              {people.map((p) => {
                const unread = unreadBySender[p._id] || 0;
                return (
                  <tr key={p._id}>
                    <td>{p.name}</td>
                    <td>{p.email}</td>
                    <td>
                      <button className={adminStyles.smallButton} onClick={() => onOpenChat(p)}>
                        Message
                        {unread > 0 && <span className={adminStyles.badgePending} style={{ marginLeft: 6 }}>{unread}</span>}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  return (
    <div>
      {renderGroup("Teachers", teachers)}
      {renderGroup("Students", students)}
    </div>
  );
}
