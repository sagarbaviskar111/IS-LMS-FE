"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "./admin.module.css";
import AdminBrandingSettings from "./AdminBrandingSettings";
import AdminYoutubeSettings from "./AdminYoutubeSettings";
import AdminPasswordResetSettings from "./AdminPasswordResetSettings";
import AdminLeadIntegrations from "./AdminLeadIntegrations";

const TABS = [
  {
    key: "branding",
    label: "Branding",
    hint: "Your institute's own login address, logo and accent color — shown to your students, teachers and telecallers.",
  },
  {
    key: "youtube",
    label: "YouTube",
    hint: "Connect the YouTube account teachers upload session recordings to.",
  },
  {
    key: "password-resets",
    label: "Password Resets",
    hint: "How your team gets a new password when they forget theirs, and the Gmail sender it goes out from.",
  },
  {
    key: "lead-integrations",
    label: "Lead Integrations",
    hint: "Feed leads in automatically from a Google Sheet, another website, or any tool that can make a web request.",
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function AdminSettingsInner() {
  const searchParams = useSearchParams();
  const initialTab = TABS.find((t) => t.key === searchParams.get("tab"))?.key || "branding";
  const [tab, setTab] = useState<TabKey>(initialTab);
  const active = TABS.find((t) => t.key === tab) || TABS[0];

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Settings</h1>
      <p className={dashboardStyles.pageSubtitle}>{active.hint}</p>

      <div className={adminStyles.tabsRow}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? adminStyles.tabActive : adminStyles.tab}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "branding" && <AdminBrandingSettings />}
      {tab === "youtube" && <AdminYoutubeSettings />}
      {tab === "password-resets" && <AdminPasswordResetSettings />}
      {tab === "lead-integrations" && <AdminLeadIntegrations />}
    </div>
  );
}

export default function AdminSettings() {
  return (
    <Suspense fallback={null}>
      <AdminSettingsInner />
    </Suspense>
  );
}
