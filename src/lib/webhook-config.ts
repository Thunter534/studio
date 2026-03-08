import type { EventName } from './events';

/**
 * Maps each webhook event to its corresponding n8n webhook URL
 * All URLs are read from environment variables
 * Uses NEXT_PUBLIC_ prefix to make variables accessible in client components
 */
export const webhookUrls: Record<EventName, string | undefined> = {
  // Dashboard
  GET_DASHBOARD_SUMMARY: process.env.NEXT_PUBLIC_N8N_DASHBOARD_SUMMARY_URL,
  GET_REVIEW_QUEUE: process.env.NEXT_PUBLIC_N8N_REVIEW_QUEUE_URL,
  GET_DRAFTS: process.env.NEXT_PUBLIC_N8N_DRAFTS_URL,
  REVIEW_OPEN: process.env.NEXT_PUBLIC_N8N_REVIEW_OPEN_URL,
  DRAFT_OPEN: process.env.NEXT_PUBLIC_N8N_DRAFT_OPEN_URL,

  // Assessments
  NEW_ASSESSMENT_START: process.env.NEXT_PUBLIC_N8N_NEW_ASSESSMENT_START_URL,
  ASSESSMENT_CREATE_DRAFT: process.env.NEXT_PUBLIC_N8N_ASSESSMENT_CREATE_DRAFT_URL,
  ASSESSMENT_GET: process.env.NEXT_PUBLIC_N8N_ASSESSMENT_GET_URL,
  ASSESSMENT_FINALIZE: process.env.NEXT_PUBLIC_N8N_ASSESSMENT_FINALIZE_URL,
  ASSESSMENT_MARK_COMPLETE: process.env.NEXT_PUBLIC_N8N_ASSESSMENT_MARK_COMPLETE_URL,
  ASSESSMENT_TYPED_UPLOAD: process.env.NEXT_PUBLIC_N8N_ASSESSMENT_TYPED_UPLOAD_URL,
  ASSESSMENT_IMAGE_UPLOAD: process.env.NEXT_PUBLIC_N8N_ASSESSMENT_IMAGE_UPLOAD_URL,
  ASSESSMENT_EXTRACT_TEXT: process.env.NEXT_PUBLIC_N8N_ASSESSMENT_EXTRACT_TEXT_URL,
  ASSESSMENT_TEXT_UPDATE: process.env.NEXT_PUBLIC_N8N_ASSESSMENT_TEXT_UPDATE_URL,
  ASSESSMENT_RUN_AI_GRADE: process.env.NEXT_PUBLIC_N8N_ASSESSMENT_RUN_AI_GRADE_URL,
  ASSESSMENT_SUBMIT_FOR_AI_REVIEW: process.env.NEXT_PUBLIC_N8N_ASSESSMENT_SUBMIT_FOR_AI_REVIEW_URL,
  ASSESSMENT_SUGGESTION_ACTION: process.env.NEXT_PUBLIC_N8N_ASSESSMENT_SUGGESTION_ACTION_URL,
  ASSESSMENT_SAVE_TEACHER_FEEDBACK: process.env.NEXT_PUBLIC_N8N_ASSESSMENT_SAVE_TEACHER_FEEDBACK_URL,
  ASSESSMENT_SET_RUBRIC: process.env.NEXT_PUBLIC_N8N_ASSESSMENT_SET_RUBRIC_URL,
  ASSESSMENT_SAVE_RUBRIC_OVERRIDE: process.env.NEXT_PUBLIC_N8N_ASSESSMENT_SAVE_RUBRIC_OVERRIDE_URL,
  ASSESSMENT_LIST: process.env.NEXT_PUBLIC_N8N_ASSESSMENT_LIST_URL,
  ASSESSMENT_GET_STUDENTS_FOR_ASSIGNMENT: process.env.NEXT_PUBLIC_N8N_ASSESSMENT_GET_STUDENTS_FOR_ASSIGNMENT_URL,
  ASSESSMENT_SAVE_TYPED: process.env.NEXT_PUBLIC_N8N_ASSESSMENT_SAVE_TYPED_URL,
  ASSESSMENT_IMAGE_EXTRACT: process.env.NEXT_PUBLIC_N8N_ASSESSMENT_IMAGE_EXTRACT_URL,

  // Students
  STUDENT_LIST: process.env.NEXT_PUBLIC_N8N_STUDENT_LIST_URL,
  STUDENT_GET: process.env.NEXT_PUBLIC_N8N_STUDENT_GET_URL,
  STUDENT_CREATE: process.env.NEXT_PUBLIC_N8N_STUDENT_CREATE_URL,
  STUDENT_REPORTS_LIST: process.env.NEXT_PUBLIC_N8N_STUDENT_REPORTS_LIST_URL,
  STUDENT_IMPORT_PROCESS: process.env.NEXT_PUBLIC_N8N_STUDENT_IMPORT_PROCESS_URL,

  // Rubrics
  RUBRIC_LIST: process.env.NEXT_PUBLIC_N8N_RUBRIC_LIST_URL,
  RUBRIC_GET: process.env.NEXT_PUBLIC_N8N_RUBRIC_GET_URL,

  // Reports
  REPORTS_LIST: process.env.NEXT_PUBLIC_N8N_REPORTS_LIST_URL,
  REPORT_GET: process.env.NEXT_PUBLIC_N8N_REPORT_GET_URL,
  REPORT_GENERATE: process.env.NEXT_PUBLIC_N8N_REPORT_GENERATE_URL,
  REPORT_SEND: process.env.NEXT_PUBLIC_N8N_REPORT_SEND_URL,
  REPORT_DOWNLOAD_PDF: process.env.NEXT_PUBLIC_N8N_REPORT_DOWNLOAD_PDF_URL,

  // Parent Portal
  PARENT_CHILDREN_LIST: process.env.NEXT_PUBLIC_N8N_PARENT_CHILDREN_LIST_URL,
  PARENT_REPORTS_LIST: process.env.NEXT_PUBLIC_N8N_PARENT_REPORTS_LIST_URL,
  PARENT_REPORT_GET: process.env.NEXT_PUBLIC_N8N_PARENT_REPORT_GET_URL,

  // Other
  HEALTH_CHECK: process.env.NEXT_PUBLIC_N8N_HEALTH_CHECK_URL,
};

/**
 * Get the webhook URL for a specific event
 */
export function getWebhookUrl(eventName: EventName): string | undefined {
  return webhookUrls[eventName];
}

/**
 * Check if a webhook is configured for an event
 */
export function isWebhookConfigured(eventName: EventName): boolean {
  return !!getWebhookUrl(eventName);
}

/**
 * Get webhook URL with fallback handling
 * Returns null if not configured, allowing graceful degradation
 */
export function getWebhookUrlSafe(eventName: EventName): string | null {
  const url = webhookUrls[eventName];
  if (!url) {
    console.warn(`[Webhook] ${eventName} is not configured. Feature may use cached data or be unavailable.`);
    return null;
  }
  return url;
}
