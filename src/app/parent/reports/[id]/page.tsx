'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import Link from "next/link";
import { useWebhook } from "@/lib/hooks";
import type { ParentReportGetResponse } from "@/lib/events";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";


function ReportSkeleton() {
    return (
        <div className="space-y-8">
            <div>
                <Skeleton className="h-7 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
            </div>
            <div className="space-y-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
            </div>
             <div className="space-y-3">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
            </div>
        </div>
    )
}

const trendIcons = {
    up: <ArrowUp className="h-4 w-4 text-green-600" />,
    down: <ArrowDown className="h-4 w-4 text-destructive" />,
    stable: <ArrowRight className="h-4 w-4 text-muted-foreground" />,
}


export default function ParentReportPage() {
    const params = useParams();
    const reportId = params.id as string;
    const { toast } = useToast();

    const { data, isLoading, error } = useWebhook<{ reportId: string }, ParentReportGetResponse>({
        eventName: 'PARENT_REPORT_GET',
        payload: { reportId }
    });

    const { trigger: downloadPdf, isLoading: isDownloading } = useWebhook<{ reportId: string }, { fileContent: string }>({
        eventName: 'REPORT_DOWNLOAD_PDF',
        manual: true,
        onSuccess: (data, payload) => {
            console.log(`Downloading PDF for report ${payload?.reportId}`);
            toast({ title: "PDF download started."});
        },
        errorMessage: "Failed to download PDF."
    });

    const report = data?.report;

  return (
    <div>
        <div className="mb-4">
            <Button asChild variant="outline" size="sm">
                <Link href="/parent/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
            </Button>
        </div>

        {isLoading && <ReportSkeleton />}
        {error && <p className="text-destructive">Failed to load report.</p>}

        {report && (
             <>
                <PageHeader
                    title={`Report for ${report.childName}`}
                    description={`${report.periodLabel} • Generated ${new Date(report.generatedAt).toLocaleDateString()}`}
                    actions={
                        report.hasPdf ? (
                            <Button variant="secondary" onClick={() => downloadPdf({ reportId })} disabled={isDownloading}>
                                <Download className="mr-2 h-4 w-4" />
                                Download PDF
                            </Button>
                        ) : null
                    }
                />
                <div className='grid gap-6 md:grid-cols-3'>
                    <div className='md:col-span-2 space-y-6'>
                         <Card>
                            <CardHeader><CardTitle>AI-Generated Summary</CardTitle></CardHeader>
                            <CardContent><p className='text-sm text-muted-foreground'>{report.sections.summary}</p></CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Teacher&apos;s Final Comment</CardTitle></CardHeader>
                            <CardContent>
                                <p className='text-sm text-muted-foreground italic border-l-2 pl-4'>&quot;{report.sections.teacherFinalComment}&quot;</p>
                            </CardContent>
                        </Card>
                    </div>
                     <div className='md:col-span-1 space-y-6'>
                        <Card>
                            <CardHeader><CardTitle>Strengths</CardTitle></CardHeader>
                            <CardContent>
                                <ul className='list-disc list-inside space-y-1 text-sm text-muted-foreground'>
                                    {report.sections.strengths.map((s,i) => <li key={i}>{s}</li>)}
                                </ul>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Growth Areas</CardTitle></CardHeader>
                            <CardContent>
                                <ul className='list-disc list-inside space-y-1 text-sm text-muted-foreground'>
                                    {report.sections.growthAreas.map((g,i) => <li key={i}>{g}</li>)}
                                </ul>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader><CardTitle>Rubric Snapshot</CardTitle></CardHeader>
                            <CardContent>
                                <div className='rounded-md border'>
                                    {report.sections.rubricSnapshot.map((item, index) => (
                                        <div key={index} className={`flex items-center justify-between p-3 text-sm ${index < report.sections.rubricSnapshot.length -1 ? 'border-b' : ''}`}>
                                            <span className='font-medium'>{item.criterion}</span>
                                            <div className='flex items-center gap-2'>
                                                <span>{trendIcons[item.trend]}</span>
                                                <Badge variant="secondary">Avg. {item.averageScore.toFixed(1)}</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </>
        )}
    </div>
  );
}
