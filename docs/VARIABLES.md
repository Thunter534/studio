# Variable and Naming Conventions

This document outlines common variable names and naming conventions used throughout the ClassPulse application to ensure consistency.

## General Conventions

- **Components**: `PascalCase` (e.g., `PageHeader.tsx`, `StudentCard.tsx`).
- **Functions/Variables**: `camelCase` (e.g., `getStudentList`, `assessmentId`).
- **Types/Interfaces**: `PascalCase` (e.g., `WebhookRequest`, `UserRole`).
- **CSS Classes**: `kebab-case` (as per Tailwind CSS).

## Webhook Event Names

Defined in `src/lib/events.ts` and `docs/WEBHOOK_CONTRACT.md`. Always in `UPPER_SNAKE_CASE`.

- `GET_DASHBOARD_SUMMARY`
- `ASSESSMENT_CREATE_DRAFT`
- `STUDENT_LIST`
- `HEALTH_CHECK`
- (and so on...)

## Common Identifiers

- `assessmentId`: A unique identifier for an assessment.
- `studentId`: A unique identifier for a student.
- `userId`: A unique identifier for a user (teacher, parent), typically from the JWT.
- `rubricId`: A unique identifier for a rubric.
- `reportId`: A unique identifier for a report.

## Authentication & Actor Model

- `user`: An object containing the currently authenticated user's information (id, name, role, etc.).
- `token`: The JWT ID token for the authenticated user.
- `actor`: An object within the `WebhookRequest` payload that contains the `role` and `userId` of the user performing an action.

This document will be updated as we introduce new concepts and variables.
