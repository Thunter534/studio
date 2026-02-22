# Changelog

This document tracks all significant changes made to the ClassPulse application during our development sessions.

## Final Cleanup and Handoff Preparation

- **Comprehensive Review**: Performed a full-app cleanup, verifying all UI logic, button states, and webhook integrations.
- **UI Polishing**: Ensured a consistent and premium grayscale theme across all pages, including dashboards, lists, and workspaces.
- **Documentation Overhaul**: Updated all files in the `/docs` directory to be the single source of truth for backend development.
  - `WEBHOOK_CONTRACT.md` has been finalized with all required event names, payloads, and response structures.
  - All other markdown files (`ARCHITECTURE.md`, `ASSESSMENT_WORKSPACE.md`, etc.) now accurately reflect the final state of the application.
- **Ready for Backend**: The frontend is now in a stable, well-documented state, ready for the backend team to begin implementation against the defined webhook contract.

## Reports Page Implementation

- **Feature**: Built the complete teacher-facing `/teacher/reports` page.
- **UI**: Includes a "Generate Report" modal, a history table of generated reports, and a "Report Preview" drawer.
- **Webhooks**: Implemented stubs for `REPORTS_LIST`, `REPORT_GENERATE`, `REPORT_GET`, `REPORT_SEND`, and `REPORT_DOWNLOAD_PDF`.

## Assessment List Page Implementation

- **Feature**: Built the assessment "inbox" at `/teacher/assessments`.
- **UI**: Includes a filterable, searchable, full-width table of all assessments. The entire row is clickable, navigating to the workspace.
- **States**: Implemented loading, empty, and error states.
- **Webhooks**: Integrated the `ASSESSMENT_LIST` webhook to fetch data.

## Rubric Workflow Refactor

- **Process Streamlined**: Removed the dedicated "Rubrics" page and navigation item to simplify the user experience.
- **Integration**: Added a required "Rubric" dropdown directly into the "New Assessment" page (`/teacher/assessments/new`). This ensures every assessment is created with a rubric from the start.
- **Workspace Update**: The Assessment Workspace now displays the selected rubric as read-only, reinforcing that rubrics are managed on the backend.

## Initial Documentation Setup

- **Project Initialization**: Started with the base Next.js project structure for ClassPulse.
- **Documentation Created**:
    - Created this `CHANGELOG.md` to record a high-level history of updates.
    - Created `ARCHITECTURE.md`: Explains the overall system design.
    - Created `WEBHOOK_CONTRACT.md`: Defines the API for frontend-backend communication.
    - Created other pages to document specific application areas.
