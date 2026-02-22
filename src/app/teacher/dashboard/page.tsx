
'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

import { PageHeader } from '@/components/page-header';
import { StatCard, StatCardSkeleton } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useWebhook } from '@/lib/hooks';
import type { DashboardKpis, ReviewQueueItem, DraftItem } from '@/lib/events';
import { normalizeAssessmentIdentifier } from '@/lib/utils';
import { FileEdit, FilePlus, PenSquare, FileText, AlertCircle, Users, ChevronRight } from 'lucide-react';

function DashboardLoadingSkeleton() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Review queue, drafts, and recent activity."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>To Review</CardTitle>
              <CardDescription>Assessments waiting for your feedback.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Updated</TableHead>
                    <TableHead><span className="sr-only">View</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-[100px]" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[100px] ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-4 ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Drafts In Progress</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[...Array(2)].map((_, i) => (
                 <div key={i} className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-4 w-[150px]" />
                        <Skeleton className="h-3 w-[100px] mt-2" />
                    </div>
                    <Skeleton className="h-4 w-4" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
            <CardContent className="grid gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <Alert variant="destructive" className="max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to Load Dashboard</AlertTitle>
            <AlertDescription>
                There was a problem fetching your dashboard data. Please try again.
                <div className="mt-4">
                    <Button variant="destructive" onClick={onRetry}>Retry</Button>
                </div>
            </AlertDescription>
        </Alert>
    );
}

export default function TeacherDashboard() {
  const router = useRouter();

  const { data: kpiData, isLoading: kpiLoading, error: kpiError, trigger: refetchKpis } = useWebhook<{ }, { kpis: DashboardKpis }>({
    eventName: 'GET_DASHBOARD_SUMMARY',
  });
  
  const { data: reviewQueueData, isLoading: reviewQueueLoading, error: reviewQueueError, trigger: refetchReviewQueue } = useWebhook<{ limit: number }, { items: ReviewQueueItem[] }>({
    eventName: 'GET_REVIEW_QUEUE',
    payload: { limit: 5 },
  });

  const { data: draftsData, isLoading: draftsLoading, error: draftsError, trigger: refetchDrafts } = useWebhook<{ limit: number }, { items: DraftItem[] }>({
    eventName: 'GET_DRAFTS',
    payload: { limit: 5 },
  });

  const handleReviewOpen = useCallback((_: any, payload?: { assessmentId: string }) => {
    const normalized = normalizeAssessmentIdentifier(payload?.assessmentId) ?? payload?.assessmentId;
    if (normalized) {
        router.push(`/teacher/assessments/${normalized}`);
    }
  }, [router]);

  const { trigger: openReview } = useWebhook<{ assessmentId: string }, {}>({
    eventName: 'REVIEW_OPEN',
    manual: true,
    onSuccess: handleReviewOpen,
    errorMessage: 'Action failed. Please try again.',
  });

  const handleDraftOpen = useCallback((_: any, payload?: { assessmentId: string }) => {
      const normalized = normalizeAssessmentIdentifier(payload?.assessmentId) ?? payload?.assessmentId;
      if (normalized) {
        router.push(`/teacher/assessments/${normalized}`);
      }
  }, [router]);

  const { trigger: openDraft } = useWebhook<{ assessmentId: string }, {}>({
    eventName: 'DRAFT_OPEN',
    manual: true,
    onSuccess: handleDraftOpen,
    errorMessage: 'Action failed. Please try again.',
  });

  const handleNewAssessmentStart = useCallback(() => {
    router.push(`/teacher/assessments/new`);
  }, [router]);

  const { trigger: startNewAssessment } = useWebhook<{}, {}>({
    eventName: 'NEW_ASSESSMENT_START',
    manual: true,
    onSuccess: handleNewAssessmentStart,
    errorMessage: 'Action failed. Please try again.',
  });


  const isLoading = kpiLoading || reviewQueueLoading || draftsLoading;
  const hasError = kpiError || reviewQueueError || draftsError;

  const handleRetry = () => {
    if (kpiError) refetchKpis();
    if (reviewQueueError) refetchReviewQueue();
    if (draftsError) refetchDrafts();
  };

  if (isLoading) {
    return <DashboardLoadingSkeleton />;
  }
  
  if (hasError) {
     return <ErrorState onRetry={handleRetry} />;
  }

  return (
    <div>
      <PageHeader 
        title="Dashboard"
        description="Review queue, drafts, and recent activity."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Pending Review" value={kpiData?.kpis.pendingReview ?? 0} icon={PenSquare} />
        <StatCard title="Drafts" value={kpiData?.kpis.drafts ?? 0} icon={FileEdit} />
        <StatCard title="Finalized This Week" value={kpiData?.kpis.finalizedThisWeek ?? 0} icon={Users} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
            <Card className="h-full">
            <CardHeader>
                <CardTitle>To Review</CardTitle>
                <CardDescription>
                These assessments are complete and waiting for your feedback.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {reviewQueueData?.items && reviewQueueData.items.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Assessment</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="hidden md:table-cell text-right">Updated</TableHead>
                                <TableHead><span className="sr-only">View</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reviewQueueData.items.map((item) => (
                            <TableRow
                              key={item.assessmentId}
                              onClick={() => openReview({ assessmentId: normalizeAssessmentIdentifier(item.assessmentId) ?? item.assessmentId })}
                              className="cursor-pointer"
                            >
                                <TableCell className="font-medium">{item.studentName}</TableCell>
                                <TableCell>{item.assessmentName}</TableCell>
                                <TableCell>
                                    <Badge variant={item.status === 'ai_draft_ready' ? 'default' : 'destructive'}>
                                        {item.status === 'ai_draft_ready' ? 'AI Draft Ready' : 'Needs Review'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-right text-muted-foreground">{formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true }).replace('about ', '')}</TableCell>
                                <TableCell className="text-right">
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-muted-foreground">Your review queue is empty. Great job!</p>
                        <Button onClick={() => startNewAssessment()} className="mt-4">
                            <FilePlus className="mr-2 h-4 w-4" />
                            Start a New Assessment
                        </Button>
                    </div>
                )}
            </CardContent>
            </Card>
        </div>

        <div className="space-y-6">
          <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button onClick={() => startNewAssessment()}>
              <FilePlus className="mr-2 h-4 w-4" /> New Assessment
            </Button>
              <Button asChild variant="secondary">
              <Link href="/teacher/assessments"><FileText className="mr-2 h-4 w-4" /> View Assessments</Link>
              </Button>
          </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
