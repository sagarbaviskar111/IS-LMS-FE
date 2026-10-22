"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, LeadSummary } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "./TelecallerOverview.module.css";

export default function TelecallerOverview() {
  const { institute } = useParams<{ institute: string }>();
  const [summary, setSummary] = useState<LeadSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .leadSummary()
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  const stats: { label: string; value: number; accent: string }[] = [
    { label: "Total Leads", value: summary?.total ?? 0, accent: styles.accentTotal },
    { label: "Overdue follow-ups", value: summary?.overdue ?? 0, accent: styles.accentContacted },
    { label: "Due today", value: summary?.today ?? 0, accent: styles.accentContacted },
    { label: "New (not called)", value: summary?.byStatus.new ?? 0, accent: styles.accentNew },
    { label: "Interested", value: summary?.byStatus.interested ?? 0, accent: styles.accentInterested },
    { label: "Converted", value: summary?.byStatus.converted ?? 0, accent: styles.accentConverted },
  ];

  const urgent = (summary?.overdue ?? 0) + (summary?.today ?? 0);

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Telecaller dashboard</h1>
      <p className={dashboardStyles.pageSubtitle}>
        {loading
          ? "Your leads and follow-ups."
          : urgent > 0
          ? `You have ${urgent} follow-up${urgent === 1 ? "" : "s"} to do today.`
          : "No follow-ups due — a good time to call your new leads."}
      </p>

      <div className={dashboardStyles.cardGrid}>
        {stats.map((s) => (
          <div className={`${dashboardStyles.card} ${styles.card} ${s.accent}`} key={s.label}>
            <p className={dashboardStyles.cardLabel}>{s.label}</p>
            {loading ? (
              <span className={styles.loadingValue} aria-hidden="true" />
            ) : (
              <p className={dashboardStyles.cardValue}>{s.value}</p>
            )}
          </div>
        ))}
      </div>

      <p style={{ marginTop: 20 }}>
        <Link href={`/${institute}/dashboard/telecaller/leads`} className={dashboardStyles.card} style={{ display: "inline-block", padding: "10px 18px", fontWeight: 600 }}>
          Open my leads →
        </Link>
      </p>
    </div>
  );
}
