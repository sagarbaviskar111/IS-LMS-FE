import type { Metadata } from "next";
import Link from "next/link";
import SitePage, { siteStyles as s } from "@/components/SitePage";
import { SITE } from "@/lib/siteInfo";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | InstituteSathi",
  description: "How fee refunds, cancellations and failed or duplicate payments work on InstituteSathi.",
};

export default function RefundPolicyPage() {
  return (
    <SitePage
      eyebrow="Legal"
      title="Refund & Cancellation Policy"
      intro="Who decides a refund, how to ask for one, and what happens when a payment fails or is taken twice."
      updated={SITE.legalUpdated}
    >
      <div className={s.prose}>
        <div className={s.note}>
          In short: course fees go to your institute, so <strong>your institute decides refunds</strong> under the terms shown when you registered. Once
          it approves one, the money is returned to the same payment method, usually within 5–7 working days.
        </div>

        <h2>1. Course fees</h2>
        <p>
          Course fees are paid to the institute through its own Razorpay account. InstituteSathi does not receive or hold them, so we cannot refund them
          ourselves. Each institute sets its own cancellation and refund rules, which you can read in the course terms before you pay and which you accept
          when you register.
        </p>

        <h2>2. How to ask for a refund</h2>
        <ol>
          <li>Contact your institute&apos;s admin and tell them your name, the course and the receipt number from your payment history.</li>
          <li>The institute checks the request against its terms (for example, how many classes have been attended).</li>
          <li>If approved, the institute refunds the amount from its Razorpay dashboard to your original payment method.</li>
        </ol>
        <p>
          Banks and cards usually take <strong>5–7 working days</strong> to show the money after Razorpay processes a refund. UPI refunds are often faster.
          Amounts refunded are credited only to the account or card used to pay.
        </p>
        <p>
          If you cannot get a reply from your institute, write to <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> with your payment
          details. We will contact the institute, though the final decision stays with it.
        </p>

        <h2>3. Payment failed but money was deducted</h2>
        <p>
          If the payment fails but your account was debited, the bank or Razorpay automatically reverses it, normally within 5–7 working days. You do
          not need to do anything.
        </p>

        <h2>4. Paid, but it does not show in the dashboard</h2>
        <p>
          Do <strong>not</strong> pay again. Our server checks Razorpay every few minutes and records any payment that did not confirm on the page. If it
          is still missing after an hour, contact your institute with the Razorpay payment ID (it starts with <code>pay_</code>) from your payment SMS or
          email.
        </p>

        <h2>5. Paid twice or paid too much</h2>
        <p>
          If the same fee was paid twice, or you paid more than was due, the extra amount is flagged to the institute&apos;s admin. The institute will
          either adjust it against your next instalment or refund it to you.
        </p>

        <h2>6. Records stay</h2>
        <p>
          A refund does not delete the original payment from the records. Payments and receipts are permanent accounting records and are never removed.
        </p>

        <h2>7. InstituteSathi subscription</h2>
        <p>
          InstituteSathi is currently available to institutes without a subscription charge. If we introduce paid plans, this page will state their
          cancellation and refund terms before you are asked to pay.
        </p>

        <p>
          See also our <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </div>
    </SitePage>
  );
}
