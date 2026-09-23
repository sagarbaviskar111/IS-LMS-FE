"use client";

import { useEffect, useState } from "react";
import { api, Lead, LeadStatus } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "./TelecallerOverview.module.css";

const STATS: { key: LeadStatus; label: string; accent: string }[] = [
  { key: "new", label: "New", accent: styles.accentNew },
  { key: "contacted", label: "Contacted", accent: styles.accentContacted },
  { key: "interested", label: "Interested", accent: styles.accentInterested },
  { key: "converted", label: "Converted", accent: styles.accentConverted },
];

export default function TelecallerOverview() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .myLeads()
      .then((res) => setLeads(res.leads))
      .finally(() => setLoading(false));
  }, []);

  const counts = STATS.reduce<Record<string, number>>((acc, s) => {
    acc[s.key] = leads.filter((l) => l.status === s.key).length;
    return acc;
  }, {});

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Telecaller dashboard</h1>
      <p className={dashboardStyles.pageSubtitle}>Your leads and follow-ups.</p>

      <div className={dashboardStyles.cardGrid}>
        <div className={`${dashboardStyles.card} ${styles.card} ${styles.accentTotal}`}>
          <p className={dashboardStyles.cardLabel}>Total Leads</p>
          {loading ? (
            <span className={styles.loadingValue} aria-hidden="true" />
          ) : (
            <p className={dashboardStyles.cardValue}>{leads.length}</p>
          )}
        </div>
        {STATS.map((s) => (
          <div className={`${dashboardStyles.card} ${styles.card} ${s.accent}`} key={s.key}>
            <p className={dashboardStyles.cardLabel}>{s.label}</p>
            {loading ? (
              <span className={styles.loadingValue} aria-hidden="true" />
            ) : (
              <p className={dashboardStyles.cardValue}>{counts[s.key] ?? 0}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
