# Student Profile Page Documentation

This document outlines the structure, functionality, and purpose of the Student Profile page (`/teacher/students/[id]`) in ClassPulse.

## 1. Page Purpose: The Student Workspace

The Student Profile page is the central hub and primary workspace for all activities related to a single student. Unlike the main "Students" list—which is designed as a quick, searchable directory—this page is where the teacher performs contextual actions for a student.

All meaningful work, such as starting a new assessment, reviewing past performance, and viewing generated reports, originates here. This design choice centralizes context and reduces clutter on higher-level pages.

### Why Actions are Centralized Here:
- **Context is Key**: When a teacher wants to start a new assessment, they are almost always thinking about a specific student. Starting it from the student's profile is a more natural workflow than starting from a global "Assessments" page and then selecting a student.
- **Reduces UI Noise**: It keeps the main student directory clean and focused on navigation.
- **Scalability**: As more features are added (e.g., communication logs, intervention plans), they can be neatly organized as new tabs or sections within this profile, keeping all student-specific information in one place.

## 2. UI Sections

- **Student Header**: Displays the student's name, class, and ID. It contains the single most important action for this page: "New Assessment".
- **Student Details Card**: A read-only card providing quick access to administrative information like the student's ID and parent's email.
- **Tab Navigation**: The core of the page, organizing all associated data into logical sections.
  - **Assessments Tab**: Lists every assessment—past and present—for the student. Each row links directly to that assessment's workspace.
  - **Reports Tab**: Lists all generated academic reports, linking to their read-only views.

## 3. Webhook Events

This page is data-driven and communicates with the backend via several well-defined webhook events.

### Data Fetching Events (on page load)

- **`STUDENT_GET`**
  - **Description**: Fetches the core profile information for the student.
  - **Payload**: `{ "studentId": "string" }`
  - **Expected Response (`data`)**:
    ```json
    {
      "student": {
        "id": "stu_01",
        "name": "Amelia Johnson",
        "class": "Grade 5",
        "studentIdNumber": "S00123",
        "studentEmail": "amelia@school.edu",
        "parentEmail": "johnson.fam@email.com"
      }
    }
    ```

- **`STUDENT_ASSESSMENTS_LIST`**
  - **Description**: Fetches all assessments for the specified student.
  - **Payload**: `{ "studentId": "string" }`
  - **Expected Response (`data`)**:
    ```json
    {
      "assessments": [
        {
          "id": "asm_01",
          "name": "Unit 3: Fractions",
          "type": "Math",
          "status": "Needs Review",
          "updatedAt": "2023-10-26T10:00:00Z"
        }
      ]
    }
    ```

- **`STUDENT_REPORTS_LIST`**
  - **Description**: Fetches all generated reports for the student.
  - **Payload**: `{ "studentId": "string" }`
  - **Expected Response (`data`)**:
    ```json
    {
      "reports": [
        {
          "id": "rep_01",
          "name": "Q3 Progress Report",
          "generatedDate": "2023-09-30T10:00:00Z",
          "status": "Final"
        }
      ]
    }
    ```

### Action Events (triggered by user)

- **`NEW_ASSESSMENT_START`**
  - **Trigger**: Clicking the "New Assessment" button in the header.
  - **Payload**: `{ "studentId": "string" }`
  - **Description**: Signals the start of a new assessment flow. The frontend navigates to `/teacher/assessments/new?studentId=[studentId]` on success.

## 4. Frontend vs. Backend Responsibilities

- **Frontend**:
  - Renders the UI, including skeletons for loading states.
  - Calls the appropriate webhooks on page load and on user action.
  - Handles navigation based on webhook responses (e.g., navigating to the new assessment page).
  - Displays toast notifications for errors.
- **n8n Backend**:
  - Responds to all `STUDENT_*` and `NEW_ASSESSMENT_START` events.
  - Contains all business logic for fetching data from the database.
  - Enforces authorization (e.g., ensuring the teacher has access to the requested student).
  - Returns data in the exact shapes defined in this contract.
