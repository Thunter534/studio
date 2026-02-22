'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { useWebhook } from "@/lib/hooks";

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
}

export default function ReportDetailPage() {
    const params = useParams();
    const router = useRouter();
    const reportId = params.id as string;
    
    // Fetch reports list to ensure cache is populated
    const { data: reportsList } = useWebhook<{}, any>({
        eventName: 'REPORTS_LIST',
        payload: {},
        cacheKey: 'reports-list',
        cacheTtlMs: 300_000,
        fallbackToCacheOnError: true,
        suppressErrorToast: true,
    });
    
    // Get student_name and assignment_title from reports list cache synchronously
    const getReportInfo = React.useCallback(() => {
        const cacheKey = 'reports-list';
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            try {
                const parsed = JSON.parse(cachedData);
                const reports = Array.isArray(parsed.data) ? parsed.data : (parsed.data?.reports ?? parsed.data?.items ?? []);
                const matchingReport = reports.find((r: any, idx: number) => {
                    const id = r.id ?? r.reportId ?? r.report_id ?? `report-${idx}`;
                    return id === reportId;
                });
                if (matchingReport) {
                    return {
                        student_name: matchingReport.student_name ?? matchingReport.studentName ?? '',
                        assignment_title: matchingReport.assignment_title ?? matchingReport.assignmentTitle ?? matchingReport.assessment_title ?? ''
                    };
                }
            } catch (e) {
                console.error('Failed to parse cached reports:', e);
            }
        }
        return { student_name: '', assignment_title: '' };
    }, [reportId]);

    const reportInfo = getReportInfo();

    // Fetch report data using REPORT_GET webhook
    const { data: reportRaw, isLoading, error, trigger: refetchReport } = useWebhook<
        { student_name: string; assignment_title: string },
        FinalizedReport | FinalizedReport[]
    >({
        eventName: 'REPORT_GET',
        payload: reportInfo,
        cacheKey: `report-${reportId}`,
        cacheTtlMs: 300_000,
        fallbackToCacheOnError: true,
        suppressErrorToast: true,
    });

    // Extract single report from array response if needed
    const report = React.useMemo(() => {
        if (!reportRaw) return null;
        return Array.isArray(reportRaw) ? reportRaw[0] : reportRaw;
    }, [reportRaw]);

    // Re-fetch report when reportsList updates (to get fresh report info from cache)
    React.useEffect(() => {
        if (reportsList && reportInfo.student_name && reportInfo.assignment_title) {
            refetchReport();
        }
    }, [reportsList, reportId]);

    if (isLoading && !report) {
        return (
            <div>
                <PageHeader
                    title="Report"
                    description="Loading report details..."
                />
                <Card>
                    <CardContent className="p-6 space-y-4">
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!report) {
        return (
            <div>
                <PageHeader
                    title="Report"
                    description="Report not found"
                />
                <Card>
                    <CardContent className="p-6">
                        <p className="text-muted-foreground">Report not found or loading...</p>
                        <Button onClick={() => router.push('/teacher/reports')} className="mt-4">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Reports
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="sm" onClick={() => router.push('/teacher/reports')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
            </div>
            
            <PageHeader
                title={report.student_name ?? 'Unknown Student'}
                description={`Assignment: ${report.assignment_title ?? 'Untitled Assignment'}${report.created_at ? ` • Finalized ${new Date(report.created_at).toLocaleDateString()}` : ''}`}
            />

            <div className="space-y-6">
                {report.rubric_name && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Rubric</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-base">{report.rubric_name}</p>
                        </CardContent>
                    </Card>
                )}

                {report.rubric_grades && report.rubric_grades.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Rubric Grades</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className='rounded-md border'>
                                {report.rubric_grades.map((item, index) => (
                                    <div 
                                        key={item.criterionId} 
                                        className={`flex items-center justify-between p-3 text-sm ${index < report.rubric_grades!.length - 1 ? 'border-b' : ''}`}
                                    >
                                        <span className='font-medium'>{item.criterionName}</span>
                                        <Badge variant="secondary">
                                            {item.score}/{item.maxScore}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {report.teacher_feedback && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Teacher Feedback</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className='text-sm whitespace-pre-wrap'>{report.teacher_feedback}</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
