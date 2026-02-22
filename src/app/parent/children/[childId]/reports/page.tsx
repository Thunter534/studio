'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWebhook } from "@/lib/hooks";
import type { ParentReportsListResponse, ParentReportsListPayload } from "@/lib/events";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Download, ChevronRight, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

function ReportsSkeleton() {
    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Period</TableHead>
                            <TableHead>Generated</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(3)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-9 w-20" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export default function ChildReportsPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const childId = params.childId as string;

    const { data, isLoading, error, trigger } = useWebhook<ParentReportsListPayload, ParentReportsListResponse>({
        eventName: 'PARENT_REPORTS_LIST',
        payload: { childId }
    });

    const { trigger: downloadPdf, isLoading: isDownloading } = useWebhook<{ reportId: string }, { fileContent: string }>({
        eventName: 'REPORT_DOWNLOAD_PDF',
        manual: true,
        onSuccess: (data, payload) => {
            console.log(`Downloading PDF for report ${payload?.reportId}`);
            toast({ title: "PDF download started." });
        },
        errorMessage: "Failed to download PDF."
    });

    if (isLoading) {
        return (
            <div>
                 <div className="mb-4">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/parent/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
                    </Button>
                </div>
                <PageHeader title="Reports" description="Loading reports..." />
                <ReportsSkeleton />
            </div>
        );
    }
    
    if (error) {
        return (
            <div>
                <div className="mb-4">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/parent/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
                    </Button>
                </div>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        Could not load reports. Please try again.
                         <div className="mt-4">
                              <Button variant="destructive" onClick={() => trigger()}>Retry</Button>
                          </div>
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    return (
        <div>
            <div className="mb-4">
                <Button asChild variant="outline" size="sm">
                    <Link href="/parent/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
                </Button>
            </div>
             <PageHeader
                title={`Reports for ${data?.studentName || 'your child'}`}
                description="Here are the progress reports available for viewing."
            />
            {data?.items && data.items.length > 0 ? (
                <Card>
                    <CardContent className="p-0">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Period</TableHead>
                                    <TableHead>Generated On</TableHead>
                                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.items.map((report) => (
                                    <TableRow key={report.reportId} className="group">
                                        <TableCell className="font-medium">{report.periodLabel}</TableCell>
                                        <TableCell>{format(new Date(report.generatedAt), 'dd MMM yyyy, p')}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {report.hasPdf && (
                                                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); downloadPdf({ reportId: report.reportId })}} disabled={isDownloading}>
                                                        <Download className="mr-2 h-4 w-4" /> PDF
                                                    </Button>
                                                )}
                                                <Button variant="secondary" size="sm" asChild>
                                                    <Link href={`/parent/reports/${report.reportId}`}>
                                                        View <ChevronRight className="ml-2 h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="p-10 text-center">
                        <p className="text-muted-foreground">No reports are available for this child at this time.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
