# Students Page Documentation

This document describes the structure and functionality of the Teacher Students Page (`/teacher/students`) in ClassPulse.

## 1. Page Purpose

The primary goal of this page is to provide teachers with a fast and efficient directory of their students. It serves as a central roster for viewing key student information at a glance and initiating common actions.

### What this page DOES:
- Lists all students associated with the teacher.
- Allows for quick searching and filtering of the student roster.
- Provides a mechanism to add new students one-by-one via a form.
- Links to a separate page for bulk importing students.
- Allows a teacher to start a new assessment for a specific student directly from the list.
- Links to the detailed student profile page.

### What this page does NOT do:
This page intentionally avoids displaying deep analytics or detailed assessment histories. Its purpose is to be a lightweight directory, not a comprehensive reporting tool. Detailed views of a student's progress, assessment breakdowns, and performance trends are located on the individual Student Profile page (`/teacher/students/[id]`). This separation keeps the main roster clean and performant.

## 2. UI Sections

- **Header**: Contains the page title ("Students") and primary action buttons ("Add Student", "Import Students").
- **Controls**: A search input and optional filters for refining the student list.
- **Student Table**: The main content area, displaying the list of students with key data points and action buttons.

## 3. Webhook Events

The Students page relies on several webhook events to function.

### Data Fetching Events (on page load)

- **`STUDENT_LIST`**
  - **Description**: Fetches the complete list of students for the logged-in teacher.
  - **Payload**: `{ "search"?: string, "class"?: string }`
  - **Expected Response (`data`)**:
    ```json
    {
      "students": [
        {
          "id": "stu_01",
          "name": "Amelia Johnson",
          "class": "Grade 5",
          "studentIdNumber": "S00123",
          "lastAssessmentDate": "2023-10-26T10:00:00Z",
          "status": "Needs Review",
          "avatarUrl": "..."
        }
      ],
      "total": 1
    }
    ```

### Action Events (triggered by user)

- **`STUDENT_CREATE`**
  - **Trigger**: Clicking "Save Student" in the "Add Student" form.
  - **Payload**:
    ```json
    {
      "fullName": "New Student",
      "studentIdNumber": "S00456",
      "className": "Grade 5",
      "studentEmail": "student@example.com", // nullable
      "parentEmail": "new.parent@example.com"
    }
    ```
  - **Expected Response (`data`)**:
    ```json
    {
      "studentId": "stu_new_id_xyz"
    }
    ```

- **`NEW_ASSESSMENT_START`**
  - **Trigger**: This action is now located inside the Student Profile page.
  - **Payload**: `{ "studentId": "string" }`
  - **Description**: The frontend navigates to `/teacher/assessments/new?studentId=[studentId]` on success.
