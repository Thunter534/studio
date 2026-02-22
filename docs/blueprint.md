# **App Name**: ClassPulse

## Core Features:

- Dashboard Summary: Display a summary of key metrics and quick actions for teachers, including a 'To Review' queue, draft assessments, and key performance indicators.
- Assessment Creation: Allow teachers to create, draft, and finalize assessments. Implement a simplified assessment editor using webhooks.
- Student Roster Management: Enable teachers to view and manage their student roster.
- Report Generation and Viewing: Generate and display reports for teachers and parents. Implement role-based access control via webhooks.
- Microsoft Entra ID Authentication: Authenticate users (teachers and parents) using Microsoft Entra ID. Securely pass the ID token with each webhook request.
- Webhook Gateway: Centralize all backend calls through a Next.js API route layer to manage authentication headers and avoid exposing n8n URLs.
- Integration Health Check: Display the health status of connected integrations, showing details like Auth configuration and recent webhook activity. Intended for debugging and not for end users.

## Style Guidelines:

- Primary color: Deep Indigo (#3F51B5) to evoke trust and intellect.
- Background color: Light Gray (#F5F5F5) to create a clean and minimal interface.
- Accent color: Soft Lavender (#C5CAE9) for subtle highlights and interactive elements.
- Body and headline font: 'Inter', a grotesque-style sans-serif providing a modern, machined, objective and neutral look.
- Utilize a 12-column grid layout with a maximum width of 1200px and an 8px spacing system for consistency.
- Use simple, outline-style icons to represent common actions and objects.
- Apply subtle, fade-in animations for page transitions and modal appearances.