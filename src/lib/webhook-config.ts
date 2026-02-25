import type { EventName } from './events';

/**
 * Maps each webhook event to its corresponding n8n webhook URL
 * All URLs are read from environment variables
 */
export const webhookUrls: Record<EventName, string | undefined> = {
  // Dashboard
  GET_DASHBOARD_SUMMARY: process.env.N8N_DASHBOARD_SUMMARY_URL,
  GET_REVIEW_QUEUE: process.env.N8N_REVIEW_QUEUE_URL,
  GET_DRAFTS: process.env.N8N_DRAFTS_URL,
  REVIEW_OPEN: process.env.N8N_REVIEW_OPEN_URL,
  DRAFT_OPEN: process.env.N8N_DRAFT_OPEN_URL,

  // Assessments
  NEW_ASSESSMENT_START: process.env.N8N_NEW_ASSESSMENT_START_URL,
  ASSESSMENT_CREATE_DRAFT: 'https://n8n.srv1336679.hstgr.cloud/webhook/73bb05d7-eeea-40f3-b782-c694207c737b',
  ASSESSMENT_GET: 'https://n8n.srv1336679.hstgr.cloud/webhook/bdb41ebb-b815-4885-8d93-d5ed1186e436',
  ASSESSMENT_FINALIZE: 'https://n8n.srv1336679.hstgr.cloud/webhook/d4f42b0c-2365-4597-a5e7-e0c75159d014',
  ASSESSMENT_MARK_COMPLETE: 'https://n8n.srv1336679.hstgr.cloud/webhook/05677d6a-1bed-4ea8-aed0-e6b5359ac7ce',
  ASSESSMENT_TYPED_UPLOAD: process.env.N8N_ASSESSMENT_TYPED_UPLOAD_URL,
  ASSESSMENT_IMAGE_UPLOAD: process.env.N8N_ASSESSMENT_IMAGE_UPLOAD_URL,
  ASSESSMENT_EXTRACT_TEXT: process.env.N8N_ASSESSMENT_EXTRACT_TEXT_URL,
  ASSESSMENT_TEXT_UPDATE: process.env.N8N_ASSESSMENT_TEXT_UPDATE_URL,
  ASSESSMENT_RUN_AI_GRADE: process.env.N8N_ASSESSMENT_RUN_AI_GRADE_URL,
  ASSESSMENT_SUBMIT_FOR_AI_REVIEW: process.env.N8N_ASSESSMENT_SUBMIT_FOR_AI_REVIEW_URL,
  ASSESSMENT_SUGGESTION_ACTION: process.env.N8N_ASSESSMENT_SUGGESTION_ACTION_URL,
  ASSESSMENT_SAVE_TEACHER_FEEDBACK: process.env.N8N_ASSESSMENT_SAVE_TEACHER_FEEDBACK_URL,
  ASSESSMENT_SET_RUBRIC: process.env.N8N_ASSESSMENT_SET_RUBRIC_URL,
  ASSESSMENT_SAVE_RUBRIC_OVERRIDE: process.env.N8N_ASSESSMENT_SAVE_RUBRIC_OVERRIDE_URL,
  ASSESSMENT_LIST: 'https://n8n.srv1336679.hstgr.cloud/webhook/843732eb-f3ca-45c7-b841-08cd7131944c',
  ASSESSMENT_GET_STUDENTS_FOR_ASSIGNMENT: process.env.N8N_ASSESSMENT_GET_STUDENTS_FOR_ASSIGNMENT_URL,
  ASSESSMENT_SAVE_TYPED: process.env.N8N_ASSESSMENT_SAVE_TYPED_URL,

  // Students
  STUDENT_LIST: process.env.N8N_STUDENT_LIST_URL,
  STUDENT_GET: process.env.N8N_STUDENT_GET_URL,
  STUDENT_CREATE: process.env.N8N_STUDENT_CREATE_URL,
  STUDENT_REPORTS_LIST: process.env.N8N_STUDENT_REPORTS_LIST_URL,
  STUDENT_IMPORT_PROCESS: process.env.N8N_STUDENT_IMPORT_PROCESS_URL,

  // Rubrics
  RUBRIC_LIST: 'https://n8n.srv1336679.hstgr.cloud/webhook/7a150c7d-8742-402b-baf9-54efeecc3550',

  // Reports
  REPORTS_LIST: 'https://n8n.srv1336679.hstgr.cloud/webhook/752041fd-27e7-4046-89de-ffd89e4ccac3',
  REPORT_GET: 'https://n8n.srv1336679.hstgr.cloud/webhook/a8a68dab-f1a8-430c-8e00-8e6e9f75b344',
  REPORT_GENERATE: process.env.N8N_REPORT_GENERATE_URL,
  REPORT_SEND: process.env.N8N_REPORT_SEND_URL,
  REPORT_DOWNLOAD_PDF: process.env.N8N_REPORT_DOWNLOAD_PDF_URL,

  // Parent Portal
  PARENT_CHILDREN_LIST: process.env.N8N_PARENT_CHILDREN_LIST_URL,
  PARENT_REPORTS_LIST: process.env.N8N_PARENT_REPORTS_LIST_URL,
  PARENT_REPORT_GET: process.env.N8N_PARENT_REPORT_GET_URL,

  // Other
  HEALTH_CHECK: process.env.N8N_HEALTH_CHECK_URL,
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
