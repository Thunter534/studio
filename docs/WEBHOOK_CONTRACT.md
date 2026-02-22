# Webhook Contract

This document is the **single source of truth** for all API communication between the ClassPulse frontend and the n8n backend. All communication happens over a single webhook endpoint, with the specific action determined by the `eventName`.

## Endpoint

- **Method**: `POST`
- **Path**: `/api/webhook` (This is the Next.js Gateway, which proxies to the n8n URL)
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <ID_TOKEN>` (Must be a valid JWT)

## Request Payload Structure

Every request sent to the webhook endpoint **MUST** follow this structure.

```typescript
interface WebhookRequest {
  eventName: string; // The name of the event to trigger
  requestId: string; // A unique UUID (v4) for this specific request
  timestamp: string; // ISO 8601 timestamp
  actor: {
    role: 'teacher' | 'parent' | 'admin';
    userId: string; // The user's unique ID from the JWT
  };
  payload: Record<string, any>; // The event-specific data
}
```

- **`eventName`**: A string from the list of defined events below. **This is the primary routing key for the backend.**
- **`requestId`**: A client-generated UUID to trace a single request through the system.
- **`actor`**: Information about the user performing the action, derived from the JWT on the client-side. The backend **MUST** re-validate this information from the token in the `Authorization` header before processing.
- **`payload`**: An object containing data relevant to the specific `eventName`.

## Response Payload Structure

Every response from the webhook **MUST** follow this structure.

```typescript
interface WebhookResponse {
  success: boolean; // True if the operation succeeded, false otherwise
  data?: any; // The data to return on success. Structure depends on the event.
  error?: {
    message:string; // A user-friendly error message
    code?: string; // An optional machine-readable error code
  };
  correlationId: string; // A unique ID from the n8n workflow execution for debugging
}
```

---

## Event List & Payloads

### Dashboard Events

| `eventName`             | Actor Roles | `payload` Schema                  | `data` Schema (on success)                                   |
| ----------------------- | ----------- | --------------------------------- | ------------------------------------------------------------ |
| `GET_DASHBOARD_SUMMARY` | `teacher`   | `{}`                              | `{ kpis: { pendingReview, drafts, finalizedThisWeek } }`     |
| `GET_REVIEW_QUEUE`      | `teacher`   | `{ limit: number }`               | `{ items: ReviewQueueItem[] }`                               |
| `GET_DRAFTS`            | `teacher`   | `{ limit: number }`               | `{ items: DraftItem[] }`                                     |
| `REVIEW_OPEN`           | `teacher`   | `{ assessmentId: string }`        | `{}` (Frontend handles navigation)                           |
| `DRAFT_OPEN`            | `teacher`   | `{ assessmentId: string }`        | `{}` (Frontend handles navigation)                           |

### Student & Roster Events

| `eventName`                | Actor Roles | `payload` Schema                               | `data` Schema (on success)                                     |
| -------------------------- | ----------- | ---------------------------------------------- | -------------------------------------------------------------- |
| `STUDENT_LIST`             | `teacher`   | `{}`                                           | `{ students: StudentListItem[], total: number }`               |
| `STUDENT_GET`              | `teacher`   | `{ studentId: string }`                        | `{ student: StudentProfileData }`                              |
| `STUDENT_CREATE`           | `teacher`   | `{ fullName, studentIdNumber, className, ... }`| `{ studentId: string }`                                        |
| `STUDENT_ASSESSMENTS_LIST` | `teacher`   | `{ studentId: string }`                        | `{ assessments: StudentAssessmentListItem[] }`                 |
| `STUDENT_REPORTS_LIST`     | `teacher`   | `{ studentId: string }`                        | `{ reports: StudentReportListItem[] }`                         |
| `STUDENT_IMPORT_PROCESS`   | `teacher`   | `{ fileRef: string }`                          | `{ importedCount: number, failedCount: number }`               |

### Assessment Events

| `eventName`                        | Actor Roles | `payload` Schema                                            | `data` Schema (on success)                                     |
| ---------------------------------- | ----------- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| `ASSESSMENT_LIST`                  | `teacher`   | `AssessmentListPayload`                                     | `AssessmentListResponse`                                       |
| `NEW_ASSESSMENT_START`             | `teacher`   | `{}`                                                        | `{}` (Frontend handles navigation)                             |
| `ASSESSMENT_CREATE_DRAFT`          | `teacher`   | `{ title, studentId, rubricId }`                            | `{ assessmentId: string }`                                     |
| `ASSESSMENT_GET`                   | `teacher`   | `{ assessmentId: string }`                                  | `{ assessment: AssessmentWorkspaceData }`                      |
| `ASSESSMENT_SET_RUBRIC`            | `teacher`   | `{ assessmentId: string, rubricId: string }`                | `{ assessmentId: string, rubricId: string }`                   |
| `ASSESSMENT_TYPED_UPLOAD`          | `teacher`   | `{ assessmentId: string, fileRef: string }`                 | `{ assessment: AssessmentWorkspaceData }` (with text & AI results) |
| `ASSESSMENT_EXTRACT_TEXT`          | `teacher`   | `{ assessmentId: string, fileRef: string }`                 | `{ assessment: AssessmentWorkspaceData }` (with extracted text)|
| `ASSESSMENT_TEXT_UPDATE`           | `teacher`   | `{ assessmentId, text, source }`                            | `{ assessmentId: string, text: string }`                       |
| `ASSESSMENT_RUN_AI_GRADE`          | `teacher`   | `{ assessmentId: string }`                                  | `{ assessment: AssessmentWorkspaceData }` (with AI results)    |
| `ASSESSMENT_SUGGESTION_ACTION`     | `teacher`   | `{ assessmentId, suggestionId, action: 'apply'\|'dismiss' }` | `{ newText: string }`                                          |
| `ASSESSMENT_SAVE_RUBRIC_OVERRIDE`  | `teacher`   | `{ assessmentId: string, overrides: object }`               | `{ overrides: object }`                                        |
| `ASSESSMENT_SAVE_TEACHER_FEEDBACK` | `teacher`   | `{ assessmentId, teacherNotes, finalFeedback }`             | `{}`                                                           |
| `ASSESSMENT_FINALIZE`              | `teacher`   | `{ assessmentId: string }`                                  | `{ assessment: AssessmentWorkspaceData }` (finalized state)    |

### Rubric & Report Events

| `eventName`           | Actor Roles | `payload` Schema                          | `data` Schema (on success)                       |
| --------------------- | ----------- | ----------------------------------------- | ------------------------------------------------ |
| `RUBRIC_LIST`         | `teacher`   | `{}`                                      | `{ rubrics: RubricListItem[] }`                  |
| `REPORTS_LIST`        | `teacher`   | `{ page?: number, pageSize?: number }`    | `ReportListResponse`                             |
| `REPORT_GET`          | `teacher`   | `{ reportId: string }`                    | `{ report: ReportData }`                         |
| `REPORT_GENERATE`     | `teacher`   | `ReportGeneratePayload`                   | `{ reportId: string }`                           |
| `REPORT_SEND`         | `teacher`   | `{ reportId: string }`                    | `{}`                                             |
| `REPORT_DOWNLOAD_PDF` | `teacher`   | `{ reportId: string }`                    | `{ fileContent: string }` (Base64)               |

### System Events

| `eventName`    | Actor Roles | `payload` Schema | `data` Schema (on success) |
| -------------- | ----------- | ---------------- | -------------------------- |
| `HEALTH_CHECK` | `teacher`   | `{}`             | `HealthCheckData`          |

*Note: For detailed schemas of payloads and data objects (e.g., `AssessmentWorkspaceData`), refer to `src/lib/events.ts`.*
