import sharedStyles from "./landing.module.css";
import styles from "./LandingPricing.module.css";
import PricingCards, { PricingPlan, PricingSettings } from "./PricingCards";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/+$/, "");

async function loadPlans(): Promise<{ plans: PricingPlan[]; settings: PricingSettings } | null> {
  try {
    const res = await fetch(`${API_URL}/api/billing/plans`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { plans?: PricingPlan[]; settings?: PricingSettings };
    if (!data.settings || !data.plans) return null;
    if (data.settings.pricingMode === "plan" && data.plans.length === 0) return null;
    return { plans: data.plans, settings: data.settings };
  } catch {
    return null;
  }
}

// Plans and prices come from the superadmin's billing settings. If the API is
// unreachable the section is hidden rather than showing stale numbers.
export default async function LandingPricing({ standalone = false }: { standalone?: boolean }) {
  const data = await loadPlans();
  const Heading = standalone ? "h1" : "h2";
  if (!data) return null;
  return (
    <section id="pricing" className={standalone ? sharedStyles.section : sharedStyles.sectionAlt}>
      <div className={sharedStyles.container}>
        <div className={sharedStyles.sectionHead}>
          <span className={sharedStyles.eyebrow}>Pricing</span>
          <Heading className={sharedStyles.sectionTitle}>Simple pricing, no cut from your fees</Heading>
          <p className={sharedStyles.sectionSubtitle}>
            Student fees go straight to your own Razorpay account. We charge 0% on them. You only pay the plan below.
          </p>
        </div>
        <PricingCards plans={data.plans} settings={data.settings} />
      </div>
    </section>
  );
}
