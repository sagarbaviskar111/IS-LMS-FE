"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, BillingAccess } from "@/lib/api";

// Slim notice above the dashboard for institute admins: trial ending, plan
// ended, or student limit nearly reached. Renders nothing otherwise.
export default function BillingBanner({ base, role }: { base: string; role: string }) {
  const [access, setAccess] = useState<BillingAccess | null>(null);

  useEffect(() => {
    if (role !== "admin") return;
    let alive = true;
    api
      .myBilling()
      .then((r) => alive && setAccess(r.access))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [role]);

  if (role !== "admin" || !access || access.state === "legacy") return null;

  let text = "";
  let urgent = false;
  if (access.state === "expired") {
    text = "Your plan has ended. You cannot add new students until you renew.";
    urgent = true;
  } else if (access.state === "trial" && access.daysLeft !== null && access.daysLeft <= 5) {
    text = access.daysLeft > 0 ? `Your free trial ends in ${access.daysLeft} day${access.daysLeft === 1 ? "" : "s"}.` : "Your free trial ends today.";
    urgent = access.daysLeft <= 2;
  } else if (access.limit > 0 && access.used / access.limit >= 0.9) {
    text = access.used >= access.limit ? `Student limit reached (${access.limit}).` : `${access.used} of ${access.limit} students used.`;
    urgent = access.used >= access.limit;
  }
  if (!text) return null;

  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        padding: "9px 14px",
        marginBottom: 16,
        borderRadius: "var(--radius-md)",
        border: `1px solid ${urgent ? "var(--danger)" : "var(--brand-border)"}`,
        background: urgent ? "var(--danger-soft)" : "var(--brand-soft)",
        color: "var(--foreground)",
        fontSize: "0.85rem",
      }}
    >
      <span>{text}</span>
      <Link href={`${base}/dashboard/admin/billing`} style={{ fontWeight: 600, color: "var(--brand-dark, var(--brand))" }}>
        Open billing
      </Link>
    </div>
  );
}
