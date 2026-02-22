import type { WebhookRequest, WebhookResponse, StudentListItem, StudentCreatePayload, AssessmentWorkspaceData, RubricListItem, AssessmentListPayload, ReportListItem, ReportGeneratePayload, ReportData, ParentChildrenListResponse, ParentChild, ParentReportsListPayload, ParentReportData, StudentAssessmentVersion } from './events';
import { studentListData as initialStudentData, getStudentByIdNumber, assessmentWorkspaceData as initialAssessmentData, fullAssessment, aiSuggestions, rubricGrades, mockRubrics, assessmentListItems, reportListItems, fullReportData } from './placeholder-data';

let students: StudentListItem[] = [...initialStudentData];
let reports: ReportListItem[] = [...reportListItems];
let currentAssessmentState: AssessmentWorkspaceData = { ...initialAssessmentData };

const parentChildMap: { [parentId: string]: string[] } = {
    'parent-01': ['S00123'], // John Doe is parent of Amelia Johnson
};

const kpis = {
  pendingReview: 7,
  drafts: 3,
  finalizedThisWeek: 12,
};

const reviewQueue = [
    {
      studentName: 'Amelia Johnson',
      studentId: 'stu_01',
      assessmentName: 'Unit 3: Fractions',
      assessmentId: 'asm_01',
      status: 'pending_review' as const,
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      studentName: 'Benjamin Carter',
      studentId: 'stu_02',
      assessmentName: 'History Mid-Term Essay',
      assessmentId: 'asm_02',
      status: 'ai_draft_ready' as const,
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      studentName: 'Charlotte Davis',
      studentId: 'stu_03',
      assessmentName: 'Science Project Proposal',
      assessmentId: 'asm_03',
      status: 'pending_review' as const,
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
];

const drafts = [
    {
      assessmentId: 'asm_draft_01',
      assessmentName: 'Creative Writing Assignment',
      studentName: 'Olivia Martinez',
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      assessmentId: 'asm_draft_02',
      assessmentName: 'Algebra II Quiz',
      studentName: 'Liam Garcia',
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
];

const healthCheck = {
    authConfigured: true,
    webhookConfigured: true,
    databaseConnected: true,
    lastSuccessfulCall: new Date().toISOString(),
};

const studentList = () => ({
    students: students,
    total: students.length,
});

const getStudent = (payload: { studentId: string }) => {
    const student = getStudentByIdNumber(payload.studentId);
    if (!student) return null;
    
    return { student };
}

const getStudentAssessments = (payload: { studentId: string }) => {
    return { assessments: fullAssessment.studentAssessments };
}

const getStudentReports = (payload: { studentId: string }) => {
    return { reports: fullAssessment.studentReports };
}


const createStudent = (payload: StudentCreatePayload) => {
    const newStudent: StudentListItem = {
        name: payload.name,
        grade: payload.grade,
        studentIdNumber: payload.studentIdNumber,
        studentEmail: payload.studentEmail,
        parentEmail: payload.parentEmail,
    };
    students.unshift(newStudent);
    return { studentId: newStudent.studentIdNumber };
}

// --- Assessment Handlers ---

const listAssessments = (payload: AssessmentListPayload) => {
  const { status = 'all', page = 1, pageSize = 10, search = '' } = payload;
  
  // Deduplicate by title - keep only the first unique assessment per title
  const seenTitles = new Set<string>();
  const deduplicatedItems = assessmentListItems.filter(item => {
    if (seenTitles.has(item.title)) {
      return false;
    }
    seenTitles.add(item.title);
    return true;
  });

  let filteredItems = deduplicatedItems;

  if (status !== 'all') {
    filteredItems = filteredItems.filter(item => item.status === status);
  }

  if (search) {
      const lowercasedSearch = search.toLowerCase();
      filteredItems = filteredItems.filter(item => 
          item.title.toLowerCase().includes(lowercasedSearch) ||
          item.rubric.name.toLowerCase().includes(lowercasedSearch)
      );
  }

  const total = filteredItems.length;
  const items = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  return {
    items,
    counts: {
      needsReview: deduplicatedItems.filter(i => i.status === 'needs_review').length,
      drafts: deduplicatedItems.filter(i => i.status === 'draft').length,
      finalizedThisWeek: deduplicatedItems.filter(i => i.status === 'finalized' && new Date(i.updatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
    },
    pagination: {
      page,
      pageSize,
      total,
    },
  };
};

const getStudentsForAssessment = (payload: { assessmentId: string }) => {
  // Find all assessment instances with the same title as the given assessmentId
  const sourceAssessment = assessmentListItems.find(a => a.assessmentId === payload.assessmentId);
  if (!sourceAssessment) {
    return { students: [] };
  }
  
  // Get all assessments with the same title
  const allVersions = assessmentListItems.filter(a => a.title === sourceAssessment.title);
  
  // Return students with their assessment status
  const students = allVersions.map(assessment => ({
    id: assessment.student.studentIdNumber,
    name: assessment.student.name,
    assessmentId: assessment.assessmentId,
    status: assessment.status,
    submissionType: assessment.submissionType,
    updatedAt: assessment.updatedAt,
  }));

  return { students };
};

const getAssessment = (payload: { assessmentId: string }) => {
    // If the ID is 'new', reset to the draft state.
    if (payload.assessmentId.startsWith('asm_new_')) {
        // State is set by ASSESSMENT_CREATE_DRAFT
    } else if (payload.assessmentId !== currentAssessmentState.id) {
         currentAssessmentState = { ...initialAssessmentData, id: payload.assessmentId };
    }
    return { assessment: currentAssessmentState };
};

const setAssessmentRubric = (payload: { assessmentId: string, rubricName: string }) => {
    currentAssessmentState.rubricName = payload.rubricName;
    return { assessmentId: payload.assessmentId, rubricName: payload.rubricName };
}

const updateAssessmentText = (payload: { assessmentId: string, text: string, source: 'handwritten_extracted' }) => {
    currentAssessmentState.currentText = payload.text;
    currentAssessmentState.source = payload.source;
    return { assessmentId: payload.assessmentId, text: payload.text };
}

const uploadTypedFile = (payload: { assessmentId: string, fileRef: string }) => {
    currentAssessmentState.source = 'typed';
    currentAssessmentState.currentText = `This is sample text extracted from the typed document: ${payload.fileRef}. Once saved, this text becomes read-only to ensure grading consistency against a single version of the student's work. The AI review process will begin automatically.`;
    currentAssessmentState.uploads.push({ id: `up_${crypto.randomUUID()}`, fileName: payload.fileRef, type: 'typed' });
    
    // Simulate AI Grading after upload
    currentAssessmentState.status = 'ai_draft_ready';
    currentAssessmentState.aiReview = {
        status: 'ready',
        suggestions: aiSuggestions,
        rubricGrades: rubricGrades,
    };
    return { assessment: currentAssessmentState };
}

const extractText = (payload: { assessmentId: string, fileRef: string }) => {
    currentAssessmentState.source = 'handwritten_extracted';
    currentAssessmentState.currentText = `This is sample OCR text extracted from ${payload.fileRef}. It may contane some errors for the techer to fix. For example, speling mistakes or formatting isues. Please review and correct the text before locking it for AI grading.`;
    currentAssessmentState.uploads.push({ id: `up_${crypto.randomUUID()}`, fileName: payload.fileRef, type: 'handwritten' });
    return { assessment: currentAssessmentState };
}

const uploadImageFile = (payload: { assessmentId: string, fileRef: string }) => {
    currentAssessmentState.source = 'image_extracted';
    currentAssessmentState.currentText = `This is OCR-style text derived from image ${payload.fileRef}. It may require corrections.`;
    currentAssessmentState.uploads.push({ id: `up_${crypto.randomUUID()}`, fileName: payload.fileRef, type: 'image' });

    // Optionally kick off AI review for image-based submissions
    currentAssessmentState.status = 'ai_draft_ready';
    currentAssessmentState.aiReview = {
        status: 'ready',
        suggestions: aiSuggestions,
        rubricGrades: rubricGrades,
    };

    return { assessment: currentAssessmentState };
}

const saveTypedText = (payload: { assessmentId: string, text: string }) => {
    currentAssessmentState.currentText = payload.text;
    return { assessment: currentAssessmentState };
}

const submitForAIReview = (payload: { assessmentId: string, text: string }) => {
    currentAssessmentState.currentText = payload.text;
    currentAssessmentState.status = 'ai_review_pending';
    
    // Simulate AI review generating grades and suggestions
    currentAssessmentState.aiReview = {
        status: 'ready',
        suggestions: aiSuggestions,
        rubricGrades: rubricGrades,
    };
    
    return { assessment: currentAssessmentState };
}

const runAIGrade = (payload: { assessmentId: string }) => {
    currentAssessmentState.status = 'ai_draft_ready';
    currentAssessmentState.aiReview = {
        status: 'ready',
        suggestions: [...aiSuggestions], // Return a copy
        rubricGrades: [...rubricGrades],
    }
    return { assessment: currentAssessmentState };
}

const finalizeAssessment = (payload: { assessmentId: string }) => {
    currentAssessmentState.status = 'finalized';
    return { assessment: currentAssessmentState };
}

const applySuggestion = (payload: { assessmentId: string; suggestionId: string, action: 'apply' | 'dismiss' }) => {
    const suggestion = currentAssessmentState.aiReview?.suggestions.find(s => s.id === payload.suggestionId);
    let newText = currentAssessmentState.currentText || '';
    if (payload.action === 'apply' && suggestion?.replacement && newText) {
        newText = newText.substring(0, suggestion.start) + suggestion.replacement + newText.substring(suggestion.end);
    }
    currentAssessmentState.currentText = newText;
    
    if(currentAssessmentState.aiReview) {
        currentAssessmentState.aiReview.suggestions = currentAssessmentState.aiReview.suggestions.filter(s => s.id !== payload.suggestionId);
    }
    return { newText };
}

const saveTeacherFeedback = (payload: { assessmentId: string; teacherNotes: string, finalFeedback: string }) => {
    currentAssessmentState.teacherFeedback = {
        notes: payload.teacherNotes,
        finalFeedback: payload.finalFeedback,
    };
    return {};
}

const saveRubricOverrides = (payload: { assessmentId: string; overrides: any }) => {
    currentAssessmentState.teacherOverrides = payload.overrides;
    return { overrides: payload.overrides };
}

// --- Report Handlers ---
const listReports = () => {
    return {
        items: reports,
        pagination: { page: 1, pageSize: 20, total: reports.length },
    };
};

const getReport = (payload: { reportId: string }): { report: ReportData } => {
    return { report: fullReportData };
};

const generateReport = (payload: ReportGeneratePayload) => {
    const student = getStudentByIdNumber(payload.studentId);
    const newReport: ReportListItem = {
        reportId: `rep_${crypto.randomUUID()}`,
        studentName: student?.name || 'Unknown Student',
        periodLabel: payload.period.preset === 'last_30' ? 'Last 30 Days' : 'Custom Range',
        generatedAt: new Date().toISOString(),
        status: 'Queued',
        hasPdf: payload.delivery.pdf,
        delivery: {
            portal: payload.delivery.portal,
            email: payload.delivery.email,
        },
    };
    reports.unshift(newReport);
    // Simulate generation
    setTimeout(() => {
        const generatedReport = reports.find(r => r.reportId === newReport.reportId);
        if (generatedReport) {
            generatedReport.status = 'Generated';
        }
    }, 5000);
    return { reportId: newReport.reportId };
};

const handlers: { [key: string]: (payload: any, actor: WebhookRequest['actor']) => any } = {
    'GET_DASHBOARD_SUMMARY': (payload, actor) => ({ kpis }),
    'GET_REVIEW_QUEUE': (payload, actor) => ({ items: reviewQueue }),
    'GET_DRAFTS': (payload, actor) => ({ items: drafts }),
    'HEALTH_CHECK': (payload, actor) => healthCheck,
    'STUDENT_LIST': (payload, actor) => studentList(),
    'STUDENT_GET': (payload: { studentId: string }, actor) => getStudent(payload),
    'STUDENT_CREATE': (payload: StudentCreatePayload, actor) => createStudent(payload),
    'STUDENT_ASSESSMENTS_LIST': (payload: { studentId: string }, actor) => getStudentAssessments(payload),
    'STUDENT_REPORTS_LIST': (payload: { studentId: string }, actor) => getStudentReports(payload),

    // Rubrics
    'RUBRIC_LIST': (payload, actor) => ({ rubrics: mockRubrics }),

    // Assessment
    'ASSESSMENT_LIST': (payload, actor) => listAssessments(payload),
    'ASSESSMENT_GET': (payload: { assessmentId: string }, actor) => getAssessment(payload),
    'ASSESSMENT_GET_STUDENTS_FOR_ASSIGNMENT': (payload: { assessmentId: string }, actor) => getStudentsForAssessment(payload),
    'ASSESSMENT_SET_RUBRIC': (payload, actor) => setAssessmentRubric(payload),
    'ASSESSMENT_TEXT_UPDATE': (payload, actor) => updateAssessmentText(payload),
    'ASSESSMENT_TYPED_UPLOAD': (payload, actor) => uploadTypedFile(payload),
    'ASSESSMENT_IMAGE_UPLOAD': (payload, actor) => uploadImageFile(payload),
    'ASSESSMENT_SAVE_TYPED': (payload, actor) => saveTypedText(payload),
    'ASSESSMENT_SUBMIT_FOR_AI_REVIEW': (payload, actor) => submitForAIReview(payload),
    'ASSESSMENT_EXTRACT_TEXT': (payload, actor) => extractText(payload),
    'ASSESSMENT_RUN_AI_GRADE': (payload, actor) => runAIGrade(payload),
    'ASSESSMENT_FINALIZE': (payload, actor) => finalizeAssessment(payload),
    'ASSESSMENT_SUGGESTION_ACTION': (payload, actor) => applySuggestion(payload),
    'ASSESSMENT_SAVE_TEACHER_FEEDBACK': (payload, actor) => saveTeacherFeedback(payload),
    'ASSESSMENT_SAVE_RUBRIC_OVERRIDE': (payload, actor) => saveRubricOverrides(payload),


    // Reports
    'REPORTS_LIST': (payload, actor) => listReports(),
    'REPORT_GET': (payload, actor) => getReport(payload),
    'REPORT_GENERATE': (payload, actor) => generateReport(payload),
    'REPORT_SEND': (payload, actor) => ({ success: true }),
    'REPORT_DOWNLOAD_PDF': (payload, actor) => ({ fileContent: 'mock-pdf-base64-content' }),

    // Action mocks just return success
    'REVIEW_OPEN': (payload, actor) => ({}),
    'DRAFT_OPEN': (payload, actor) => ({}),
    'NEW_ASSESSMENT_START': (payload, actor) => ({}),
    'ASSESSMENT_CREATE_DRAFT': ({ title, rubricName, notes }: {title: string, rubricName: string, notes?: string}) => {
        const newId = `asm_new_${crypto.randomUUID().slice(0,4)}`;
        currentAssessmentState = {
            id: newId,
            title: title,
            status: "draft",
            student: { id: 'unassigned', name: 'All Students' },
            rubricName: rubricName,
            notes: notes,
            source: null,
            currentText: null,
            uploads: [],
            aiReview: null,
            teacherFeedback: null,
            teacherOverrides: null,
        };
        return { assessmentId: newId };
    },

    // Parent Portal
    'PARENT_CHILDREN_LIST': (payload, actor) => {
        const childIds = parentChildMap[actor.userId] || [];
        const children = childIds.map(id => {
            const student = getStudentByIdNumber(id);
            if (!student) return null;
            const studentReports = reportListItems.filter(r => r.studentName === student.name).sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
            return {
                childId: student.studentIdNumber,
                childName: student.name,
                gradeLabel: student.grade,
                latestReportAt: studentReports.length > 0 ? studentReports[0].generatedAt : null,
            };
        }).filter((c): c is ParentChild => c !== null);
        return { children };
    },
    'PARENT_REPORTS_LIST': (payload: ParentReportsListPayload) => {
        const student = getStudentByIdNumber(payload.childId);
        if (!student) { return { studentName: "Unknown", items: [], pagination: { page: 1, pageSize: 10, total: 0 }}; }

        const items = reportListItems
            .filter(item => item.studentName === student.name)
            .map(({ reportId, periodLabel, generatedAt, hasPdf }) => ({ reportId, periodLabel, generatedAt, hasPdf }));
        
        return {
            studentName: student.name,
            items,
            pagination: { page: 1, pageSize: 10, total: items.length },
        };
    },
    'PARENT_REPORT_GET': (payload: { reportId: string }): { report: ParentReportData } => {
        const summary = reportListItems.find(r => r.reportId === payload.reportId);
        const studentName = summary?.studentName || fullReportData.studentName;

        return {
            report: {
                reportId: payload.reportId,
                childName: studentName,
                periodLabel: summary?.periodLabel || fullReportData.periodLabel,
                generatedAt: summary?.generatedAt || fullReportData.generatedAt,
                hasPdf: summary?.hasPdf || false,
                sections: {
                    summary: fullReportData.summary,
                    strengths: fullReportData.strengths,
                    growthAreas: fullReportData.growthAreas,
                    rubricSnapshot: fullReportData.rubricSnapshot,
                    teacherFinalComment: fullReportData.teacherFinalComment
                }
            }
        };
    },
};


export function getMockResponse(body: WebhookRequest): WebhookResponse | null {
  const handler = handlers[body.eventName];
  if (handler) {
    const data = handler(body.payload, body.actor);
    if (data === null) {
         return {
            success: false,
            error: { message: 'Not found' },
            correlationId: `mock_${crypto.randomUUID()}`,
        };
    }
    return {
      success: true,
      data,
      correlationId: `mock_${crypto.randomUUID()}`,
    };
  }
  return null;
}
