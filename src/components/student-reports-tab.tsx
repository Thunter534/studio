'use client';

import { useMemo } from 'react';
import { useWebhook } from "@/lib/hooks";
import { type StudentReportListItem } from "@/lib/events";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "./ui/button";


function ReportsTableSkeleton() {
    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Report Name</TableHead>
                            <TableHead>Generated Date</TableHead>
                            <TableHead className="text-right w-[50px]"><span className="sr-only">View</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(2)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-5 w-5" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to Load Reports</AlertTitle>
            <AlertDescription>
                There was a problem fetching this student's reports.
                <div className="mt-4">
                    <Button variant="destructive" onClick={onRetry}>Retry</Button>
                </div>
            </AlertDescription>
        </Alert>
    );
}

function formatGeneratedDate(value: string): string {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) {
        return 'N/A';
    }

    const numericValue = Number(trimmed);
    if (Number.isFinite(numericValue) && trimmed.length >= 10) {
        const dateFromTimestamp = new Date(trimmed.length === 13 ? numericValue : numericValue * 1000);
        if (!Number.isNaN(dateFromTimestamp.getTime())) {
            return format(dateFromTimestamp, 'dd MMM yyyy');
        }
    }

    const parsedDate = new Date(trimmed);
    if (!Number.isNaN(parsedDate.getTime())) {
        return format(parsedDate, 'dd MMM yyyy');
    }

    return 'N/A';
}


export function StudentReportsTab({ studentId, studentName }: { studentId: string; studentName?: string }) {
    const router = useRouter();

    const normalizedStudentName = String(studentName ?? '').trim();

    const { data, isLoading, error, trigger: refetch } = useWebhook<{
        studentName: string;
        student_name: string;
        studentId: string;
        student_id: string;
    }, any>({
        eventName: 'STUDENT_REPORTS_LIST',
        payload: {
            studentName: normalizedStudentName,
            student_name: normalizedStudentName,
            studentId,
            student_id: studentId,
        },
        allowRawResponse: true,
        suppressErrorToast: true,
        manual: !normalizedStudentName,
    });

    const reports = useMemo(() => {
        if (!data) {
            return [] as StudentReportListItem[];
        }

        const rawItems = Array.isArray(data)
            ? data
            : data?.data?.reports
                ?? data?.data?.items
                ?? data?.reports
                ?? data?.items
                ?? [];

        return (rawItems as any[])
            .map((report: any, index: number) => {
                const statusValue = String(report?.status ?? 'Final').toLowerCase();
                const status: StudentReportListItem['status'] = (
                    statusValue === 'draft' || statusValue === 'queued' || statusValue === 'generating'
                        ? 'Draft'
                        : 'Final'
                );

                const explicitId = report?.id ?? report?.reportId ?? report?.report_id;
                const generatedDate = String(
                    report?.timestamp
                    ?? report?.generatedDate
                    ?? report?.generated_at
                    ?? report?.generatedAt
                    ?? report?.created_at
                    ?? new Date().toISOString()
                );
                const fallbackId = `derived:${report?.student_name ?? report?.studentName ?? studentName ?? studentId}:${report?.assignment_title ?? report?.assignmentTitle ?? index}:${index}`;

                return {
                    id: String(explicitId ?? fallbackId),
                    name: String(report?.name ?? report?.assignment_title ?? report?.assignmentTitle ?? report?.periodLabel ?? 'Student Report'),
                    generatedDate,
                    status,
                } satisfies StudentReportListItem;
            });
    }, [data]);

    const handleRowClick = (reportId: string) => {
        if (reportId.startsWith('derived:')) {
            return;
        }
        router.push(`/teacher/reports?reportId=${encodeURIComponent(reportId)}`);
    };

    if (isLoading) {
        return <ReportsTableSkeleton />;
    }

    if (error && reports.length > 0) {
        return <ErrorState onRetry={() => refetch({
            studentName: normalizedStudentName,
            student_name: normalizedStudentName,
            studentId,
            student_id: studentId,
        })} />;
    }

    if (!reports || reports.length === 0) {
        return (
            <div className="text-center py-16 border-dashed border-2 rounded-lg mt-2">
                <h3 className="text-xl font-semibold">No reports generated</h3>
                <p className="text-muted-foreground mt-2 mb-4">Generated reports for this student will appear here.</p>
            </div>
        );
    }

    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Report Name</TableHead>
                            <TableHead>Generated Date</TableHead>
                            <TableHead className="text-right w-[50px]"><span className="sr-only">View</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reports.map((report) => (
                            <TableRow
                                key={report.id}
                                className={`group hover:bg-secondary/50 transition-colors ${report.id.startsWith('derived:') ? 'cursor-default' : 'cursor-pointer'}`}
                                onClick={() => handleRowClick(report.id)}
                            >
                                <TableCell className="font-medium">{report.name}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {formatGeneratedDate(report.generatedDate)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <span className={`text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest ${report.id.startsWith('derived:') ? 'text-muted-foreground' : 'text-primary'}`}>
                                            View Report
                                        </span>
                                        <ChevronRight className={`h-4 w-4 transition-all ${report.id.startsWith('derived:') ? 'text-muted-foreground/70 group-hover:translate-x-1' : 'text-muted-foreground group-hover:text-primary group-hover:translate-x-1'}`} />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
