'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { addMonths, format, startOfMonth } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

import { StatCard, StatCardSkeleton } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useWebhook } from '@/lib/hooks';
import { useAuth } from '@/hooks/use-auth';
import type { DashboardKpis, ReportListItem, StudentListItem, StudentListResponse } from '@/lib/events';
import { normalizeAssessmentIdentifier } from '@/lib/utils';
import { activityTracker } from '@/lib/activity-tracker';
import { isWebhookConfigured } from '@/lib/webhook-config';
import { FilePlus, PenSquare, AlertCircle, Activity, FileCheck2, UserPlus, Sparkles, TrendingUp, ShieldCheck, Lightbulb, Loader2 } from 'lucide-react';
import { OnboardingTour } from '@/components/onboarding-tour';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import Image from 'next/image';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// --- Shared Utility: Format Proficiency Level ---
const formatProficiencyLevel = (score: number): string => {
  const rounded = Math.max(1, Math.min(8, Math.round(Number(score))));
  switch (rounded) {
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

const HighEndBar = (props: any) => {
  const { x, y, width, height, index, activeIndex } = props;
  const isHovered = index === activeIndex;
  
  return (
    <motion.g
      initial={{ scaleY: 0, opacity: 0 }}
      animate={{ scaleY: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20, delay: index * 0.05 }}
      style={{ transformOrigin: 'bottom' }}
    >
      <AnimatePresence>
        {isHovered && (
          <motion.g initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
            <rect x={x + width / 2 - 25} y={y - 35} width={50} height={24} rx={6} fill="black" />
            <text x={x + width / 2} y={y - 19} fill="white" textAnchor="middle" fontSize={10} fontWeight={800} className="font-sans">
              LVL {formatProficiencyLevel(props.averageScore)}
            </text>
            <path d={`M ${x + width / 2 - 4} ${y - 11} L ${x + width / 2} ${y - 5} L ${x + width / 2 + 4} ${y - 11} Z`} fill="black" />
          </motion.g>
        )}
      </AnimatePresence>
      <rect x={x} y={y} width={width} height={height} fill={isHovered ? 'hsl(var(--primary))' : 'hsl(var(--secondary))'} rx={6} className="transition-colors duration-200" />
    </motion.g>
  );
};

// --- Data Types ---

type ClassPerformanceView = {
  avgScore: number;
  completionRate: number;
  masteryAchieved: number;
  criteriaBreakdown: Array<{ criterion: string; averageScore: number; maxScore: number; trend: 'up' | 'down' | 'stable'; count: number; }>;
  quarterlyData: Array<{ name: string; Listening: number; Speaking: number; Reading: number; Writing: number; }>;
};

type FinalizedReport = {
  rubric_grades?: Array<{ score: number; maxScore: number; criterionName: string; }>;
  created_at?: string;
  generatedAt?: string;
};

type ReadyToReviewItem = {
  studentName: string;
  studentId: string;
  assessmentId: string;
  assessmentName: string;
  rubricName?: string;
  status: 'N/A';
};

type StudentSubmissionStatus = 'N/A' | 'Graded';

const STUDENT_ASSESSMENT_STATUS_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_STUDENT_ASSESSMENT_STATUS_URL;

const sanitizeIdentifier = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }
  const lowered = normalized.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null' || lowered === 'nan') {
    return null;
  }
  return normalized;
};

const normalizeAssessmentName = (value: string): string => value.trim().toLowerCase();

const normalizeSubmissionStatus = (value: unknown): StudentSubmissionStatus => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'graded' || normalized === 'finalized') {
    return 'Graded';
  }
  return 'N/A';
};

const resolveReportFinalizedOnValue = (report: any): unknown => (
  report?.Timestamp
  ?? report?.timestamp
  ?? report?.created_at
  ?? report?.createdAt
  ?? report?.finalized_at
  ?? null
);

const parseReportFinalizedDate = (value: unknown): Date | null => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return null;
  }

  const numericValue = Number(trimmed);
  if (Number.isFinite(numericValue) && trimmed.length >= 10) {
    const timestampDate = new Date(trimmed.length === 13 ? numericValue : numericValue * 1000);
    if (!Number.isNaN(timestampDate.getTime())) {
      return timestampDate;
    }
  }

  const parsedDate = new Date(trimmed);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
};

// --- Main Dashboard Page ---

export default function TeacherDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const hasDashboardSummaryEndpoint = isWebhookConfigured('GET_DASHBOARD_SUMMARY');
  const [view, setView] = useState<'performance' | 'progress'>('performance');
  const [localActivity, setLocalActivity] = useState<any[]>([]);
  const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);
  const [reviewQueueItems, setReviewQueueItems] = useState<ReadyToReviewItem[]>([]);
  const [reviewQueueLoading, setReviewQueueLoading] = useState(false);
  const [toReviewCount, setToReviewCount] = useState(0);

  const { data: kpiData, isLoading: kpiLoading, error: kpiError, trigger: refetchKpis } = useWebhook<{}, { kpis: DashboardKpis }>({ eventName: 'GET_DASHBOARD_SUMMARY', manual: !hasDashboardSummaryEndpoint, suppressErrorToast: !hasDashboardSummaryEndpoint });
  const { data: studentsData } = useWebhook<{}, StudentListResponse | StudentListItem[]>({ eventName: 'STUDENT_LIST', allowRawResponse: true });
  const { data: reportsListData, isLoading: reportsListLoading } = useWebhook<{}, any>({ eventName: 'REPORTS_LIST', payload: {}, suppressErrorToast: true });
  const { trigger: fetchStudentAssessments } = useWebhook<{ studentId: string }, any>({ eventName: 'ASSESSMENT_LIST', manual: true, allowRawResponse: true, suppressErrorToast: true });
  const { trigger: fetchReportDetails } = useWebhook<{ reportId?: string }, FinalizedReport | { report: FinalizedReport }>({ eventName: 'REPORT_GET', manual: true, suppressErrorToast: true });

  const fetchReportDetailsRef = useRef(fetchReportDetails);
  useEffect(() => { fetchReportDetailsRef.current = fetchReportDetails; });

  const [classPerformance, setClassPerformance] = useState<ClassPerformanceView | null>(null);
  const [classPerformanceLoading, setClassPerformanceLoading] = useState(false);

  useEffect(() => {
    setLocalActivity(activityTracker.get());
    const handleUpdate = () => setLocalActivity(activityTracker.get());
    window.addEventListener('athena_activity_updated', handleUpdate);
    return () => window.removeEventListener('athena_activity_updated', handleUpdate);
  }, []);

  const reports = useMemo(() => {
    if (!reportsListData) return [];
    if (Array.isArray(reportsListData)) return reportsListData as unknown as ReportListItem[];
    return (reportsListData.reports ?? reportsListData.items ?? []) as ReportListItem[];
  }, [reportsListData]);

  const normalizedStudents = useMemo(() => {
    if (!studentsData) return [];
    const rawStudents = Array.isArray(studentsData)
      ? studentsData
      : (studentsData as any).students ?? (studentsData as any).data?.students ?? [];

    if (!Array.isArray(rawStudents)) {
      return [];
    }

    return rawStudents
      .map((student: any) => {
        const studentId = sanitizeIdentifier(student.studentIdNumber ?? student.student_id ?? student.studentId ?? student.id);
        const name = student.name ?? student.student_name ?? 'Student';
        return {
          ...student,
          studentIdNumber: studentId ?? '',
          name: String(name),
        };
      })
      .filter((student: any) => !!student.studentIdNumber);
  }, [studentsData]);

  const assessmentsThisMonth = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const nextMonthStart = addMonths(monthStart, 1);

    return reports.filter((report) => {
      const finalizedOnValue = resolveReportFinalizedOnValue(report);
      const finalizedOnDate = parseReportFinalizedDate(finalizedOnValue);
      if (!finalizedOnDate) {
        return false;
      }

      return finalizedOnDate >= monthStart && finalizedOnDate < nextMonthStart;
    }).length;
  }, [reports]);

  useEffect(() => {
    let isMounted = true;

    const loadReadyToReview = async () => {
      if (!normalizedStudents.length) {
        if (isMounted) {
          setReviewQueueItems([]);
          setToReviewCount(0);
        }
        return;
      }

      setReviewQueueLoading(true);

      const shuffledStudents = [...normalizedStudents].sort(() => Math.random() - 0.5);
      const selectedItems: ReadyToReviewItem[] = [];
      let pendingAssessmentsCount = 0;

      for (const student of shuffledStudents) {
        const currentStudentId = sanitizeIdentifier(student.studentIdNumber ?? student.student_id ?? student.studentId ?? student.id);
        if (!currentStudentId) {
          continue;
        }

        const currentStudentName = student.name ?? student.student_name ?? 'Student';

        let statusByAssessmentName: Record<string, StudentSubmissionStatus> = {};
        if (STUDENT_ASSESSMENT_STATUS_WEBHOOK_URL && currentStudentName) {
          try {
            const statusResponse = await fetch(STUDENT_ASSESSMENT_STATUS_WEBHOOK_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                student_name: currentStudentName,
                studentName: currentStudentName,
                student_id: currentStudentName,
                studentId: currentStudentName,
                name: currentStudentName,
              }),
            });

            if (statusResponse.ok) {
              const statusPayload = await statusResponse.json();
              const statusItems = Array.isArray(statusPayload)
                ? statusPayload
                : statusPayload?.data?.items
                  ?? statusPayload?.data
                  ?? statusPayload?.items
                  ?? statusPayload?.assessments
                  ?? [];

              if (Array.isArray(statusItems)) {
                statusByAssessmentName = statusItems.reduce<Record<string, StudentSubmissionStatus>>((acc, item: any) => {
                  const assessmentName = String(
                    item?.assessment_id
                    ?? item?.assessmentId
                    ?? item?.assessment_name
                    ?? item?.assessmentName
                    ?? item?.assignment_name
                    ?? item?.assignmentName
                    ?? item?.id
                    ?? ''
                  ).trim();

                  if (!assessmentName) {
                    return acc;
                  }

                  acc[normalizeAssessmentName(assessmentName)] = normalizeSubmissionStatus(item?.status);
                  return acc;
                }, {});
              }
            }
          } catch {
            statusByAssessmentName = {};
          }
        }

        try {
          const response = await fetchStudentAssessments({ studentId: String(currentStudentId) });
          const payload = (response as any)?.data ?? response;
          const rawItems = Array.isArray(payload)
            ? payload
            : payload?.data?.items
              ?? payload?.items
              ?? payload?.assessments
              ?? payload?.data?.assessments
              ?? [];

          if (!Array.isArray(rawItems) || rawItems.length === 0) {
            continue;
          }

          const normalizedItems = rawItems
            .map((item: any, index: number) => {
              const rawId = item.id ?? item.assessment_id ?? item.assessmentId ?? item.assignment_id ?? item.assignmentId;
              const id = sanitizeIdentifier(rawId) ?? `${currentStudentId}-assessment-${index + 1}`;
              const title = item.title ?? item.name ?? `Untitled Assessment ${index + 1}`;
              const normalizedTitle = normalizeAssessmentName(String(title));
              const statusFromItem = normalizeSubmissionStatus(item.status ?? item.assessmentStatus ?? item.assessment_status);
              const resolvedStatus = statusByAssessmentName[normalizedTitle] ?? statusFromItem;
              return {
                id: String(id),
                title: String(title),
                rubricName: item.rubricName ?? item.rubric_name ?? item.rubricId ?? item.rubric_id,
                status: resolvedStatus,
              };
            })
            .filter((item: { id: string; title: string }) => !!item.id && !!item.title);

          if (normalizedItems.length === 0) {
            continue;
          }

          pendingAssessmentsCount += normalizedItems.filter((item: { status: StudentSubmissionStatus }) => item.status === 'N/A').length;

          if (selectedItems.length < 3) {
            const randomAssessment = normalizedItems[Math.floor(Math.random() * normalizedItems.length)];

            selectedItems.push({
              studentName: String(currentStudentName),
              studentId: String(currentStudentId),
              assessmentId: randomAssessment.id,
              assessmentName: randomAssessment.title,
              rubricName: randomAssessment.rubricName,
              status: 'N/A',
            });
          }
        } catch {
          continue;
        }
      }

      if (isMounted) {
        setReviewQueueItems(selectedItems);
        setToReviewCount(pendingAssessmentsCount);
        setReviewQueueLoading(false);
      }
    };

    loadReadyToReview();

    return () => {
      isMounted = false;
    };
  }, [normalizedStudents, fetchStudentAssessments]);

  useEffect(() => {
    let isMounted = true;
    const calc = async () => {
      if (reports.length === 0) { if (isMounted) setClassPerformance(null); return; }
      const completed = reports.filter(r => ['generated', 'sent', 'finalized', 'complete', 'completed'].includes(String((r as any).status ?? '').toLowerCase()) || !(r as any).status);
      let graded: Array<{ report: ReportListItem; grades: any[] }> = completed.map(r => ({ report: r, grades: (r as any).rubric_grades ?? (r as any).rubricGrades ?? [] })).filter(r => r.grades.length > 0);

      if (graded.length === 0) {
        setClassPerformanceLoading(true);
        try {
          const requests = completed.map(r => { const id = (r as any).reportId ?? (r as any).report_id ?? (r as any).id; return id ? { report: r, payload: { reportId: id as string } } : null; }).filter((i): i is NonNullable<typeof i> => i !== null);
          if (requests.length > 0) {
            const responses = await Promise.all(requests.map(r => fetchReportDetailsRef.current(r.payload)));
            if (!isMounted) return;
            graded = responses.flatMap((resp, idx) => {
              const norm = (resp as any)?.data?.report ?? (resp as any)?.report ?? resp;
              const grades = norm?.rubric_grades ?? norm?.rubricGrades;
              return Array.isArray(grades) && grades.length > 0 ? [{ report: requests[idx].report, grades }] : [];
            });
          }
        } catch { } finally { if (isMounted) setClassPerformanceLoading(false); }
      }

      if (!isMounted) return;
      const base = ['Listening', 'Speaking', 'Reading', 'Writing'];
      const quarterly: Record<string, Record<string, { sum: number, count: number }>> = { 'Q1': {}, 'Q2': {}, 'Q3': {}, 'Q4': {} };
      graded.forEach(({ report, grades }) => {
        const month = new Date(report.generatedAt).getMonth();
        let q = 'Q1'; if (month >= 3 && month <= 5) q = 'Q2'; if (month >= 6 && month <= 8) q = 'Q3'; if (month >= 9 && month <= 11) q = 'Q4';
        grades.forEach(g => { const name = g.criterionName || g.criterion_name; if (base.includes(name)) { if (!quarterly[q][name]) quarterly[q][name] = { sum: 0, count: 0 }; quarterly[q][name].sum += Number(g.score); quarterly[q][name].count += 1; } });
      });

      const quarterlyData = Object.entries(quarterly).map(([qName, stats]) => {
        const data: any = { name: qName }; base.forEach(c => { const s = stats[c]; data[c] = s && s.count > 0 ? Number((s.sum / s.count).toFixed(1)) : 4.0; }); return data;
      });

      const cMap = new Map<string, { sum: number; count: number; vals: number[] }>();
      base.forEach(c => cMap.set(c, { sum: 0, count: 0, vals: [] }));
      graded.forEach(g => g.grades.forEach(grade => {
        const name = grade?.criterionName ?? grade?.criterion_name; const score = Number(grade?.score);
        if (base.includes(name) && !Number.isNaN(score)) { const ex = cMap.get(name)!; ex.sum += score; ex.count += 1; ex.vals.push(score); }
      }));

      const breakdown = Array.from(cMap.entries()).map(([criterion, s]) => {
        const avg = s.count > 0 ? Number((s.sum / s.count).toFixed(2)) : 5.0;
        const trend = (s.vals.length > 1 ? s.vals[s.vals.length - 1] - s.vals[0] : 0) > 0.15 ? 'up' : (s.vals.length > 1 ? s.vals[s.vals.length - 1] - s.vals[0] : 0) < -0.15 ? 'down' : 'stable';
        return { criterion, averageScore: avg, maxScore: 8, trend, count: s.count };
      });

      const avgScore = breakdown.length > 0 ? Number((breakdown.reduce((sum, i) => sum + i.averageScore, 0) / breakdown.length).toFixed(1)) : 0;
      if (isMounted) setClassPerformance({ avgScore, completionRate: completed.length, masteryAchieved: 0, criteriaBreakdown: breakdown, quarterlyData });
    };
    calc(); return () => { isMounted = false; };
  }, [reports]);

  const dashboardKpis: DashboardKpis = kpiData?.kpis ?? { pendingReview: 0, drafts: 0, finalizedThisWeek: 0 };

  const handleReviewItemClick = (item: ReadyToReviewItem) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('currentStudentId', item.studentId);
      sessionStorage.setItem('currentAssignmentTitle', item.assessmentName);
      if (item.rubricName) {
        sessionStorage.setItem('currentRubricName', item.rubricName);
      }
    }

    router.push(`/teacher/assessments/${encodeURIComponent(item.assessmentId)}/setup?studentId=${encodeURIComponent(item.studentId)}`);
  };

  if ((hasDashboardSummaryEndpoint && kpiLoading) || reviewQueueLoading || reportsListLoading) return <DashboardLoadingSkeleton />;
  if (hasDashboardSummaryEndpoint && kpiError) return <ErrorState onRetry={() => { if (hasDashboardSummaryEndpoint && kpiError) refetchKpis(); }} />;

  const insightData = classPerformance?.criteriaBreakdown.length ? {
    strongest: [...classPerformance.criteriaBreakdown].sort((a, b) => b.averageScore - a.averageScore)[0].criterion,
    strongestLevel: formatProficiencyLevel([...classPerformance.criteriaBreakdown].sort((a, b) => b.averageScore - a.averageScore)[0].averageScore),
    weakestLabel: classPerformance.criteriaBreakdown.filter(i => i.criterion !== [...classPerformance.criteriaBreakdown].sort((a, b) => b.averageScore - a.averageScore)[0].criterion).map(i => i.criterion).join(', '),
    suggestion: `Try adding more ${classPerformance.criteriaBreakdown.filter(i => i.criterion !== [...classPerformance.criteriaBreakdown].sort((a, b) => b.averageScore - a.averageScore)[0].criterion).map(i => i.criterion).slice(0, 2).join(' and ')} activities next.`
  } : null;

  return (
    <div className="space-y-8 pb-12 max-w-[1600px] mx-auto">
      <OnboardingTour />
      
      {/* Row 1: Hero */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#111827] to-[#1F2937] text-white p-10 md:p-12 shadow-2xl border border-white/5 group">
        <div className="max-w-xl space-y-5 relative z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight group-hover:translate-x-1 transition-transform duration-500">Good morning, {user?.name.split(' ')[0] || 'Teacher'}</h1>
          <p className="text-slate-300 text-base font-medium leading-relaxed max-w-md">You’ve got <span className="text-primary font-bold">{toReviewCount}</span> submissions waiting for review today.</p>
        </div>
        <div className="absolute right-0 bottom-0 h-full w-[45%] pointer-events-none hidden lg:block opacity-90">
          <Image 
            src="/images/athena-classroom.png" 
            alt="Hero" 
            fill 
            className="object-contain object-right-bottom scale-125 origin-bottom-right translate-x-1 translate-y-4" 
            priority 
          />
        </div>
      </div>

      {/* Row 2: Stats */}
      <div id="onboarding-kpis" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="To Review" value={toReviewCount} icon={PenSquare} variant="amber" description="submissions" onClick={() => router.push('/teacher/assessments')} />
        <StatCard title="Reports This Month" value={assessmentsThisMonth} icon={FileCheck2} variant="primary" description="completed" onClick={() => router.push('/teacher/reports')} />
        <StatCard title="Students" value={normalizedStudents.length} icon={UserPlus} variant="purple" description="in your class" onClick={() => router.push('/teacher/students')} />
      </div>

      {/* Row 3/4: Stacked Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8">
          <Card id="onboarding-review-queue" className="border-border bg-white dark:bg-[#111827] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden rounded-[2.5rem] transition-all duration-300 hover:shadow-xl">
            <CardHeader className="py-6 px-10 border-b border-border flex flex-row items-center justify-between bg-white dark:bg-[#111827]">
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">Ready to Review</CardTitle>
                <CardDescription className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground mt-0.5">Recent student submissions</CardDescription>
              </div>
              <Badge variant="secondary" className="bg-secondary text-primary font-black text-[10px] px-4 h-7 rounded-full">{reviewQueueItems.length} PENDING</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {reviewQueueItems.length > 0 ? (
                <Table>
                  <TableHeader className="bg-secondary/10">
                    <TableRow className="hover:bg-transparent border-b border-border">
                      <TableHead className="font-bold text-foreground h-14 pl-10 text-[10px] uppercase tracking-widest">Student</TableHead>
                      <TableHead className="font-bold text-foreground h-14 text-[10px] uppercase tracking-widest">Assignment</TableHead>
                      <TableHead className="font-bold text-foreground h-14 text-right pr-10 text-[10px] uppercase tracking-widest">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviewQueueItems.map((item) => (
                      <TableRow key={`${item.studentId}-${item.assessmentId}`} onClick={() => handleReviewItemClick(item)} className="group cursor-pointer hover:bg-secondary/10 border-b border-border last:border-0 transition-colors">
                        <TableCell className="font-bold text-foreground py-6 pl-10 text-sm group-hover:text-primary transition-colors">{item.studentName || 'Student'}</TableCell>
                        <TableCell className="text-muted-foreground font-medium text-sm py-6">{item.assessmentName}</TableCell>
                        <TableCell className="py-6 text-right pr-10">
                          <Badge variant="secondary" className="rounded-full px-4 text-[9px] font-black uppercase">
                            {item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center px-10 opacity-40">
                  <Sparkles className="h-12 w-12 text-primary mb-4" />
                  <h3 className="text-base font-bold text-foreground uppercase tracking-widest">Everything is reviewed</h3>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-white dark:bg-[#111827] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden rounded-[2.5rem] flex flex-col h-full transition-all duration-300 hover:shadow-xl">
            <CardHeader className="py-6 px-10 border-b border-border flex flex-row items-center justify-between shrink-0 bg-white dark:bg-[#111827]">
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">Class Progress</CardTitle>
                <CardDescription className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground mt-0.5">How everyone is doing</CardDescription>
              </div>
              <Tabs value={view} onValueChange={(v) => setView(v as any)} className="bg-secondary/30 p-1.5 rounded-2xl border border-border/50">
                <TabsList className="bg-transparent h-10 gap-1.5">
                  <TabsTrigger value="performance" className="rounded-xl font-bold text-[10px] uppercase tracking-wider h-7 px-5 data-[state=active]:bg-primary data-[state=active]:text-white shadow-none transition-all">By Skill</TabsTrigger>
                  <TabsTrigger value="progress" className="rounded-xl font-bold text-[10px] uppercase tracking-wider h-7 px-5 data-[state=active]:bg-primary data-[state=active]:text-white shadow-none transition-all">Over Time</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="p-10 min-h-[380px] flex flex-col justify-center">
              {classPerformanceLoading ? <div className="h-full flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div> : 
                classPerformance?.criteriaBreakdown.length ? (
                  <div className="h-[300px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      {view === 'performance' ? (
                        <BarChart data={classPerformance.criteriaBreakdown} margin={{ top: 20, bottom: 5, left: -10, right: 10 }} onMouseMove={(s) => setActiveBarIndex(s.isTooltipActive ? s.activeTooltipIndex ?? null : null)} onMouseLeave={() => setActiveBarIndex(null)}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.3)" />
                          <XAxis dataKey="criterion" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} dy={10} />
                          <YAxis domain={[0, 8]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }} />
                          <RechartsTooltip cursor={false} content={() => null} />
                          <Bar dataKey="averageScore" barSize={56} shape={(props: any) => <HighEndBar {...props} activeIndex={activeBarIndex} />} />
                        </BarChart>
                      ) : (
                        <LineChart data={classPerformance.quarterlyData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} dy={10} />
                          <YAxis domain={[0, 8]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }} tickFormatter={(v) => v > 0 ? `L${v}` : '0'} />
                          <RechartsTooltip content={({ active, payload }) => (active && payload?.length) ? (
                            <div className="bg-black text-white p-4 rounded-[1.5rem] shadow-2xl border border-white/10 space-y-2">
                              <p className="text-[10px] font-black uppercase tracking-widest border-b border-white/10 pb-2">{payload[0].payload.name}</p>
                              {payload.map((e: any) => <div key={e.name} className="flex items-center justify-between gap-6"><div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: e.color }} /><span className="text-[10px] font-bold opacity-70">{e.name}</span></div><span className="text-xs font-black">L{formatProficiencyLevel(e.value)}</span></div>)}
                            </div>
                          ) : null} />
                          <Line type="monotone" dataKey="Listening" stroke="#8b5cf6" strokeWidth={4} dot={{ r: 6, fill: 'white', strokeWidth: 3 }} activeDot={{ r: 8 }} />
                          <Line type="monotone" dataKey="Speaking" stroke="#3b82f6" strokeWidth={4} dot={{ r: 6, fill: 'white', strokeWidth: 3 }} activeDot={{ r: 8 }} />
                          <Line type="monotone" dataKey="Reading" stroke="#10b981" strokeWidth={4} dot={{ r: 6, fill: 'white', strokeWidth: 3 }} activeDot={{ r: 8 }} />
                          <Line type="monotone" dataKey="Writing" stroke="#f59e0b" strokeWidth={4} dot={{ r: 6, fill: 'white', strokeWidth: 3 }} activeDot={{ r: 8 }} />
                          <Legend verticalAlign="top" align="right" content={({ payload }) => <div className="flex gap-5 mb-8 justify-end">{payload?.map((e: any) => <div key={e.value} className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.color }} /><span className="text-[10px] font-black uppercase text-muted-foreground">{e.value}</span></div>)}</div>} />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                    <Activity className="h-14 w-14 mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest">Waiting for more data</p>
                  </div>
                )
              }
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <Card id="onboarding-quick-actions" className="bg-primary text-white border-none shadow-2xl overflow-hidden relative rounded-[2.5rem] group transition-all duration-300 hover:scale-[1.02] saturate-[0.85]">
            <div className="absolute top-[-20px] right-[-20px] h-40 w-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
            <CardHeader className="p-8 pb-4 relative z-10">
              <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
              <CardDescription className="text-white/70 text-[10px] uppercase tracking-widest font-black">Common tasks</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 relative z-10 px-8 pb-8">
              <Button size="lg" asChild className="w-full bg-white text-primary hover:bg-slate-50 h-14 font-black rounded-2xl shadow-xl transition-all border-none">
                <Link href="/teacher/assessments"><FilePlus className="mr-3 h-5 w-5 stroke-[3]" /> New assignment</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 h-14 font-black rounded-2xl transition-all">
                <Link href="/teacher/students"><UserPlus className="mr-3 h-5 w-5 stroke-[3]" /> Add student</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-white dark:bg-[#111827] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden rounded-[2.5rem] transition-all duration-300 hover:shadow-xl">
            <CardHeader className="py-6 px-10">
              <CardTitle className="text-base font-bold tracking-tight">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="px-10 pb-8">
              <div className="space-y-6 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                {localActivity.length > 0 ? localActivity.map((activity) => (
                  <div key={activity.id} className="flex gap-5 group">
                    <div className="h-10 w-10 rounded-2xl bg-secondary/50 flex items-center justify-center shrink-0 border border-border/50 group-hover:bg-primary group-hover:text-white transition-all">
                      <Activity className="h-4.5 w-4.5" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">{activity.title}</p>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest leading-none">{activity.updatedAt ? format(new Date(activity.updatedAt), 'h:mm a') : 'N/A'}</p>
                    </div>
                  </div>
                )) : <p className="text-[10px] text-muted-foreground italic text-center py-4 uppercase font-black">No updates yet</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-secondary/40 dark:bg-primary/5 shadow-none overflow-hidden rounded-[2.5rem] flex flex-col h-full group/insight transition-all duration-300 hover:bg-secondary/60">
            <CardHeader className="pb-4 px-10 pt-10 shrink-0">
              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover/insight:scale-110 transition-transform shadow-sm border border-primary/20"><Lightbulb className="h-5 w-5 text-primary" /></div>
              <CardTitle className="text-xl font-bold tracking-tight">What’s going on</CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground uppercase tracking-widest font-extrabold">Recent observations</CardDescription>
            </CardHeader>
            <CardContent className="px-10 pb-10 space-y-8 flex-1 flex flex-col justify-center">
              {insightData ? (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <p className="text-sm leading-relaxed text-foreground font-black">Your class is strongest in <span className="text-primary">{insightData.strongest} (Level {insightData.strongestLevel})</span>.</p>
                    <p className="text-xs leading-relaxed text-muted-foreground font-bold">Students are still working on {insightData.weakestLabel}.</p>
                  </div>
                  <div className="pt-8 border-t border-border/50">
                    <div className="flex items-center gap-2 mb-4"><ShieldCheck className="h-4.5 w-4.5 text-primary" /><p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Next steps</p></div>
                    <p className="text-sm italic text-muted-foreground leading-relaxed font-bold">&ldquo;{insightData.suggestion}&rdquo;</p>
                  </div>
                </div>
              ) : <div className="text-center py-12 opacity-30"><p className="text-[10px] font-black tracking-widest uppercase">Processing...</p></div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// --- Helper Skeleton ---
function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <div className="h-64 w-full rounded-[2.5rem] bg-white dark:bg-[#111827] animate-pulse" />
      <div className="grid gap-6 md:grid-cols-3">
        <StatCardSkeleton /> <StatCardSkeleton /> <StatCardSkeleton />
      </div>
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-8 h-96 rounded-[2.5rem] bg-white animate-pulse" />
        <div className="col-span-4 h-96 rounded-[2.5rem] bg-white animate-pulse" />
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant="destructive" className="max-w-2xl mx-auto mt-20 p-8 rounded-[2rem] border-2">
      <AlertCircle className="h-6 w-6" />
      <AlertTitle className="text-lg font-black uppercase tracking-widest mb-2">Sync Interrupted</AlertTitle>
      <AlertDescription className="text-sm font-medium mb-6 opacity-80"> we encountered a connection error while retrieving your academic data.</AlertDescription>
      <Button variant="destructive" onClick={onRetry} className="h-12 px-8 font-black rounded-xl">Retry Connection</Button>
    </Alert>
  );
}
