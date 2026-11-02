import type { Metadata } from "next";
import Link from "next/link";
import SitePage, { siteStyles as s } from "@/components/SitePage";
import landing from "../landing.module.css";

export const metadata: Metadata = {
  title: "About | InstituteSathi",
  description: "InstituteSathi is one dashboard for coaching institutes: admissions, fees, classes, exams, leads and certificates.",
};

const DOES = [
  ["Admissions that verify", "A registration link per course with ID proofs, a live photo, a signature and the fee, so the paperwork is done before the first class."],
  ["Fees that stay correct", "Instalments, due dates, reminders and online payments through the institute's own Razorpay account, with a receipt for every rupee."],
  ["Classes, attendance and exams", "Batches, attendance, assignments, study material, recordings and online tests for teachers and students."],
  ["Leads to students", "Telecallers follow up enquiries, and a converted lead becomes a registered student in a few clicks."],
  ["Certificates people can check", "Designed on the institute's own template, issued one by one or from an Excel sheet, each with a QR code anyone can verify."],
  ["Everyone in their own space", "Admin, teacher, telecaller and student each see only what they need, and one institute never sees another's data."],
];

const VALUES = [
  ["Built around how institutes work", "Most coaching classes run on registers, WhatsApp groups and Excel sheets. We start from that routine and make it lighter, not replace it with something foreign."],
  ["Money goes straight to the institute", "Every institute connects its own Razorpay account. Fees never pass through us, and the amount is always set by the institute, never by the browser."],
  ["Records you can trust", "Payments and receipts are never deleted, and a payment is recorded only after it is confirmed, so the books match the bank."],
  ["Respect for student data", "Identity documents are kept private and opened only by the institute's admin. See how in our privacy policy."],
];

export default function AboutPage() {
  return (
    <SitePage
      eyebrow="About us"
      title="One dashboard for the whole coaching institute"
      intro="InstituteSathi helps coaching institutes spend less time on registers, fee chasing and spreadsheets, and more time teaching."
    >
      <div className={s.prose}>
        <h2 style={{ marginTop: 0 }}>Why we built it</h2>
        <p>
          A typical coaching institute runs on many small tools: a paper register for attendance, a notebook for fees, WhatsApp groups for notices, a
          spreadsheet for enquiries and a printer for certificates. Each works on its own, and together they eat the owner&apos;s evenings.
        </p>
        <p>
          InstituteSathi brings these into one place for admins, teachers, telecallers and students, with each person seeing only their own part of it.
        </p>
      </div>

      <div className={s.prose}>
        <h2>What it does</h2>
      </div>
      <div className={s.grid}>
        {DOES.map(([title, text]) => (
          <div className={s.card} key={title}>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>

      <div className={s.prose}>
        <h2>What we care about</h2>
      </div>
      <div className={s.grid}>
        {VALUES.map(([title, text]) => (
          <div className={s.card} key={title}>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>

      <div className={s.prose}>
        <h2>Who it is for</h2>
        <p>
          Coaching classes and training institutes of any size in India, from a single-branch tuition class to a multi-course academy. If you take
          admissions, collect fees and run batches, it is meant for you.
        </p>
        <div className={s.actions}>
          <Link href="/signup" className={landing.buttonPrimary}>
            Get started free
          </Link>
          <Link href="/contact" className={landing.buttonSecondary}>
            Talk to us
          </Link>
        </div>
      </div>
    </SitePage>
  );
}
