import type { PaymentOrder, RazorpayProof } from "./razorpay";
import { dayEndISO, dayStartISO } from "./dates";

// In dev the configured address is often this PC's LAN IP (so a phone can reach
// it). Cookies are per-host, so a page opened at localhost must talk to
// localhost, and one opened at the LAN IP to the LAN IP — otherwise the login
// cookie is never sent back. Real (public) hosts are used exactly as configured.
const API_URL = (() => {
  const configured = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  if (typeof window === "undefined") return configured;
  try {
    const u = new URL(configured);
    const local = u.hostname === "localhost" || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname);
    if (local) {
      u.hostname = window.location.hostname;
      return u.origin;
    }
  } catch {
    // fall through to the configured value
  }
  return configured;
})();

// Mirrors Backend/utils/upload.js — checked client-side so an oversized file
// is rejected instantly instead of after uploading most of it.
export const VIDEO_MAX_SIZE = 1024 * 1024 * 1024; // 1GB
export const DOCUMENT_MAX_SIZE = 100 * 1024 * 1024; // 100MB

export type Role = "superadmin" | "admin" | "student" | "teacher" | "telecaller";

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type VideoFlow = "youtube" | "storage";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  avatarUrl?: string | null;
  isActive: boolean;
  // set when the student was archived (hidden and locked, data kept)
  archivedAt?: string | null;
  pending?: boolean;
  admin?: string | null;
  studentInviteCode?: string;
  teacherInviteCode?: string;
  telecallerInviteCode?: string;
  batch?: string | null;
  batches?: string[];
  // false for a student the admin registered who hasn't finished their registration yet
  registrationComplete?: boolean;
  // the course an admin-registered / self-registered student enrolled in (list responses populate the name)
  course?: { _id: string; name: string } | string | null;
  // Payment (students only)
  installmentAmount?: number;
  balanceDue?: number;
  nextDueDate?: string | null;
  paymentGraceUntil?: string | null;
  deactivatedForPayment?: boolean;
  paymentPending?: boolean;
  // Custom login-screen message shown when an admin manually deactivates this account.
  deactivationMessage?: string | null;
  // Session recording access block (students only) — recordingBlockTo left
  // null blocks that date and everything after it.
  recordingBlockFrom?: string | null;
  recordingBlockTo?: string | null;
  // Admins only — which recording flow the superadmin enabled for them.
  videoFlow?: VideoFlow;
  // Set when the signed-in person is a sub-admin (a helper of this institute's admin).
  // They arrive with role "admin" so the admin pages work; this says what they may use.
  subadmin?: { permissions: Record<string, "view" | "manage">; adminId: string; adminName: string };
  createdAt: string;
  updatedAt: string;
}

export interface Institute {
  name: string;
  slug: string;
  brandColor: string | null;
  brandColorPrimary: string | null;
  brandColorBackground: string | null;
  logoUrl: string | null;
}

export interface OwnInstitute {
  name: string;
  instituteSlug: string | null;
  brandColor: string | null;
  brandColorPrimary: string | null;
  brandColorBackground: string | null;
  logoUrl: string | null;
}

export interface PortfolioEducation {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startYear?: string;
  endYear?: string;
  grade?: string;
  description?: string;
}

export interface PortfolioExperience {
  company: string;
  role: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
}

export interface PortfolioProject {
  title: string;
  description?: string;
  techStack?: string[];
  link?: string;
  github?: string;
}

export interface PortfolioAchievement {
  title: string;
  description?: string;
  date?: string;
}

export interface PortfolioSocialLinks {
  linkedin?: string;
  naukri?: string;
  github?: string;
  website?: string;
}

// Public shape — what anyone visiting /student-portfolio/<slug> sees. Never
// includes email or dob.
export interface PortfolioPublic {
  slug: string;
  name: string;
  headline?: string;
  bio?: string;
  phone?: string;
  location?: string;
  profilePictureUrl?: string | null;
  backgroundImageUrl?: string | null;
  socialLinks: PortfolioSocialLinks;
  education: PortfolioEducation[];
  experience: PortfolioExperience[];
  projects: PortfolioProject[];
  skills: string[];
  achievements: PortfolioAchievement[];
}

// Owner's own view (create/login/dashboard responses) — same as public plus
// account fields only the owner should see.
export interface PortfolioOwn extends PortfolioPublic {
  email: string;
  dob: string;
}

export interface PortfolioUpdatePayload {
  name?: string;
  headline?: string;
  bio?: string;
  phone?: string;
  location?: string;
  socialLinks?: PortfolioSocialLinks;
  education?: PortfolioEducation[];
  experience?: PortfolioExperience[];
  projects?: PortfolioProject[];
  skills?: string[];
  achievements?: PortfolioAchievement[];
}

export interface Batch {
  _id: string;
  name: string;
  description?: string;
  admin: string;
  defaultFee?: number;
  paymentCycleDays?: number;
  course?: { _id: string; name: string } | null;
  mode?: CourseMode;
  startDate?: string | null;
  endDate?: string | null;
  maxStudents?: number;
  studentCount?: number;
  teacherCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BatchPayload {
  course: string;
  name: string;
  description?: string;
  mode: CourseMode;
  startDate?: string | null;
  endDate?: string | null;
  maxStudents?: number;
}

export type CourseMode = "online" | "offline" | "hybrid";
export type CourseLevel = "beginner" | "intermediate" | "advanced" | "all";
export type DurationUnit = "days" | "weeks" | "months";

export interface CourseInstallment {
  label: string;
  amount: number;
  dueAfterDays: number;
}

export interface Course {
  _id: string;
  name: string;
  description: string;
  level: CourseLevel;
  language: string;
  mode: CourseMode;
  durationValue: number;
  durationUnit: DurationUnit;
  prerequisites: string;
  oneTimeEnabled: boolean;
  oneTimeAmount: number;
  installmentEnabled: boolean;
  installments: CourseInstallment[];
  installmentCharge: number;
  syllabus: string;
  terms: string;
  registrationToken?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// What the course form sends (dates as YYYY-MM-DD or empty).
export type CoursePayload = Omit<Course, "_id" | "createdAt" | "updatedAt" | "registrationToken">;

// Public course-registration page (/enroll/<token>).
export interface EnrollmentLinkInfo {
  name: string;
  email: string;
  phone: string;
  skipPayment: boolean;
  plan: "one_time" | "installment" | null;
  amountPaid: number;
  planTotal: number;
  paymentMethod: string;
  expiresAt: string | null;
}

export type PaidStatus = "unpaid" | "first_installment" | "full";

// An admin-registered student's enrollment, as the admin sees it.
export interface EnrollmentSummary {
  _id: string;
  student: string;
  course: { _id: string; name: string } | null;
  paidStatus: PaidStatus;
  plan: "one_time" | "installment" | null;
  planTotal: number;
  amountPaid: number;
  paymentMethod: string;
  token: string | null;
  expiresAt: string | null;
  usedAt: string | null;
  state: "no_link" | "active" | "expired" | "used";
}

// What the server returns right after an online payment was recorded.
export interface PaidReceipt {
  _id: string;
  amount: number;
  receiptNo: string;
  createdAt: string;
}

export interface PaymentAttention {
  _id: string;
  purpose: "dues" | "next_installment" | "course_registration";
  amount: number;
  excess: number;
  status: "paid" | "fulfilled";
  paidAt: string | null;
  student: { name: string; email: string } | null;
  email: string | null;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
}

export interface RazorpaySettings {
  configured: boolean;
  keyId: string | null;
  mode: "test" | "live" | null;
  connectedAt: string | null;
}

export interface RegisterStudentPayload {
  name: string;
  email: string;
  phone: string;
  courseId: string;
  paymentStatus: PaidStatus;
  paymentMethod?: "cash" | "upi" | "other";
  amount?: number;
  note?: string;
}

export interface CourseRegistrationInfo {
  // gateway = real Razorpay checkout, dev = no keys on a dev machine, none = not available
  paymentMode?: "gateway" | "dev" | "none";
  institute: { name: string; slug: string; logoUrl: string | null };
  enrollment: EnrollmentLinkInfo | null;
  course: Pick<
    Course,
    | "name" | "description" | "level" | "language" | "mode" | "durationValue" | "durationUnit"
    | "prerequisites" | "syllabus" | "oneTimeEnabled" | "oneTimeAmount" | "installmentEnabled"
    | "installmentCharge" | "installments" | "terms"
  >;
}

export interface CourseRegistrationRow {
  _id: string;
  student: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string | null;
  address: string;
  idProofs?: { docType: string }[];
  plan: "one_time" | "installment";
  planTotal: number;
  amountPaid: number;
  createdAt: string;
}

export interface StudentGroupMember {
  _id: string;
  name: string;
  email: string;
}

export interface StudentGroup {
  _id: string;
  name: string;
  admin: string;
  students: StudentGroupMember[];
  createdAt: string;
  updatedAt: string;
}

export type JobVisibility = "all" | "batch";
export type JobApplicationMode = "link" | "interest";
export type JobStatus = "open" | "closed";

export interface Job {
  _id: string;
  admin: string;
  title: string;
  company: string;
  description: string;
  skills?: string;
  responsibilities?: string;
  location?: string;
  visibility: JobVisibility;
  batch?: { _id: string; name: string } | string | null;
  applicationMode: JobApplicationMode;
  applyLink?: string | null;
  status: JobStatus;
  interestedCount?: number;
  interested?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobInterestRow {
  _id: string;
  student: { _id: string; name: string; email: string; phone?: string };
  createdAt: string;
}

export interface JobEmailLead {
  _id: string;
  instituteName: string;
  company: string;
  email: string;
  createdAt: string;
}

export interface Tool {
  _id: string;
  name: string;
  url: string;
  admin: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  _id: string;
  student: string;
  admin: string;
  batch?: string | null;
  amount: number;
  method: "razorpay" | "manual" | "online";
  status: "paid" | "failed";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  recordedBy?: { _id: string; name: string; role: Role } | string | null;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subadmin {
  _id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  permissions: Record<string, "view" | "manage">;
  createdAt: string;
}

export interface SubadminModule {
  key: string;
  label: string;
  hint: string;
}

export interface SubadminPreset {
  key: string;
  label: string;
  permissions: Record<string, "view" | "manage">;
}

export interface SubadminActivityRow {
  _id: string;
  who: string;
  module: string | null;
  method: string;
  path: string;
  at: string;
}

export interface InstallmentItem {
  _id: string;
  label: string;
  amount: number;
  paid: number;
  // late fee already included in `amount`
  fine?: number;
  dueDate: string;
  status: "paid" | "partial" | "pending";
}

export interface FeeAdjustment {
  _id?: string;
  kind: "late_fee" | "scholarship" | "discount" | "sibling";
  // + adds to the fee (late fee), - takes off (scholarship / discount)
  amount: number;
  note?: string;
  createdAt: string;
}

export interface FeeRules {
  graceDays: number;
  lateFee: { mode: "none" | "flat" | "daily"; amount: number; maxAmount: number };
  siblingDiscountPercent: number;
}

export interface FeeRulesPreview {
  deactivated: { _id: string; name: string; email: string; balanceDue: number; dueDate: string; deadline: string }[];
  deactivatedCount: number;
  alreadyDue: number;
  lateFee: { students: number; total: number };
}

export interface Receipt {
  receiptNo: string;
  paidAt: string;
  amount: number;
  status: string;
  method: string;
  note: string;
  transactionId: string;
  receivedBy: string;
  student: { name: string; email: string; phone: string };
  course: string;
  institute: { name: string; slug: string; logoUrl: string | null };
}

export type RegistrationDocKind = "id1" | "id2" | "selfie" | "signature";

export interface MyRegistration {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string | null;
  address: string;
  course: string;
  plan: "one_time" | "installment";
  planTotal: number;
  amountPaid: number;
  registeredAt: string;
  documents: { kind: RegistrationDocKind; label: string; mimetype: string }[];
}

export interface StudentPaymentSummary {
  // False only where online payment isn't available at all (no Razorpay keys on production).
  onlinePayment?: boolean;
  // Course students: every installment with its own due date.
  schedule?: InstallmentItem[];
  installmentAmount?: number;
  balanceDue?: number;
  nextDueDate?: string | null;
  paymentGraceUntil?: string | null;
  // When an unpaid account gets deactivated (due date + the institute's grace days, or an admin extension).
  paymentDeadline?: string | null;
  graceDays?: number;
  adjustments?: FeeAdjustment[];
  // Set for students on a course plan; fullyPaid once the whole course fee is in.
  feeStatus?: { planTotal: number; totalPaid: number; remaining: number; fullyPaid: boolean } | null;
  // Where the due date moves to if the next installment is paid early.
  nextInstallmentDueDate?: string | null;
}

export interface AdminPaymentStudent {
  _id: string;
  name: string;
  email: string;
  installmentAmount: number;
  balanceDue: number;
  nextDueDate: string | null;
  paymentGraceUntil: string | null;
  isActive: boolean;
  deactivatedForPayment: boolean;
  paymentPending: boolean;
  paymentDeadline?: string | null;
  graceDays?: number;
  schedule?: InstallmentItem[];
  adjustments?: FeeAdjustment[];
}

export interface Session {
  _id: string;
  batch: string;
  createdBy: string;
  topic: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
  meetingLink?: string;
  attendanceMarked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = "present" | "absent";

export interface AttendanceRecord {
  student: string;
  name: string;
  email: string;
  status: AttendanceStatus | null;
}

export interface AttendanceSummaryRow {
  student: string;
  name: string;
  email: string;
  present: number;
  total: number;
  percentage: number | null;
}

export interface StudentAttendanceSession {
  session: { _id: string; topic: string; date: string; startTime: string; endTime: string } | null;
  status: AttendanceStatus;
}

export interface StudentAttendance {
  present: number;
  total: number;
  percentage: number | null;
  sessions: StudentAttendanceSession[];
  page: number;
  limit: number;
  totalPages: number;
}

export interface MaterialSessionRef {
  _id: string;
  topic: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface Material {
  _id: string;
  batch: string;
  uploadedBy: string;
  session?: string | MaterialSessionRef | null;
  type: "document" | "video";
  title: string;
  description?: string;
  fileName: string;
  fileUrl?: string | null;
  fileSize: number;
  mimeType: string;
  youtubeVideoId?: string | null;
  // Short-lived signed URL for a recording hosted on the institute's own storage server.
  videoUrl?: string | null;
  locked?: boolean;
  lockedReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentAttachment {
  fileName: string | null;
  fileUrl: string | null;
  fileSize: number | null;
  mimeType: string | null;
}

export type ReviewDecision = "" | "approved" | "resubmit" | "rejected";

export interface SubmissionAttempt {
  fileName?: string;
  submittedAt?: string;
  decision?: ReviewDecision;
  points?: number | null;
  review?: string;
  reviewedAt?: string;
}

export interface AssignmentSummary {
  status?: "active" | "cancelled";
  cancelReason?: string;
  _id: string;
  batch: string;
  title: string;
  description?: string;
  dueDate: string;
  attachment: AssignmentAttachment;
  submittedCount: number;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentSubmissionFile {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  submittedAt: string;
  points?: number | null;
  review?: string;
  reviewedAt?: string | null;
  decision?: ReviewDecision;
  resubmitUntil?: string | null;
  history?: SubmissionAttempt[];
}

export interface StudentAssignment {
  status?: "active" | "cancelled";
  cancelReason?: string;
  // False once cancelled, finalised by the teacher, or past the due date with no resubmission window.
  canSubmit?: boolean;
  _id: string;
  title: string;
  description?: string;
  dueDate: string;
  attachment: AssignmentAttachment;
  submitted: boolean;
  submission: AssignmentSubmissionFile | null;
  locked: boolean;
  overdue: boolean;
}

export interface AssignmentSubmissionRow {
  _id: string;
  student: { _id: string; name: string; email: string } | string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  submittedAt: string;
  points?: number | null;
  review?: string;
  reviewedAt?: string | null;
  decision?: ReviewDecision;
  resubmitUntil?: string | null;
  history?: SubmissionAttempt[];
}

export type StorageProvider = "s3" | "r2";

export interface StorageStatus {
  flow: VideoFlow;
  provider: StorageProvider | null;
  accessKeyId: string | null;
  bucket: string | null;
  region: string | null;
  endpoint: string | null;
  verified: boolean;
  verifiedAt: string | null;
}

export interface SaveStoragePayload {
  provider: StorageProvider;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region?: string;
  accountId?: string;
}

export interface YoutubeStatus {
  flow?: VideoFlow;
  connected: boolean;
  channelTitle: string | null;
  hasCredentials?: boolean;
  googleClientId?: string | null;
  redirectUri?: string;
}

export type ExamStatus = "draft" | "published" | "closed";

export interface ExamQuestion {
  _id: string;
  text: string;
  options: string[];
  correctOptionIndex?: number;
  marks: number;
}

export interface ExamSummary {
  _id: string;
  batch: string;
  title: string;
  description?: string;
  status: ExamStatus;
  resultsAnnounced: boolean;
  questionCount: number;
  totalMarks: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExamDetail extends ExamSummary {
  questions: ExamQuestion[];
}

export interface StudentExamSummary {
  _id: string;
  title: string;
  description?: string;
  status: ExamStatus;
  resultsAnnounced: boolean;
  questionCount: number;
  totalMarks: number;
  submitted: boolean;
  score: number | null;
}

export interface StudentExamTake {
  exam: {
    _id: string;
    title: string;
    description?: string;
    status: ExamStatus;
    questions?: { _id: string; text: string; options: string[]; marks: number }[];
  };
  alreadySubmitted: boolean;
  resultsAnnounced?: boolean;
}

export interface ExamResultQuestion {
  _id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  selectedOptionIndex: number | null;
  marks: number;
}

export interface ExamResult {
  adjustment?: number;
  review?: string;
  score: number;
  totalMarks: number;
  questions: ExamResultQuestion[];
}

export interface Submission {
  _id: string;
  exam: string;
  student: { _id: string; name: string; email: string } | string;
  score: number;
  totalMarks: number;
  autoScore?: number | null;
  adjustment?: number;
  review?: string;
  createdAt: string;
}

// A call's outcome and the lead's status share one vocabulary (see leadStatus.ts).
export type CallResponse =
  | "no_answer"
  | "call_back_later"
  | "contacted"
  | "interested"
  | "not_interested"
  | "wrong_number"
  | "lost";

export type LeadStatus = "new" | CallResponse | "converted";

export interface CallLog {
  _id: string;
  calledBy: { _id: string; name: string; email: string } | string;
  response: CallResponse;
  notes?: string;
  createdAt: string;
}

// Lead-list filters, shared by the admin list and the caller's "My Leads".
export interface LeadFilterState {
  q: string;
  status: LeadStatus | "";
  telecaller: string; // "", "unassigned" or a user id (admin only)
  source: string; // "", or "<source>|<label>"
  calls: "" | "none" | "some";
  followUp: "" | "overdue" | "today" | "upcoming" | "any"; // caller's reminders
  from: string;
  to: string;
  sort: "newest" | "oldest" | "name";
}

export interface QuickMessage {
  _id?: string;
  label: string;
  text: string;
}

export interface LeadSummary {
  total: number;
  byStatus: Partial<Record<LeadStatus, number>>;
  overdue: number;
  today: number;
  invalidCount: number;
}

export interface LeadSourceOption {
  source: "manual" | "webhook" | "inquiry_form" | "import";
  label: string | null;
  count: number;
}

export interface LeadBulkResult {
  created: { row: number; name: string; phone: string; assigned: boolean }[];
  skipped: { row: number; name: string; phone: string; reason: string }[];
  noTelecallers: boolean;
}

export interface LeadListQuery extends Partial<LeadFilterState> {
  invalid?: boolean; // only leads with an invalid phone / email
  page?: number;
  limit?: number;
}

const leadQs = (o: LeadListQuery = {}) => {
  const params = new URLSearchParams();
  if (o.page) params.set("page", String(o.page));
  if (o.limit) params.set("limit", String(o.limit));
  if (o.q?.trim()) params.set("q", o.q.trim());
  if (o.status) params.set("status", o.status);
  if (o.telecaller) params.set("telecaller", o.telecaller);
  if (o.source) {
    const [source, label] = o.source.split("|");
    params.set("source", source);
    if (label) params.set("sourceLabel", label);
  }
  if (o.calls) params.set("calls", o.calls);
  if (o.followUp) {
    params.set("followUp", o.followUp);
    // "Today" is the caller's day, not the server's.
    const today = new Date().toLocaleDateString("en-CA");
    params.set("dayStart", dayStartISO(today));
    params.set("dayEnd", dayEndISO(today));
  }
  if (o.from) params.set("from", dayStartISO(o.from));
  if (o.to) params.set("to", dayEndISO(o.to));
  if (o.sort && o.sort !== "newest") params.set("sort", o.sort);
  if (o.invalid) params.set("invalid", "1");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

export interface Lead {
  _id: string;
  admin: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  assignedTelecaller: { _id: string; name: string; email: string } | string | null;
  status: LeadStatus;
  followUpAt?: string | null;
  convertedStudent?: { _id: string; name: string; email: string } | string | null;
  convertedBy?: { _id: string; name: string; email: string; role: Role } | string | null;
  registrationToken?: string;
  feeAmount?: number;
  callLogs: CallLog[];
  source?: "manual" | "webhook" | "inquiry_form" | "import";
  sourceLabel?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  _id: string;
  recipient: string;
  sender: { _id: string; name: string; role: Role } | string;
  senderRole: Role;
  title: string;
  message: string;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface SentNotificationSummary {
  sendBatchId: string;
  title: string;
  message: string;
  createdAt: string;
  totalRecipients: number;
  readCount: number;
}

export interface SentNotificationRecipient {
  recipient: { _id: string; name: string; email: string; role: Role };
  read: boolean;
  readAt?: string | null;
}

export interface SentNotificationDetail {
  title: string;
  message: string;
  createdAt: string;
  recipients: SentNotificationRecipient[];
}

export interface ClassPerson {
  _id: string;
  name: string;
  email: string;
}

export interface ChatMessage {
  _id: string;
  sender: { _id: string; name: string; role: Role } | string;
  recipient: string;
  text: string;
  read: boolean;
  createdAt: string;
}

class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(message: string, status: number, data: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export type InquiryQuestionType =
  | "short_text"
  | "paragraph"
  | "multiple_choice"
  | "checkboxes"
  | "dropdown"
  | "linear_scale"
  | "date"
  | "time"
  | "multiple_choice_grid"
  | "checkbox_grid"
  | "name"
  | "phone"
  | "email"
  | "lead";

export interface InquiryQuestion {
  id: string;
  type: InquiryQuestionType;
  title: string;
  description?: string;
  required: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  rows?: string[];
  columns?: string[];
}

export interface InquiryForm {
  _id: string;
  publicId: string;
  subject: string;
  description: string;
  questions: InquiryQuestion[];
  isActive: boolean;
  responseCount: number;
  path: string;
  createdAt: string;
}

export type InquiryAnswer = string | number | string[] | Record<string, string | string[]>;

export interface InquiryResponseRow {
  _id: string;
  answers: Record<string, InquiryAnswer>;
  createdAt: string;
  // The lead this response became (auto on a "yes", or added by hand).
  lead?: string | null;
  leadAddedAt?: string | null;
}

export interface InquiryFilter {
  questionId: string;
  value: string;
  valueTo?: string;
}

export interface InquirySummary {
  answered: number;
  counts?: Record<string, number>;
  average?: number | null;
}

export interface PublicInquiryForm {
  subject: string;
  description: string;
  isActive: boolean;
  questions: InquiryQuestion[];
}

export interface InquiryQuery {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  inLead?: "yes" | "no";
  filters?: InquiryFilter[];
}

const inquiryQs = (q: InquiryQuery = {}) => {
  const params = new URLSearchParams();
  if (q.page) params.set("page", String(q.page));
  if (q.limit) params.set("limit", String(q.limit));
  if (q.from) params.set("from", dayStartISO(q.from));
  if (q.to) params.set("to", dayEndISO(q.to));
  if (q.inLead) params.set("inLead", q.inLead);
  if (q.filters?.length) params.set("filters", JSON.stringify(q.filters));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

// Fetches a binary response (PDF) with the session cookie.
async function fetchBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.message || "Could not download the file", res.status, data);
  }
  return res.blob();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.message || "Request failed", res.status, data);
  }

  return data as T;
}

// fetch() has no cross-browser way to report upload progress, so a large
// file upload (a recording can run to hundreds of MB) needs XHR instead.
function uploadWithProgress<T>(
  path: string,
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}${path}`);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      let data: { message?: string } = {};
      try {
        data = JSON.parse(xhr.responseText || "{}");
      } catch {
        // non-JSON response — fall through with the status text below
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as T);
      } else {
        reject(new ApiError(data.message || "Upload failed", xhr.status));
      }
    };

    xhr.onerror = () => reject(new ApiError("Upload failed — check your connection", 0));
    xhr.ontimeout = () => reject(new ApiError("Upload timed out", 0));
    // Generous ceiling for a large recording on a slow connection.
    xhr.timeout = 20 * 60 * 1000;

    xhr.send(formData);
  });
}

export type UserStatus = "pending" | "team" | "active" | "inactive";

export type FinanceType = "credit" | "debit";
export type FinanceMethod = "cash" | "upi" | "bank" | "card" | "cheque" | "other";

export interface FinanceRow {
  _id: string;
  type: FinanceType;
  amount: number;
  category: string;
  title: string;
  note: string;
  method: string;
  date: string;
  // "payment" rows are student fee payments read live from the payments records.
  source: "manual" | "payment";
}

export interface FinanceSummary {
  credit: number;
  debit: number;
  net: number;
  count: number;
  receivable: number;
  receivableStudents: number;
  credits: { category: string; total: number; count: number }[];
  debits: { category: string; total: number; count: number }[];
  monthly: { month: string; credit: number; debit: number }[];
}

export interface FinanceQuery {
  from?: string;
  to?: string;
  type?: FinanceType | "";
  source?: "manual" | "payment" | "";
  category?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface FinanceEntryPayload {
  type: FinanceType;
  amount: number;
  category: string;
  title: string;
  note?: string;
  method: FinanceMethod;
  date: string;
}

const financeQs = (q: FinanceQuery = {}) => {
  const params = new URLSearchParams();
  (Object.entries(q) as [string, string | number | undefined][]).forEach(([k, v]) => {
    if (v !== undefined && v !== "") params.set(k, String(v));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

export interface Testimonial {
  _id: string;
  quote: string;
  name: string;
  role: string;
  city: string;
  isActive: boolean;
  order: number;
}

export interface TestimonialPayload {
  quote: string;
  name: string;
  role?: string;
  city?: string;
  isActive?: boolean;
  order?: number;
}

// ---- Certificates ----
export type CertFieldKey =
  | "student_name"
  | "certificate_no"
  | "course"
  | "date"
  | "grade"
  | "batch"
  | "institute_name"
  | "custom";

export interface CertField {
  _id?: string;
  key: CertFieldKey;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  maxWidth: number;
  color: string;
  align: "left" | "center" | "right";
  font: "helvetica" | "times" | "courier" | "unicode";
  bold: boolean;
  italic: boolean;
  transform: "none" | "upper" | "title";
}

export interface CertQr {
  enabled: boolean;
  x: number;
  y: number;
  size: number;
}

export interface CertNumbering {
  prefix: string;
  includeYear: boolean;
  padding: number;
  counter: number;
}

export interface CertTemplate {
  _id: string;
  name: string;
  imageUrl: string | null;
  width: number;
  height: number;
  fields: CertField[];
  qr: CertQr;
  numbering: CertNumbering;
  archived: boolean;
  issued?: number;
  createdAt: string;
}

export interface Certificate {
  _id: string;
  certificateNo: string;
  studentId: string | null;
  studentName: string;
  templateId: string;
  templateName: string;
  course: string;
  grade: string;
  date: string;
  status: "active" | "revoked";
  revokedReason: string;
  issuedAt: string;
  verifyUrl: string;
  qrEnabled?: boolean;
  batchId?: string | null;
  batchName?: string;
  hasEmail?: boolean;
  emailedAt?: string | null;
  emailError?: string;
}

export interface CertBatch {
  _id: string;
  name: string;
  templateName: string;
  createdAt: string;
  total: number;
  withEmail: number;
  emailed: number;
}

export interface CertEmailJob {
  id: string;
  state: "running" | "done";
  total: number;
  done: number;
  sent: number;
  failed: number;
  noEmail: number;
  alreadySent: number;
  revoked: number;
  // Waiting for tomorrow because the 90-a-day email limit was reached.
  limited: number;
  notSent: number;
  error: string;
}

export interface CertificateVerification {
  status: "active" | "revoked";
  certificateNo: string;
  studentName: string;
  course: string;
  grade: string;
  date: string;
  revokedReason: string;
  institute: { name: string; logoUrl: string | null };
}

export interface CertSheetRow {
  row: number;
  name: string;
  email: string;
  phone: string;
  course: string;
  grade: string;
  date: string;
  certificateNo: string;
  batch: string;
}

export interface IssueResult {
  certificates: Certificate[];
  batch?: { _id: string; name: string } | null;
  emailJob?: { jobId: string; total: number } | { error: string } | null;
  skipped: { studentId: string | null; name: string; reason: string }[];
  invalid?: { row: number; name: string; reason: string }[];
}

export interface IssueCertificatesPayload {
  templateId: string;
  studentIds: string[];
  course?: string;
  date?: string;
  grade?: string;
  certificateNo?: string;
  allowDuplicate?: boolean;
  batchName?: string;
  qrEnabled?: boolean;
  sendEmail?: boolean;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: User; institute: Institute | null }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  // Dev-only passwordless login; the backend 404s outside NODE_ENV=development.
  devLogin: (role: "admin" | "teacher" | "student" | "telecaller") =>
    request<{ user: User; institute: Institute | null }>("/api/auth/dev-login", {
      method: "POST",
      body: JSON.stringify({ role }),
    }),
  register: (payload: { name: string; email: string; password: string; phone?: string; inviteCode: string }) =>
    request<{ message: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  inviteInfo: (code: string) =>
    request<{ role: Role; coachingClassName: string }>(
      `/api/auth/invite-info?code=${encodeURIComponent(code)}`
    ),
  logout: () => request<{ message: string }>("/api/auth/logout", { method: "POST" }),
  me: () => request<{ user: User; institute: Institute | null }>("/api/auth/me"),
  updateProfile: async (payload: {
    name?: string;
    phone?: string;
    avatar?: File | null;
    removeAvatar?: boolean;
  }): Promise<{ user: User; institute: Institute | null }> => {
    const formData = new FormData();
    if (payload.name !== undefined) formData.append("name", payload.name);
    if (payload.phone !== undefined) formData.append("phone", payload.phone);
    if (payload.avatar) formData.append("avatar", payload.avatar);
    else if (payload.removeAvatar) formData.append("removeAvatar", "true");

    const res = await fetch(`${API_URL}/api/auth/me`, {
      method: "PATCH",
      credentials: "include",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.message || "Could not save profile", res.status);
    return data;
  },
  forgotPassword: (email: string) =>
    request<{ message: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    request<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),
  publicInstitute: (slug: string) => request<{ institute: Institute }>(`/api/institutes/${encodeURIComponent(slug)}`),
  getBranding: () => request<{ institute: OwnInstitute }>("/api/institutes/branding"),
  updateBranding: async (payload: {
    instituteSlug?: string;
    brandColor?: string | null;
    brandColorPrimary?: string | null;
    brandColorBackground?: string | null;
    logo?: File | null;
  }): Promise<{ institute: OwnInstitute }> => {
    const formData = new FormData();
    if (payload.instituteSlug !== undefined) formData.append("instituteSlug", payload.instituteSlug);
    if (payload.brandColor !== undefined) formData.append("brandColor", payload.brandColor || "");
    if (payload.brandColorPrimary !== undefined)
      formData.append("brandColorPrimary", payload.brandColorPrimary || "");
    if (payload.brandColorBackground !== undefined)
      formData.append("brandColorBackground", payload.brandColorBackground || "");
    if (payload.logo) formData.append("logo", payload.logo);

    const res = await fetch(`${API_URL}/api/institutes/branding`, {
      method: "PATCH",
      credentials: "include",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.message || "Could not save branding", res.status);
    return data;
  },
  listUsers: (opts?: {
    role?: Role;
    status?: UserStatus;
    page?: number;
    limit?: number;
    q?: string;
    sort?: string;
    active?: "1" | "0";
    registration?: "pending";
    archived?: boolean;
    course?: string;
    batch?: string;
  }) => {
    const params = new URLSearchParams();
    if (opts?.role) params.set("role", opts.role);
    if (opts?.status) params.set("status", opts.status);
    if (opts?.q?.trim()) params.set("q", opts.q.trim());
    if (opts?.sort) params.set("sort", opts.sort);
    if (opts?.active) params.set("active", opts.active);
    if (opts?.registration) params.set("registration", opts.registration);
    if (opts?.archived) params.set("archived", "1");
    if (opts?.course) params.set("course", opts.course);
    if (opts?.batch) params.set("batch", opts.batch);
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<PageMeta & { users: User[] }>(`/api/users${qs ? `?${qs}` : ""}`);
  },
  createUser: (payload: {
    name: string;
    email: string;
    password: string;
    role: Role;
    phone?: string;
    batch?: string | null;
    batches?: string[];
    installmentAmount?: number;
    amountPaidNow?: number;
  }) =>
    request<{ user: User }>("/api/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  bulkCreateUsers: (payload: {
    role: "student" | "teacher" | "telecaller";
    rows: { name: string; email: string; phone?: string; password?: string; batch?: string; batches?: string }[];
  }) =>
    request<{
      created: { row: number; name: string; email: string; password?: string }[];
      skipped: { row: number; name: string; email: string; reason: string }[];
    }>("/api/users/bulk", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateUser: (
    id: string,
    payload: {
      name?: string;
      phone?: string;
      isActive?: boolean;
      password?: string;
      batch?: string | null;
      batches?: string[];
      deactivationMessage?: string | null;
      recordingBlockFrom?: string | null;
      recordingBlockTo?: string | null;
    }
  ) =>
    request<{ user: User }>(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteUser: (id: string) =>
    request<{ message: string; archived?: boolean }>(`/api/users/${id}`, { method: "DELETE" }),
  restoreUser: (id: string) => request<{ user: User }>(`/api/users/${id}/restore`, { method: "POST" }),
  getTeamSettings: () => request<{ allowSelfPasswordReset: boolean }>("/api/users/team-settings"),
  updateTeamSettings: (payload: { allowSelfPasswordReset: boolean }) =>
    request<{ allowSelfPasswordReset: boolean }>("/api/users/team-settings", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  getEmailSettings: () => request<{ address: string | null; hasCredentials: boolean; sentToday: number; reminderLimit: number }>("/api/users/email-settings"),
  sendTestEmail: () => request<{ message: string; to: string }>("/api/users/email-settings/test", { method: "POST" }),
  updateEmailSettings: (payload: { address: string; appPassword: string }) =>
    request<{ message: string }>("/api/users/email-settings", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  getLeadWebhookSettings: () => request<{ apiKey: string; webhookUrl: string }>("/api/users/lead-webhook"),
  regenerateLeadWebhookKey: () =>
    request<{ apiKey: string; webhookUrl: string }>("/api/users/lead-webhook/regenerate", { method: "POST" }),
  listBatches: (opts?: { page?: number; limit?: number; q?: string; sort?: string; course?: string; mode?: string }) => {
    const params = new URLSearchParams();
    if (opts?.q?.trim()) params.set("q", opts.q.trim());
    if (opts?.sort) params.set("sort", opts.sort);
    if (opts?.course) params.set("course", opts.course);
    if (opts?.mode) params.set("mode", opts.mode);
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<PageMeta & { batches: Batch[] }>(`/api/batches${qs ? `?${qs}` : ""}`);
  },
  createBatch: (payload: BatchPayload) =>
    request<{ batch: Batch }>("/api/batches", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateBatch: (
    id: string,
    payload: Partial<BatchPayload>
  ) =>
    request<{ batch: Batch }>(`/api/batches/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  updateBatchMembers: (id: string, payload: { studentIds?: string[]; teacherIds?: string[] }) =>
    request<{ message: string }>(`/api/batches/${id}/members`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteBatch: (id: string) =>
    request<{ message: string }>(`/api/batches/${id}`, { method: "DELETE" }),
  listCourses: (opts?: { page?: number; limit?: number; q?: string; sort?: string; mode?: string; active?: "1" | "0" }) => {
    const params = new URLSearchParams();
    if (opts?.q?.trim()) params.set("q", opts.q.trim());
    if (opts?.sort) params.set("sort", opts.sort);
    if (opts?.mode) params.set("mode", opts.mode);
    if (opts?.active) params.set("active", opts.active);
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<PageMeta & { courses: Course[] }>(`/api/courses${qs ? `?${qs}` : ""}`);
  },
  createCourse: (payload: Partial<CoursePayload>) =>
    request<{ course: Course }>("/api/courses", { method: "POST", body: JSON.stringify(payload) }),
  updateCourse: (id: string, payload: Partial<CoursePayload>) =>
    request<{ course: Course }>(`/api/courses/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  listCourseRegistrations: (courseId: string) =>
    request<{ registrations: CourseRegistrationRow[] }>(`/api/courses/${courseId}/registrations`),
  // Verification files are private — fetched with the admin's session as a blob.
  courseRegistrationFile: async (regId: string, kind: "id1" | "id2" | "selfie" | "signature") => {
    const res = await fetch(`${API_URL}/api/courses/registrations/${regId}/file/${kind}`, { credentials: "include" });
    if (!res.ok) throw new ApiError("Could not load the file", res.status);
    return res.blob();
  },
  registerStudent: (payload: RegisterStudentPayload) =>
    request<{ student: User; enrollment: EnrollmentSummary }>("/api/enrollments/register-student", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getStudentEnrollment: (studentId: string) =>
    request<{ enrollment: EnrollmentSummary | null }>(`/api/enrollments/student/${studentId}`),
  getStudentRegistration: (studentId: string) =>
    request<{ registration: (CourseRegistrationRow & { course?: { _id: string; name: string } | null }) | null }>(
      `/api/enrollments/student/${studentId}/registration`
    ),
  createStudentEnrollmentLink: (studentId: string, expiresInHours: number) =>
    request<{ enrollment: EnrollmentSummary }>(`/api/enrollments/student/${studentId}/link`, {
      method: "POST",
      body: JSON.stringify({ expiresInHours }),
    }),
  courseRegistrationInfo: (token: string, slug: string) =>
    request<CourseRegistrationInfo>(
      `/api/course-registration/${encodeURIComponent(token)}?slug=${encodeURIComponent(slug)}`
    ),
  submitCourseRegistration: async (token: string, form: FormData) => {
    const res = await fetch(`${API_URL}/api/course-registration/${encodeURIComponent(token)}`, {
      method: "POST",
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.message || "Registration failed", res.status);
    return data as { message: string; amountPaid: number; planTotal: number; balance: number; paidEarlier?: boolean };
  },
  deleteCourse: (id: string) => request<{ message: string }>(`/api/courses/${id}`, { method: "DELETE" }),
  listStudentGroups: (opts?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<PageMeta & { groups: StudentGroup[] }>(`/api/student-groups${qs ? `?${qs}` : ""}`);
  },
  createStudentGroup: (payload: { name: string; studentIds?: string[] }) =>
    request<{ group: StudentGroup }>("/api/student-groups", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateStudentGroup: (id: string, payload: { name?: string; studentIds?: string[] }) =>
    request<{ group: StudentGroup }>(`/api/student-groups/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteStudentGroup: (id: string) =>
    request<{ message: string }>(`/api/student-groups/${id}`, { method: "DELETE" }),
  listTools: (opts?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<PageMeta & { tools: Tool[] }>(`/api/tools${qs ? `?${qs}` : ""}`);
  },
  createTool: (payload: { name: string; url: string }) =>
    request<{ tool: Tool }>("/api/tools", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateTool: (id: string, payload: { name?: string; url?: string }) =>
    request<{ tool: Tool }>(`/api/tools/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteTool: (id: string) => request<{ message: string }>(`/api/tools/${id}`, { method: "DELETE" }),
  teacherTools: (opts?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<PageMeta & { tools: Tool[] }>(`/api/teacher/tools${qs ? `?${qs}` : ""}`);
  },
  studentTools: (opts?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<PageMeta & { tools: Tool[] }>(`/api/student/tools${qs ? `?${qs}` : ""}`);
  },

  parseJobText: (text: string) =>
    request<{
      fields: {
        title: string;
        company: string;
        location: string;
        skills: string;
        responsibilities: string;
        description: string;
      };
    }>("/api/jobs/parse", { method: "POST", body: JSON.stringify({ text }) }),
  listJobs: (opts?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<PageMeta & { jobs: Job[] }>(`/api/jobs${qs ? `?${qs}` : ""}`);
  },
  createJob: (payload: {
    title: string;
    company: string;
    description: string;
    skills?: string;
    responsibilities?: string;
    location?: string;
    visibility: JobVisibility;
    batchId?: string;
    applicationMode: JobApplicationMode;
    applyLink?: string;
  }) => request<{ job: Job }>("/api/jobs", { method: "POST", body: JSON.stringify(payload) }),
  updateJob: (
    id: string,
    payload: Partial<{
      title: string;
      company: string;
      description: string;
      skills: string;
      responsibilities: string;
      location: string;
      visibility: JobVisibility;
      batchId: string;
      applicationMode: JobApplicationMode;
      applyLink: string;
      status: JobStatus;
    }>
  ) => request<{ job: Job }>(`/api/jobs/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteJob: (id: string) => request<{ message: string }>(`/api/jobs/${id}`, { method: "DELETE" }),
  listJobInterests: (id: string) => request<{ interests: JobInterestRow[] }>(`/api/jobs/${id}/interests`),
  studentListJobs: (opts?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<PageMeta & { jobs: Job[] }>(`/api/student/jobs${qs ? `?${qs}` : ""}`);
  },
  studentExpressInterest: (id: string) =>
    request<{ message: string }>(`/api/student/jobs/${id}/interest`, { method: "POST" }),
  listJobEmailLeads: (opts?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<PageMeta & { leads: JobEmailLead[] }>(`/api/superadmin/job-email-leads${qs ? `?${qs}` : ""}`);
  },
  myBatches: () => request<{ batches: Batch[] }>("/api/teacher/batches"),
  batchStudents: (batchId: string, opts?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<PageMeta & { students: User[] }>(
      `/api/teacher/batches/${batchId}/students${qs ? `?${qs}` : ""}`
    );
  },
  listSessions: (batch: string, opts?: { from?: string; to?: string }) => {
    const params = new URLSearchParams({ batch });
    if (opts?.from) params.set("from", opts.from);
    if (opts?.to) params.set("to", opts.to);
    return request<{ sessions: Session[] }>(`/api/teacher/sessions?${params.toString()}`);
  },
  createSession: (payload: {
    batch: string;
    topic: string;
    date: string;
    startTime: string;
    endTime: string;
    notes?: string;
    meetingLink?: string;
  }) =>
    request<{ session: Session }>("/api/teacher/sessions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createBulkSessions: (payload: {
    batch: string;
    topic: string;
    dates: string[];
    startTime: string;
    endTime: string;
    notes?: string;
    meetingLink?: string;
  }) =>
    request<{ sessions: Session[] }>("/api/teacher/sessions/bulk", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateSession: (
    id: string,
    payload: {
      topic?: string;
      date?: string;
      startTime?: string;
      endTime?: string;
      notes?: string;
      meetingLink?: string;
    }
  ) =>
    request<{ session: Session }>(`/api/teacher/sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteSession: (id: string) =>
    request<{ message: string }>(`/api/teacher/sessions/${id}`, { method: "DELETE" }),
  getSessionAttendance: (sessionId: string) =>
    request<{ records: AttendanceRecord[]; markedAt: string | null }>(
      `/api/teacher/sessions/${sessionId}/attendance`
    ),
  markSessionAttendance: (
    sessionId: string,
    records: { student: string; status: AttendanceStatus }[]
  ) =>
    request<{ attendance: unknown }>(`/api/teacher/sessions/${sessionId}/attendance`, {
      method: "PUT",
      body: JSON.stringify({ records }),
    }),
  batchAttendanceSummary: (batchId: string) =>
    request<{ summary: AttendanceSummaryRow[]; sessionCount: number }>(
      `/api/teacher/batches/${batchId}/attendance-summary`
    ),
  listMaterials: (batch: string, opts?: { type?: "document" | "video"; page?: number; limit?: number }) => {
    const params = new URLSearchParams({ batch });
    if (opts?.type) params.set("type", opts.type);
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    return request<PageMeta & { materials: Material[] }>(`/api/teacher/materials?${params.toString()}`);
  },
  uploadMaterial: (
    payload: {
      batch: string;
      title: string;
      description?: string;
      session?: string;
      file: File;
    },
    onProgress?: (percent: number) => void
  ): Promise<{ material: Material }> => {
    const formData = new FormData();
    formData.append("batch", payload.batch);
    formData.append("title", payload.title);
    if (payload.description) formData.append("description", payload.description);
    if (payload.session) formData.append("session", payload.session);
    formData.append("file", payload.file);

    return uploadWithProgress<{ material: Material }>("/api/teacher/materials", formData, onProgress);
  },
  deleteMaterial: (id: string) =>
    request<{ message: string }>(`/api/teacher/materials/${id}`, { method: "DELETE" }),
  teacherYoutubeStatus: () => request<YoutubeStatus>("/api/teacher/youtube-status"),
  myStudentBatch: () => request<{ batch: Batch | null }>("/api/student/batch"),
  studentSessions: (opts?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<PageMeta & { sessions: Session[] }>(`/api/student/sessions${qs ? `?${qs}` : ""}`);
  },
  studentAttendance: (opts?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<StudentAttendance>(`/api/student/attendance${qs ? `?${qs}` : ""}`);
  },
  studentMaterials: (opts?: { type?: "document" | "video"; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.type) params.set("type", opts.type);
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<PageMeta & { materials: Material[] }>(`/api/student/materials${qs ? `?${qs}` : ""}`);
  },
  listExams: (batch: string, opts?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams({ batch });
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    return request<PageMeta & { exams: ExamSummary[] }>(`/api/teacher/exams?${params.toString()}`);
  },
  createExam: (payload: { batch: string; title: string; description?: string }) =>
    request<{ exam: ExamSummary }>("/api/teacher/exams", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getExam: (id: string) => request<{ exam: ExamDetail }>(`/api/teacher/exams/${id}`),
  updateExam: (id: string, payload: { title?: string; description?: string }) =>
    request<{ exam: ExamDetail }>(`/api/teacher/exams/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteExam: (id: string) => request<{ message: string }>(`/api/teacher/exams/${id}`, { method: "DELETE" }),
  addQuestion: (
    examId: string,
    payload: { text: string; options: string[]; correctOptionIndex: number; marks?: number }
  ) =>
    request<{ exam: ExamDetail }>(`/api/teacher/exams/${examId}/questions`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateQuestion: (
    examId: string,
    qid: string,
    payload: Partial<{ text: string; options: string[]; correctOptionIndex: number; marks: number }>
  ) =>
    request<{ exam: ExamDetail }>(`/api/teacher/exams/${examId}/questions/${qid}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteQuestion: (examId: string, qid: string) =>
    request<{ exam: ExamDetail }>(`/api/teacher/exams/${examId}/questions/${qid}`, { method: "DELETE" }),
  publishExam: (id: string) => request<{ exam: ExamDetail }>(`/api/teacher/exams/${id}/publish`, { method: "PATCH" }),
  closeExam: (id: string) => request<{ exam: ExamDetail }>(`/api/teacher/exams/${id}/close`, { method: "PATCH" }),
  announceResults: (id: string) =>
    request<{ exam: ExamDetail }>(`/api/teacher/exams/${id}/announce`, { method: "PATCH" }),
  listSubmissions: (id: string) => request<{ submissions: Submission[] }>(`/api/teacher/exams/${id}/submissions`),
  studentListExams: (opts?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<PageMeta & { exams: StudentExamSummary[] }>(`/api/student/exams${qs ? `?${qs}` : ""}`);
  },
  studentGetExam: (id: string) => request<StudentExamTake>(`/api/student/exams/${id}`),
  studentSubmitExam: (id: string, answers: { question: string; selectedOptionIndex: number }[]) =>
    request<{ message: string }>(`/api/student/exams/${id}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),
  // Teacher: review a submission. `review` is rich-text HTML (sanitized server-side).
  reviewAssignmentSubmission: (
    assignmentId: string,
    submissionId: string,
    payload: { points?: number | null; review?: string; decision?: ReviewDecision; resubmitUntil?: string }
  ) =>
    request<{ submission: AssignmentSubmissionRow }>(
      `/api/teacher/assignments/${assignmentId}/submissions/${submissionId}/review`,
      { method: "PATCH", body: JSON.stringify(payload) }
    ),
  cancelAssignment: (id: string, reason: string) =>
    request<{ assignment: AssignmentSummary }>(`/api/teacher/assignments/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  restoreAssignment: (id: string) =>
    request<{ assignment: AssignmentSummary }>(`/api/teacher/assignments/${id}/restore`, { method: "POST" }),
  reviewExamSubmission: (examId: string, submissionId: string, payload: { adjustment?: number; review?: string }) =>
    request<{ submission: Submission }>(`/api/teacher/exams/${examId}/submissions/${submissionId}/review`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  studentExamResult: (id: string) => request<ExamResult>(`/api/student/exams/${id}/result`),

  // Teacher: assignments
  listAssignments: (batch: string, opts?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams({ batch });
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    return request<PageMeta & { assignments: AssignmentSummary[] }>(`/api/teacher/assignments?${params.toString()}`);
  },
  createAssignment: async (payload: {
    batch: string;
    title: string;
    description?: string;
    dueDate: string;
    file?: File | null;
  }): Promise<{ assignment: AssignmentSummary }> => {
    const formData = new FormData();
    formData.append("batch", payload.batch);
    formData.append("title", payload.title);
    if (payload.description) formData.append("description", payload.description);
    formData.append("dueDate", payload.dueDate);
    if (payload.file) formData.append("file", payload.file);

    const res = await fetch(`${API_URL}/api/teacher/assignments`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.message || "Could not create assignment", res.status);
    return data;
  },
  getAssignment: (id: string) => request<{ assignment: AssignmentSummary }>(`/api/teacher/assignments/${id}`),
  updateAssignment: (id: string, payload: { title?: string; description?: string; dueDate?: string }) =>
    request<{ assignment: AssignmentSummary }>(`/api/teacher/assignments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAssignment: (id: string) =>
    request<{ message: string }>(`/api/teacher/assignments/${id}`, { method: "DELETE" }),
  listAssignmentSubmissions: (id: string) =>
    request<{
      submissions: AssignmentSubmissionRow[];
      notSubmitted: { _id: string; name: string; email: string }[];
    }>(`/api/teacher/assignments/${id}/submissions`),

  // Student: assignments
  studentListAssignments: (opts?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<PageMeta & { assignments: StudentAssignment[] }>(`/api/student/assignments${qs ? `?${qs}` : ""}`);
  },
  studentSubmitAssignment: async (id: string, file: File): Promise<{ message: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_URL}/api/student/assignments/${id}/submit`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.message || "Submission failed", res.status);
    return data;
  },

  // Admin: inquiry forms
  listInquiryForms: () => request<{ forms: InquiryForm[] }>("/api/inquiry-forms"),
  getInquiryForm: (id: string) => request<{ form: InquiryForm; path: string }>(`/api/inquiry-forms/${id}`),
  createInquiryForm: (payload: { subject: string; description: string; questions: InquiryQuestion[] }) =>
    request<{ form: InquiryForm; path: string }>("/api/inquiry-forms", { method: "POST", body: JSON.stringify(payload) }),
  updateInquiryForm: (
    id: string,
    payload: Partial<{ subject: string; description: string; questions: InquiryQuestion[]; isActive: boolean }>
  ) => request<{ form: InquiryForm; path: string }>(`/api/inquiry-forms/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteInquiryForm: (id: string) => request<{ message: string }>(`/api/inquiry-forms/${id}`, { method: "DELETE" }),
  listInquiryResponses: (id: string, q?: InquiryQuery) =>
    request<PageMeta & { responses: InquiryResponseRow[]; summary: Record<string, InquirySummary> }>(
      `/api/inquiry-forms/${id}/responses${inquiryQs(q)}`
    ),
  deleteInquiryResponse: (id: string, responseId: string) =>
    request<{ message: string }>(`/api/inquiry-forms/${id}/responses/${responseId}`, { method: "DELETE" }),
  addInquiryResponseToLead: (id: string, responseId: string) =>
    request<{ message: string; leadId: string; existed: boolean }>(
      `/api/inquiry-forms/${id}/responses/${responseId}/lead`,
      { method: "POST" }
    ),
  exportInquiryResponses: async (id: string, q?: InquiryQuery): Promise<Blob> => {
    const res = await fetch(
      `${API_URL}/api/inquiry-forms/${id}/responses/export${inquiryQs({ ...q, page: undefined, limit: undefined })}`,
      { credentials: "include" }
    );
    if (!res.ok) throw new ApiError("Export failed", res.status);
    return res.blob();
  },
  // Public: what a student sees at /<institute>/inquiry/<formKey>
  getPublicInquiryForm: (slug: string, formKey: string) =>
    request<{ institute: Institute; form: PublicInquiryForm }>(
      `/api/inquiry-forms/public/${encodeURIComponent(slug)}/${encodeURIComponent(formKey)}`
    ),
  submitPublicInquiryForm: (slug: string, formKey: string, answers: Record<string, InquiryAnswer>) =>
    request<{ message: string }>(
      `/api/inquiry-forms/public/${encodeURIComponent(slug)}/${encodeURIComponent(formKey)}`,
      { method: "POST", body: JSON.stringify({ answers }) }
    ),

  // Admin: leads
  listLeads: (opts?: LeadListQuery) => request<PageMeta & { leads: Lead[]; invalidCount: number }>(`/api/leads${leadQs(opts)}`),
  bulkCreateLeads: (payload: {
    fileName: string;
    rows: { name: string; phone: string; email?: string; notes?: string; telecaller?: string }[];
  }) => request<LeadBulkResult>("/api/leads/bulk", { method: "POST", body: JSON.stringify(payload) }),
  leadSources: () => request<{ sources: LeadSourceOption[] }>("/api/leads/sources"),
  deleteInvalidLeads: (payload: { ids?: string[]; all?: boolean }) =>
    request<{ deleted: number }>("/api/leads/invalid/delete", { method: "POST", body: JSON.stringify(payload) }),
  createLead: (payload: { name: string; phone: string; email?: string; notes?: string }) =>
    request<{ lead: Lead }>("/api/leads", { method: "POST", body: JSON.stringify(payload) }),
  getLead: (id: string) => request<{ lead: Lead }>(`/api/leads/${id}`),
  reassignLead: (id: string, telecallerId: string) =>
    request<{ lead: Lead }>(`/api/leads/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ telecallerId }),
    }),
  registerLead: (
    id: string,
    payload: {
      name: string;
      email: string;
      password: string;
      phone?: string;
      feeAmount?: number;
      amountPaidNow?: number;
    }
  ) =>
    request<{ student: User; lead: Lead }>(`/api/leads/${id}/register`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  // Convert a lead the same way Students > Register student works
  registerLeadStudent: (id: string, payload: RegisterStudentPayload) =>
    request<{ student: User; enrollment: EnrollmentSummary; lead: Lead }>(`/api/leads/${id}/register-student`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  leadEnrollment: (id: string) => request<{ enrollment: EnrollmentSummary | null }>(`/api/leads/${id}/enrollment`),
  createLeadEnrollmentLink: (id: string, expiresInHours: number) =>
    request<{ enrollment: EnrollmentSummary }>(`/api/leads/${id}/enrollment-link`, {
      method: "POST",
      body: JSON.stringify({ expiresInHours }),
    }),
  generateLeadLink: (id: string, feeAmount?: number) =>
    request<{ token: string; feeAmount: number }>(`/api/leads/${id}/registration-link`, {
      method: "POST",
      body: JSON.stringify(feeAmount !== undefined ? { feeAmount } : {}),
    }),

  // Telecaller: leads
  myLeads: (opts?: LeadListQuery) => request<PageMeta & { leads: Lead[]; invalidCount: number }>(`/api/telecaller/leads${leadQs(opts)}`),
  myLeadSources: () => request<{ sources: LeadSourceOption[] }>("/api/telecaller/leads/sources"),
  deleteMyInvalidLeads: (payload: { ids?: string[]; all?: boolean }) =>
    request<{ deleted: number }>("/api/telecaller/leads/invalid/delete", { method: "POST", body: JSON.stringify(payload) }),
  getMyLead: (id: string) => request<{ lead: Lead }>(`/api/telecaller/leads/${id}`),
  getQuickMessages: () => request<{ messages: QuickMessage[] }>("/api/telecaller/quick-messages"),
  saveQuickMessages: (messages: { label: string; text: string }[]) =>
    request<{ messages: QuickMessage[] }>("/api/telecaller/quick-messages", {
      method: "PUT",
      body: JSON.stringify({ messages }),
    }),
  leadSummary: () => {
    const today = new Date().toLocaleDateString("en-CA");
    return request<LeadSummary>(
      `/api/telecaller/leads/summary?dayStart=${encodeURIComponent(dayStartISO(today))}&dayEnd=${encodeURIComponent(dayEndISO(today))}`
    );
  },
  setLeadFollowUp: (id: string, followUpAt: string | null) =>
    request<{ lead: Lead }>(`/api/telecaller/leads/${id}/follow-up`, {
      method: "PATCH",
      body: JSON.stringify({ followUpAt }),
    }),
  logCall: (id: string, payload: { response: CallResponse; notes?: string; followUpAt?: string }) =>
    request<{ lead: Lead }>(`/api/telecaller/leads/${id}/calls`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  registerMyLead: (
    id: string,
    payload: {
      name: string;
      email: string;
      password: string;
      phone?: string;
      feeAmount?: number;
      amountPaidNow?: number;
    }
  ) =>
    request<{ student: User; lead: Lead }>(`/api/telecaller/leads/${id}/register`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  telecallerCourses: () => request<{ courses: Course[] }>("/api/telecaller/courses"),
  registerMyLeadStudent: (id: string, payload: RegisterStudentPayload) =>
    request<{ student: User; enrollment: EnrollmentSummary; lead: Lead }>(`/api/telecaller/leads/${id}/register-student`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  myLeadEnrollment: (id: string) => request<{ enrollment: EnrollmentSummary | null }>(`/api/telecaller/leads/${id}/enrollment`),
  createMyLeadEnrollmentLink: (id: string, expiresInHours: number) =>
    request<{ enrollment: EnrollmentSummary }>(`/api/telecaller/leads/${id}/enrollment-link`, {
      method: "POST",
      body: JSON.stringify({ expiresInHours }),
    }),
  generateMyLeadLink: (id: string, feeAmount?: number) =>
    request<{ token: string; feeAmount: number }>(`/api/telecaller/leads/${id}/registration-link`, {
      method: "POST",
      body: JSON.stringify(feeAmount !== undefined ? { feeAmount } : {}),
    }),

  // Public: register via a lead's link
  leadInfo: (token: string) =>
    request<{ name: string; phone: string; email?: string; feeAmount: number; coachingClassName: string }>(
      `/api/auth/lead-info?token=${encodeURIComponent(token)}`
    ),
  registerViaLead: (payload: { token: string; name: string; email: string; password: string; phone?: string }) =>
    request<{ message: string; requiresPayment: boolean; amount?: number; user?: User }>(
      "/api/auth/register-lead",
      { method: "POST", body: JSON.stringify(payload) }
    ),
  createLeadPaymentOrder: (token: string) =>
    request<{ orderId: string; amount: number; currency: string; keyId: string; name: string; email: string }>(
      "/api/auth/lead-payment/order",
      { method: "POST", body: JSON.stringify({ token }) }
    ),
  verifyLeadPayment: (payload: {
    token: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) =>
    request<{ message: string; user: User }>("/api/auth/lead-payment/verify", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Notifications — available to every role
  listNotifications: (opts?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<PageMeta & { notifications: Notification[]; unreadCount: number }>(
      `/api/notifications${qs ? `?${qs}` : ""}`
    );
  },
  unreadNotificationCount: () => request<{ count: number }>("/api/notifications/unread-count"),
  markNotificationRead: (id: string) =>
    request<{ notification: Notification }>(`/api/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () =>
    request<{ message: string }>("/api/notifications/read-all", { method: "PATCH" }),
  sendNotification: (payload: {
    title: string;
    message: string;
    recipientId?: string;
    recipientRole?: Role;
    batchId?: string;
    broadcast?: boolean;
  }) =>
    request<{ count: number; sendBatchId: string }>("/api/notifications", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listSentNotifications: (opts?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<PageMeta & { sent: SentNotificationSummary[] }>(
      `/api/notifications/sent${qs ? `?${qs}` : ""}`
    );
  },
  getSentNotificationDetail: (sendBatchId: string) =>
    request<SentNotificationDetail>(`/api/notifications/sent/${sendBatchId}`),

  // Class network + simple chat (student/teacher only, batch-scoped)
  studentClassmates: () =>
    request<{ students: ClassPerson[]; teachers: ClassPerson[] }>("/api/student/classmates"),
  teacherBatchNetwork: (batchId: string) =>
    request<{ students: ClassPerson[]; teachers: ClassPerson[] }>(
      `/api/teacher/batches/${batchId}/network`
    ),
  chatUnreadSummary: () =>
    request<{ bySender: Record<string, number>; total: number }>("/api/messages/unread-summary"),
  getThread: (userId: string, opts?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<PageMeta & { messages: ChatMessage[] }>(
      `/api/messages/with/${userId}${qs ? `?${qs}` : ""}`
    );
  },
  sendChatMessage: (recipientId: string, text: string) =>
    request<{ message: ChatMessage }>("/api/messages", {
      method: "POST",
      body: JSON.stringify({ recipientId, text }),
    }),
  markThreadRead: (userId: string) =>
    request<{ message: string }>(`/api/messages/read/${userId}`, { method: "PATCH" }),

  studentReceipt: (paymentId: string) => request<{ receipt: Receipt }>(`/api/student/payments/${paymentId}/receipt`),
  adminReceipt: (paymentId: string) => request<{ receipt: Receipt }>(`/api/payments/receipts/${paymentId}`),
  // Student: their own registration details and uploaded documents (view only).
  myRegistration: () => request<{ registration: MyRegistration | null }>("/api/student/registration"),
  myRegistrationFile: async (kind: RegistrationDocKind) => {
    const res = await fetch(`${API_URL}/api/student/registration/file/${kind}`, { credentials: "include" });
    if (!res.ok) throw new ApiError("Could not load the file", res.status);
    return res.blob();
  },
  payNextInstallment: (razorpay?: RazorpayProof) =>
    request<{ nextDueDate: string; payment: PaidReceipt; excess: number }>("/api/student/payments/next-installment", {
      method: "POST",
      body: JSON.stringify({ razorpay }),
    }),
  // Part payment: any amount, optionally for one chosen installment.
  createCustomOrder: (payload: { amount: number; itemId?: string }) =>
    request<PaymentOrder>("/api/student/payments/custom/order", { method: "POST", body: JSON.stringify(payload) }),
  payCustom: (payload: { amount: number; itemId?: string }, razorpay?: RazorpayProof) =>
    request<{ payment: PaidReceipt; excess: number }>("/api/student/payments/custom", {
      method: "POST",
      body: JSON.stringify({ ...payload, razorpay }),
    }),
  subadminModules: () => request<{ modules: SubadminModule[]; presets: SubadminPreset[] }>("/api/subadmins/modules"),
  listSubadmins: () => request<{ subadmins: Subadmin[] }>("/api/subadmins"),
  createSubadmin: (payload: { name: string; email: string; password: string; phone?: string; permissions: Subadmin["permissions"] }) =>
    request<{ subadmin: Subadmin }>("/api/subadmins", { method: "POST", body: JSON.stringify(payload) }),
  updateSubadmin: (
    id: string,
    payload: { name?: string; phone?: string; isActive?: boolean; password?: string; permissions?: Subadmin["permissions"] }
  ) => request<{ subadmin: Subadmin }>(`/api/subadmins/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteSubadmin: (id: string) => request<{ message: string }>(`/api/subadmins/${id}`, { method: "DELETE" }),
  subadminActivity: (opts?: { page?: number; subadmin?: string }) => {
    const params = new URLSearchParams();
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.subadmin) params.set("subadmin", opts.subadmin);
    const qs = params.toString();
    return request<PageMeta & { activity: SubadminActivityRow[] }>(`/api/subadmins/activity${qs ? `?${qs}` : ""}`);
  },
  getFeeRules: () => request<{ rules: FeeRules }>("/api/fee-rules"),
  previewFeeRules: (rules: Partial<FeeRules>) =>
    request<{ rules: FeeRules; preview: FeeRulesPreview }>("/api/fee-rules/preview", { method: "POST", body: JSON.stringify(rules) }),
  saveFeeRules: (rules: Partial<FeeRules>, confirm = false) =>
    request<{ rules: FeeRules; preview: FeeRulesPreview }>("/api/fee-rules", {
      method: "PUT",
      body: JSON.stringify({ ...rules, confirm }),
    }),
  addConcession: (
    studentId: string,
    payload: { kind: "scholarship" | "discount" | "sibling"; mode?: "percent" | "flat"; value?: number; note?: string }
  ) =>
    request<{ student: AdminPaymentStudent }>(`/api/payments/students/${studentId}/concession`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createNextInstallmentOrder: () =>
    request<PaymentOrder>("/api/student/payments/next-installment/order", { method: "POST" }),
  // Student: own payment history
  myPayments: (opts?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<PageMeta & { summary: StudentPaymentSummary; history: Payment[] }>(
      `/api/student/payments${qs ? `?${qs}` : ""}`
    );
  },

  // Admin: manage a student's payment terms
  // Admin: finance ledger (credits / debits)
  financeSummary: (q: Pick<FinanceQuery, "from" | "to"> = {}) =>
    request<FinanceSummary>(`/api/finance/summary${financeQs(q)}`),
  financeEntries: (q: FinanceQuery = {}) =>
    request<PageMeta & { entries: FinanceRow[] }>(`/api/finance/entries${financeQs(q)}`),
  financeCategories: () => request<{ credit: string[]; debit: string[] }>("/api/finance/categories"),
  createFinanceEntry: (payload: FinanceEntryPayload) =>
    request<{ entry: FinanceRow }>("/api/finance/entries", { method: "POST", body: JSON.stringify(payload) }),
  updateFinanceEntry: (id: string, payload: Partial<FinanceEntryPayload>) =>
    request<{ entry: FinanceRow }>(`/api/finance/entries/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteFinanceEntry: (id: string) =>
    request<{ message: string }>(`/api/finance/entries/${id}`, { method: "DELETE" }),
  // ---- Landing page reviews (superadmin) ----
  manageTestimonials: () => request<{ testimonials: Testimonial[] }>("/api/testimonials/manage"),
  createTestimonial: (payload: TestimonialPayload) =>
    request<{ testimonial: Testimonial }>("/api/testimonials", { method: "POST", body: JSON.stringify(payload) }),
  updateTestimonial: (id: string, payload: Partial<TestimonialPayload>) =>
    request<{ testimonial: Testimonial }>(`/api/testimonials/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteTestimonial: (id: string) => request<{ message: string }>(`/api/testimonials/${id}`, { method: "DELETE" }),
  importTestimonials: (items: TestimonialPayload[]) =>
    request<{ testimonials: Testimonial[] }>("/api/testimonials/import", { method: "POST", body: JSON.stringify({ items }) }),
  // ---- Certificates ----
  certTemplates: () => request<{ templates: CertTemplate[] }>("/api/certificates/templates"),
  createCertTemplate: async (payload: { name: string; image: File; prefix?: string }) => {
    const fd = new FormData();
    fd.append("name", payload.name);
    fd.append("image", payload.image);
    if (payload.prefix) fd.append("prefix", payload.prefix);
    const res = await fetch(`${API_URL}/api/certificates/templates`, { method: "POST", credentials: "include", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.message || "Could not save the template", res.status);
    return data as { template: CertTemplate };
  },
  updateCertTemplate: (
    id: string,
    payload: { name?: string; fields?: CertField[]; qr?: CertQr; numbering?: Partial<CertNumbering>; archived?: boolean }
  ) =>
    request<{ template: CertTemplate }>(`/api/certificates/templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteCertTemplate: (id: string) =>
    request<{ message: string; archived?: boolean }>(`/api/certificates/templates/${id}`, { method: "DELETE" }),
  certTemplatePreview: (id: string, payload: { fields?: CertField[]; qr?: CertQr }) =>
    fetchBlob(`/api/certificates/templates/${id}/preview`, { method: "POST", body: JSON.stringify(payload) }),
  issueCertificates: (payload: IssueCertificatesPayload) =>
    request<IssueResult>("/api/certificates/issue", { method: "POST", body: JSON.stringify(payload) }),
  issueCertificatesSheet: (payload: {
    templateId: string;
    rows: CertSheetRow[];
    defaults: { course?: string; grade?: string; date?: string };
    allowDuplicate?: boolean;
    batchName?: string;
    qrEnabled?: boolean;
    sendEmail?: boolean;
  }) => request<IssueResult>("/api/certificates/issue-sheet", { method: "POST", body: JSON.stringify(payload) }),
  listCertificates: (q: { template?: string; batch?: string; status?: string; q?: string; page?: number; limit?: number } = {}) => {
    const params = new URLSearchParams();
    if (q.template) params.set("template", q.template);
    if (q.batch) params.set("batch", q.batch);
    if (q.status) params.set("status", q.status);
    if (q.q?.trim()) params.set("q", q.q.trim());
    if (q.page) params.set("page", String(q.page));
    if (q.limit) params.set("limit", String(q.limit));
    const qs = params.toString();
    return request<PageMeta & { certificates: Certificate[] }>(`/api/certificates${qs ? `?${qs}` : ""}`);
  },
  revokeCertificate: (id: string, reason: string) =>
    request<{ certificate: Certificate }>(`/api/certificates/${id}/revoke`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    }),
  restoreCertificate: (id: string) =>
    request<{ certificate: Certificate }>(`/api/certificates/${id}/restore`, { method: "PATCH" }),
  certificatePdf: (id: string) => fetchBlob(`/api/certificates/${id}/pdf`),
  certificatesPdf: (ids: string[]) =>
    fetchBlob("/api/certificates/pdf", { method: "POST", body: JSON.stringify({ ids }) }),
  certBatches: () => request<{ batches: CertBatch[] }>("/api/certificates/batches"),
  // Many at once: the chosen certificates, or a whole batch. Runs in the background; poll certEmailJob.
  emailCertificates: (payload: { ids?: string[]; batchId?: string; resend?: boolean }) =>
    request<{ jobId: string; total: number }>("/api/certificates/email", { method: "POST", body: JSON.stringify(payload) }),
  certEmailJob: (id: string) => request<{ job: CertEmailJob }>(`/api/certificates/email-jobs/${id}`),
  emailCertificate: (id: string) =>
    request<{ certificate: Certificate }>(`/api/certificates/${id}/email`, { method: "POST" }),
  setCertificatesQr: (ids: string[], enabled: boolean) =>
    request<{ updated: number; qrEnabled: boolean }>("/api/certificates/qr", { method: "POST", body: JSON.stringify({ ids, enabled }) }),
  verifyCertificatePdf: (code: string) => fetchBlob(`/api/certificates/verify/${encodeURIComponent(code)}/pdf`),
  myCertificates: () => request<{ certificates: Certificate[] }>("/api/student/certificates"),
  myCertificatePdf: (id: string) => fetchBlob(`/api/student/certificates/${id}/pdf`),
  verifyCertificate: (code: string) =>
    request<CertificateVerification>(`/api/certificates/verify/${encodeURIComponent(code)}`),
  financeExport: async (q: FinanceQuery = {}) => {
    const res = await fetch(`${API_URL}/api/finance/export${financeQs(q)}`, { credentials: "include" });
    if (!res.ok) throw new ApiError("Could not export", res.status);
    return res.blob();
  },
  getStudentPayment: (id: string, opts?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<PageMeta & { student: AdminPaymentStudent; history: Payment[] }>(
      `/api/payments/students/${id}${qs ? `?${qs}` : ""}`
    );
  },
  updateStudentPayment: (id: string, payload: { installmentAmount?: number; balanceDue?: number; nextDueDate?: string }) =>
    request<{ student: AdminPaymentStudent }>(`/api/payments/students/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  recordPayment: (id: string, payload: { amount: number; note?: string }) =>
    request<{ payment: Payment; student: AdminPaymentStudent }>(`/api/payments/students/${id}/record`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  // Adds `days` on top of the current deadline (due date + grace days).
  extendPaymentDeadline: (id: string, days: number) =>
    request<{ student: AdminPaymentStudent }>(`/api/payments/students/${id}/extend`, {
      method: "POST",
      body: JSON.stringify({ days }),
    }),
  editInstallment: (id: string, itemId: string, payload: { dueDate?: string; amount?: number }) =>
    request<{ student: AdminPaymentStudent }>(`/api/payments/students/${id}/installments/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  reactivateStudent: (id: string, days?: number) =>
    request<{ student: AdminPaymentStudent }>(`/api/payments/students/${id}/reactivate`, {
      method: "POST",
      body: JSON.stringify({ days }),
    }),
  // Pay the full balance due. Pass credentials when locked out of the account.
  // Pay the full balance due. Pass credentials when locked out of the account, and
  // the Razorpay proof once the student has paid in checkout.
  payDues: (credentials?: { email: string; password: string }, razorpay?: RazorpayProof) =>
    request<{ message: string; payment: PaidReceipt; excess: number }>(credentials ? "/api/auth/dues-payment" : "/api/auth/me/dues-payment", {
      method: "POST",
      body: JSON.stringify({ ...(credentials ?? {}), razorpay }),
    }),
  createDuesOrder: (credentials?: { email: string; password: string }) =>
    request<PaymentOrder>(credentials ? "/api/auth/dues-payment/order" : "/api/auth/me/dues-payment/order", {
      method: "POST",
      body: JSON.stringify(credentials ?? {}),
    }),
  createRegistrationOrder: (token: string, payload: { slug: string; plan: string; email?: string; name?: string }) =>
    request<PaymentOrder | { mode: "paid"; orderId: string; amount: number }>(`/api/course-registration/${encodeURIComponent(token)}/payment-order`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Admin: the institute's own Razorpay account
  paymentsNeedingAttention: () => request<{ orders: PaymentAttention[] }>("/api/payments/orders/attention"),
  getRazorpaySettings: () => request<{ razorpay: RazorpaySettings }>("/api/institutes/razorpay"),
  saveRazorpaySettings: (payload: { keyId: string; keySecret: string }) =>
    request<{ razorpay: RazorpaySettings }>("/api/institutes/razorpay", { method: "PUT", body: JSON.stringify(payload) }),
  removeRazorpaySettings: () => request<{ razorpay: RazorpaySettings }>("/api/institutes/razorpay", { method: "DELETE" }),

  // Admin: YouTube integration for session recordings
  getYoutubeStatus: () => request<YoutubeStatus>("/api/admin/youtube/status"),
  saveYoutubeCredentials: (payload: { clientId: string; clientSecret: string }) =>
    request<{ message: string }>("/api/admin/youtube/credentials", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  getYoutubeConnectUrl: () => request<{ url: string }>("/api/admin/youtube/connect"),
  disconnectYoutube: () =>
    request<{ message: string }>("/api/admin/youtube/disconnect", { method: "DELETE" }),

  // Admin: own storage server (AWS S3 / Cloudflare R2) for session recordings
  getStorageStatus: () => request<StorageStatus>("/api/admin/storage/status"),
  saveStorageConfig: (payload: SaveStoragePayload) =>
    request<{ message: string }>("/api/admin/storage/config", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  removeStorageConfig: () =>
    request<{ message: string }>("/api/admin/storage/config", { method: "DELETE" }),

  // Superadmin: choose which recording flow an institute uses
  setAdminVideoFlow: (adminId: string, flow: VideoFlow) =>
    request<{ user: User }>(`/api/superadmin/admins/${adminId}/video-flow`, {
      method: "PATCH",
      body: JSON.stringify({ flow }),
    }),

  // Student Portfolio — public, self-serve resume/portfolio builder, entirely
  // separate from institute accounts (own "portfolio_token" cookie, no admin tenancy).
  portfolioRegister: (payload: {
    name: string;
    email: string;
    password: string;
    dob: string;
    headline?: string;
    bio?: string;
    phone?: string;
    location?: string;
  }) =>
    request<{ portfolio: PortfolioOwn }>("/api/portfolio/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  portfolioLogin: (email: string, password: string) =>
    request<{ portfolio: PortfolioOwn }>("/api/portfolio/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  portfolioLogout: () => request<{ message: string }>("/api/portfolio/logout", { method: "POST" }),
  portfolioMe: () => request<{ portfolio: PortfolioOwn }>("/api/portfolio/me"),
  portfolioUpdate: (payload: PortfolioUpdatePayload) =>
    request<{ portfolio: PortfolioOwn }>("/api/portfolio/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  portfolioUploadProfilePicture: async (file: File): Promise<{ portfolio: PortfolioOwn }> => {
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch(`${API_URL}/api/portfolio/me/profile-picture`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.message || "Could not upload profile picture", res.status);
    return data;
  },
  portfolioUploadBackgroundImage: async (file: File): Promise<{ portfolio: PortfolioOwn }> => {
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch(`${API_URL}/api/portfolio/me/background-image`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.message || "Could not upload background image", res.status);
    return data;
  },
  portfolioDeleteProfilePicture: () =>
    request<{ portfolio: PortfolioOwn }>("/api/portfolio/me/profile-picture", { method: "DELETE" }),
  portfolioDeleteBackgroundImage: () =>
    request<{ portfolio: PortfolioOwn }>("/api/portfolio/me/background-image", { method: "DELETE" }),
  portfolioGetPublic: (slug: string) =>
    request<{ portfolio: PortfolioPublic }>(`/api/portfolio/public/${encodeURIComponent(slug)}`),
};

export { ApiError };
