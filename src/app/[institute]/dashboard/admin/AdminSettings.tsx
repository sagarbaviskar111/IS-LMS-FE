"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "./admin.module.css";
import AdminBrandingSettings from "./AdminBrandingSettings";
import AdminVideoSettings from "./AdminVideoSettings";
import AdminPasswordResetSettings from "./AdminPasswordResetSettings";
import AdminSenderEmailSettings from "./AdminSenderEmailSettings";
import AdminLeadIntegrations from "./AdminLeadIntegrations";
import AdminRazorpaySettings from "./AdminRazorpaySettings";

const TABS = [
  {
    key: "branding",
    label: "Branding",
    hint: "Your institute's own login address, logo and colors — shown to your students, teachers and telecallers.",
  },
  {
    key: "payments",
    label: "Online Payments",
    hint: "Connect your own Razorpay account so students can pay fees online straight into it.",
  },
  {
    key: "youtube",
    label: "Video Storage",
    hint: "Set up where teachers' session recordings are stored — a guided, step-by-step setup.",
  },
  {
    key: "sender-email",
    label: "Sender Email",
    hint: "Connect your own Gmail so emails to your students, teachers and telecallers go out from your address.",
  },
  {
    key: "password-resets",
    label: "Password Resets",
    hint: "How your team gets a new password when they forget theirs.",
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
      {tab === "payments" && <AdminRazorpaySettings />}
      {tab === "youtube" && <AdminVideoSettings />}
      {tab === "sender-email" && <AdminSenderEmailSettings />}
      {tab === "password-resets" && <AdminPasswordResetSettings onOpenSenderEmail={() => setTab("sender-email")} />}
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
