import type { Metadata } from "next";
import SitePage, { siteStyles as s } from "@/components/SitePage";
import landing from "../landing.module.css";
import { SITE } from "@/lib/siteInfo";

export const metadata: Metadata = {
  title: "Careers | InstituteSathi",
  description: "Work with us on software for India's coaching institutes.",
};

const AREAS = [
  ["Engineering", "Next.js, Node.js and MongoDB. Payments, certificates, attendance and the many small details of a real institute."],
  ["Customer success", "Help institutes set up, move their records over and get their staff comfortable. Hindi and regional-language skills help."],
  ["Sales and partnerships", "Meet coaching institute owners, understand how they work and show them what would save their time."],
  ["Design", "Interfaces that a busy teacher or a first-time student can use without a manual."],
];

export default function CareersPage() {
  return (
    <SitePage
      eyebrow="Careers"
      title="Build software for India's coaching institutes"
      intro="We are a small team working on one thing: making an institute's daily work simpler."
    >
      <div className={s.prose}>
        <div className={s.note}>
          <strong>No open positions right now.</strong> We are always glad to hear from people who care about this problem, so feel free to introduce
          yourself.
        </div>

        <h2>Where we may hire</h2>
      </div>
      <div className={s.grid}>
        {AREAS.map(([title, text]) => (
          <div className={s.card} key={title}>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>

      <div className={s.prose}>
        <h2>How to reach us</h2>
        <p>
          Email <a href={`mailto:${SITE.supportEmail}?subject=Careers`}>{SITE.supportEmail}</a> with a few lines about yourself, what you have built or
          done, and the kind of work you want to do. A link to your work or CV helps. We read every message.
        </p>
        <div className={s.actions}>
          <a href={`mailto:${SITE.supportEmail}?subject=Careers`} className={landing.buttonPrimary}>
            Email us
          </a>
        </div>
      </div>
    </SitePage>
  );
}
