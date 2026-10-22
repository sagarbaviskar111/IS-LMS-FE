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
  method: "razorpay" | "manual";
  status: "paid" | "failed";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  recordedBy?: { _id: string; name: string; role: Role } | string | null;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentPaymentSummary {
  installmentAmount?: number;
  balanceDue?: number;
  nextDueDate?: string | null;
  paymentGraceUntil?: string | null;
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

export interface AssignmentSummary {
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
}

export interface StudentAssignment {
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
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
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
    throw new ApiError(data.message || "Request failed", res.status);
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

export const api = {
  login: (email: string, password: string) =>
    request<{ user: User; institute: Institute | null }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
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
    request<{ message: string }>(`/api/users/${id}`, { method: "DELETE" }),
  getTeamSettings: () => request<{ allowSelfPasswordReset: boolean }>("/api/users/team-settings"),
  updateTeamSettings: (payload: { allowSelfPasswordReset: boolean }) =>
    request<{ allowSelfPasswordReset: boolean }>("/api/users/team-settings", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  getEmailSettings: () => request<{ address: string | null; hasCredentials: boolean }>("/api/users/email-settings"),
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
  getStudentPayment: (id: string, opts?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<PageMeta & { student: AdminPaymentStudent; history: Payment[] }>(
      `/api/payments/students/${id}${qs ? `?${qs}` : ""}`
    );
  },
  updateStudentPayment: (id: string, payload: { installmentAmount?: number; balanceDue?: number }) =>
    request<{ student: AdminPaymentStudent }>(`/api/payments/students/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  recordPayment: (id: string, payload: { amount: number; note?: string }) =>
    request<{ payment: Payment; student: AdminPaymentStudent }>(`/api/payments/students/${id}/record`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  extendPaymentDeadline: (id: string, until: string) =>
    request<{ student: AdminPaymentStudent }>(`/api/payments/students/${id}/extend`, {
      method: "POST",
      body: JSON.stringify({ until }),
    }),
  reactivateStudent: (id: string) =>
    request<{ student: AdminPaymentStudent }>(`/api/payments/students/${id}/reactivate`, { method: "POST" }),

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
