# Security Notes

This document covers key security considerations for the ClassPulse application, focusing on token handling, access control, and logging.

## Token Handling

The security of the application relies on the correct handling of JSON Web Tokens (JWTs) issued by Microsoft Entra ID.

- **Storage:** The ID token received from Entra ID after login should be stored securely.
  - **In Memory (Recommended):** Storing the token in a React Context or state management library is the most secure method for a Single Page Application (SPA) architecture. It is not vulnerable to Cross-Site Scripting (XSS) attacks that target `localStorage` or `sessionStorage`. The token will be lost on a page refresh, requiring a new silent login flow or redirect.
  - **Cookies:** If persistence across page reloads is essential without silent re-authentication, use a secure, `HttpOnly`, `SameSite=Strict` cookie to store the session. The Next.js backend (or Webhook Gateway) can then read the token from the cookie. **Do not store tokens in `localStorage`.**

- **Transmission:**
  - The ID token **MUST** be sent from the frontend to the Webhook Gateway in the `Authorization` header as a Bearer token.
    ```
    Authorization: Bearer <your-id-token>
    ```
  - All communication between the client, the Next.js server, and the n8n backend **MUST** use HTTPS in production.

- **Expiration:**
  - The frontend should handle token expiration. Before making a webhook call, check the `exp` claim of the JWT. If it's expired, trigger a silent token refresh flow with your OIDC provider or prompt the user to log in again.

## Role-Based Access Control (RBAC)

RBAC is enforced at two layers. **Both are required.**

1.  **Frontend (UI Layer):**
    - The UI uses the user's role (e.g., `teacher`, `parent`), decoded from the JWT, to control what is rendered.
    - This includes:
      - Displaying the correct sidebar navigation.
      - Routing users to the appropriate dashboard (`/teacher/dashboard` vs. `/parent/dashboard`).
      - Preventing a user from navigating to a URL they don't have access to (e.g., a parent trying to access `/teacher/settings`).
    - **This is a UX enhancement, not a security boundary.** A malicious user can bypass frontend controls.

2.  **Backend (n8n Layer - Authoritative):**
    - **This is the critical security boundary.**
    - Every n8n workflow that is triggered by a webhook **MUST** validate the user's role from the verified JWT against the action they are trying to perform.
    - For example, the `ASSESSMENT_CREATE_DRAFT` workflow must check that `actor.role === 'teacher'`. If the role is `parent`, the workflow must immediately stop and return an authorization error, even if the request somehow bypassed the frontend checks.
    - For data-specific access (e.g., a teacher viewing *their own* students), the backend must use the `userId` from the JWT in its database queries (e.g., `WHERE teacher_id = :userId`).

## What NOT to Log or Store

To prevent sensitive data exposure, adhere to the following rules:

- **NEVER** log raw JWTs (ID tokens or access tokens) to the browser console, server logs, or any third-party logging service.
- **NEVER** log sensitive user information, such as full names or email addresses, in a way that is not access-controlled.
- **NEVER** expose internal n8n webhook URLs to the client. All calls must go through the Webhook Gateway.
- **NEVER** embed secrets like API keys or database connection strings in the frontend code. All secrets must be managed via environment variables on the respective servers (Next.js and n8n) and injected securely in production environments (e.g., using AWS Secrets Manager).

The internal developer log page (`/dev/logs`) should only be enabled in `NODE_ENV=development` and should not display any raw tokens or PII. It is designed for debugging the event flow, not for inspecting sensitive data.
