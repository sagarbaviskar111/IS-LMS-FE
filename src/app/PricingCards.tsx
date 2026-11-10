"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./LandingPricing.module.css";

export interface PricingPlan {
  _id: string;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  studentLimit: number;
  features: string[];
  isPopular: boolean;
}

export interface PricingSettings {
  pricingMode: "plan" | "per_student";
  perStudentPrice: number;
  perStudentMin: number;
  yearlyDiscountPercent: number;
  trialDays: number;
  gstPercent: number;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function PricingCards({ plans, settings }: { plans: PricingPlan[]; settings: PricingSettings }) {
  const [interval, setInterval] = useState<"monthly" | "yearly">("yearly");
  const trial = settings.trialDays > 0 ? `${settings.trialDays}-day free trial, no card needed` : "Start in minutes";
  const gst = settings.gstPercent > 0 ? `+ ${settings.gstPercent}% GST` : "";

  const toggle = (
    <div className={styles.toggle} role="group" aria-label="Billing period">
      <button
        type="button"
        className={interval === "monthly" ? styles.toggleOn : styles.toggleOff}
        aria-pressed={interval === "monthly"}
        onClick={() => setInterval("monthly")}
      >
        Monthly
      </button>
      <button
        type="button"
        className={interval === "yearly" ? styles.toggleOn : styles.toggleOff}
        aria-pressed={interval === "yearly"}
        onClick={() => setInterval("yearly")}
      >
        Yearly
      </button>
    </div>
  );

  if (settings.pricingMode === "per_student") {
    const yearlyPerStudent = settings.perStudentPrice * (1 - settings.yearlyDiscountPercent / 100);
    const shown = interval === "yearly" ? yearlyPerStudent : settings.perStudentPrice;
    return (
      <div>
        {settings.yearlyDiscountPercent > 0 && toggle}
        <div className={styles.single}>
          <p className={styles.planName}>Pay for the students you have</p>
          <p className={styles.price}>
            <span className={styles.amount}>{inr(shown)}</span>
            <span className={styles.per}> per student / month {gst}</span>
          </p>
          <p className={styles.note}>
            Billed for at least {settings.perStudentMin} students.
            {interval === "yearly" && settings.yearlyDiscountPercent > 0
              ? ` Paying yearly takes ${settings.yearlyDiscountPercent}% off.`
              : ""}
          </p>
          <ul className={styles.features}>
            <li>Every feature included, no module add-ons</li>
            <li>Unlimited teachers, telecallers and sub-admins</li>
            <li>Fees collected into your own Razorpay account</li>
          </ul>
          <Link href="/get-started" className={styles.cta}>
            Start free trial
          </Link>
          <p className={styles.trial}>{trial}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {toggle}
      <div className={styles.grid}>
        {plans.map((p) => {
          const free = p.priceMonthly <= 0 && p.priceYearly <= 0;
          const price = interval === "yearly" ? p.priceYearly : p.priceMonthly;
          const perMonth = interval === "yearly" ? p.priceYearly / 12 : p.priceMonthly;
          const saved = p.priceMonthly * 12 - p.priceYearly;
          const perStudent = p.studentLimit > 0 && !free ? perMonth / p.studentLimit : 0;
          return (
            <div key={p._id} className={p.isPopular ? `${styles.plan} ${styles.planPopular}` : styles.plan}>
              {p.isPopular && <span className={styles.badge}>Most chosen</span>}
              <p className={styles.planName}>{p.name}</p>
              {p.tagline && <p className={styles.tagline}>{p.tagline}</p>}
              <p className={styles.price}>
                <span className={styles.amount}>{free ? "Free" : inr(price)}</span>
                {!free && <span className={styles.per}> / {interval === "yearly" ? "year" : "month"} {gst}</span>}
              </p>
              <p className={styles.note}>
                {free
                  ? "Free to use"
                  : interval === "yearly" && saved > 0
                    ? `${inr(perMonth)} a month, you save ${inr(saved)} a year`
                    : "Switch to yearly to pay less"}
              </p>
              <p className={styles.limit}>
                {p.studentLimit > 0 ? `Up to ${p.studentLimit.toLocaleString("en-IN")} students` : "Unlimited students"}
                {perStudent > 0 && <span className={styles.perStudent}> · about {inr(perStudent)} per student a month</span>}
              </p>
              <ul className={styles.features}>
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link href={`/get-started?plan=${p._id}`} className={p.isPopular ? styles.cta : styles.ctaPlain}>
                Start free trial
              </Link>
            </div>
          );
        })}
      </div>
      <p className={styles.trial}>{trial}</p>
    </div>
  );
}
