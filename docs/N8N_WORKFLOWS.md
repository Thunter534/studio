# n8n Workflow Guide

This document outlines the responsibilities of the n8n workflows that act as the backend for ClassPulse. Each workflow corresponds to an event triggered by the frontend.

**Universal Workflow Steps:**

Every workflow should start with these two steps:

1.  **Webhook Trigger:** The entry point. It receives the request from the Next.js Gateway.
2.  **JWT Validation & Role Check:**
    - Extract the `Authorization: Bearer <token>` header.
    - Verify the JWT signature using the public key from MS Entra ID (stored as an n8n environment variable).
    - Decode the token to get the user's ID and role (`actor.role`).
    - **Crucially, check if the user's role has permission to perform the action defined by `eventName`.** If not, immediately return a `success: false` error.

---

### Event: `GET_DASHBOARD_SUMMARY`

- **Trigger:** Teacher logs in and lands on their dashboard.
- **Input Payload:** `{}`
- **Actor Role:** `teacher`
- **Workflow Steps:**
  1.  Query the database for assessments where `teacher_id` matches the actor's `userId`.
  2.  Count assessments with `status = 'pending_review'`.
  3.  Count assessments with `status = 'draft'`.
  4.  Count assessments with `status = 'finalized'` and `finalized_at` within the last 7 days.
  5.  Query the database for the top 5 most recent assessments with `status = 'pending_review'`, joining with the `students` table to get student names.
- **Output (`data`):**
  ```json
  {
    "kpis": {
      "pendingReview": 15,
      "drafts": 4,
      "finalizedThisWeek": 8
    },
    "reviewQueue": [
      {
        "studentName": "John Doe",
        "studentId": "stu_123",
        "assessmentName": "Unit 3 Quiz",
        "assessmentId": "asm_456",
        "status": "pending_review",
        "updatedAt": "2023-10-27T10:00:00Z"
      }
    ]
  }
  ```

---

### Event: `ASSESSMENT_CREATE_DRAFT`

- **Trigger:** Teacher clicks "Start New Assessment" and saves it for the first time.
- **Input Payload:** `{ "title": "Unit 4 Test", "studentId": "stu_123", "rubricId": "rub_789" }`
- **Actor Role:** `teacher`
- **Workflow Steps:**
  1.  Validate the input payload.
  2.  Insert a new record into the `assessments` table with `status = 'draft'`, `teacher_id` from the JWT, and the payload data.
- **Output (`data`):**
  ```json
  {
    "assessmentId": "asm_new_id_123"
  }
  ```

---

### Event: `ASSESSMENT_GET`

- **Trigger:** Teacher or Parent views an assessment.
- **Input Payload:** `{ "assessmentId": "asm_123" }`
- **Actor Role:** `teacher` or `parent`
- **Workflow Steps:**
  1.  Query the `assessments` table for the given `assessmentId`.
  2.  **Authorization Check:**
      - If actor is a `teacher`, verify `teacher_id` on the assessment matches `actor.userId`.
      - If actor is a `parent`, verify the `student_id` on the assessment is linked to the parent's account. Also, ensure the assessment status is `'finalized'`.
  3.  Join with `students`, `rubrics`, and `assessment_criteria` tables to fetch all related data.
- **Output (`data`):** A full assessment object.

---

### Event: `STUDENT_LIST`

- **Trigger:** Teacher navigates to the `/teacher/students` page.
- **Input Payload:** `{}` (or optional filters like `sortBy`, `page`)
- **Actor Role:** `teacher`
- **Workflow Steps:**
  1.  Query the `students` table for all students associated with the `teacher_id` from the JWT.
  2.  Implement pagination and sorting if specified in the payload.
- **Output (`data`):**
  ```json
  {
    "students": [
      { "id": "stu_123", "name": "Jane Doe", "class": "Grade 5" },
      { "id": "stu_456", "name": "Peter Pan", "class": "Grade 5" }
    ],
    "totalCount": 25
  }
  ```

---

### Event: `HEALTH_CHECK`

- **Trigger:** Developer or Admin visits the `/teacher/settings/integrations` page.
- **Input Payload:** `{}`
- **Actor Role:** `teacher` (or `admin`)
- **Workflow Steps:**
  1.  **Auth Check:** Simply check if the `JWT_PUBLIC_KEY` environment variable is set in n8n.
  2.  **Webhook Check:** This workflow running means the webhook is configured.
  3.  **DB Check:** Perform a simple `SELECT 1` query on the database to ensure the connection is alive.
  4.  Get the timestamp of the last logged webhook call from a logging table (if implemented).
- **Output (`data`):**
  ```json
  {
    "authConfigured": true,
    "webhookConfigured": true,
    "databaseConnected": true,
    "lastSuccessfulCall": "2023-10-27T10:00:00Z"
  }
  ```

---

*This guide should be expanded for all events defined in `WEBHOOK_CONTRACT.md`.*
