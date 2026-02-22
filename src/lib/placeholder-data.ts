import type { StudentListItem, StudentAssessmentListItem, StudentReportListItem, StudentProfileData, AssessmentWorkspaceData, AISuggestion, RubricGrade, RubricListItem, AssessmentListItem, ReportListItem, ReportData } from './events';

export const studentListData: StudentListItem[] = [
    { 
        name: 'Amelia Johnson', 
        grade: 'Grade 5', 
        studentIdNumber: 'S00123',
        studentEmail: 'amelia.johnson@school.edu',
        parentEmail: 'parent.johnson@email.com',
    },
    { 
        name: 'Benjamin Carter', 
        grade: 'Grade 5', 
        studentIdNumber: 'S00124',
        studentEmail: 'benjamin.carter@school.edu',
        parentEmail: 'parent.carter@email.com',
    },
    { 
        name: 'Charlotte Davis', 
        grade: 'Grade 5', 
        studentIdNumber: 'S00125',
        studentEmail: 'charlotte.davis@school.edu',
        parentEmail: 'parent.davis@email.com',
    },
    { 
        name: 'Daniel Evans', 
        grade: 'Grade 5', 
        studentIdNumber: 'S00126',
        studentEmail: 'daniel.evans@school.edu',
        parentEmail: 'parent.evans@email.com',
    },
    { 
        name: 'Emma Foster', 
        grade: 'Grade 5', 
        studentIdNumber: 'S00127',
        studentEmail: 'emma.foster@school.edu',
        parentEmail: 'parent.foster@email.com',
    },
];

export const getStudentByIdNumber = (studentIdNumber: string): StudentListItem | undefined => {
    const student = studentListData.find(s => s.studentIdNumber === studentIdNumber);
    return student;
};

const studentAssessments: StudentAssessmentListItem[] = [
    { id: 'asm_01', name: 'Unit 3: Fractions', type: 'Math', status: 'Needs Review', updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'asm_11', name: 'Book Report: The Giver', type: 'Reading', status: 'Finalized', updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'asm_12', name: 'Spelling Test #5', type: 'Writing', status: 'Finalized', updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'asm_draft_03', name: 'Science Fair Proposal', type: 'Science', status: 'Draft', updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'asm_ai_01', name: 'EAL Vocabulary Quiz', type: 'EAL', status: 'AI Draft Ready', updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
];

const studentReports: StudentReportListItem[] = [
    { id: 'rep_01', name: 'Q3 Progress Report', generatedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), status: 'Final' },
    { id: 'rep_02', name: 'Mid-Term Summary', generatedDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'Final' },
];

export const fullAssessment = {
    studentAssessments,
    studentReports,
}

// --- MOCK DATA FOR ASSESSMENT WORKSPACE ---
const sampleText = "The book 'The Giver' by Lois Lowry explores a society that has eliminated pain and strife by converting to 'Sameness'—a tightly controlled social order. The story folows a boy named Jonas who is chosen to be the next 'Receiver of Memory', the only person who holds the memories of the past, including pain and pleasure. This role isolates him from his friends and family. One of the central themes is the importance of individuality and freedom of choice. Lowry uses a simple writing style, but the concepts are deep. The ending is ambiguous, leaving the reader to wonder about Jonas's fate.";

export const aiSuggestions: AISuggestion[] = [
    { id: 'sug_01', start: 161, end: 167, criterionName: 'Mechanics', severity: 'Major', comment: 'Spelling error.', replacement: 'follows' },
    { id: 'sug_02', start: 350, end: 382, criterionName: 'Clarity', severity: 'Moderate', comment: 'This could be phrased more clearly to emphasize the trade-off.', replacement: 'This role isolates him, highlighting the conflict between a painless society and deep human connection.' },
    { id: 'sug_03', start: 22, end: 34, criterionName: 'Evidence', severity: 'Minor', comment: 'Identifies the author of the text.', replacement: undefined },
    { id: 'sug_04', start: 407, end: 446, criterionName: 'Central Idea', severity: 'Moderate', comment: 'Correctly identifies a major theme of the book.', replacement: undefined },
];

export const rubricGrades: RubricGrade[] = [];

export const mockRubrics: RubricListItem[] = [];


export const assessmentWorkspaceData: AssessmentWorkspaceData = {
    id: "asm_01",
    title: "Book Report: The Giver",
    status: 'draft',
    rubricName: null,
    student: {
        id: "S00123",
        name: "Amelia Johnson",
    },
    source: "typed",
    currentText: sampleText,
    uploads: [{ id: 'up_01', fileName: 'The Giver Report.docx', type: 'typed' }],
    aiReview: null,
    teacherFeedback: {
        notes: 'Amelia seems to grasp the main concepts but needs to work on proofreading her work before submission.',
        finalFeedback: 'Good analysis of the central theme, Amelia. Be sure to proofread for minor spelling errors next time. Your insights are strong!'
    },
    teacherOverrides: null,
};

export const assessmentListItems: AssessmentListItem[] = [
  {
    assessmentId: 'asm_01',
    title: 'Unit 3: Fractions',
    student: { id: 'S00123', name: 'Amelia Johnson' },
    classLabel: 'Grade 5',
    submissionType: 'typed',
    rubric: { name: 'Standard ELA Essay' },
    status: 'needs_review',
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Please focus on the mathematical reasoning',
  },
  {
    assessmentId: 'asm_02',
    title: 'History Mid-Term Essay',
    student: { id: 'S00124', name: 'Benjamin Carter' },
    classLabel: 'Grade 5',
    submissionType: 'handwritten',
    rubric: { name: 'Standard ELA Essay' },
    status: 'ai_draft_ready',
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Strong narrative, check citations',
  },
  {
    assessmentId: 'asm_draft_01',
    title: 'Creative Writing Assignment',
    student: { id: 'S00125', name: 'Charlotte Davis' },
    classLabel: 'Grade 5',
    submissionType: 'typed',
    rubric: { name: 'Quick Write - Single Paragraph' },
    status: 'draft',
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    assessmentId: 'asm_04',
    title: 'Book Report: The Giver',
    student: { id: 'S00123', name: 'Amelia Johnson' },
    classLabel: 'Grade 5',
    submissionType: 'typed',
    rubric: { name: '5th Grade Book Report' },
    status: 'finalized',
    updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
    {
    assessmentId: 'asm_05',
    title: 'Lab Report: Photosynthesis',
    student: { id: 'S00127', name: 'Emma Foster' },
    classLabel: 'Grade 5',
    submissionType: 'handwritten',
    rubric: { name: '5th Grade Book Report' },
    status: 'needs_review',
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];


// --- MOCK DATA FOR REPORTS ---

export const reportListItems: ReportListItem[] = [
    {
        reportId: 'rep_01',
        studentName: 'Amelia Johnson',
        periodLabel: 'Q3 2023',
        generatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Generated',
        hasPdf: true,
        delivery: { portal: true, email: true },
    },
    {
        reportId: 'rep_02',
        studentName: 'Benjamin Carter',
        periodLabel: 'Last 30 Days',
        generatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Sent',
        hasPdf: false,
        delivery: { portal: true, email: true },
    },
    {
        reportId: 'rep_03',
        studentName: 'Amelia Johnson',
        periodLabel: 'This Month',
        generatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        status: 'Queued',
        hasPdf: true,
        delivery: { portal: true, email: false },
    },
];

export const fullReportData: ReportData = {
    id: 'rep_01',
    studentName: 'Amelia Johnson',
    periodLabel: 'Q3 2023',
    generatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    includedAssessmentsCount: 4,
    summary: 'Amelia has shown strong progress in Reading Comprehension and foundational Math skills this quarter. She consistently demonstrates an ability to identify the central idea in complex texts. The primary area for growth is in providing detailed evidence to support her claims in written assignments.',
    strengths: [
        'Excellent grasp of central themes in literature.',
        'Improved accuracy in multi-step math problems.',
        'Actively participates in class discussions.',
    ],
    growthAreas: [
        'Incorporate more specific textual evidence in essays.',
        'Double-check for minor grammatical errors before submitting.',
        'Expand vocabulary in science-related writing.',
    ],
    rubricSnapshot: [
        { criterion: 'Central Idea', averageScore: 4.5, trend: 'up' },
        { criterion: 'Evidence & Support', averageScore: 3.2, trend: 'stable' },
        { criterion: 'Mechanics', averageScore: 3.8, trend: 'down' },
    ],
    teacherFinalComment: 'Amelia is a bright and engaged student with a clear passion for reading. I am confident that with a continued focus on using specific evidence in her writing, she will excel. It is a pleasure to have her in class.',
};
