# Webhook Specification & Supabase Schema

This document defines every webhook event, its request/response format, and how it maps to Supabase tables.

---

## Database Schema (Supabase SQL)

```sql
-- Core Tables
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  class VARCHAR(100),
  student_id_number VARCHAR(50) UNIQUE,
  avatar_url TEXT,
  student_email VARCHAR(255),
  parent_email VARCHAR(255),
  last_assessment_date TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'No Assessments',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  version VARCHAR(20),
  criteria JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  rubric_id UUID REFERENCES rubrics(id),
  student_id UUID REFERENCES students(id),
  notes TEXT,
  source VARCHAR(50),
  current_text TEXT,
  ai_review JSONB,
  teacher_feedback JSONB,
  teacher_overrides JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  INDEX idx_status (status),
  INDEX idx_student_id (student_id),
  INDEX idx_rubric_id (rubric_id)
);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  period_label VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Queued',
  summary TEXT,
  strengths TEXT[],
  growth_areas TEXT[],
  rubric_snapshot JSONB,
  teacher_final_comment TEXT,
  included_assessments_count INTEGER,
  has_pdf BOOLEAN DEFAULT false,
  delivery JSONB,
  generated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  INDEX idx_student_id (student_id)
);

CREATE TABLE webhook_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  request_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  event_name VARCHAR(255) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_role VARCHAR(50),
  actor_user_id VARCHAR(255),
  payload JSONB,
  response_status BOOLEAN,
  correlation_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  INDEX idx_event_name (event_name),
  INDEX idx_actor_user_id (actor_user_id)
);
```

---

## Event Specifications

### DASHBOARD EVENTS

#### 1. GET_DASHBOARD_SUMMARY
**Purpose:** Fetch dashboard KPIs
**Supabase Query:**
```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'needs_review') as pending_review,
  COUNT(*) FILTER (WHERE status = 'draft') as drafts,
  COUNT(*) FILTER (WHERE status = 'finalized' AND updated_at > NOW() - INTERVAL '7 days') as finalized_this_week
FROM assessments;
```

**Request Format:**
```json
{
  "eventName": "GET_DASHBOARD_SUMMARY",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-02-19T14:30:00Z",
  "actor": { "role": "teacher", "userId": "teacher_001" },
  "payload": {}
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "kpis": {
      "pendingReview": 7,
      "drafts": 3,
      "finalizedThisWeek": 12
    }
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

#### 2. GET_REVIEW_QUEUE
**Purpose:** Fetch assessments waiting for teacher review
**Supabase Query:**
```sql
SELECT
  a.id as assessment_id,
  a.title as assessment_name,
  a.status,
  s.id as student_id,
  s.name as student_name,
  a.updated_at
FROM assessments a
JOIN students s ON a.student_id = s.id
WHERE a.status IN ('ai_draft_ready', 'needs_review')
ORDER BY a.updated_at DESC
LIMIT 50;
```

**Request Format:**
```json
{
  "eventName": "GET_REVIEW_QUEUE",
  "requestId": "550e8400-e29b-41d4-a716-446655440001",
  "timestamp": "2026-02-19T14:31:00Z",
  "actor": { "role": "teacher", "userId": "teacher_001" },
  "payload": {}
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "assessmentId": "asm_01",
        "assessmentName": "Unit 3: Fractions",
        "studentId": "stu_01",
        "studentName": "Amelia Johnson",
        "status": "pending_review",
        "updatedAt": "2026-02-19T10:30:00Z"
      }
    ]
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440001"
}
```

---

#### 3. GET_DRAFTS
**Purpose:** Fetch draft assessments in progress
**Supabase Query:**
```sql
SELECT
  a.id as assessment_id,
  a.title as assessment_name,
  s.name as student_name,
  a.updated_at
FROM assessments a
JOIN students s ON a.student_id = s.id
WHERE a.status = 'draft'
ORDER BY a.updated_at DESC
LIMIT 50;
```

**Request Format:**
```json
{
  "eventName": "GET_DRAFTS",
  "requestId": "550e8400-e29b-41d4-a716-446655440002",
  "timestamp": "2026-02-19T14:32:00Z",
  "actor": { "role": "teacher", "userId": "teacher_001" },
  "payload": {}
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "assessmentId": "asm_draft_01",
        "assessmentName": "Creative Writing Assignment",
        "studentName": "Charlotte Davis",
        "updatedAt": "2026-02-19T14:00:00Z"
      }
    ]
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440002"
}
```

---

#### 4. REVIEW_OPEN
**Purpose:** Mark assessment as opened for review
**Supabase Action:** Update assessment status to `in_review`
**Request Format:**
```json
{
  "eventName": "REVIEW_OPEN",
  "requestId": "550e8400-e29b-41d4-a716-446655440003",
  "timestamp": "2026-02-19T14:33:00Z",
  "actor": { "role": "teacher", "userId": "teacher_001" },
  "payload": { "assessmentId": "asm_01" }
}
```

**Response Format:**
```json
{
  "success": true,
  "correlationId": "550e8400-e29b-41d4-a716-446655440003"
}
```

---

#### 5. DRAFT_OPEN
**Purpose:** Mark draft as opened
**Supabase Action:** Log access timestamp
**Request Format:**
```json
{
  "eventName": "DRAFT_OPEN",
  "requestId": "550e8400-e29b-41d4-a716-446655440004",
  "timestamp": "2026-02-19T14:34:00Z",
  "actor": { "role": "teacher", "userId": "teacher_001" },
  "payload": { "assessmentId": "asm_draft_01" }
}
```

**Response Format:**
```json
{
  "success": true,
  "correlationId": "550e8400-e29b-41d4-a716-446655440004"
}
```

---

### ASSESSMENT EVENTS

#### 6. ASSESSMENT_CREATE_DRAFT
**Purpose:** Create new assessment as draft (universal assignment, no student tied)
**Supabase Action:**
```sql
INSERT INTO assessments (title, rubric_id, status, notes, created_at)
VALUES ($1, $2, 'draft', $3, NOW())
RETURNING id;
```

**Request Format:**
```json
{
  "eventName": "ASSESSMENT_CREATE_DRAFT",
  "requestId": "550e8400-e29b-41d4-a716-446655440005",
  "timestamp": "2026-02-19T14:35:00Z",
  "actor": { "role": "teacher", "userId": "teacher_001" },
  "payload": {
    "title": "Unit 3: Fractions",
    "studentId": "",
    "rubricId": "rub_02",
    "notes": "Focus on mathematical reasoning"
  }
}
```

**Response Format:**
```json
{
  "success": true,
  "data": { "assessmentId": "asm_01" },
  "correlationId": "550e8400-e29b-41d4-a716-446655440005"
}
```

---

#### 7. ASSESSMENT_GET
**Purpose:** Fetch full assessment data by ID
**Supabase Query:**
```sql
SELECT
  a.*,
  r.name as rubric_name,
  r.criteria,
  s.name as student_name
FROM assessments a
LEFT JOIN rubrics r ON a.rubric_id = r.id
LEFT JOIN students s ON a.student_id = s.id
WHERE a.id = $1;
```

**Request Format:**
```json
{
  "eventName": "ASSESSMENT_GET",
  "requestId": "550e8400-e29b-41d4-a716-446655440006",
  "timestamp": "2026-02-19T14:36:00Z",
  "actor": { "role": "teacher", "userId": "teacher_001" },
  "payload": { "assessmentId": "asm_01" }
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "assessment": {
      "id": "asm_01",
      "title": "Unit 3: Fractions",
      "status": "draft",
      "rubricId": "rub_02",
      "student": { "id": "stu_01", "name": "Amelia Johnson" },
      "notes": "Focus on mathematical reasoning",
      "source": null,
      "currentText": null,
      "uploads": [],
      "aiReview": null,
      "teacherFeedback": null,
      "teacherOverrides": null
    }
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440006"
}
```

---

#### 8. ASSESSMENT_SET_RUBRIC
**Purpose:** Assign rubric to assessment
**Supabase Action:**
```sql
UPDATE assessments SET rubric_id = $1, updated_at = NOW() WHERE id = $2;
```

**Request Format:**
```json
{
  "eventName": "ASSESSMENT_SET_RUBRIC",
  "requestId": "550e8400-e29b-41d4-a716-446655440007",
  "timestamp": "2026-02-19T14:37:00Z",
  "actor": { "role": "teacher", "userId": "teacher_001" },
  "payload": { "assessmentId": "asm_01", "rubricId": "rub_02" }
}
```

**Response Format:**
```json
{
  "success": true,
  "correlationId": "550e8400-e29b-41d4-a716-446655440007"
}
```

---

#### 9. ASSESSMENT_TYPED_UPLOAD
**Purpose:** Upload and analyze typed document (extract text)
**Supabase Action:**
```sql
UPDATE assessments 
SET 
  current_text = $1,
  source = 'typed',
  updated_at = NOW()
WHERE id = $2;
```

**Request Format:**
```json
{
  "eventName": "ASSESSMENT_TYPED_UPLOAD",
  "requestId": "550e8400-e29b-41d4-a716-446655440008",
  "timestamp": "2026-02-19T14:38:00Z",
  "actor": { "role": "teacher", "userId": "teacher_001" },
  "payload": {
    "assessmentId": "asm_01",
    "fileRef": "document.pdf"
  }
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "extractedText": "The student's essay about fractions..."
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440008"
}
```

---

#### 10. ASSESSMENT_IMAGE_UPLOAD
**Purpose:** Upload and analyze image (OCR extracted text)
**Supabase Action:**
```sql
UPDATE assessments 
SET 
  current_text = $1,
  source = 'handwritten_extracted',
  updated_at = NOW()
WHERE id = $2;
```

**Request Format:**
```json
{
  "eventName": "ASSESSMENT_IMAGE_UPLOAD",
  "requestId": "550e8400-e29b-41d4-a716-446655440009",
  "timestamp": "2026-02-19T14:39:00Z",
  "actor": { "role": "teacher", "userId": "teacher_001" },
  "payload": {
    "assessmentId": "asm_01",
    "fileRef": "handwriting.jpg"
  }
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "extractedText": "Handwritten text from student work..."
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440009"
}
```

---

#### 11. ASSESSMENT_SUBMIT_FOR_AI_REVIEW
**Purpose:** Send extracted text to AI for grading
**Supabase Action:**
```sql
UPDATE assessments 
SET 
  ai_review = $1,
  status = 'ai_draft_ready',
  updated_at = NOW()
WHERE id = $2;
```
Where `ai_review` contains: `{ status: 'ready', rubricGrades: [...], suggestions: [...] }`

**Request Format:**
```json
{
  "eventName": "ASSESSMENT_SUBMIT_FOR_AI_REVIEW",
  "requestId": "550e8400-e29b-41d4-a716-446655440010",
  "timestamp": "2026-02-19T14:40:00Z",
  "actor": { "role": "teacher", "userId": "teacher_001" },
  "payload": {
    "assessmentId": "asm_01",
    "text": "Student's corrected essay text..."
  }
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "grades": [
      {
        "id": "g1",
        "criterionId": "r1",
        "criterionName": "Clarity",
        "suggestedLevelOrScore": 4,
        "rationale": "Clear and well-structured argument"
      }
    ],
    "suggestions": [
      {
        "id": "s1",
        "start": 0,
        "end": 15,
        "criterionName": "Clarity",
        "severity": "Minor",
        "comment": "Try rephrasing this sentence"
      }
    ]
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440010"
}
```

---

#### 12. ASSESSMENT_FINALIZE
**Purpose:** Mark assessment as complete and ready
**Supabase Action:**
```sql
UPDATE assessments 
SET 
  status = 'finalized',
  updated_at = NOW()
WHERE id = $1;
```

**Request Format:**
```json
{
  "eventName": "ASSESSMENT_FINALIZE",
  "requestId": "550e8400-e29b-41d4-a716-446655440011",
  "timestamp": "2026-02-19T14:41:00Z",
  "actor": { "role": "teacher", "userId": "teacher_001" },
  "payload": { "assessmentId": "asm_01" }
}
```

**Response Format:**
```json
{
  "success": true,
  "correlationId": "550e8400-e29b-41d4-a716-446655440011"
}
```

---

#### 13. ASSESSMENT_LIST
**Purpose:** Fetch deduplicated list of assignments (not per-student instances)
**Supabase Query:**
```sql
SELECT DISTINCT ON (a.title)
  a.id as assessment_id,
  a.title,
  r.id as rubric_id,
  r.name as rubric_name,
  a.status,
  a.notes,
  a.updated_at,
  s.id as student_id,
  s.name as student_name
FROM assessments a
LEFT JOIN rubrics r ON a.rubric_id = r.id
LEFT JOIN students s ON a.student_id = s.id
WHERE ($1 = 'all' OR a.status = $1)
  AND ($2 IS NULL OR a.title ILIKE '%' || $2 || '%')
ORDER BY a.title, a.updated_at DESC
OFFSET ($3 - 1) * $4
LIMIT $4;
```

**Request Format:**
```json
{
  "eventName": "ASSESSMENT_LIST",
  "requestId": "550e8400-e29b-41d4-a716-446655440012",
  "timestamp": "2026-02-19T14:42:00Z",
  "actor": { "role": "teacher", "userId": "teacher_001" },
  "payload": {
    "status": "all",
    "search": "",
    "page": 1,
    "pageSize": 10
  }
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "assessmentId": "asm_01",
        "title": "Unit 3: Fractions",
        "student": { "id": "stu_01", "name": "Amelia Johnson" },
        "rubric": { "id": "rub_02", "name": "Standard Math" },
        "status": "draft",
        "updatedAt": "2026-02-19T14:00:00Z",
        "notes": "Focus on reasoning"
      }
    ],
    "counts": {
      "needsReview": 3,
      "drafts": 5,
      "finalizedThisWeek": 12
    },
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 25
    }
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440012"
}
```

---

#### 14. ASSESSMENT_GET_STUDENTS_FOR_ASSIGNMENT
**Purpose:** Get all students who have instances of this assignment
**Supabase Query:**
```sql
SELECT
  s.id,
  s.name,
  a.id as assessment_id,
  a.status,
  a.source as submission_type,
  a.updated_at
FROM assessments a
JOIN students s ON a.student_id = s.id
WHERE a.title = (SELECT title FROM assessments WHERE id = $1)
ORDER BY s.name;
```

**Request Format:**
```json
{
  "eventName": "ASSESSMENT_GET_STUDENTS_FOR_ASSIGNMENT",
  "requestId": "550e8400-e29b-41d4-a716-446655440013",
  "timestamp": "2026-02-19T14:43:00Z",
  "actor": { "role": "teacher", "userId": "teacher_001" },
  "payload": { "assessmentId": "asm_01" }
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "id": "stu_01",
        "name": "Amelia Johnson",
        "assessmentId": "asm_01",
        "status": "draft",
        "submissionType": "typed",
        "updatedAt": "2026-02-19T14:00:00Z"
      },
      {
        "id": "stu_02",
        "name": "Benjamin Carter",
        "assessmentId": "asm_02",
        "status": "ai_draft_ready",
        "submissionType": "handwritten_extracted",
        "updatedAt": "2026-02-19T13:30:00Z"
      }
    ]
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440013"
}
```

---

### STUDENT EVENTS

#### 15. STUDENT_LIST
**Purpose:** Fetch all students
**Supabase Query:**
```sql
SELECT * FROM students ORDER BY name;
```

**Request Format:**
```json
{
  "eventName": "STUDENT_LIST",
  "requestId": "550e8400-e29b-41d4-a716-446655440014",
  "timestamp": "2026-02-19T14:44:00Z",
  "actor": { "role": "teacher", "userId": "teacher_001" },
  "payload": {}
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "id": "stu_01",
        "name": "Amelia Johnson",
        "grade": "Grade 5",
        "studentIdNumber": "S00123",
        "studentEmail": "amelia.johnson@school.edu",
        "parentEmail": "parent.johnson@email.com"
      }
    ],
    "total": 25
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440014"
}
```

---

#### 16. STUDENT_GET
**Purpose:** Fetch single student profile
**Supabase Query:**
```sql
SELECT id, name, grade, student_id_number, student_email, parent_email FROM students WHERE id = $1;
```

**Request Format:**
```json
{
  "eventName": "STUDENT_GET",
  "requestId": "550e8400-e29b-41d4-a716-446655440015",
  "timestamp": "2026-02-19T14:45:00Z",
  "actor": { "role": "teacher", "userId": "teacher_001" },
  "payload": { "studentId": "stu_01" }
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "student": {
      "id": "stu_01",
      "name": "Amelia Johnson",
      "class": "Grade 5",
      "studentIdNumber": "S00123",
      "studentEmail": "amelia@school.edu",
      "parentEmail": "parent@email.com"
    }
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440015"
}
```

---

#### 17. STUDENT_CREATE
**Purpose:** Create new student
**Supabase Action:**
```sql
INSERT INTO students (id, name, grade, student_id_number, student_email, parent_email)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id;
```

**Request Format:**
```json
{
  "eventName": "STUDENT_CREATE",
  "requestId": "550e8400-e29b-41d4-a716-446655440016",
  "timestamp": "2026-02-19T14:46:00Z",
  "actor": { "role": "teacher", "userId": "teacher_001" },
  "payload": {
    "id": "stu_06",
    "name": "David Evans",
    "studentIdNumber": "S00126",
    "grade": "Grade 5",
    "studentEmail": "david@school.edu",
    "parentEmail": "parent@email.com"
  }
}
```

**Response Format:**
```json
{
  "success": true,
  "data": { "studentId": "stu_06" },
  "correlationId": "550e8400-e29b-41d4-a716-446655440016"
}
```

---

### RUBRIC EVENTS

#### 18. RUBRIC_LIST
**Purpose:** Fetch all available rubrics
**Supabase Query:**
```sql
SELECT id, name, version, criteria FROM rubrics ORDER BY name;
```

**Request Format:**
```json
{
  "eventName": "RUBRIC_LIST",
  "requestId": "550e8400-e29b-41d4-a716-446655440017",
  "timestamp": "2026-02-19T14:47:00Z",
  "actor": { "role": "teacher", "userId": "teacher_001" },
  "payload": {}
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "rubrics": [
      {
        "id": "rub_01",
        "name": "5th Grade Book Report",
        "version": "1.0"
      },
      {
        "id": "rub_02",
        "name": "Standard ELA Essay",
        "version": "2.1"
      }
    ]
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440017"
}
```

---

### REPORT EVENTS

#### 19. REPORTS_LIST
**Purpose:** Fetch all generated reports
**Supabase Query:**
```sql
SELECT * FROM reports ORDER BY generated_at DESC LIMIT $1 OFFSET ($2-1)*$1;
```

**Request Format:**
```json
{
  "eventName": "REPORTS_LIST",
  "requestId": "550e8400-e29b-41d4-a716-446655440018",
  "timestamp": "2026-02-19T14:48:00Z",
  "actor": { "role": "teacher", "userId": "teacher_001" },
  "payload": { "page": 1, "pageSize": 10 }
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "reportId": "rep_01",
        "studentName": "Amelia Johnson",
        "periodLabel": "Q3 2023",
        "generatedAt": "2026-02-15T10:00:00Z",
        "status": "Generated",
        "hasPdf": true,
        "delivery": { "portal": true, "email": true }
      }
    ],
    "pagination": { "page": 1, "pageSize": 10, "total": 45 }
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440018"
}
```

---

#### 20. REPORT_GET
**Purpose:** Fetch full report data
**Supabase Query:**
```sql
SELECT * FROM reports WHERE id = $1;
```

**Request Format:**
```json
{
  "eventName": "REPORT_GET",
  "requestId": "550e8400-e29b-41d4-a716-446655440019",
  "timestamp": "2026-02-19T14:49:00Z",
  "actor": { "role": "teacher", "userId": "teacher_001" },
  "payload": { "reportId": "rep_01" }
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "report": {
      "id": "rep_01",
      "studentName": "Amelia Johnson",
      "periodLabel": "Q3 2023",
      "generatedAt": "2026-02-15T10:00:00Z",
      "summary": "Amelia has shown strong progress...",
      "strengths": ["Excellent grasp of themes", "Strong participation"],
      "growthAreas": ["More evidence in essays", "Grammar review"],
      "rubricSnapshot": [
        { "criterion": "Clarity", "averageScore": 4.5, "trend": "up" }
      ],
      "teacherFinalComment": "Excellent student...",
      "includedAssessmentsCount": 4
    }
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440019"
}
```

---

#### 21. REPORT_GENERATE
**Purpose:** Create new report for student
**Supabase Action:**
```sql
INSERT INTO reports (student_id, period_label, status, delivery, created_at)
VALUES ($1, $2, 'Queued', $3, NOW())
RETURNING id;
```

**Request Format:**
```json
{
  "eventName": "REPORT_GENERATE",
  "requestId": "550e8400-e29b-41d4-a716-446655440020",
  "timestamp": "2026-02-19T14:50:00Z",
  "actor": { "role": "teacher", "userId": "teacher_001" },
  "payload": {
    "studentId": "stu_01",
    "period": {
      "preset": "this_month"
    },
    "include": {
      "summary": true,
      "rubricBreakdown": true,
      "teacherNotes": true
    },
    "delivery": {
      "portal": true,
      "email": true,
      "pdf": true
    }
  }
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "reportId": "rep_02",
    "status": "Queued"
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440020"
}
```

---

#### 22. REPORT_SEND
**Purpose:** Deliver report to portal/email
**Supabase Action:**
```sql
UPDATE reports SET delivery = $1, status = 'Sent', updated_at = NOW() WHERE id = $2;
```

**Request Format:**
```json
{
  "eventName": "REPORT_SEND",
  "requestId": "550e8400-e29b-41d4-a716-446655440021",
  "timestamp": "2026-02-19T14:51:00Z",
  "actor": { "role": "teacher", "userId": "teacher_001" },
  "payload": {
    "reportId": "rep_02",
    "delivery": { "portal": true, "email": true }
  }
}
```

**Response Format:**
```json
{
  "success": true,
  "correlationId": "550e8400-e29b-41d4-a716-446655440021"
}
```

---

#### 23. REPORT_DOWNLOAD_PDF
**Purpose:** Generate and return PDF download link
**Request Format:**
```json
{
  "eventName": "REPORT_DOWNLOAD_PDF",
  "requestId": "550e8400-e29b-41d4-a716-446655440022",
  "timestamp": "2026-02-19T14:52:00Z",
  "actor": { "role": "teacher", "userId": "teacher_001" },
  "payload": { "reportId": "rep_02" }
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "pdfUrl": "https://storage.example.com/reports/rep_02.pdf?token=xyz",
    "expiresAt": "2026-02-20T14:52:00Z"
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440022"
}
```

---

### PARENT PORTAL EVENTS

#### 24. PARENT_CHILDREN_LIST
**Purpose:** Get all children assigned to a parent account
**Supabase Query:**
```sql
SELECT s.id, s.name, s.class FROM students s WHERE parent_email = (SELECT email FROM users WHERE id = $1);
```

**Request Format:**
```json
{
  "eventName": "PARENT_CHILDREN_LIST",
  "requestId": "550e8400-e29b-41d4-a716-446655440023",
  "timestamp": "2026-02-19T14:53:00Z",
  "actor": { "role": "parent", "userId": "parent_01" },
  "payload": {}
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "children": [
      {
        "childId": "stu_01",
        "childName": "Amelia Johnson",
        "gradeLabel": "Grade 5",
        "latestReportAt": "2026-02-15T10:00:00Z"
      }
    ]
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440023"
}
```

---

#### 25. PARENT_REPORTS_LIST
**Purpose:** Get all reports for a child
**Supabase Query:**
```sql
SELECT report_id, period_label, generated_at, has_pdf FROM reports WHERE student_id = $1 ORDER BY generated_at DESC;
```

**Request Format:**
```json
{
  "eventName": "PARENT_REPORTS_LIST",
  "requestId": "550e8400-e29b-41d4-a716-446655440024",
  "timestamp": "2026-02-19T14:54:00Z",
  "actor": { "role": "parent", "userId": "parent_01" },
  "payload": { "childId": "stu_01", "page": 1, "pageSize": 10 }
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "studentName": "Amelia Johnson",
    "items": [
      {
        "reportId": "rep_01",
        "periodLabel": "Q3 2023",
        "generatedAt": "2026-02-15T10:00:00Z",
        "hasPdf": true
      }
    ],
    "pagination": { "page": 1, "pageSize": 10, "total": 4 }
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440024"
}
```

---

#### 26. PARENT_REPORT_GET
**Purpose:** Get detailed report data for parent
**Supabase Query:**
```sql
SELECT * FROM reports WHERE id = $1 AND student_id IN (SELECT id FROM students WHERE parent_email = $2);
```

**Request Format:**
```json
{
  "eventName": "PARENT_REPORT_GET",
  "requestId": "550e8400-e29b-41d4-a716-446655440025",
  "timestamp": "2026-02-19T14:55:00Z",
  "actor": { "role": "parent", "userId": "parent_01" },
  "payload": { "reportId": "rep_01" }
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "report": {
      "reportId": "rep_01",
      "childName": "Amelia Johnson",
      "periodLabel": "Q3 2023",
      "generatedAt": "2026-02-15T10:00:00Z",
      "sections": {
        "summary": "Amelia has shown strong progress...",
        "strengths": ["Excellent grasp of themes"],
        "growthAreas": ["More evidence in essays"],
        "rubricSnapshot": [
          { "criterion": "Clarity", "averageScore": 4.5, "trend": "up" }
        ],
        "teacherFinalComment": "Excellent student..."
      },
      "hasPdf": true
    }
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440025"
}
```

---

### OTHER EVENTS

#### 27. HEALTH_CHECK
**Purpose:** Verify backend connectivity and configuration
**Request Format:**
```json
{
  "eventName": "HEALTH_CHECK",
  "requestId": "550e8400-e29b-41d4-a716-446655440026",
  "timestamp": "2026-02-19T14:56:00Z",
  "actor": { "role": "teacher", "userId": "teacher_001" },
  "payload": {}
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "authConfigured": true,
    "webhookConfigured": true,
    "databaseConnected": true,
    "lastSuccessfulCall": "2026-02-19T14:56:00Z"
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440026"
}
```

---

## Summary

**Total Events:** 27  
**Event Categories:**
- Dashboard: 5 events
- Assessments: 9 events
- Students: 3 events
- Rubrics: 1 event
- Reports: 5 events
- Parent Portal: 3 events
- Other: 1 event

**Key Data Flows:**
1. **Assignment Creation** → ASSESSMENT_CREATE_DRAFT (no student)
2. **Student Selection** → ASSESSMENT_GET_STUDENTS_FOR_ASSIGNMENT
3. **Document Upload** → ASSESSMENT_TYPED_UPLOAD or ASSESSMENT_IMAGE_UPLOAD → Extract text
4. **AI Review** → ASSESSMENT_SUBMIT_FOR_AI_REVIEW → Get grades
5. **Finalize** → ASSESSMENT_FINALIZE → Mark complete
6. **Report** → REPORT_GENERATE → REPORT_SEND → REPORT_DOWNLOAD_PDF
