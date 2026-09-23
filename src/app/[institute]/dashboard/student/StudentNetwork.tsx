"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ClassPerson } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import ClassNetworkDirectory from "../ClassNetworkDirectory";
import ChatPanel from "../ChatPanel";
import StudentLoading from "./StudentLoading";

export default function StudentNetwork() {
  const [students, setStudents] = useState<ClassPerson[]>([]);
  const [teachers, setTeachers] = useState<ClassPerson[]>([]);
  const [unreadBySender, setUnreadBySender] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activePerson, setActivePerson] = useState<ClassPerson | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dir, unread] = await Promise.all([api.studentClassmates(), api.chatUnreadSummary()]);
      setStudents(dir.students);
      setTeachers(dir.teachers);
      setUnreadBySender(unread.bySender);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Class Network</h1>
      <p className={dashboardStyles.pageSubtitle}>Classmates and teachers in your batch.</p>

      {activePerson && (
        <ChatPanel person={activePerson} onClose={() => setActivePerson(null)} onRead={load} />
      )}

      {loading && <StudentLoading />}

      {!loading && (
        <ClassNetworkDirectory
          teachers={teachers}
          students={students}
          unreadBySender={unreadBySender}
          onOpenChat={setActivePerson}
        />
      )}
    </div>
  );
}
