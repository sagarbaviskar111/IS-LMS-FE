"use client";

import dashboardStyles from "../dashboard.module.css";
import NotificationInbox from "../NotificationInbox";

export default function StudentNotifications() {
  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Notifications</h1>
      <p className={dashboardStyles.pageSubtitle}>Updates from your admin and teachers.</p>
      <NotificationInbox />
    </div>
  );
}
