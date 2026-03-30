# N8N Webhook Configuration

This file documents how to configure separate n8n webhooks for each event.

## Setup Steps

### 1. Create N8N Workflows

For each event, create a new workflow in n8n:

**Dashboard Events:**
- GET_DASHBOARD_SUMMARY → `/webhook/dashboard/summary`
- GET_REVIEW_QUEUE → `/webhook/review/queue`
- GET_DRAFTS → `/webhook/drafts/list`
- REVIEW_OPEN → `/webhook/review/open`
- DRAFT_OPEN → `/webhook/draft/open`

**Assessment Events:**
- ASSESSMENT_CREATE_DRAFT → `/webhook/assessment/create`
- ASSESSMENT_GET → `/webhook/assessment/get`
- ASSESSMENT_SET_RUBRIC → `/webhook/assessment/rubric/set`
- ASSESSMENT_TYPED_UPLOAD → `/webhook/assessment/upload/typed`
- ASSESSMENT_IMAGE_UPLOAD → `/webhook/assessment/upload/image`
- ASSESSMENT_SUBMIT_FOR_AI_REVIEW → `/webhook/assessment/submit-ai`
- ASSESSMENT_FINALIZE → `/webhook/assessment/finalize`
- ASSESSMENT_LIST → `/webhook/assessment/list`
- ASSESSMENT_GET_STUDENTS_FOR_ASSIGNMENT → `/webhook/assessment/students`

**Student Events:**
- STUDENT_LIST → `/webhook/student/list`
- STUDENT_GET → `/webhook/student/get`
- STUDENT_CREATE → `/webhook/student/create`
- STUDENT_ASSESSMENTS_LIST → `/webhook/student/assessments`
- STUDENT_REPORTS_LIST → `/webhook/student/reports`

**Rubric Events:**
- RUBRIC_LIST → `/webhook/rubric/list`

**Report Events:**
- REPORTS_LIST → `/webhook/report/list`
- REPORT_GET → `/webhook/report/get`
- REPORT_GENERATE → `/webhook/report/generate`
- REPORT_SEND → `/webhook/report/send`
- REPORT_DOWNLOAD_PDF → `/webhook/report/pdf`

**Parent Portal Events:**
- PARENT_CHILDREN_LIST → `/webhook/parent/children`
- PARENT_REPORTS_LIST → `/webhook/parent/reports`
- PARENT_REPORT_GET → `/webhook/parent/report`

**Other Events:**
- HEALTH_CHECK → `/webhook/health`

### 2. Configure Environment Variables

Each webhook URL is mapped via environment variable. Add these to `.env.local`:

```bash
# Dashboard
N8N_DASHBOARD_SUMMARY_URL=https://your-n8n.com/webhook/dashboard/summary
N8N_REVIEW_QUEUE_URL=https://your-n8n.com/webhook/review/queue
N8N_DRAFTS_URL=https://your-n8n.com/webhook/drafts/list
N8N_REVIEW_OPEN_URL=https://your-n8n.com/webhook/review/open
N8N_DRAFT_OPEN_URL=https://your-n8n.com/webhook/draft/open

# Assessments
N8N_ASSESSMENT_CREATE_DRAFT_URL=https://your-n8n.com/webhook/assessment/create
N8N_ASSESSMENT_GET_URL=https://your-n8n.com/webhook/assessment/get
N8N_ASSESSMENT_SET_RUBRIC_URL=https://your-n8n.com/webhook/assessment/rubric/set
N8N_ASSESSMENT_TYPED_UPLOAD_URL=https://your-n8n.com/webhook/assessment/upload/typed
N8N_ASSESSMENT_IMAGE_UPLOAD_URL=https://your-n8n.com/webhook/assessment/upload/image
N8N_ASSESSMENT_SUBMIT_FOR_AI_REVIEW_URL=https://your-n8n.com/webhook/assessment/submit-ai
N8N_ASSESSMENT_FINALIZE_URL=https://your-n8n.com/webhook/assessment/finalize
N8N_ASSESSMENT_LIST_URL=https://your-n8n.com/webhook/assessment/list
N8N_ASSESSMENT_GET_STUDENTS_FOR_ASSIGNMENT_URL=https://your-n8n.com/webhook/assessment/students
N8N_ASSESSMENT_EXTRACT_TEXT_URL=https://your-n8n.com/webhook/assessment/extract
N8N_ASSESSMENT_TEXT_UPDATE_URL=https://your-n8n.com/webhook/assessment/text-update
N8N_ASSESSMENT_RUN_AI_GRADE_URL=https://your-n8n.com/webhook/assessment/ai-grade
N8N_ASSESSMENT_SUGGESTION_ACTION_URL=https://your-n8n.com/webhook/assessment/suggestion
N8N_ASSESSMENT_SAVE_TEACHER_FEEDBACK_URL=https://your-n8n.com/webhook/assessment/feedback
N8N_ASSESSMENT_SAVE_RUBRIC_OVERRIDE_URL=https://your-n8n.com/webhook/assessment/override
N8N_NEW_ASSESSMENT_START_URL=https://your-n8n.com/webhook/assessment/start
N8N_ASSESSMENT_SAVE_TYPED_URL=https://your-n8n.com/webhook/assessment/save-typed

# Students
N8N_STUDENT_LIST_URL=https://your-n8n.com/webhook/student/list
N8N_STUDENT_GET_URL=https://your-n8n.com/webhook/student/get
N8N_STUDENT_CREATE_URL=https://your-n8n.com/webhook/student/create
N8N_STUDENT_ASSESSMENTS_LIST_URL=https://your-n8n.com/webhook/student/assessments
N8N_STUDENT_REPORTS_LIST_URL=https://your-n8n.com/webhook/student/reports
N8N_STUDENT_IMPORT_PROCESS_URL=https://your-n8n.com/webhook/student/import

# Rubrics
N8N_RUBRIC_LIST_URL=https://your-n8n.com/webhook/rubric/list

# Reports
N8N_REPORTS_LIST_URL=https://your-n8n.com/webhook/report/list
N8N_REPORT_GET_URL=https://your-n8n.com/webhook/report/get
N8N_REPORT_GENERATE_URL=https://your-n8n.com/webhook/report/generate
N8N_REPORT_SEND_URL=https://your-n8n.com/webhook/report/send
N8N_REPORT_DOWNLOAD_PDF_URL=https://your-n8n.com/webhook/report/pdf

# Parent Portal
N8N_PARENT_CHILDREN_LIST_URL=https://your-n8n.com/webhook/parent/children
N8N_PARENT_REPORTS_LIST_URL=https://your-n8n.com/webhook/parent/reports
N8N_PARENT_REPORT_GET_URL=https://your-n8n.com/webhook/parent/report

# Other
N8N_HEALTH_CHECK_URL=https://your-n8n.com/webhook/health
```

### 3. How It Works

The webhook gateway (`src/app/api/webhook/route.ts`) now:

1. **Receives a request** from the frontend with an event name
2. **Checks development mode:** If in dev and a mock exists, returns mock data
3. **Looks up the n8n URL** for that specific event from `webhook-config.ts`
4. **Forwards the request** to the correct n8n webhook
5. **Returns the response** to the frontend

### 4. Testing

**Test one webhook:**
```bash
curl -X POST http://localhost:9002/api/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "eventName": "STUDENT_LIST",
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-02-19T14:30:00Z",
    "actor": { "role": "teacher", "userId": "teacher_001" },
    "payload": {}
  }'
```

**Expected response:**
```json
{
  "success": true,
  "data": { "students": [...] },
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 5. N8N Workflow Template

Each n8n workflow should:

1. **Receive POST request** with full `WebhookRequest` body
2. **Extract payload** from request
3. **Query/update database** using Supabase nodes
4. **Format response** matching expected `WebhookResponse`
5. **Return JSON**

**Example workflow structure for STUDENT_LIST:**

```
Webhook Trigger
  ↓
Query Supabase
  │ SELECT * FROM students ORDER BY name;
  ↓
Map to response format
  │ {
  │   success: true,
  │   data: {
  │     students: [...],
  │     total: count
  │   },
  │   correlationId: $request.body.requestId
  │ }
  ↓
Return response
```

### 6. Development Mock Fallback

If a webhook URL is not configured but the app is in development mode, it will use mock data from `src/lib/mock-api.ts`. This lets you test without n8n running.

**To disable mocks and force n8n:**
```bash
NODE_ENV=production
```

### 7. Troubleshooting

**Issue: "Webhook not configured for event"**
- Check: Is the environment variable set?
- Check: Is the variable name correct? (Must match exactly in `webhook-config.ts`)
- Check: Is the n8n URL correct and accessible?

**Issue: Authorization errors**
- The frontend must send an `Authorization` header
- This is passed through to n8n, so ensure your n8n webhooks validate it

**Issue: Webhook receiving null payload**
- Ensure the n8n webhook is set to `POST` and accepts the full request body
- Test by calling the webhook directly with curl

---

For more info, see `WEBHOOK_SPECIFICATION.md` for all event formats and Supabase queries.
