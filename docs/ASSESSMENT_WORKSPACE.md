# Assessment Workspace Documentation

This document outlines the architecture and user flow of the Teacher Assessment Workspace, the primary interface for grading and providing feedback on student work in ClassPulse.

## 1. Philosophy: Rubric-First, Teacher-Approved AI

The core principle of this workspace is that **AI is an assistant, not a replacement, and all grading is grounded in a pre-defined rubric.**
- **Rubric is King**: Before any grading can occur, the teacher must select an existing rubric. All AI analysis is performed against the criteria of this specific rubric. Generic feedback (like grammar correction) will only occur if the rubric includes a "Mechanics" criterion.
- **AI Generates Drafts**: All outputs from AI—be it rubric scores, textual suggestions, or identified issues—are treated as drafts. They are never shown to students or parents directly.
- **Teacher Approves & Overrides**: The teacher has the final say. They must review, can override any AI-suggested score, edit all textual feedback, and explicitly "Finalize" an assessment. This action locks in the grades and feedback as the official record.
- **Manual Override**: The system is designed to be fully functional even if the AI fails or the teacher chooses not to use it. A teacher can always ignore the AI and enter their scores and feedback manually.

## 2. Workspace Flow

The workspace is designed to handle two types of student work: typed text and handwritten images/PDFs, with strict rules about when text becomes read-only.

### Typed Work Flow
1.  **Select Rubric**: The teacher selects an existing rubric from a dropdown. This is a mandatory first step.
2.  **Input**: The teacher uploads a file (e.g., `.docx`, `.pdf`) or pastes text directly into a textarea.
3.  **Save & Lock**: The teacher clicks "Save Typed Submission". This saves the text and immediately makes it **read-only**, ensuring the version sent to the AI is the canonical version.
4.  **AI Grading**: The teacher clicks "Run AI Grading". This sends the locked text and selected `rubricId` to the backend via the `ASSESSMENT_RUN_AI_GRADE` webhook.
5.  **Review & Edit**: The UI updates with AI-generated suggestions and a draft rubric scorecard. The teacher reviews these suggestions, can override scores, and adds their own qualitative feedback.
6.  **Finalize**: The teacher clicks "Finalize", which triggers the `ASSESSMENT_FINALIZE` webhook, locking the assessment and making it ready for reporting.

### Handwritten Work Flow
1.  **Select Rubric**: The teacher selects an existing rubric from a dropdown.
2.  **Input**: The teacher uploads an image or PDF of the handwritten work.
3.  **OCR**: The teacher clicks "Extract Text", triggering the `ASSESSMENT_EXTRACT_TEXT` webhook.
4.  **Edit OCR**: The extracted text appears in an editor. The teacher **must** review and correct any errors in the OCR output. This is the *only* phase where this text is editable.
5.  **Save & Lock**: The teacher can save progress on the extracted text (`ASSESSMENT_TEXT_UPDATE`). When ready, they click "Lock Text & Send to AI". This saves the final version of the text, makes it read-only, and triggers the `ASSESSMENT_RUN_AI_GRADE` webhook.
6.  **AI Grading -> Finalize**: From this point, the flow is identical to the Typed Work flow.

## 3. Frontend vs. n8n Backend Responsibilities

### Frontend
- Renders the 3-rail workspace UI.
- Manages local UI state (loading spinners, button disabled states, modal visibility, read-only states).
- Handles file uploads and input validation (e.g., empty text, rubric selected).
- Makes specific, event-driven webhook calls to n8n for all backend operations.
- Displays the data returned from n8n (e.g., AI suggestions, rubric drafts, override controls).
- **Does NOT contain any business logic.** It doesn't know how to perform OCR, score a rubric, or select a rubric version. It only knows which webhook to call.

### n8n Backend
- Listens for all `ASSESSMENT_*` and `RUBRIC_*` webhook events.
- Contains all business logic.
- **`RUBRIC_LIST`**: Fetches all available rubrics for the teacher.
- **`ASSESSMENT_SET_RUBRIC`**: Associates a rubric with an assessment in the database.
- **`ASSESSMENT_EXTRACT_TEXT`**: Receives a file reference and uses an OCR service to extract text.
- **`ASSESSMENT_RUN_AI_GRADE`**: Receives the assessment text and `rubricId`. It orchestrates calls to a generative AI model, passing the text along with the *specific rubric structure* and asks the AI to:
    - Identify evidence in the text that aligns with each rubric criterion.
    - Propose a draft score for each criterion based on the evidence.
    - Generate suggestions for improvement that are tied directly to rubric criteria.
- Stores all data in the database (e.g., saving AI suggestions, rubric scores, teacher overrides, and final feedback).
- **`ASSESSMENT_FINALIZE`**: Performs the final state change in the database, marking the assessment as complete and ready for reporting.

## 4. Webhook Events & Payloads

- **`RUBRIC_LIST`**:
  - **Payload**: `{}`
  - **Returns**: `{ rubrics: [{ id, name, version }] }`
- **`ASSESSMENT_GET`**:
  - **Payload**: `{ assessmentId: string }`
  - **Returns**: The complete state of the assessment workspace.
- **`ASSESSMENT_SET_RUBRIC`**:
  - **Payload**: `{ assessmentId: string, rubricId: string }`
  - **Returns**: `{ success: true }`
- **`ASSESSMENT_TEXT_SAVE`**:
  - **Payload**: `{ assessmentId: string, text: string, source: 'typed' }`
  - **Returns**: `{ success: true }`
- **`ASSESSMENT_TEXT_UPDATE`**:
  - **Payload**: `{ assessmentId: string, text: string, source: 'handwritten_extracted' }`
  - **Returns**: `{ success: true }`
- **`ASSESSMENT_EXTRACT_TEXT`**:
  - **Payload**: `{ assessmentId: string, fileRef: string }`
  - **Returns**: `{ extractedText: string }`
- **`ASSESSMENT_RUN_AI_GRADE`**:
  - **Payload**: `{ assessmentId: string }`
  - **Returns**: The updated assessment state with `aiReview.status = 'ready'` and populated suggestions/rubric grades.
- **`ASSESSMENT_SUGGESTION_ACTION`**:
  - **Payload**: `{ assessmentId: string, suggestionId: string, action: 'apply' | 'dismiss' }`
  - **Returns**: The updated text after applying the suggestion.
- **`ASSESSMENT_SAVE_RUBRIC_OVERRIDE`**:
  - **Payload**: `{ assessmentId: string, overrides: [{ criterionId: string, score: number, note: string }] }`
  - **Returns**: `{ success: true }`
- **`ASSESSMENT_SAVE_TEACHER_FEEDBACK`**:
  - **Payload**: `{ assessmentId: string, privateNotes: string, finalFeedback: string }`
  - **Returns**: `{ success: true }`
- **`ASSESSMENT_FINALIZE`**:
  - **Payload**: `{ assessmentId: string }`
  - **Returns**: The final, locked-down assessment state.
