'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, GraduationCap, MessageSquare, FileCheck2, User, Calendar, Loader2 } from "lucide-react";
import { useWebhook } from "@/lib/hooks";
import { Separator } from '@/components/ui/separator';
import dynamic from 'next/dynamic';

// Dynamically import the wrapper to prevent SSR issues and React 19 reconciliation errors with react-pdf
const ReportDownloadButton = dynamic(
  () => import('@/components/reports/report-download-button'),
  { 
    ssr: false,
    loading: () => (
      <Button variant="outline" disabled className="h-11 rounded-xl font-bold border-border bg-card shadow-sm">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Initialising PDF...
      </Button>
    )
  }
);

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

const normalizeLegacyRubricScore = (score: number, maxScore?: number): number => {
    const rawScore = Number(score);
    const rawMaxScore = Number(maxScore);
    if (Number.isFinite(rawMaxScore) && rawMaxScore === 6) {
        return rawScore + 2;
    }
    return rawScore;
};

interface FinalizedReport {
  id?: string;
  student_name: string;
  assignment_title: string;
  rubric_name: string;
  teacher_feedback?: string;
  rubric_grades?: Array<{
    score: number;
    maxScore: number;
    criterionId: string;
    criterionName: string;
  }>;
  created_at?: string;
  Timestamp?: string;
  timestamp?: string;
}

export default function ReportDetailPage() {
    const params = useParams();
    const router = useRouter();
    const reportId = params.id as string;
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);
    
    const { data: reportsList } = useWebhook<{}, any>({
        eventName: 'REPORTS_LIST',
        payload: {},
        suppressErrorToast: true,
    });
    
    const reportInfo = React.useMemo(() => {
        const reports = Array.isArray(reportsList)
            ? reportsList
            : (reportsList?.reports ?? reportsList?.items ?? []);

        const matchingReport = reports.find((r: any, idx: number) => {
            const id = r.id ?? r.reportId ?? r.report_id ?? `report-${idx}`;
            return id === reportId;
        });

        return {
            reportId,
            student_name: matchingReport?.student_name ?? matchingReport?.studentName,
            assignment_title: matchingReport?.assignment_title ?? matchingReport?.assignmentTitle ?? matchingReport?.assessment_title,
        };
    }, [reportId, reportsList]);

    const { data: reportRaw, isLoading, trigger: refetchReport } = useWebhook<
        { reportId: string; student_name?: string; assignment_title?: string },
        FinalizedReport | FinalizedReport[]
    >({
        eventName: 'REPORT_GET',
        payload: reportInfo,
        manual: true,
        suppressErrorToast: true,
    });

    const report = React.useMemo(() => {
        if (!reportRaw) return null;
        return Array.isArray(reportRaw) ? reportRaw[0] : reportRaw;
    }, [reportRaw]);

    React.useEffect(() => {
        if (reportInfo.reportId) refetchReport(reportInfo);
    }, [reportInfo, refetchReport]);

    if (isLoading && !report) {
        return (
            <div className="space-y-8 pb-20">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="h-32 w-full rounded-[2rem] bg-white animate-pulse" />
                <div className="grid gap-8 lg:grid-cols-12">
                    <div className="lg:col-span-7 h-96 rounded-[2rem] bg-white animate-pulse" />
                    <div className="lg:col-span-5 h-96 rounded-[2rem] bg-white animate-pulse" />
                </div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <p className="text-muted-foreground font-medium">Record not found or still processing.</p>
                <Button onClick={() => router.push('/teacher/reports')} className="mt-6 rounded-xl font-bold">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Return to Reports
                </Button>
            </div>
        );
    }

    const dateString = (report.Timestamp ?? report.timestamp ?? report.created_at);
    const formattedDate = dateString ? new Date(dateString).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A';

    return (
        <div className="w-full space-y-8 pb-20">
            {/* Premium Context Header */}
            <div className="space-y-4">
                <button 
                    onClick={() => router.push('/teacher/reports')}
                    className="group flex items-center gap-2 text-[10px] font-bold text-muted-foreground hover:text-primary transition-all tracking-[0.2em] uppercase"
                >
                    <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
                    <span>Archive History</span>
                </button>

                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between bg-white dark:bg-[#111827] p-6 rounded-[2rem] border border-border shadow-sm">
                    <div className="flex flex-wrap items-center gap-8">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center border border-border">
                                <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Student</p>
                                <p className="text-sm font-bold text-foreground truncate max-w-[180px]">{report.student_name}</p>
                            </div>
                        </div>

                        <Separator orientation="vertical" className="hidden lg:block h-10 bg-border" />

                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center border border-border">
                                <FileCheck2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Record Type</p>
                                <p className="text-sm font-bold text-foreground">Finalized Report</p>
                            </div>
                        </div>

                        <Separator orientation="vertical" className="hidden lg:block h-10 bg-border" />

                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Calendar className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none mb-1">Issue Date</p>
                                <p className="text-sm font-bold text-foreground">
                                    {formattedDate}
                                </p>
                            </div>
                        </div>
                    </div>

                    {isClient && (
                        <ReportDownloadButton 
                            report={report}
                            formattedDate={formattedDate}
                        />
                    )}
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-12 items-start">
                {/* Main Results Column */}
                <div className="lg:col-span-7 space-y-8">
                    <Card className="border-border shadow-sm overflow-hidden rounded-[2rem] bg-card">
                        <CardHeader className="bg-card border-b border-border pb-6 px-8 pt-8">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                                    <GraduationCap className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-bold">Academic Achievement</CardTitle>
                                    <CardDescription className="text-xs uppercase tracking-widest font-bold text-muted-foreground/60 mt-0.5">Evaluation Results</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="space-y-6">
                                <div className="grid gap-3">
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Rubric Criteria Scores</p>
                                    {report.rubric_grades && report.rubric_grades.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {report.rubric_grades.map((item) => (
                                                <div key={item.criterionId} className="flex items-center justify-between p-4 border border-border rounded-2xl bg-secondary/5 group hover:bg-secondary/10 transition-colors">
                                                    <span className="text-xs font-bold text-foreground">{item.criterionName}</span>
                                                    <Badge variant="secondary" className="bg-white dark:bg-slate-800 text-primary border-none shadow-sm font-bold px-3">
                                                        Level {formatProficiencyLevel(normalizeLegacyRubricScore(item.score, item.maxScore))}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">No score breakdown available for this record.</p>
                                    )}
                                </div>

                                <Separator className="bg-border/50" />

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                            <MessageSquare className="h-3 w-3 text-primary" />
                                        </div>
                                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Final Narrative Feedback</p>
                                    </div>
                                    <div className="p-6 rounded-2xl bg-secondary/10 border border-border/50 shadow-inner italic">
                                        <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                                            &ldquo;{report.teacher_feedback || 'No final narrative provided for this assessment.'}&rdquo;
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Assignment Metadata Column */}
                <div className="lg:col-span-5 space-y-8">
                    <Card className="border-border shadow-sm overflow-hidden rounded-[2rem] bg-white dark:bg-[#111827]">
                        <CardHeader className="bg-primary/5 border-b border-border/50 pb-6 px-8 pt-8">
                            <CardTitle className="text-lg font-bold text-foreground">Record Context</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Assignment Details</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Learning Objective</p>
                                <p className="text-sm font-bold text-foreground leading-tight">{report.assignment_title}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Applied Rubric</p>
                                <p className="text-sm font-medium text-muted-foreground">{report.rubric_name}</p>
                            </div>
                            
                            <Separator className="bg-border/50" />
                            
                            <div className="p-4 rounded-xl border border-primary/10 bg-primary/5">
                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Academic Note</p>
                                <p className="text-xs leading-relaxed text-muted-foreground font-medium">
                                    This record is finalized and synced with the parent portal. Proficiency levels are calculated based on the global academic scale.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
