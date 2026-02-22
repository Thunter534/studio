
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, parseISO } from 'date-fns';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWebhook } from '@/lib/hooks';
import type { AssessmentListItem, AssessmentListPayload, AssessmentListResponse, AssessmentStatus, RubricListItem } from '@/lib/events';
import { AlertCircle, ChevronRight, FilePlus, Search } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const statusMap: Record<AssessmentStatus, string> = {
  draft: 'Draft',
  ai_draft_ready: 'AI Draft Ready',
  needs_review: 'Needs Review',
  finalized: 'Finalized',
};

const statusPillVariants: Record<AssessmentStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    draft: 'secondary',
    ai_draft_ready: 'default',
    needs_review: 'destructive',
    finalized: 'outline',
};

function AssessmentsPageSkeleton() {
  return (
    <div className="w-full">
      <PageHeader
        title="Assessments"
        description="Search, filter, and open assessments for review."
        actions={<Skeleton className="h-11 w-40" />}
      />
      <div className="mb-4 flex gap-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-40" />
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-10 w-full sm:w-64" />
            <Skeleton className="h-10 w-full sm:w-[400px]" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assessment</TableHead>
                <TableHead>Rubric</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-12"><span className="sr-only">View</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState() {
    return (
        <div className="text-center py-16 border-dashed border-2 rounded-lg mt-8">
            <h3 className="text-xl font-semibold">No assessments found</h3>
            <p className="text-muted-foreground mt-2 mb-4">Try adjusting your filters or create a new assessment.</p>
            <Button asChild>
                <Link href="/teacher/assessments/new">
                    <FilePlus className="mr-2 h-4 w-4" />
                    Create New Assessment
                </Link>
            </Button>
        </div>
    )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant="destructive" className="mt-8">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Failed to Load Assessments</AlertTitle>
      <AlertDescription>
        There was an issue fetching the assessment list. Please try again.
        <div className="mt-4">
          <Button variant="destructive" onClick={onRetry}>Retry</Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

type RawAssignmentItem = {
  id?: string;
  title?: string;
  rubricName?: string;
  notes?: string | null;
};

const resolveRubricName = (rubricName?: string): string => {
  if (rubricName) {
    return rubricName;
  }
  return 'Unknown Rubric';
};

function normalizeAssessmentList(
  data: AssessmentListResponse | RawAssignmentItem[] | null,
  filters: Omit<AssessmentListPayload, 'pageSize'>,
  pageSize: number
): AssessmentListResponse {
  if (!data || Array.isArray(data)) {
    const itemsArray = Array.isArray(data) ? data : [];
    const items: AssessmentListItem[] = itemsArray.map((item, index) => {
      const resolvedRubricName = item.rubricName || (item as { rubricId?: string; rubric_id?: string }).rubricId || (item as { rubric_id?: string }).rubric_id;

      return {
      assessmentId: item.id || item.title || `assignment-${index + 1}`,
      title: item.title || 'Untitled Assignment',
      student: { id: 'all', name: 'All Students' },
      rubric: {
        name: resolveRubricName(resolvedRubricName),
      },
      status: 'draft',
      updatedAt: new Date().toISOString(),
      notes: item.notes ?? undefined,
      };
    });

    return {
      items,
      counts: {
        needsReview: 0,
        drafts: items.length,
        finalizedThisWeek: 0,
      },
      pagination: {
        page: filters.page ?? 1,
        pageSize,
        total: items.length,
      },
    };
  }

  return data;
}


export default function AssessmentsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<Omit<AssessmentListPayload, 'pageSize'>>({ status: 'all', search: '', page: 1 });
  const pageSize = 10;

  const [rubricItems, setRubricItems] = useState<RubricListItem[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const rawValue = window.sessionStorage.getItem('rubrics:list');
    if (!rawValue) {
      return;
    }
    try {
      const cached = JSON.parse(rawValue) as { timestamp?: number; data?: RubricListItem[] | { rubrics: RubricListItem[] } };
      const cachedData = Array.isArray(cached?.data)
        ? cached.data
        : cached?.data?.rubrics ?? [];
      setRubricItems(cachedData);
    } catch (error) {
      window.sessionStorage.removeItem('rubrics:list');
    }
  }, []);


  const rubricMap = useMemo(() => {
    return new Map(rubricItems.map(rubric => [rubric.name, rubric.name]));
  }, [rubricItems]);

  const { data, isLoading, error, trigger: refetch } = useWebhook<AssessmentListPayload, AssessmentListResponse | RawAssignmentItem[]>({
    eventName: 'ASSESSMENT_LIST',
    payload: { ...filters, pageSize },
    allowRawResponse: true,
  });

  const handleStatusChange = (status: string) => {
    setFilters(prev => ({ ...prev, status: status as AssessmentStatus, page: 1 }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }));
  };

  const handlePageChange = (direction: 'next' | 'prev') => {
    setFilters(prev => ({
        ...prev,
        page: direction === 'next' ? (prev.page ?? 1) + 1 : (prev.page ?? 1) - 1,
    }));
  };

  const handleRowClick = (assessmentId: string) => {
    router.push(`/teacher/assessments/${assessmentId}/select-student`);
  };

  const normalizedData = useMemo(
    () => normalizeAssessmentList(data ?? null, filters, pageSize),
    [data, filters, pageSize, rubricMap]
  );

  const counts = normalizedData.counts;
  const items = normalizedData.items;
  const pagination = normalizedData.pagination;

  const pageNumber = pagination?.page ?? 1;
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1;

  if (isLoading && !data) {
    return <AssessmentsPageSkeleton />;
  }

  if (error && !data) {
    return (
      <div className="w-full">
         <PageHeader
            title="Assessments"
            description="Search, filter, and open assessments for review."
            actions={
              <Button asChild>
                <Link href="/teacher/assessments/new"><FilePlus className="mr-2 h-4 w-4" /> New Assessment</Link>
              </Button>
            }
          />
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Assignments"
        description="Select an assignment and choose which student's work to grade."
        actions={
          <Button asChild>
            <Link href="/teacher/assessments/new"><FilePlus className="mr-2 h-4 w-4" /> New Assignment</Link>
          </Button>
        }
      />
      
      <Card>
        <CardHeader>
            {/* Filter Bar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                 <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search assignment..."
                        className="w-full rounded-lg bg-background pl-8"
                        value={filters.search}
                        onChange={handleSearchChange}
                        disabled={isLoading}
                    />
                </div>
            </div>
        </CardHeader>
        <CardContent>
            {items.length > 0 ? (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Assignment</TableHead>
                        <TableHead>Rubric</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="w-12"><span className="sr-only">View</span></TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {items.map((item) => (
                        <TableRow key={item.assessmentId} onClick={() => handleRowClick(item.assessmentId)} className="cursor-pointer">
                        <TableCell className="font-medium">{item.title}</TableCell>
                        <TableCell className="text-muted-foreground">{item.rubric.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{item.notes || '-'}</TableCell>
                        <TableCell>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            ) : (
                <EmptyState />
            )}
        </CardContent>
        {pagination && pagination.total > pagination.pageSize && (
            <div className="flex items-center justify-end gap-2 border-t p-4">
                <span className="text-sm text-muted-foreground">
                    Page {pageNumber} of {totalPages}
                </span>
                <Button variant="outline" size="sm" onClick={() => handlePageChange('prev')} disabled={pageNumber <= 1}>
                    Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => handlePageChange('next')} disabled={pageNumber >= totalPages}>
                    Next
                </Button>
            </div>
        )}
      </Card>
    </div>
  );
}
