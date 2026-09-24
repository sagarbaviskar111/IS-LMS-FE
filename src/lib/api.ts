const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  isActive: boolean;
  pending?: boolean;
  admin?: string | null;
  studentInviteCode?: string;
  teacherInviteCode?: string;
  telecallerInviteCode?: string;
  batch?: string | null;
  batches?: string[];
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
  createdAt: string;
  updatedAt: string;
}

export interface Institute {
  name: string;
  slug: string;
  brandColor: string | null;
  logoUrl: string | null;
}

export interface OwnInstitute {
  name: string;
  instituteSlug: string | null;
  brandColor: string | null;
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
  studentCount?: number;
  teacherCount?: number;
  createdAt: string;
  updatedAt: string;
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

export interface YoutubeStatus {
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

export type CallResponse = "no_answer" | "call_back_later" | "interested" | "not_interested" | "wrong_number";

export type LeadStatus = "new" | "contacted" | "interested" | "not_interested" | "converted" | "lost";

export interface CallLog {
  _id: string;
  calledBy: { _id: string; name: string; email: string } | string;
  response: CallResponse;
  notes?: string;
  createdAt: string;
}

export interface Lead {
  _id: string;
  admin: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  assignedTelecaller: { _id: string; name: string; email: string } | string | null;
  status: LeadStatus;
  convertedStudent?: { _id: string; name: string; email: string } | string | null;
  convertedBy?: { _id: string; name: string; email: string; role: Role } | string | null;
  registrationToken?: string;
  feeAmount?: number;
  callLogs: CallLog[];
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
  publicInstitute: (slug: string) => request<{ institute: Institute }>(`/api/institutes/${encodeURIComponent(slug)}`),
  getBranding: () => request<{ institute: OwnInstitute }>("/api/institutes/branding"),
  updateBranding: async (payload: {
    instituteSlug?: string;
    brandColor?: string | null;
    logo?: File | null;
  }): Promise<{ institute: OwnInstitute }> => {
    const formData = new FormData();
    if (payload.instituteSlug !== undefined) formData.append("instituteSlug", payload.instituteSlug);
    if (payload.brandColor !== undefined) formData.append("brandColor", payload.brandColor || "");
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
  listUsers: (opts?: { role?: Role; status?: UserStatus; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.role) params.set("role", opts.role);
    if (opts?.status) params.set("status", opts.status);
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
  listBatches: (opts?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<PageMeta & { batches: Batch[] }>(`/api/batches${qs ? `?${qs}` : ""}`);
  },
  createBatch: (payload: {
    name: string;
    description?: string;
    studentIds?: string[];
    teacherIds?: string[];
    defaultFee?: number;
    paymentCycleDays?: number;
  }) =>
    request<{ batch: Batch }>("/api/batches", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateBatch: (
    id: string,
    payload: { name?: string; description?: string; defaultFee?: number; paymentCycleDays?: number }
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
  listStudentGroups: () => request<{ groups: StudentGroup[] }>("/api/student-groups"),
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
  myBatches: () => request<{ batches: Batch[] }>("/api/teacher/batches"),
  batchStudents: (batchId: string) =>
    request<{ students: User[] }>(`/api/teacher/batches/${batchId}/students`),
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
  listMaterials: (batch: string) =>
    request<{ materials: Material[] }>(`/api/teacher/materials?batch=${batch}`),
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
  studentSessions: () => request<{ sessions: Session[] }>("/api/student/sessions"),
  studentAttendance: () => request<StudentAttendance>("/api/student/attendance"),
  studentMaterials: () => request<{ materials: Material[] }>("/api/student/materials"),
  listExams: (batch: string) => request<{ exams: ExamSummary[] }>(`/api/teacher/exams?batch=${batch}`),
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
  studentListExams: () => request<{ exams: StudentExamSummary[] }>("/api/student/exams"),
  studentGetExam: (id: string) => request<StudentExamTake>(`/api/student/exams/${id}`),
  studentSubmitExam: (id: string, answers: { question: string; selectedOptionIndex: number }[]) =>
    request<{ message: string }>(`/api/student/exams/${id}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),
  studentExamResult: (id: string) => request<ExamResult>(`/api/student/exams/${id}/result`),

  // Teacher: assignments
  listAssignments: (batch: string) =>
    request<{ assignments: AssignmentSummary[] }>(`/api/teacher/assignments?batch=${batch}`),
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
  studentListAssignments: () => request<{ assignments: StudentAssignment[] }>("/api/student/assignments"),
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

  // Admin: leads
  listLeads: (opts?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<PageMeta & { leads: Lead[] }>(`/api/leads${qs ? `?${qs}` : ""}`);
  },
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
  myLeads: (opts?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.page) params.set("page", String(opts.page));
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<PageMeta & { leads: Lead[] }>(`/api/telecaller/leads${qs ? `?${qs}` : ""}`);
  },
  getMyLead: (id: string) => request<{ lead: Lead }>(`/api/telecaller/leads/${id}`),
  logCall: (id: string, payload: { response: CallResponse; notes?: string }) =>
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
    request<{ count: number }>("/api/notifications", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

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
