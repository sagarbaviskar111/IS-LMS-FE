import dashboardStyles from "../../dashboard.module.css";
import EmailSenderSettings from "../../EmailSenderSettings";

export default function SuperAdminEmailPage() {
  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Email Settings</h1>
      <p className={dashboardStyles.pageSubtitle}>
        The Gmail account your own password-reset emails are sent from.
      </p>
      <EmailSenderSettings />
    </div>
  );
}
