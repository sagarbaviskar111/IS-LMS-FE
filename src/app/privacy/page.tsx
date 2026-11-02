import type { Metadata } from "next";
import SitePage, { siteStyles as s } from "@/components/SitePage";
import { SITE } from "@/lib/siteInfo";

export const metadata: Metadata = {
  title: "Privacy Policy | InstituteSathi",
  description: "What personal data InstituteSathi collects from students, staff and institutes, why, and the rights you have over it.",
};

const SECTIONS = [
  ["who", "Who this policy covers"],
  ["collect", "What we collect"],
  ["why", "Why we use it"],
  ["share", "Who we share it with"],
  ["payments", "Payments"],
  ["cookies", "Cookies and local storage"],
  ["retention", "How long we keep it"],
  ["security", "How we protect it"],
  ["rights", "Your rights"],
  ["children", "Children and minors"],
  ["breach", "If something goes wrong"],
  ["grievance", "Grievance Officer"],
  ["changes", "Changes to this policy"],
];

export default function PrivacyPage() {
  return (
    <SitePage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="InstituteSathi runs the dashboard that coaching institutes use to manage students, fees, classes and certificates. This page explains, in plain words, what personal data we handle and what you can do about it."
      updated={SITE.legalUpdated}
    >
      <nav className={s.toc} aria-label="On this page">
        <p>On this page</p>
        <ol>
          {SECTIONS.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`}>{label}</a>
            </li>
          ))}
        </ol>
      </nav>

      <div className={s.prose}>
        <h2 id="who">1. Who this policy covers</h2>
        <p>
          {SITE.name} is a platform. Each coaching institute that uses it (&quot;the institute&quot;) runs its own space on the platform, with its own
          students, teachers and staff.
        </p>
        <ul>
          <li>
            <strong>For students, teachers and staff of an institute,</strong> the institute decides why and how your data is used. It is the
            &quot;Data Fiduciary&quot; under India&apos;s Digital Personal Data Protection Act, 2023 (DPDP Act). We, {SITE.legalName}, handle your data on
            the institute&apos;s behalf, as its service provider (&quot;Data Processor&quot;).
          </li>
          <li>
            <strong>For institute owners and admins who sign up, and for visitors to our website,</strong> we are the Data Fiduciary.
          </li>
        </ul>
        <p>
          Your institute may also have its own rules (for example, fee terms shown while you register). Those apply in addition to this policy.
        </p>

        <h2 id="collect">2. What we collect</h2>
        <h3>Account details</h3>
        <p>Name, email address, phone number, role (student, teacher, telecaller, admin) and a password. Passwords are stored only as a one-way hash.</p>
        <h3>Admission and identity details</h3>
        <p>
          When a student registers for a course through an institute&apos;s registration link, the institute can collect: date of birth, address, two ID
          proofs (photo or PDF), a live photo (selfie) for face verification, a signature image and acceptance of the course terms. These are used by the
          institute to verify who is enrolling.
        </p>
        <h3>Learning activity</h3>
        <p>Batches and courses, attendance, assignments and submitted files, exam answers and scores, study material and recordings you open, and certificates issued to you.</p>
        <h3>Fee and payment records</h3>
        <p>
          Amounts, dates, instalment schedules, receipt numbers, payment method and the Razorpay order and payment reference numbers. See{" "}
          <a href="#payments">Payments</a> below.
        </p>
        <h3>Enquiries</h3>
        <p>Name, phone number, email and notes about people who enquire about a course, entered by an institute&apos;s admin or telecallers.</p>
        <h3>Messages</h3>
        <p>Notifications, chat messages inside the dashboard, and emails the institute sends through the platform (such as fee reminders and password-reset links).</p>
        <h3>Technical data</h3>
        <p>Basic server logs such as IP address, browser type and the time of requests, kept to keep the service secure and working.</p>

        <h2 id="why">3. Why we use it</h2>
        <ul>
          <li>To create and run your account and show you the right dashboard.</li>
          <li>To let the institute verify admissions, manage batches, take attendance, run exams and issue certificates.</li>
          <li>To collect fees, record payments, issue receipts and remind you before a fee falls due.</li>
          <li>To send you service messages (password reset, fee reminders, notices from your institute).</li>
          <li>To keep the platform secure, prevent fraud and fix problems.</li>
          <li>To meet legal, accounting and tax requirements.</li>
        </ul>
        <p>
          We use your data for these purposes and not for advertising. We do not sell personal data. Where the law requires your consent, the institute
          or we ask for it when the data is collected, and you can withdraw it (see <a href="#rights">Your rights</a>).
        </p>

        <h2 id="share">4. Who we share it with</h2>
        <p>
          <strong>Your institute.</strong> Its admin, and the teachers and telecallers it chooses, can see the data of its own students. Other
          institutes on the platform cannot.
        </p>
        <p>We use a small number of service providers to run the platform. They process data only to provide their service to us:</p>
        <ul>
          <li><strong>Razorpay</strong> – online fee payments (see below).</li>
          <li><strong>Cloudinary</strong> – storage of uploaded files such as ID proofs, selfies, signatures, assignments and certificate templates. Identity documents are kept as private files that have no public link.</li>
          <li><strong>MongoDB Atlas and our hosting provider</strong> – where the application and its database run.</li>
          <li><strong>Google (Gmail and YouTube)</strong> – emails go out from the institute&apos;s own Gmail account; if an institute chooses YouTube for class recordings, those videos are stored on its own channel.</li>
        </ul>
        <p>We may also disclose data when a court, regulator or law-enforcement authority legally requires it, or to protect people&apos;s safety and our rights.</p>
        <p>Some of these providers keep data on servers outside India. We choose providers that use industry-standard security, and we share only what each service needs.</p>

        <h2 id="payments">5. Payments</h2>
        <p>
          Fees are paid to the institute through <strong>the institute&apos;s own Razorpay account</strong>. The money goes to the institute, not to us.
          Your card, UPI or bank details are entered on Razorpay&apos;s secure checkout. We never see or store them. We keep only the amount, date, status
          and Razorpay reference numbers, so the payment can be shown in your history and on your receipt.
        </p>
        <p>Razorpay handles your payment details under its own privacy policy.</p>

        <h2 id="cookies">6. Cookies and local storage</h2>
        <p>
          We use one essential cookie that keeps you logged in. It is not readable by scripts on the page and is not used for tracking. We also save your
          light/dark theme choice in your browser. We do not use advertising or cross-site tracking cookies.
        </p>

        <h2 id="retention">7. How long we keep it</h2>
        <ul>
          <li><strong>Account and learning data:</strong> while the account is in use, and afterwards for as long as the institute needs its records or the law requires.</li>
          <li><strong>Payment and receipt records:</strong> kept for the period required by accounting and tax law. For this reason they cannot be deleted on request, but they are never used for any other purpose.</li>
          <li><strong>Identity documents:</strong> kept with the admission record for as long as the institute needs them. The institute can remove them when no longer needed.</li>
          <li><strong>Enquiries:</strong> until the institute deletes them or the enquiry is converted into an admission.</li>
        </ul>
        <p>When data is no longer needed and no law requires us to keep it, it is deleted or made anonymous.</p>

        <h2 id="security">8. How we protect it</h2>
        <ul>
          <li>Connections use HTTPS.</li>
          <li>Passwords are hashed; payment keys and email passwords are stored encrypted.</li>
          <li>Identity documents are stored privately and opened only by the institute&apos;s admin through short-lived secure links.</li>
          <li>Each institute&apos;s data is separated from every other institute&apos;s.</li>
          <li>Payments are verified on our server against Razorpay before they are recorded.</li>
        </ul>
        <p>No system is perfectly secure, but we work to keep your data safe and fix weaknesses quickly.</p>

        <h2 id="rights">9. Your rights</h2>
        <p>Under the DPDP Act you can:</p>
        <ul>
          <li>ask for a summary of the personal data held about you and how it is used;</li>
          <li>ask us or your institute to correct inaccurate data or complete missing data;</li>
          <li>ask for your data to be erased, except where the law requires us to keep it (for example payment records);</li>
          <li>withdraw consent you gave, which may mean we can no longer provide some features;</li>
          <li>get your complaint heard and resolved (see Grievance Officer below);</li>
          <li>nominate another person to exercise these rights if you die or cannot do so.</li>
        </ul>
        <p>
          To use these rights, write to <a href={`mailto:${SITE.privacyEmail}`}>{SITE.privacyEmail}</a> from the email address on your account. If you are a
          student, you can also ask your institute directly. We aim to reply within 30 days. If we are not able to resolve your complaint, you can
          approach the Data Protection Board of India.
        </p>

        <h2 id="children">10. Children and minors</h2>
        <p>
          Many students are under 18. The institute must get a parent&apos;s or legal guardian&apos;s consent before enrolling a minor and before it
          collects that child&apos;s personal data. We do not show advertising to students, we do not track them for advertising, and we do not use
          their data in ways that could harm them.
        </p>
        <p>
          If you are a parent or guardian and want to see, correct or delete your child&apos;s data, contact the institute or write to us at the privacy
          address above.
        </p>

        <h2 id="breach">11. If something goes wrong</h2>
        <p>
          If a personal-data breach affects you, we will tell the institute and, where the law requires, the Data Protection Board and the people
          affected, explaining what happened and what you can do.
        </p>

        <h2 id="grievance">12. Grievance Officer</h2>
        <div className={s.note}>
          <strong>{SITE.grievanceOfficer.name}</strong>
          <br />
          {SITE.legalName}
          <br />
          {SITE.address}
          <br />
          Email: <a href={`mailto:${SITE.grievanceOfficer.email}`}>{SITE.grievanceOfficer.email}</a>
        </div>
        <p>Write to the Grievance Officer with your name, the email on your account and the details of your complaint. We acknowledge complaints promptly and aim to resolve them within 30 days.</p>

        <h2 id="changes">13. Changes to this policy</h2>
        <p>
          We may update this policy when the platform or the law changes. The &quot;Last updated&quot; date at the top shows the latest version. For
          significant changes we will tell account holders through the dashboard or by email.
        </p>
      </div>
    </SitePage>
  );
}
