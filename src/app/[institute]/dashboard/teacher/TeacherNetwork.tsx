"use client";

import { useEffect, useState, useCallback } from "react";
import { useTeacherBatch } from "@/context/TeacherBatchContext";
import { api, ClassPerson } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "./teacher.module.css";
import ClassNetworkDirectory from "../ClassNetworkDirectory";
import ChatPanel from "../ChatPanel";
import BatchSwitcher from "./BatchSwitcher";

export default function TeacherNetwork() {
  const { activeBatchId, activeBatch } = useTeacherBatch();
  const [students, setStudents] = useState<ClassPerson[]>([]);
  const [teachers, setTeachers] = useState<ClassPerson[]>([]);
  const [unreadBySender, setUnreadBySender] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activePerson, setActivePerson] = useState<ClassPerson | null>(null);

  const load = useCallback(async () => {
    if (!activeBatchId) return;
    setLoading(true);
    try {
      const [dir, unread] = await Promise.all([
        api.teacherBatchNetwork(activeBatchId),
        api.chatUnreadSummary(),
      ]);
      setStudents(dir.students);
      setTeachers(dir.teachers);
      setUnreadBySender(unread.bySender);
    } finally {
      setLoading(false);
    }
  }, [activeBatchId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Class Network</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Students and other teachers in {activeBatch?.name || "your batch"}.
      </p>

      <BatchSwitcher />

      {activePerson && (
        <ChatPanel person={activePerson} onClose={() => setActivePerson(null)} onRead={load} />
      )}

      {loading && (
        <div className={styles.loadingRow}>
          <span className={styles.spinner} aria-hidden="true" />
          <span>Loading network…</span>
        </div>
      )}

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
