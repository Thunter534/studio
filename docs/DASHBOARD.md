# Teacher Dashboard Documentation

This document describes the structure and functionality of the Teacher Dashboard in ClassPulse.

## 1. UI Sections

The dashboard is composed of several key sections designed to give teachers a command center for their most common tasks.

- **Header**: Contains the application logo, a global search bar for finding students or assessments, and the user navigation menu.
- **Sidebar**: Provides primary navigation to all major sections of the application: Dashboard, Students, Assessments, Rubrics, Reports, and Settings.
- **Title Block**: Displays the main page title ("Dashboard") and a brief description.
- **KPI Strip**: A set of three `StatCard` components showing high-level Key Performance Indicators:
    - **Pending Review**: The number of student assessments submitted and waiting for teacher review.
    - **Drafts**: The number of assessments started but not yet completed.
    - **Finalized This Week**: The number of assessments the teacher has completed and finalized in the last 7 days.
- **Main Widget: "To Review"**: A table listing up to 5 assessments that are ready for the teacher's review. This is the teacher's primary work queue.
- **Secondary Widget: "Drafts In Progress"**: A list of the most recent assessments that are still in draft form.
- **Right Sidebar Widget: "Quick Actions"**: A set of buttons for the most frequent actions: creating a new assessment, managing rubrics, and importing students.

## 2. Webhook Events

The dashboard is highly interactive and relies on several webhook events to fetch data and perform actions. All events are sent to the `/api/webhook` gateway.

### Data Fetching Events (on page load)

- **`GET_DASHBOARD_SUMMARY`**
  - **Payload**: `{}`
  - **Description**: Fetches the numbers for the KPI strip.
  - **Expected Response (`data`)**:
    ```json
    {
      "kpis": {
        "pendingReview": 7,
        "drafts": 3,
        "finalizedThisWeek": 12
      }
    }
    ```

- **`GET_REVIEW_QUEUE`**
  - **Payload**: `{ "limit": 5 }`
  - **Description**: Fetches the top 5 most recent assessments awaiting review.
  - **Expected Response (`data`)**:
    ```json
    {
      "items": [
        {
          "assessmentId": "asm_01",
          "studentName": "Amelia Johnson",
          "assessmentName": "Unit 3: Fractions",
          "status": "pending_review",
          "updatedAt": "2023-10-26T10:00:00Z"
        }
      ]
    }
    ```

- **`GET_DRAFTS`**
  - **Payload**: `{ "limit": 5 }`
  - **Description**: Fetches the top 5 most recent draft assessments.
  - **Expected Response (`data`)**:
    ```json
    {
      "items": [
        {
          "assessmentId": "asm_draft_01",
          "studentName": "Olivia Martinez",
          "assessmentName": "Creative Writing Assignment",
          "updatedAt": "2023-10-24T11:00:00Z"
        }
      ]
    }
    ```

### Action Events (triggered by user)

- **`REVIEW_OPEN`**
  - **Trigger**: Clicking the "Review" button in the "To Review" table.
  - **Payload**: `{ "assessmentId": "string" }`
  - **Description**: Signals the start of a review session. The frontend navigates to `/teacher/assessments/[assessmentId]` on success.

- **`DRAFT_OPEN`**
  - **Trigger**: Clicking the "Continue" button in the "Drafts" list.
  - **Payload**: `{ "assessmentId": "string" }`
  - **Description**: Signals the user wants to continue working on a draft. The frontend navigates to `/teacher/assessments/[assessmentId]` on success.

- **`NEW_ASSESSMENT_START`**
  - **Trigger**: Clicking the "New Assessment" button in "Quick Actions".
  - **Payload**: `{}`
  - **Description**: Signals the start of a new assessment creation flow. The frontend navigates to `/teacher/assessments/new` on success.
