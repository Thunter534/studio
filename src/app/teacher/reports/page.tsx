'use client';

import React from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, FileText } from "lucide-react";
import { useWebhook } from "@/lib/hooks";
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';

function ReportsPageSkeleton() {
    return (
        <div>
            <PageHeader
                title="Reports"
                description="View finalized assessment reports."
            />
            <Card>
                <CardHeader>
                    <CardTitle>Finalized Reports</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Assignment</TableHead>
                                <TableHead>Rubric</TableHead>
                                <TableHead>Finalized On</TableHead>
                                <TableHead className="w-[100px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-9 w-20" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}

function EmptyState() {
    return (
        <div className="text-center py-16 border-dashed border-2 rounded-lg">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold">No reports yet</h3>
            <p className="text-muted-foreground mt-2 mb-4">Finalized assessments will appear here.</p>
        </div>
    )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <Alert variant="destructive" className="mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to Load Reports</AlertTitle>
            <AlertDescription>
                There was an issue fetching the report history. Please try again.
                <div className="mt-4">
                    <Button variant="destructive" onClick={onRetry}>Retry</Button>
                </div>
            </AlertDescription>
        </Alert>
    );
}

export default function ReportsPage() {
    const router = useRouter();

    const { data, isLoading, error, trigger: refetch } = useWebhook<{}, any>({
        eventName: 'REPORTS_LIST',
        payload: {},
        cacheKey: 'reports-list',
        cacheTtlMs: 300_000,
        fallbackToCacheOnError: true,
        suppressErrorToast: true,
    });

    const reports = Array.isArray(data) ? data : (data?.reports ?? data?.items ?? []);

    if (isLoading && !data) {
        return <ReportsPageSkeleton />;
    }

    if (error && !data) {
        return (
            <div>
                 <PageHeader
                    title="Reports"
                    description="View finalized assessment reports."
                />
                <ErrorState onRetry={refetch} />
            </div>
        )
    }

    return (
        <div>
            <PageHeader
                title="Reports"
                description="View finalized assessment reports."
            />
            
            {reports && reports.length > 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Finalized Reports</CardTitle>
                        <CardDescription>Assessment reports that have been finalized.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Assignment</TableHead>
                                    <TableHead>Rubric</TableHead>
                                    <TableHead>Finalized On</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reports.map((report: any, index: number) => {
                                    const reportId = report.id ?? report.reportId ?? report.report_id ?? `report-${index}`;
                                    const studentName = report.student_name ?? report.studentName ?? 'Unknown';
                                    const assignmentTitle = report.assignment_title ?? report.assignmentTitle ?? report.assessment_title ?? 'Untitled';
                                    const rubricName = report.rubric_name ?? report.rubricName ?? '-';
                                    const createdAt = report.created_at ?? report.createdAt ?? report.finalized_at ?? report.finalizedAt ?? new Date().toISOString();
                                    
                                    if (!reportId || reportId === 'undefined') {
                                        console.error('Invalid reportId for report:', report);
                                        return null;
                                    }
                                    
                                    return (
                                        <TableRow key={reportId} className="cursor-pointer hover:bg-muted/50" onClick={() => {
                                            router.push(`/teacher/reports/${reportId}`);
                                        }}>
                                            <TableCell className="font-medium">{studentName}</TableCell>
                                            <TableCell className="text-muted-foreground">{assignmentTitle}</TableCell>
                                            <TableCell className="text-muted-foreground">{rubricName}</TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {format(new Date(createdAt), 'dd MMM yyyy, p')}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : (
                <EmptyState />
            )}
        </div>
    );
}
