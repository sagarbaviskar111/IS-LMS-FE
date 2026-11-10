import type { Metadata } from "next";
import LandingNav from "../LandingNav";
import LandingPricing from "../LandingPricing";
import SiteFooter from "@/components/SiteFooter";
import sharedStyles from "../landing.module.css";
import styles from "../LandingPricing.module.css";

export const metadata: Metadata = {
  title: "Pricing | InstituteSathi",
  description: "Plans for coaching institutes. Free trial, no card, and 0% cut from the fees you collect.",
};

const FAQ: [string, string][] = [
  ["Do you take a share of the fees we collect?", "No. Each institute connects its own Razorpay account, so student fees go to you directly. You pay only the plan price."],
  ["Is GST included in the price?", "Prices are shown before GST. GST is added at checkout and shown on the invoice."],
  ["What happens when the trial ends?", "Your data stays. You can keep using what you have, but adding new students needs a paid plan until you subscribe."],
  ["What happens if I go over my student limit?", "You will be asked to move to a bigger plan before you can add more students. Nobody is removed."],
  ["Can I change plans later?", "Yes. Pick another plan from the Billing page in your dashboard whenever you like."],
];

export default function PricingPage() {
  return (
    <div className={sharedStyles.page}>
      <LandingNav />
      <LandingPricing standalone />
      <section className={sharedStyles.section}>
        <div className={sharedStyles.container}>
          <div className={styles.faq}>
            <h2>Billing questions</h2>
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
