import type { Metadata } from "next";
import Link from "next/link";
import SitePage, { siteStyles as s } from "@/components/SitePage";
import { SITE } from "@/lib/siteInfo";

export const metadata: Metadata = {
  title: "Contact | InstituteSathi",
  description: "Reach the InstituteSathi team for support, sales or privacy questions.",
};

export default function ContactPage() {
  return (
    <SitePage
      eyebrow="Contact"
      title="Get in touch"
      intro="Questions about setting up your institute, a problem with the dashboard, or anything about your data? Write to us."
    >
      <div className={s.grid}>
        <div className={s.card}>
          <h3>Support and sales</h3>
          <p>Setup help, demos and questions about the product.</p>
          <p style={{ marginTop: 10 }}>
            <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>
          </p>
        </div>
        <div className={s.card}>
          <h3>Phone</h3>
          <p>Reach us during working hours.</p>
          <p style={{ marginTop: 10 }}>
            <a href={`tel:${SITE.phone.replace(/[^\d+]/g, "")}`}>{SITE.phone}</a>
          </p>
        </div>
        <div className={s.card}>
          <h3>Privacy and data requests</h3>
          <p>To see, correct or delete your data, or to make a complaint.</p>
          <p style={{ marginTop: 10 }}>
            <a href={`mailto:${SITE.privacyEmail}`}>{SITE.privacyEmail}</a>
          </p>
        </div>
      </div>

      <div className={s.prose}>
        <h2 style={{ marginTop: 0 }}>Registered office</h2>
        <p>
          {SITE.legalName}
          <br />
          {SITE.address}
        </p>

        <h2>Are you a student?</h2>
        <p>
          Your fees, classes, results and certificates are handled by your own institute. For a fee, refund or admission question, contact your
          institute first; we can help with problems using the website. If you paid and it is not showing, please read our{" "}
          <Link href="/refund-policy">Refund Policy</Link> before paying again.
        </p>

        <h2>Grievance Officer</h2>
        <p>
          {SITE.grievanceOfficer.name} &middot; <a href={`mailto:${SITE.grievanceOfficer.email}`}>{SITE.grievanceOfficer.email}</a>
          <br />
          See the <Link href="/privacy#grievance">Privacy Policy</Link> for how complaints are handled.
        </p>
      </div>
    </SitePage>
  );
}
