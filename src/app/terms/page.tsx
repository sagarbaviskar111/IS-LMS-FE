import type { Metadata } from "next";
import Link from "next/link";
import SitePage, { siteStyles as s } from "@/components/SitePage";
import { SITE } from "@/lib/siteInfo";

export const metadata: Metadata = {
  title: "Terms of Service | InstituteSathi",
  description: "The rules for using InstituteSathi as an institute, teacher, telecaller or student.",
};

const SECTIONS = [
  ["about", "What InstituteSathi is"],
  ["accounts", "Accounts and roles"],
  ["institutes", "What institutes agree to"],
  ["students", "What students agree to"],
  ["fees", "Fees and online payments"],
  ["content", "Content and files"],
  ["use", "Acceptable use"],
  ["certificates", "Certificates"],
  ["availability", "Availability"],
  ["suspension", "Suspension and ending an account"],
  ["liability", "Our responsibility"],
  ["law", "Governing law"],
  ["contact", "Contact"],
];

export default function TermsPage() {
  return (
    <SitePage
      eyebrow="Legal"
      title="Terms of Service"
      intro="These terms apply when you use InstituteSathi, whether as an institute owner, admin, teacher, telecaller or student. By creating an account or using the service you agree to them."
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
        <h2 id="about">1. What InstituteSathi is</h2>
        <p>
          InstituteSathi (run by {SITE.legalName}, &quot;we&quot;, &quot;us&quot;) is software that coaching institutes use to manage admissions,
          batches, attendance, study material, exams, fees, leads and certificates. We provide the software. We are not a school or coaching institute, and
          we do not teach, certify or employ anyone on an institute&apos;s behalf.
        </p>
        <p>
          Each institute is an independent business with its own students and its own agreement with them. Our relationship with students&apos; personal data
          is explained in our <Link href="/privacy">Privacy Policy</Link>.
        </p>

        <h2 id="accounts">2. Accounts and roles</h2>
        <ul>
          <li>You must give correct details and keep them up to date.</li>
          <li>Keep your password private. You are responsible for what happens under your account, so tell us at once if you think someone else has access.</li>
          <li>An institute&apos;s admin creates or approves the teachers, telecallers and students in that institute and decides what each role can see.</li>
          <li>You must be 18 or older to open an institute (admin) account. A student under 18 may join only with a parent&apos;s or guardian&apos;s consent.</li>
        </ul>

        <h2 id="institutes">3. What institutes agree to</h2>
        <p>If you run an institute on InstituteSathi, you also agree that:</p>
        <ul>
          <li>You have the right to collect and use your students&apos; and staff&apos;s data, and you will collect only what you need, tell them why, and get the consent the law requires (including a parent&apos;s or guardian&apos;s consent for minors).</li>
          <li>The course details, fees, instalment plans, refund rules and terms you set are your own. You are responsible for them and for honouring them.</li>
          <li>Your Razorpay account and keys are yours. You must have a valid Razorpay account, keep your keys safe, and follow Razorpay&apos;s terms.</li>
          <li>You will handle identity documents and personal data responsibly and remove them when you no longer need them.</li>
          <li>You are responsible for taxes (including GST where it applies) on the fees you collect.</li>
          <li>You will answer your students&apos; questions and complaints about your courses and fees.</li>
        </ul>

        <h2 id="students">4. What students agree to</h2>
        <ul>
          <li>Provide true details and genuine documents when you register. Fake documents or a photo of someone else can lead to cancellation of your admission.</li>
          <li>Do not share your login, exam answers, recordings or study material with people outside your batch.</li>
          <li>Pay fees on time as per the plan you chose. An institute may deactivate access to its dashboard when fees stay unpaid after the grace period shown to you.</li>
          <li>Your institute, not InstituteSathi, is responsible for the teaching and for the terms of your course.</li>
        </ul>

        <h2 id="fees">5. Fees and online payments</h2>
        <ul>
          <li>Course fees are paid to the institute. Online payments are made through <strong>the institute&apos;s own Razorpay account</strong>, which means the money goes straight to the institute. We do not receive, hold or pay out student fees.</li>
          <li>The amount to pay is set by the institute and calculated by our server. It cannot be changed from the browser.</li>
          <li>A payment is recorded only after Razorpay confirms it. If you paid but the page did not confirm, do not pay again: it is recorded automatically within a few minutes. If it is not, contact your institute with the Razorpay payment ID.</li>
          <li>Payment records and receipts are permanent accounting records and cannot be deleted.</li>
          <li>Refunds are decided by the institute under its own policy. See our <Link href="/refund-policy">Refund Policy</Link> for how they work.</li>
          <li>InstituteSathi is currently offered to institutes without a subscription charge. If we introduce paid plans, we will tell you in advance and they will not apply to you until you accept them.</li>
        </ul>

        <h2 id="content">6. Content and files</h2>
        <p>
          You keep the rights to what you upload (study material, recordings, assignments, logos, certificate designs). You give us permission to store,
          process and show it to the people you choose in the platform, only so we can run the service. You promise you have the right to upload it and that
          it does not break anyone&apos;s copyright or the law.
        </p>

        <h2 id="use">7. Acceptable use</h2>
        <p>Do not:</p>
        <ul>
          <li>use the platform for anything unlawful, misleading or abusive;</li>
          <li>try to access another institute&apos;s data, or any account that is not yours;</li>
          <li>upload viruses, or try to disrupt, overload or reverse-engineer the service;</li>
          <li>send spam or unwanted messages through the platform;</li>
          <li>use someone else&apos;s identity, documents or signature.</li>
        </ul>

        <h2 id="certificates">8. Certificates</h2>
        <p>
          A certificate is issued by the institute named on it, not by InstituteSathi. Each certificate has a QR code and a verification page that shows
          whether the institute still considers it valid. The institute can revoke a certificate it issued by mistake.
        </p>

        <h2 id="availability">9. Availability</h2>
        <p>
          We work to keep the service running, but we cannot promise it will always be available or error-free. We may carry out maintenance, add features
          or change or remove features. We will try to give notice of changes that significantly affect you.
        </p>

        <h2 id="suspension">10. Suspension and ending an account</h2>
        <p>
          You can stop using the service at any time. We may suspend or close an account that breaks these terms, puts others at risk, or is used to cheat or
          defraud. An institute may deactivate a student&apos;s access as described in section 4. When an account closes we handle its data as described in our{" "}
          <Link href="/privacy#retention">Privacy Policy</Link>; payment records are kept as the law requires.
        </p>

        <h2 id="liability">11. Our responsibility</h2>
        <p>
          The service is provided &quot;as is&quot;. To the extent the law allows, we are not responsible for indirect or consequential losses, for loss of
          profit or admissions, for how an institute runs its courses or handles refunds, or for outages of services we rely on, such as Razorpay, Google or
          the internet. Where we are found responsible for a loss, our total liability is limited to the amount you paid us for the service in the last 12
          months (and is nil if you paid us nothing). Nothing in these terms limits liability that cannot lawfully be limited.
        </p>
        <p>
          If a dispute arises between an institute and a student about fees, refunds or teaching, it is between them; we will cooperate by providing the
          records the platform holds.
        </p>

        <h2 id="law">12. Governing law</h2>
        <p>
          These terms are governed by the laws of India. Courts at {SITE.jurisdictionCity} have jurisdiction over disputes, subject to any right you have
          under consumer-protection law to approach the forum nearest to you.
        </p>

        <h2 id="contact">13. Contact</h2>
        <p>
          Questions about these terms? Write to <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> or visit our{" "}
          <Link href="/contact">Contact page</Link>. We may update these terms; the &quot;Last updated&quot; date shows the current version, and continuing
          to use the service after a change means you accept it.
        </p>
      </div>
    </SitePage>
  );
}
