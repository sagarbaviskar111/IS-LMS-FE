"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import adminStyles from "./admin.module.css";

// Fee reminders and password-reset links go out from the institute's own Gmail.
// Until it is connected nothing is sent, so say so on the pages that depend on it.
export default function SenderEmailWarning() {
  const { institute } = useParams<{ institute: string }>();
  const [state, setState] = useState<{ connected: boolean; sentToday: number; limit: number } | null>(null);

  useEffect(() => {
    api
      .getEmailSettings()
      .then((r) => setState({ connected: r.hasCredentials, sentToday: r.sentToday, limit: r.reminderLimit }))
      .catch(() => {});
  }, []);

  if (!state) return null;

  if (!state.connected) {
    return (
      <section className={adminStyles.section} style={{ marginBottom: 20, borderColor: "var(--warning)" }}>
        <h2 className={adminStyles.sectionTitle}>Set up your sender email</h2>
        <p className={adminStyles.sectionSubtitle} style={{ margin: "6px 0 12px" }}>
          Fee reminders are emailed to students from your institute&apos;s own Gmail. Until you connect it, no reminder is sent and students
          whose fee is due will get no warning before their account is deactivated.
        </p>
        <Link className={adminStyles.smallButton} href={`/${institute}/dashboard/admin/settings?tab=sender-email`}>
          Set up sender email
        </Link>
      </section>
    );
  }

  if (state.sentToday >= state.limit) {
    return (
      <p className={adminStyles.messageError} style={{ marginBottom: 20 }}>
        Today&apos;s limit of {state.limit} reminder emails is used up. The remaining reminders go out tomorrow, most overdue first.
      </p>
    );
  }

  return null;
}
