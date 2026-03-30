import type { UserRole } from './auth';

export type EventName =
  // Dashboard
  | 'GET_DASHBOARD_SUMMARY'
  | 'GET_REVIEW_QUEUE'
  | 'GET_DRAFTS'
  | 'GET_RECENT_ACTIVITY'
  | 'GET_STUDENT_INSIGHTS'
  | 'REVIEW_OPEN'
  | 'DRAFT_OPEN'
  
  // Assessments
  | 'NEW_ASSESSMENT_START'
  | 'ASSESSMENT_CREATE_DRAFT'
  | 'ASSESSMENT_GET'
  | 'ASSESSMENT_FINALIZE'
  | 'ASSESSMENT_MARK_COMPLETE'
  | 'ASSESSMENT_TYPED_UPLOAD'
  | 'ASSESSMENT_IMAGE_UPLOAD'
  | 'ASSESSMENT_EXTRACT_TEXT'
  | 'ASSESSMENT_TEXT_UPDATE'
  | 'ASSESSMENT_RUN_AI_GRADE'
  | 'ASSESSMENT_SUBMIT_FOR_AI_REVIEW'
  | 'ASSESSMENT_SUGGESTION_ACTION'
  | 'ASSESSMENT_SAVE_TEACHER_FEEDBACK'
  | 'ASSESSMENT_SET_RUBRIC'
  | 'ASSESSMENT_SAVE_RUBRIC_OVERRIDE'
  | 'ASSESSMENT_LIST'
  | 'ASSESSMENT_GET_STUDENTS_FOR_ASSIGNMENT'
  | 'ASSESSMENT_SAVE_TYPED'
  | 'ASSESSMENT_IMAGE_EXTRACT'
  
  // Students
  | 'STUDENT_LIST'
  | 'STUDENT_GET'
  | 'STUDENT_CREATE'
  | 'STUDENT_REPORTS_LIST'
  | 'STUDENT_IMPORT_PROCESS'

  // Rubrics
  | 'RUBRIC_LIST'
  | 'RUBRIC_GET'

  // Reports
  | 'REPORTS_LIST'
  | 'REPORT_GET'
  | 'REPORT_GENERATE'
  | 'REPORT_SEND'
  | 'REPORT_DOWNLOAD_PDF'

  // Parent Portal
  | 'PARENT_CHILDREN_LIST'
  | 'PARENT_REPORTS_LIST'
  | 'PARENT_REPORT_GET'

  // Other
  | 'HEALTH_CHECK';

// === GENERIC ERROR/SUCCESS TYPES ===
export interface ErrorResponse {
  message: string;
  code?: string;
}

// === DASHBOARD EVENTS ===

export interface GetDashboardSummaryRequest {
  eventName: 'GET_DASHBOARD_SUMMARY';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: {};
}

export interface GetDashboardSummaryResponse {
  success: boolean;
  data?: { kpis: DashboardKpis };
  error?: ErrorResponse;
  correlationId: string;
}

export interface GetReviewQueueRequest {
  eventName: 'GET_REVIEW_QUEUE';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: {};
}

export interface GetReviewQueueResponse {
  success: boolean;
  data?: { items: ReviewQueueItem[] };
  error?: ErrorResponse;
  correlationId: string;
}

export interface GetDraftsRequest {
  eventName: 'GET_DRAFTS';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: {};
}

export interface GetDraftsResponse {
  success: boolean;
  data?: { items: DraftItem[] };
  error?: ErrorResponse;
  correlationId: string;
}

export interface GetRecentActivityRequest {
  eventName: 'GET_RECENT_ACTIVITY';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: { limit?: number };
}

export interface GetRecentActivityResponse {
  success: boolean;
  data?: { items: ActivityItem[] };
  error?: ErrorResponse;
  correlationId: string;
}

export interface ReviewOpenRequest {
  eventName: 'REVIEW_OPEN';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: { assessmentId: string };
}

export interface ReviewOpenResponse {
  success: boolean;
  error?: ErrorResponse;
  correlationId: string;
}

export interface DraftOpenRequest {
  eventName: 'DRAFT_OPEN';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: { assessmentId: string };
}

export interface DraftOpenResponse {
  success: boolean;
  error?: ErrorResponse;
  correlationId: string;
}

// === INSIGHT TYPES ===
export type StudentInsight = {
  studentId: string;
  name: string;
  latestLevel: string;
  scoreDelta: number; // e.g. +1.2
  history: Array<{ date: string; value: number }>;
};

export type DashboardInsights = {
  declining: StudentInsight[];
  improving: StudentInsight[];
  atRisk: StudentInsight[];
};

// === ASSESSMENT EVENTS ===

export interface AssessmentCreateDraftRequest {
  eventName: 'ASSESSMENT_CREATE_DRAFT';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: {
    title: string;
    rubricName?: string;
    notes?: string;
  };
}

export interface AssessmentCreateDraftResponse {
  success: boolean;
  data?: { assessmentId: string };
  error?: ErrorResponse;
  correlationId: string;
}

export interface AssessmentGetRequest {
  eventName: 'ASSESSMENT_GET';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: { assessmentId: string };
}

export interface AssessmentGetResponse {
  success: boolean;
  data?: { assessment: AssessmentWorkspaceData };
  error?: ErrorResponse;
  correlationId: string;
}

export interface AssessmentSetRubricRequest {
  eventName: 'ASSESSMENT_SET_RUBRIC';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: { assessmentId: string; rubricName: string };
}

export interface AssessmentSetRubricResponse {
  success: boolean;
  error?: ErrorResponse;
  correlationId: string;
}

export interface AssessmentTypedUploadRequest {
  eventName: 'ASSESSMENT_TYPED_UPLOAD';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: { assessmentId: string; fileRef: string };
}

export interface AssessmentTypedUploadResponse {
  success: boolean;
  data?: { extractedText: string };
  error?: ErrorResponse;
  correlationId: string;
}

export interface AssessmentImageUploadRequest {
  eventName: 'ASSESSMENT_IMAGE_UPLOAD';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: { assessmentId: string; fileRef: string };
}

export interface AssessmentImageUploadResponse {
  success: boolean;
  data?: { extractedText: string };
  error?: ErrorResponse;
  correlationId: string;
}

export interface AssessmentSubmitForAIReviewRequest {
  eventName: 'ASSESSMENT_SUBMIT_FOR_AI_REVIEW';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: { assessmentId: string; text: string };
}

export interface AssessmentSubmitForAIReviewResponse {
  success: boolean;
  data?: {
    grades: RubricGrade[];
    suggestions: AISuggestion[];
  };
  error?: ErrorResponse;
  correlationId: string;
}

export interface AssessmentFinalizeRequest {
  eventName: 'ASSESSMENT_FINALIZE';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: { assessmentId: string };
}

export interface AssessmentFinalizeResponse {
  success: boolean;
  error?: ErrorResponse;
  correlationId: string;
}

export interface AssessmentListRequest {
  eventName: 'ASSESSMENT_LIST';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: {
    status?: AssessmentStatus | 'all';
    classId?: string;
    rubricName?: string;
    submissionType?: 'typed' | 'handwritten';
    search?: string;
    page?: number;
    pageSize?: number;
  };
}

export interface AssessmentListResponse {
  success: boolean;
  data?: {
    items: AssessmentListItem[];
    counts: AssessmentListCounts;
    pagination: { page: number; pageSize: number; total: number };
  };
  error?: ErrorResponse;
  correlationId: string;
}

export interface AssessmentGetStudentsForAssignmentRequest {
  eventName: 'ASSESSMENT_GET_STUDENTS_FOR_ASSIGNMENT';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: { assessmentId: string };
}

export interface AssessmentGetStudentsForAssignmentResponse {
  success: boolean;
  data?: { students: StudentAssessmentVersion[] };
  error?: ErrorResponse;
  correlationId: string;
}

// === STUDENT EVENTS ===

export interface StudentListRequest {
  eventName: 'STUDENT_LIST';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: {};
}

export interface StudentListResponse {
  success: boolean;
  data?: { students: StudentListItem[]; total: number };
  error?: ErrorResponse;
  correlationId: string;
}

export interface StudentGetRequest {
  eventName: 'STUDENT_GET';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: { studentId: string };
}

export interface StudentGetResponse {
  success: boolean;
  data?: { student: StudentProfileData };
  error?: ErrorResponse;
  correlationId: string;
}

export interface StudentCreateRequest {
  eventName: 'STUDENT_CREATE';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: StudentCreatePayload;
}

export interface StudentCreateResponse {
  success: boolean;
  data?: { studentId: string };
  error?: ErrorResponse;
  correlationId: string;
}

// === RUBRIC EVENTS ===

export interface RubricListRequest {
  eventName: 'RUBRIC_LIST';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: {};
}

export interface RubricListResponse {
  success: boolean;
  data?: { rubrics: RubricListItem[] };
  error?: ErrorResponse;
  correlationId: string;
}

// === REPORT EVENTS ===

export interface ReportsListRequest {
  eventName: 'REPORTS_LIST';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: { page?: number; pageSize?: number };
}

export interface ReportsListResponse {
  success: boolean;
  data?: {
    items: ReportListItem[];
    pagination: { page: number; pageSize: number; total: number };
  };
  error?: ErrorResponse;
  correlationId: string;
}

export interface ReportGetRequest {
  eventName: 'REPORT_GET';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: { reportId: string };
}

export interface ReportGetResponse {
  success: boolean;
  data?: { report: ReportData };
  error?: ErrorResponse;
  correlationId: string;
}

export interface ReportGenerateRequest {
  eventName: 'REPORT_GENERATE';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: ReportGeneratePayload;
}

export interface ReportGenerateResponse {
  success: boolean;
  data?: { reportId: string; status: 'Queued' | 'Generating' };
  error?: ErrorResponse;
  correlationId: string;
}

export interface ReportSendRequest {
  eventName: 'REPORT_SEND';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: { reportId: string; delivery: { portal: boolean; email: boolean } };
}

export interface ReportSendResponse {
  success: boolean;
  error?: ErrorResponse;
  correlationId: string;
}

export interface ReportDownloadPdfRequest {
  eventName: 'REPORT_DOWNLOAD_PDF';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: { reportId: string };
}

export interface ReportDownloadPdfResponse {
  success: boolean;
  data?: { pdfUrl: string; expiresAt: string };
  error?: ErrorResponse;
  correlationId: string;
}

// === PARENT PORTAL EVENTS ===

export interface ParentChildrenListRequest {
  eventName: 'PARENT_CHILDREN_LIST';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: {};
}

export interface ParentChildrenListResponse {
  success: boolean;
  data?: ParentChildrenListResponse;
  error?: ErrorResponse;
  correlationId: string;
}

export interface ParentReportsListRequest {
  eventName: 'PARENT_REPORTS_LIST';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: ParentReportsListPayload;
}

export interface ParentReportsListResponse extends BaseWebhookResponse {
  data?: {
    studentName: string;
    items: ParentReportListItem[];
    pagination: { page: number; pageSize: number; total: number };
  };
}

export interface ParentReportGetRequest {
  eventName: 'PARENT_REPORT_GET';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: { reportId: string };
}

export interface ParentReportGetResponse {
  success: boolean;
  data?: ParentReportGetResponse;
  error?: ErrorResponse;
  correlationId: string;
}

// === OTHER EVENTS ===

export interface HealthCheckRequest {
  eventName: 'HEALTH_CHECK';
  requestId: string;
  timestamp: string;
  actor: { role: UserRole; userId: string };
  payload: {};
}

export interface HealthCheckResponse {
  success: boolean;
  data?: HealthCheckData;
  error?: ErrorResponse;
  correlationId: string;
}

// === UNION TYPE FOR ALL REQUESTS/RESPONSES ===

export type WebhookRequestUnion = 
  | GetDashboardSummaryRequest
  | GetReviewQueueRequest
  | GetDraftsRequest
  | GetRecentActivityRequest
  | ReviewOpenRequest
  | DraftOpenRequest
  | AssessmentCreateDraftRequest
  | AssessmentGetRequest
  | AssessmentSetRubricRequest
  | AssessmentTypedUploadRequest
  | AssessmentImageUploadRequest
  | AssessmentSubmitForAIReviewRequest
  | AssessmentFinalizeRequest
  | AssessmentListRequest
  | AssessmentGetStudentsForAssignmentRequest
  | StudentListRequest
  | StudentGetRequest
  | StudentCreateRequest
  | RubricListRequest
  | ReportsListRequest
  | ReportGetRequest
  | ReportGenerateRequest
  | ReportSendRequest
  | ReportDownloadPdfRequest
  | ParentChildrenListRequest
  | ParentReportsListRequest
  | ParentReportGetRequest
  | HealthCheckRequest;

export type WebhookResponseUnion =
  | GetDashboardSummaryResponse
  | GetReviewQueueResponse
  | GetDraftsResponse
  | GetRecentActivityResponse
  | ReviewOpenResponse
  | DraftOpenResponse
  | AssessmentCreateDraftResponse
  | AssessmentGetResponse
  | AssessmentSetRubricResponse
  | AssessmentTypedUploadResponse
  | AssessmentImageUploadResponse
  | AssessmentSubmitForAIReviewResponse
  | AssessmentFinalizeResponse
  | AssessmentListResponse
  | AssessmentGetStudentsForAssignmentResponse
  | StudentListResponse
  | StudentGetResponse
  | StudentCreateResponse
  | RubricListResponse
  | ReportsListResponse
  | ReportGetResponse
  | ReportGenerateResponse
  | ReportSendResponse
  | ReportDownloadPdfResponse
  | ParentChildrenListResponse
  | ParentReportsListResponse
  | ParentReportGetResponse
  | HealthCheckResponse;

// For backwards compatibility
export interface BaseWebhookResponse {
  success: boolean;
  error?: ErrorResponse;
  correlationId: string;
}

export interface WebhookRequest<T = Record<string, any>> {
  eventName: EventName;
  requestId: string;
  timestamp: string;
  actor: {
    role: UserRole;
    userId: string;
  };
  payload: T;
}

export interface WebhookResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  correlationId: string;
}

// --- Specific Payload and Data types ---

// GET_DASHBOARD_SUMMARY
export type DashboardKpis = {
  pendingReview: number;
  drafts: number;
  finalizedThisWeek: number;
};

// GET_REVIEW_QUEUE
export type ReviewQueueItem = {
  studentName: string;
  studentId: string;
  assessmentName: string;
  assessmentId: string;
  status: 'pending_review' | 'ai_draft_ready';
  updatedAt: string;
};

// GET_DRAFTS
export type DraftItem = {
  assessmentId: string;
  assessmentName: string;
  studentName: string;
  updatedAt: string;
};

// GET_RECENT_ACTIVITY
export type ActivityItem = {
  id: string;
  type: 'assessment_created' | 'assessment_finalized' | 'student_added' | 'draft_updated' | 'report_generated';
  title: string;
  subtitle: string;
  updatedAt: string;
};

// RUBRIC_LIST
export type RubricListItem = {
  id?: string;
    name: string;
  version?: string;
  criteria1?: string;
  criteria2?: string;
  criteria3?: string;
  criteria4?: string;
};


// STUDENT_LIST
export type StudentListItem = {
    name: string;
    grade: string;
    studentIdNumber: string;
    studentEmail?: string;
    parentEmail: string;
};
export type GetStudentListData = {
    students: StudentListItem[];
    total: number;
};

// STUDENT_GET
export type StudentProfileData = {
    name: string;
    grade: string;
    studentIdNumber: string;
    studentEmail?: string;
    parentEmail: string;
};

// STUDENT_ASSESSMENTS_LIST
export type StudentAssessmentListItem = {
    id: string;
    name: string;
    type: 'Writing' | 'Reading' | 'Math' | 'Science' | 'EAL';
    status: 'Draft' | 'AI Draft Ready' | 'Needs Review' | 'Finalized';
    updatedAt: string;
};

// STUDENT_REPORTS_LIST
export type StudentReportListItem = {
    id: string;
    name: string;
    generatedDate: string;
    status: 'Draft' | 'Final';
};

// STUDENT_CREATE
export type StudentCreatePayload = {
    name: string;
    studentIdNumber: string;
    grade: string;
    studentEmail?: string;
    parentEmail: string;
};

// ASSESSMENT_GET & related
export type AISuggestion = {
    id: string;
    start: number;
    end: number;
    criterionName: string;
    severity: 'Minor' | 'Moderate' | 'Major';
    comment: string;
    replacement?: string;
};

export type RubricGrade = {
    id: string;
    criterionId: string;
    criterionName: string;
    suggestedLevelOrScore: number;
    rationale: string;
    evidenceRefs?: string[];
}

export type AssessmentWorkspaceData = {
    id: string;
    title: string;
    status: 'draft' | 'ai_draft_ready' | 'needs_review' | 'finalized';
  rubricName: string | null;
    student: {
        id: string;
        name: string;
    };
    notes?: string;
    source: 'typed' | 'handwritten_extracted' | null;
    currentText: string | null;
    uploads: { id: string, fileName: string, type: 'typed' | 'handwritten' }[];
    aiReview: {
        status: 'idle' | 'running' | 'ready' | 'error';
        suggestions: AISuggestion[];
        rubricGrades: RubricGrade[];
    } | null;
    teacherFeedback: {
        notes: string;
        finalFeedback: string;
    } | null;
    teacherOverrides: {
        [criterionId: string]: {
            score: number;
            note: string;
        }
    } | null;
};


// HEALTH_CHECK
export type HealthCheckData = {
    authConfigured: boolean;
    webhookConfigured: boolean;
    databaseConnected: boolean;
    lastSuccessfulCall?: string;
};

// ASSESSMENT_LIST
export type AssessmentStatus = 'draft' | 'ai_draft_ready' | 'needs_review' | 'finalized';

export interface AssessmentListItem {
  assessmentId: string;
  title: string;
  student: { id: string; name: string };
  rubric: { name: string };
  status: AssessmentStatus;
  updatedAt: string;
  notes?: string;
}

export interface StudentAssessmentVersion {
  id: string;
  name: string;
  assessmentId: string;
  status: AssessmentStatus;
  submissionType: string;
  updatedAt: string;
}

export interface AssessmentListCounts {
  needsReview: number;
  drafts: number;
  finalizedThisWeek: number;
}

export interface AssessmentListPayload {
  status?: AssessmentStatus | 'all';
  classId?: string;
  rubricName?: string;
  submissionType?: 'typed' | 'handwritten';
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AssessmentListResponse {
  items: AssessmentListItem[];
  counts: AssessmentListCounts;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

// REPORTS
export interface ReportListItem {
    reportId: string;
    studentName: string;
    periodLabel: string;
    generatedAt: string;
    status: 'Queued' | 'Generated' | 'Sent' | 'Failed';
    hasPdf: boolean;
    delivery: {
        portal: boolean;
        email: boolean;
    };
}

export interface ReportListResponse {
    items: ReportListItem[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
    };
}

export interface ReportGeneratePayload {
    studentId: string;
    period: {
        preset?: 'last_30' | 'this_month';
        startDate?: string;
        endDate?: string;
    };
    include: {
        summary: boolean;
        rubricBreakdown: boolean;
        teacherNotes: boolean;
    };
    delivery: {
        portal: boolean;
        email: boolean;
        pdf: boolean;
    };
}

export interface ReportData {
    id: string;
    studentName: string;
    periodLabel: string;
    generatedAt: string;
    summary: string;
    strengths: string[];
    growthAreas: string[];
    rubricSnapshot: {
        criterion: string;
        averageScore: number;
        trend: 'up' | 'down' | 'stable';
    }[];
    teacherFinalComment: string;
    includedAssessmentsCount: number;
}

// --- Parent Portal Types ---

// PARENT_CHILDREN_LIST
export interface ParentChild {
    childId: string;
    childName: string;
    gradeLabel: string;
    latestReportAt: string | null;
}
export interface ParentChildrenListResponse {
    children: ParentChild[];
}

// PARENT_REPORTS_LIST
export interface ParentReportListItem {
    reportId: string;
    periodLabel: string;
    generatedAt: string;
    hasPdf: boolean;
}
export interface ParentReportsListPayload {
    childId: string;
    page?: number;
    pageSize?: number;
}
export interface ParentReportsListResponse {
    studentName: string;
    items: ParentReportListItem[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
    };
}

// PARENT_REPORT_GET
export interface ParentReportData {
    reportId: string;
    childName: string;
    periodLabel: string;
    generatedAt: string;
    sections: {
        summary: string;
        strengths: string[];
        growthAreas: string[];
        rubricSnapshot: {
            criterion: string;
            averageScore: number;
            trend: 'up' | 'down' | 'stable';
        }[];
        teacherFinalComment: string;
    };
    hasPdf: boolean;
}
export interface ParentReportGetResponse {
    report: ParentReportData;
}
