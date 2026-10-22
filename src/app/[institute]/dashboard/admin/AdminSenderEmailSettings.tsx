"use client";

import adminStyles from "./admin.module.css";
import EmailSenderSettings from "../EmailSenderSettings";

const STEPS = [
  <>
    Use (or create) a Gmail account for your institute, e.g. <strong>yourinstitute@gmail.com</strong>.
    Students will see mails coming from this address.
  </>,
  <>
    Open{" "}
    <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer">
      Google Account &gt; Security
    </a>{" "}
    and turn on <strong>2-Step Verification</strong> (required by Google for app passwords).
  </>,
  <>
    Open{" "}
    <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">
      App Passwords
    </a>
    , type any name (e.g. &quot;Institute Dashboard&quot;) and click <strong>Create</strong>.
  </>,
  <>
    Google shows a <strong>16-character password</strong>. Copy it (spaces don&apos;t matter) and paste it
    below together with your Gmail address, then click <strong>Save</strong>.
  </>,
];

export default function AdminSenderEmailSettings() {
  return (
    <div>
      <section className={adminStyles.section} style={{ marginBottom: 16 }}>
        <div className={adminStyles.sectionHead}>
          <div>
            <h2 className={adminStyles.sectionTitle}>How to set this up (about 2 minutes)</h2>
            <p className={adminStyles.sectionSubtitle}>
              Emails to your students, teachers and telecallers — like password-reset links — are sent
              from <strong>your own Gmail</strong>, not a shared address. Nothing is sent until you
              complete this.
            </p>
          </div>
        </div>
        <ol style={{ paddingLeft: 20, display: "grid", gap: 8, color: "var(--foreground)" }}>
          {STEPS.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
        <p className={adminStyles.sectionSubtitle} style={{ marginTop: 12 }}>
          Your app password is stored encrypted and is never shown again. You can replace it any time.
        </p>
      </section>

      <EmailSenderSettings />
    </div>
  );
}
