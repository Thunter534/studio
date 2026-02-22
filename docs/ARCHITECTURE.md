# ClassPulse Architecture

This document outlines the architecture of the ClassPulse application, detailing the responsibilities of each component.

## System Diagram (Text-Based)

```
+----------------+      +---------------------+      +-----------------+      +---------------------+
|                |      |                     |      |                 |      |                     |
|  End User      |----->|   ClassPulse UI     |----->|  Webhook Gateway  |----->|   n8n Workflows     |
| (Teacher/Parent|      |    (Next.js)        |      | (Next.js API)   |      |  (Business Logic)   |
|                |      |                     |      |                 |      |                     |
+----------------+      +---------------------+      +-----------------+      +----------+----------+
                                                                                         |
                                                                                         |
                                    +---------------------------v------------------------+
                                    |                           |
                            +-------+--------+          +-------+--------+
                            |                |          |                |
                            |   Database     |          |  External APIs |
                            | (e.g., Postgres|          |  (e.g., AI)    |
                            |                |          |                |
                            +----------------+          +----------------+
```

## Component Responsibilities

### 1. ClassPulse UI (Frontend)

- **Framework**: Next.js (App Router) with React and TypeScript.
- **Responsibility**: User interface and user experience.
- **Key Functions**:
  - Renders all pages, components, and visual elements.
  - Manages local UI state (loading, errors, form inputs).
  - Authenticates users via a mock authentication system (pluggable for real providers).
  - Collects user input through forms and interactive components.
  - **Does NOT contain any business logic.** All complex operations are delegated to the backend.
  - **Does NOT directly access the database or any external services (like AI).**
  - Its ONLY communication with the backend is through the Webhook Gateway. It sends event-based requests and displays the results.

### 2. Webhook Gateway (Next.js API Route)

- **Location**: `src/app/api/webhook/route.ts`
- **Responsibility**: A secure proxy and mock-data provider between the frontend and the n8n backend.
- **Key Functions**:
  - Provides a single, consistent endpoint for the frontend to call (`/api/webhook`).
  - Receives event-based requests from the frontend.
  - **In Development**: Intercepts calls and returns mock data from `src/lib/mock-api.ts` to simulate a real backend, allowing for rapid UI development.
  - **In Production**: Retrieves the user's ID token, attaches it to the `Authorization` header, and forwards the request to the real n8n webhook URL.
  - Masks the n8n URL from the client-side browser.
  - Passes the response from n8n (or the mock service) back to the frontend.

### 3. n8n Workflows (Backend Brain)

- **Framework**: n8n (self-hosted or cloud).
- **Responsibility**: All business logic, data processing, and orchestration.
- **Key Functions**:
  - Triggered by webhooks from the Gateway.
  - **Validates the JWT** attached to the request to ensure the user is authenticated and has the correct permissions for the requested action.
  - Executes business logic based on the `eventName` in the webhook payload (see `docs/WEBHOOK_CONTRACT.md`).
  - Connects to the database to read or write data (e.g., fetching students, saving assessments).
  - Calls external services (e.g., AI models for assessment analysis, OCR services for text extraction).
  - Constructs a standardized success or error response and returns it to the Gateway.

### 4. Database

- **Technology**: Any SQL database (e.g., Supabase Postgres).
- **Responsibility**: Data persistence.
- **Key Functions**:
  - Stores all application data: users, students, assessments, rubrics, reports, etc.
  - **Is ONLY accessed by n8n workflows.** The frontend is completely decoupled from the database schema and technology.

## Data and Control Flow (Example: Creating an Assessment)

1.  **Teacher** fills out the "New Assessment" form in the **ClassPulse UI**.
2.  On submit, the UI's `useWebhook` hook sends a `POST` request to the **Webhook Gateway** (`/api/webhook`) with the event `ASSESSMENT_CREATE_DRAFT` and the form data as the payload.
3.  The **Gateway** (in production) adds the teacher's `Authorization: Bearer <token>` header and forwards the request to the **n8n** instance.
4.  The corresponding **n8n workflow** is triggered.
5.  The workflow first validates the JWT.
6.  It then runs the business logic: validates the payload, creates a new draft assessment record in the **Database**.
7.  **n8n** sends a `{ success: true, data: { assessmentId: '...' } }` response back.
8.  The **Gateway** passes this response to the **UI**.
9.  The **UI**'s `useWebhook` hook receives the success response and navigates the teacher to the new assessment's page (`/teacher/assessments/[assessmentId]`).
