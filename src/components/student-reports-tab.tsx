'use client';

import { useWebhook } from "@/lib/hooks";
import { type StudentReportListItem } from "@/lib/events";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from 'date-fns';
import { Badge } from "@/components/ui/badge";
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
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right w-[50px]"><span className="sr-only">View</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(2)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
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


export function StudentReportsTab({ studentId }: { studentId: string }) {
    const router = useRouter();
    const { data, isLoading, error, trigger: refetch } = useWebhook<{ studentId: string }, { reports: StudentReportListItem[] }>({
        eventName: 'STUDENT_REPORTS_LIST',
        payload: { studentId }
    });

    const getStatusVariant = (status: string) => {
        return status === 'Final' ? 'outline' : 'secondary';
    };

    const handleRowClick = (reportId: string) => {
        router.push(`/teacher/reports?reportId=${encodeURIComponent(reportId)}`);
    };

    if (isLoading) {
        return <ReportsTableSkeleton />;
    }

    if (error) {
        return <ErrorState onRetry={refetch} />;
    }

    if (!data || data.reports.length === 0) {
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
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right w-[50px]"><span className="sr-only">View</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.reports.map((report) => (
                            <TableRow
                                key={report.id}
                                className="cursor-pointer"
                                onClick={() => handleRowClick(report.id)}
                            >
                                <TableCell className="font-medium">{report.name}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {format(parseISO(report.generatedDate), 'dd MMM yyyy')}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={getStatusVariant(report.status)}>{report.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <ChevronRight className="h-4 w-4 text-muted-foreground inline-block opacity-50 group-hover:opacity-100 transition-opacity" />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
