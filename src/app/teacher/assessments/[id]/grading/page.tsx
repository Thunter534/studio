'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWebhook } from '@/lib/hooks';
import { useToast } from '@/hooks/use-toast';
import { normalizeAssessmentIdentifier } from '@/lib/utils';
import { clampProficiencyLevelForGrade, getAllowedProficiencyLevelsForGrade, normalizeStudentGrade } from '@/lib/grade-rules';
import type { StudentListItem, StudentListResponse } from '@/lib/events';
import { User, FileText, ShieldCheck, ArrowLeft, CheckCircle2, Sparkles, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

type GradeScaleValue = 'A' | 'B' | '1' | '2' | '3' | '4' | '5' | '6';

const FIXED_REPORT_CRITERIA: Array<{ id: string; title: string; description?: string; maxPoints: number }> = [
  { id: 'listening', title: 'Listening', maxPoints: 8 },
  { id: 'speaking', title: 'Speaking', maxPoints: 8 },
  { id: 'reading', title: 'Reading', maxPoints: 8 },
  { id: 'writing', title: 'Writing', maxPoints: 8 },
];

const toGradeNumericValue = (value: GradeScaleValue): number => {
  switch (value) {
    case 'A': return 1;
    case 'B': return 2;
    case '1': return 3;
    case '2': return 4;
    case '3': return 5;
    case '4': return 6;
    case '5': return 7;
    case '6': return 8;
    default: return 5;
  }
};

const toGradeScaleValue = (value: unknown): GradeScaleValue => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    if (value === 'A' || value === 'B') {
      return value;
    }
    return '3';
  }
  const clamped = Math.max(1, Math.min(8, Math.round(parsed)));
  switch (clamped) {
    case 1: return 'A';
    case 2: return 'B';
    case 3: return '1';
    case 4: return '2';
    case 5: return '3';
    case 6: return '4';
    case 7: return '5';
    case 8: return '6';
    default: return '3';
  }
};

export default function GradingPage() {
  const params = useParams<{ id: string }>();
  const assessmentId = params.id;
  const normalizedAssessmentId = normalizeAssessmentIdentifier(assessmentId) ?? assessmentId;
  const { toast } = useToast();
  const router = useRouter();

  const { data: assessmentData, isLoading } = useWebhook<{ assessmentId: string }, { assessment: any }>({
    eventName: 'ASSESSMENT_GET',
    payload: { assessmentId: normalizedAssessmentId },
    cacheKey: `assessment-get:${normalizedAssessmentId}`,
    cacheTtlMs: 60_000,
    fallbackToCacheOnError: true,
  });

  const { data: studentsData } = useWebhook<{}, StudentListResponse | StudentListItem[] | { students?: any[] }>({
    eventName: 'STUDENT_LIST',
    allowRawResponse: true,
  });

  const normalizedStudents = useMemo<StudentListItem[]>(() => {
    if (!studentsData) {
      return [];
    }

    const mapStudent = (student: any): StudentListItem => ({
      name: student?.name,
      grade: student?.grade,
      studentIdNumber: student?.student_id ?? student?.studentId ?? student?.studentIdNumber ?? student?.id ?? '',
      studentEmail: student?.student_email ?? student?.studentEmail,
      parentEmail: student?.parent_email ?? student?.parentEmail ?? '',
    });

    if (Array.isArray(studentsData)) {
      return studentsData.map(mapStudent).filter((student) => student.name && student.studentIdNumber);
    }

    const responseLike = studentsData as any;
    if (Array.isArray(responseLike.students)) {
      return responseLike.students.map(mapStudent).filter((student: StudentListItem) => student.name && student.studentIdNumber);
    }

    if (responseLike.success && Array.isArray(responseLike.data?.students)) {
      return responseLike.data.students.map(mapStudent).filter((student: StudentListItem) => student.name && student.studentIdNumber);
    }

    return [];
  }, [studentsData]);

  const resolvedAssessment = useMemo(() => {
    if (!assessmentData) {
      return null;
    }
    if (Array.isArray(assessmentData)) {
      return assessmentData[0] ?? null;
    }
    const candidate = assessmentData as any;
    return candidate.assessment ?? candidate.data?.assessment ?? candidate ?? null;
  }, [assessmentData]);

  const { trigger: finalizeAssessment, isLoading: isFinalizing } = useWebhook<{
    assessment_id: string;
    student_id?: string | null;
    student_name?: string | null;
    assignment_title?: string | null;
    rubric_name?: string | null;
    teacher_feedback?: string | null;
    ai_output?: string | null;
    status?: string;
    rubric_grades?: Array<{
      criterionId: string;
      criterionName: string;
      score: number;
      maxScore: number;
    }>;
    criteria_ratings?: Array<{
      criterionId: string;
      criterionName: string;
      rating: number;
      maxRating: number;
    }>;
  }, { reportId?: string; assessment?: any; report?: { reportId?: string } }>(
    {
      eventName: 'ASSESSMENT_FINALIZE',
      manual: true,
    }
  );

  const { trigger: markComplete, isLoading: isMarkingComplete } = useWebhook<{
    student_id: string;
    assessment_id: string;
    status: string;
  }, { success?: boolean }>(
    {
      eventName: 'ASSESSMENT_MARK_COMPLETE',
      manual: true,
    }
  );

  const [scores, setScores] = useState<Record<string, GradeScaleValue>>({});
  const [teacherFeedback, setTeacherFeedback] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null);
  const [selectedAssignmentTitle, setSelectedAssignmentTitle] = useState<string | null>(null);
  const [sessionAiOutput, setSessionAiOutput] = useState<string | null>(null);
  const [rubricNameFromSession, setRubricNameFromSession] = useState<string | null>(null);

  const criteria = useMemo(() => FIXED_REPORT_CRITERIA, []);

  const aiOutputText = useMemo(() => {
    const rawOutput = resolvedAssessment?.aiReview?.finalFeedback
      ?? resolvedAssessment?.aiReview?.feedback
      ?? resolvedAssessment?.aiReview?.summary
      ?? resolvedAssessment?.aiReview?.output
      ?? resolvedAssessment?.aiReview?.rawOutput
      ?? resolvedAssessment?.aiReview?.text
      ?? resolvedAssessment?.aiReview
      ?? resolvedAssessment?.aiOutput
      ?? resolvedAssessment?.aiResponse
      ?? resolvedAssessment?.aiResult
      ?? resolvedAssessment?.ai;

    if (!rawOutput) {
      return sessionAiOutput || 'No AI output yet.';
    }

    const extractTextFromParts = (parts: any[]): string => {
      return parts
        .map((part) => (typeof part?.text === 'string' ? part.text : ''))
        .filter(Boolean)
        .join('\n');
    };

    if (typeof rawOutput === 'string') {
      return rawOutput;
    }

    if (Array.isArray(rawOutput)) {
      const first = rawOutput[0];
      const parts = first?.content?.parts ?? first?.parts;
      if (Array.isArray(parts)) {
        const extracted = extractTextFromParts(parts);
        if (extracted) {
          return extracted;
        }
      }
      return JSON.stringify(rawOutput, null, 2);
    }

    const parts = rawOutput?.content?.parts ?? rawOutput?.parts;
    if (Array.isArray(parts)) {
      const extracted = extractTextFromParts(parts);
      if (extracted) {
        return extracted;
      }
    }

    if (typeof rawOutput?.text === 'string') {
      return rawOutput.text;
    }

    return JSON.stringify(rawOutput, null, 2);
  }, [resolvedAssessment, sessionAiOutput]);

  const resolvedStudentGrade = useMemo(() => {
    const assessmentGrade = resolvedAssessment?.student?.grade
      ?? resolvedAssessment?.student?.gradeLabel
      ?? resolvedAssessment?.student_grade
      ?? resolvedAssessment?.studentGrade
      ?? resolvedAssessment?.gradeLabel
      ?? resolvedAssessment?.grade
      ?? null;

    if (assessmentGrade) {
      return String(assessmentGrade);
    }

    const students = normalizedStudents;
    if (!students.length) {
      return null;
    }

    const assessmentStudentId = resolvedAssessment?.student?.studentIdNumber
      ?? resolvedAssessment?.student?.id
      ?? null;
    const assessmentStudentName = resolvedAssessment?.student?.name ?? null;

    const normalizeMatchValue = (value: unknown): string => String(value ?? '').trim().toLowerCase();

    const candidateIds = new Set(
      [
        selectedStudentId,
        assessmentStudentId,
      ]
        .map(normalizeMatchValue)
        .filter(Boolean),
    );

    const candidateNames = new Set(
      [
        selectedStudentName,
        assessmentStudentName,
      ]
        .map(normalizeMatchValue)
        .filter(Boolean),
    );

    const matchedStudent = students.find((student) => {
      const rawStudent = student as any;
      const studentIdCandidates = [
        rawStudent.id,
        rawStudent.student_id,
        rawStudent.studentId,
        rawStudent.studentIdNumber,
        student.studentIdNumber,
      ]
        .map(normalizeMatchValue)
        .filter(Boolean);

      const studentNameCandidates = [
        rawStudent.name,
        rawStudent.student_name,
        rawStudent.studentName,
        student.name,
      ]
        .map(normalizeMatchValue)
        .filter(Boolean);

      return (
        studentIdCandidates.some((id) => candidateIds.has(id))
        || studentNameCandidates.some((name) => candidateNames.has(name))
      );
    });

    return matchedStudent?.grade ?? null;
  }, [resolvedAssessment, selectedStudentId, selectedStudentName, normalizedStudents]);

  const allowedGradeScaleOptions = useMemo(
    () => getAllowedProficiencyLevelsForGrade(resolvedStudentGrade) as GradeScaleValue[],
    [resolvedStudentGrade],
  );

  const displayedLimiterGrade = useMemo(
    () => normalizeStudentGrade(resolvedStudentGrade),
    [resolvedStudentGrade],
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const storedStudentId = sessionStorage.getItem('currentStudentId');
    const storedStudentName = sessionStorage.getItem('currentStudentName');
    const storedAssignmentTitle = sessionStorage.getItem('currentAssignmentTitle');
    const storedAiOutput = sessionStorage.getItem('currentAiOutput');
    const storedRubricName = sessionStorage.getItem('currentRubricName');
    if (storedStudentId) {
      setSelectedStudentId(storedStudentId);
    }
    if (storedStudentName) {
      setSelectedStudentName(storedStudentName);
    }
    if (storedAiOutput) {
      setSessionAiOutput(storedAiOutput);
    }
    if (storedRubricName) {
      setRubricNameFromSession(storedRubricName);
    }
    if (normalizedAssessmentId) {
      setSelectedAssignmentTitle(normalizedAssessmentId);
      sessionStorage.setItem('currentAssignmentTitle', normalizedAssessmentId);
    } else if (storedAssignmentTitle) {
      setSelectedAssignmentTitle(storedAssignmentTitle);
    }
  }, [normalizedAssessmentId]);

  useEffect(() => {
    if (!criteria.length) {
      return;
    }
    const initial: Record<string, GradeScaleValue> = {};
    criteria.forEach((criterion) => {
      initial[criterion.id] = clampProficiencyLevelForGrade(
        toGradeScaleValue(Math.round(criterion.maxPoints * 0.6)),
        resolvedStudentGrade,
      ) as GradeScaleValue;
    });
    setScores(initial);
  }, [criteria, resolvedStudentGrade]);

  useEffect(() => {
    // Populate scores from AI review when assessment data loads
    const rubricGrades = resolvedAssessment?.aiReview?.rubricGrades
      ?? resolvedAssessment?.aiReview?.criteria
      ?? [];
    if (!Array.isArray(rubricGrades) || !criteria.length) {
      return;
    }
    const newScores: Record<string, GradeScaleValue> = {};
    criteria.forEach((criterion, index) => {
      const grade = rubricGrades.find((g: any) =>
        g.criterionId === criterion.id
        || g.id === criterion.id
        || (g.title && g.title === criterion.title)
        || (g.name && g.name === criterion.title)
      ) ?? rubricGrades[index];
      const score = grade?.score ?? grade?.points;
      const resolvedScore = Number.isFinite(Number(score))
        ? toGradeScaleValue(score)
        : toGradeScaleValue(Math.round(criterion.maxPoints * 0.6));
      newScores[criterion.id] = clampProficiencyLevelForGrade(resolvedScore, resolvedStudentGrade) as GradeScaleValue;
    });
    setScores((prev) => ({ ...prev, ...newScores }));
  }, [resolvedAssessment, criteria, resolvedStudentGrade]);

  const handleScoreChange = (id: string, value: GradeScaleValue) => {
    setScores((s) => ({ ...s, [id]: value }));
  };

  const handleFinalize = async () => {
    const rubricGrades = criteria.map((criterion) => {
      const rawScore = scores[criterion.id] ?? '4';
      const rating = toGradeNumericValue(rawScore);
      return {
        criterionId: criterion.id,
        criterionName: criterion.title,
        score: rating,
        maxScore: 8,
      };
    });
    const criteriaRatings = rubricGrades.map((item) => ({
      criterionId: item.criterionId,
      criterionName: item.criterionName,
      rating: item.score,
      maxRating: 8,
    }));
    const assignmentTitle = resolvedAssessment?.title ?? selectedAssignmentTitle ?? normalizedAssessmentId ?? null;
    const rubricName = resolvedAssessment?.rubricName
      ?? resolvedAssessment?.rubric_name
      ?? resolvedAssessment?.rubricId
      ?? resolvedAssessment?.rubric_id
      ?? rubricNameFromSession
      ?? null;
    const studentId = resolvedAssessment?.student?.studentIdNumber
      ?? resolvedAssessment?.student?.id
      ?? selectedStudentId
      ?? null;
    const studentName = resolvedAssessment?.student?.name ?? selectedStudentName ?? null;
    const aiOutput = aiOutputText && aiOutputText !== 'No AI output yet.' ? aiOutputText : null;
    const feedbackValue = teacherFeedback.trim() ? teacherFeedback.trim() : null;

    const finalizeResponse = await finalizeAssessment({
      assessment_id: normalizedAssessmentId,
      student_id: studentId,
      student_name: studentName,
      assignment_title: assignmentTitle,
      rubric_name: rubricName,
      teacher_feedback: feedbackValue,
      ai_output: aiOutput,
      status: 'Graded',
      rubric_grades: rubricGrades,
      criteria_ratings: criteriaRatings,
    });

    // Mark the assignment as complete for the student
    if (studentName && assignmentTitle) {
      await markComplete({
        student_id: studentName,
        assessment_id: assignmentTitle,
        status: 'Graded',
      });
    }

    if (typeof window !== 'undefined') {
      if (studentId) {
        sessionStorage.setItem('currentStudentId', studentId);
      }
      if (studentName) {
        sessionStorage.setItem('currentStudentName', studentName);
      }
      if (assignmentTitle) {
        sessionStorage.setItem('currentAssignmentTitle', assignmentTitle);
      }
    }

    const reportId = (finalizeResponse as any)?.data?.reportId
      ?? (finalizeResponse as any)?.reportId
      ?? (finalizeResponse as any)?.data?.report?.reportId
      ?? (finalizeResponse as any)?.report?.reportId
      ?? (finalizeResponse as any)?.data?.assessment?.reportId
      ?? (finalizeResponse as any)?.assessment?.reportId;

    if (typeof window !== 'undefined' && reportId && studentId) {
      const cacheKey = `report:${studentId}:${normalizedAssessmentId}`;
      window.sessionStorage.setItem(cacheKey, reportId);
    }

    toast({ title: 'Finalized', description: 'Assessment finalized.' });
    setTimeout(() => router.push(reportId ? `/teacher/reports/${reportId}` : '/teacher/reports'), 600);
  };

  const studentDisplayName = resolvedAssessment?.student?.name
    ?? resolvedAssessment?.student?.studentIdNumber
    ?? selectedStudentName
    ?? selectedStudentId
    ?? 'Unknown Student';

  const assignmentDisplayName = normalizedAssessmentId
    ?? resolvedAssessment?.title
    ?? selectedAssignmentTitle
    ?? 'Untitled Assignment';

  return (
    <div className="w-full space-y-8 pb-20">
      {/* Premium Context Header */}
      <div className="space-y-4">
        <button 
          onClick={() => router.back()}
          className="group flex items-center gap-2 text-[10px] font-bold text-muted-foreground hover:text-primary transition-all tracking-[0.2em] uppercase"
        >
          <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
          <span>Return to Workspace</span>
        </button>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between bg-white dark:bg-[#111827] p-6 rounded-[2rem] border border-border shadow-sm">
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center border border-border">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Student</p>
                <p className="text-sm font-bold text-foreground truncate max-w-[180px]">{studentDisplayName}</p>
              </div>
            </div>

            <Separator orientation="vertical" className="hidden lg:block h-10 bg-border" />

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center border border-border">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Assignment</p>
                <p className="text-sm font-bold text-foreground truncate max-w-[220px]">{assignmentDisplayName}</p>
              </div>
            </div>

            <Separator orientation="vertical" className="hidden lg:block h-10 bg-border" />

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none mb-1">Grade Level Rules</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-secondary text-foreground border-none font-bold rounded-md px-2 py-0.5">
                    {displayedLimiterGrade ?? 'Manual'}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                    {allowedGradeScaleOptions.length} levels allowed
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleFinalize} 
            disabled={isFinalizing || isMarkingComplete || isLoading}
            className="bg-primary hover:opacity-90 h-12 px-8 font-bold rounded-xl transition-all shadow-md shadow-primary/20"
          >
            {isFinalizing || isMarkingComplete ? <ArrowLeft className="animate-spin h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Finalize & Create Report
          </Button>
        </div>
      </div>

      {/* Main Action Workspace */}
      <div className="grid gap-8 lg:grid-cols-12 items-start">
        <Card className="lg:col-span-7 border-border shadow-sm overflow-hidden rounded-[2rem] bg-card">
          <CardHeader className="bg-card border-b border-border pb-6 px-8">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Evaluation Grid</CardTitle>
                <CardDescription>Select proficiency levels for this student.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            {/* Criteria Grid: Small & Compact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {criteria.map((criterion) => (
                <div key={criterion.id} className="group p-3 border border-border rounded-xl hover:bg-secondary/10 transition-all flex items-center justify-between gap-3 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary group-hover:bg-primary transition-colors" />
                  <div className="space-y-0.5 pl-2">
                    <h4 className="text-xs font-bold text-foreground leading-tight">{criterion.title}</h4>
                  </div>
                  <div className="shrink-0">
                    <Select
                      value={clampProficiencyLevelForGrade(scores[criterion.id] ?? '4', resolvedStudentGrade)}
                      onValueChange={(value) => handleScoreChange(criterion.id, value as GradeScaleValue)}
                    >
                      <SelectTrigger className="w-20 h-8 rounded-lg bg-background border-border font-bold text-[11px] focus:ring-primary/20 px-2">
                        <SelectValue placeholder="Level" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {allowedGradeScaleOptions.map((option) => (
                          <SelectItem key={option} value={option} className="text-xs font-medium">{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="bg-border/50" />

            {/* Final Feedback: Prominent & Most Important */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-3 w-3 text-primary" />
                </div>
                <Label htmlFor="teacher-feedback" className="text-[11px] font-bold uppercase tracking-widest text-primary">Final Teacher Narrative</Label>
              </div>
              
              <div className="relative group">
                <Textarea 
                  id="teacher-feedback" 
                  placeholder="The most important part! Share encouraging remarks and areas for growth with the student and parents..."
                  className="min-h-[220px] rounded-2xl bg-secondary/20 border-border focus:border-primary/50 transition-all text-sm leading-relaxed p-6 shadow-inner ring-offset-background placeholder:italic"
                  value={teacherFeedback} 
                  onChange={(e) => setTeacherFeedback(e.target.value)} 
                />
                <div className="absolute top-4 right-4 opacity-30 group-hover:opacity-100 transition-opacity">
                  <Badge variant="outline" className="bg-background text-[9px] font-bold uppercase">Narrative Feedback</Badge>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => setTeacherFeedback('')} className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider hover:text-foreground">
                  Clear Narrative
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Insight Sidebar */}
        <div className="lg:col-span-5 space-y-8">
          <Card className="border-border shadow-sm overflow-hidden rounded-[2rem] bg-white dark:bg-[#111827]">
            <CardHeader className="bg-primary/5 border-b border-border/50 pb-6 px-8">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-foreground">AI Intelligence Brief</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">Generated analysis from student work.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="rounded-2xl border border-border bg-secondary/10 p-6">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap italic">
                  {aiOutputText}
                </p>
              </div>
              <div className="mt-6 p-4 rounded-xl border border-primary/10 bg-primary/5 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-bold text-primary mb-1 uppercase tracking-wider">Scale Enforcement</p>
                  <p className="text-muted-foreground font-medium">Proficiency options are limited to <span className="text-foreground font-bold">{allowedGradeScaleOptions.join(', ')}</span> based on the student&apos;s current grade level ({displayedLimiterGrade}).</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
