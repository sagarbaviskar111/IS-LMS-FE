import type { CallResponse, Lead, LeadStatus } from "./api";

// One list of statuses, used by the lead filter, the "Log a call" form, call
// history and status badges — so they can never drift apart.
export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  no_answer: "No answer",
  call_back_later: "Call back later",
  interested: "Interested",
  not_interested: "Not interested",
  wrong_number: "Wrong number",
  converted: "Converted",
  lost: "Lost",
};

// Every status, in the order they appear in the filter dropdown.
export const STATUS_ORDER: LeadStatus[] = [
  "new",
  "contacted",
  "no_answer",
  "call_back_later",
  "interested",
  "not_interested",
  "wrong_number",
  "converted",
  "lost",
];

// What a call can end as: every status except "new" and "converted" (a
// conversion happens through registration, not by logging a call).
export const CALL_OUTCOMES: CallResponse[] = [
  "no_answer",
  "call_back_later",
  "contacted",
  "interested",
  "not_interested",
  "wrong_number",
  "lost",
];

// Outcomes that close the lead out — no follow-up reminder is kept for them.
export const CLOSED_OUTCOMES: LeadStatus[] = ["not_interested", "wrong_number", "lost"];

// ---- reaching out ---------------------------------------------------------

// Leads store an Indian mobile as plain 10 digits and anything else as +E.164.
// Dialling / WhatsApp want the country code.
export function dialNumber(phone: string): string {
  const s = phone.replace(/[\s\-().]/g, "");
  if (s.startsWith("+")) return s;
  if (/^[6-9]\d{9}$/.test(s)) return `+91${s}`;
  return s.startsWith("00") ? `+${s.slice(2)}` : s;
}

export const telUrl = (phone: string) => `tel:${dialNumber(phone)}`;
export const smsUrl = (phone: string, body: string) => `sms:${dialNumber(phone)}?body=${encodeURIComponent(body)}`;
export const whatsappUrl = (phone: string, body: string) =>
  `https://wa.me/${dialNumber(phone).replace(/^\+/, "")}?text=${encodeURIComponent(body)}`;
export const mailUrl = (email: string, subject: string, body: string) =>
  `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

// Quick messages are the telecaller's own (managed on the Quick Messages page).
// {name} / {caller} / {institute} are filled in per lead.
export function fillTemplate(text: string, vars: { name: string; caller: string; institute: string }): string {
  return text
    .replace(/\{name\}/g, vars.name.split(" ")[0] || vars.name)
    .replace(/\{caller\}/g, vars.caller)
    .replace(/\{institute\}/g, vars.institute);
}

// ---- follow-ups -----------------------------------------------------------

export type FollowUpState = "overdue" | "today" | "upcoming" | null;

export function followUpState(lead: Pick<Lead, "followUpAt" | "status">): FollowUpState {
  if (!lead.followUpAt || lead.status === "converted" || CLOSED_OUTCOMES.includes(lead.status)) return null;
  const when = new Date(lead.followUpAt);
  const now = new Date();
  if (when.getTime() < now.getTime()) return "overdue";
  return when.toDateString() === now.toDateString() ? "today" : "upcoming";
}

export function formatFollowUp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return `Today ${time}`;
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow ${time}`;
  return `${d.toLocaleDateString([], { day: "numeric", month: "short" })} ${time}`;
}

// <input type="datetime-local"> value for "now + hours" (local time).
export function localInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
