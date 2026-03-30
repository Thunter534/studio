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
import { useWebhook } from '@/lib/hooks';
import type { AssessmentListItem, AssessmentListPayload, AssessmentListResponse, AssessmentStatus, RubricListItem } from '@/lib/events';
import { AlertCircle, ChevronRight, FilePlus, Search, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { OnboardingTour } from '@/components/onboarding-tour';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

function AssessmentsPageSkeleton() {
  return (
    <div className="w-full">
      <PageHeader
        title="Assessments"
        description="Search, filter, and open assessments for review."
        actions={<Skeleton className="h-11 w-40" />}
      />
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
                <TableHead>Notes</TableHead>
                <TableHead className="w-12"><span className="sr-only">View</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
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

const DELETE_ASSIGNMENT_WEBHOOK_URL = 'https://n8n.srv1336679.hstgr.cloud/webhook/ded55702-b005-431b-a943-a362583ce040';

const resolveRubricName = (rubricName?: string, globalRubricName?: string): string => {
  if (rubricName) {
    return rubricName;
  }
  if (globalRubricName) {
    return globalRubricName;
  }
  return 'No global rubric configured';
};

function normalizeAssessmentList(
  data: AssessmentListResponse | RawAssignmentItem[] | null,
  filters: Omit<AssessmentListPayload, 'pageSize'>,
  pageSize: number,
  globalRubricName?: string,
): AssessmentListResponse {
  if (!data || Array.isArray(data)) {
    const itemsArray = Array.isArray(data) ? data : [];
    
    // Explicitly enforce client-side slicing for array-only responses
    const currentPage = filters.page ?? 1;
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedArray = itemsArray.slice(startIndex, startIndex + pageSize);

    const items: AssessmentListItem[] = paginatedArray.map((item, index) => {
      const resolvedRubricName = item.rubricName || (item as any).rubricId || (item as any).rubric_id;

      return {
        assessmentId: item.id || item.title || `assignment-${startIndex + index + 1}`,
        title: item.title || 'Untitled Assignment',
        student: { id: 'all', name: 'All Students' },
        rubric: {
          name: resolveRubricName(resolvedRubricName, globalRubricName),
        },
        status: 'draft' as AssessmentStatus,
        updatedAt: new Date().toISOString(),
        notes: item.notes ?? undefined,
      };
    });

    return {
      items,
      counts: {
        needsReview: 0,
        drafts: itemsArray.length,
        finalizedThisWeek: 0,
      },
      pagination: {
        page: currentPage,
        pageSize,
        total: itemsArray.length,
      },
    };
  }

  return data;
}


export default function AssessmentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [filters, setFilters] = useState<Omit<AssessmentListPayload, 'pageSize'>>({ status: 'all', search: '', page: 1 });
  const [displaySearch, setDisplaySearch] = useState('');
  const pageSize = 10;

  const [rubricItems, setRubricItems] = useState<RubricListItem[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [assessmentPendingDelete, setAssessmentPendingDelete] = useState<AssessmentListItem | null>(null);
  const [deleteDialogStep, setDeleteDialogStep] = useState<'list' | 'confirm'>('list');
  const [isDeletingAssignment, setIsDeletingAssignment] = useState(false);
  const [deletedAssessmentIds, setDeletedAssessmentIds] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: displaySearch, page: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [displaySearch]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const rawValue = window.sessionStorage.getItem('rubrics:list');
    if (!rawValue) return;
    try {
      const cached = JSON.parse(rawValue);
      const cachedData = Array.isArray(cached?.data)
        ? cached.data
        : cached?.data?.rubrics ?? [];
      setRubricItems(cachedData);
    } catch (error) {
      window.sessionStorage.removeItem('rubrics:list');
    }
  }, []);


  const globalRubricName = useMemo(() => rubricItems[0]?.name, [rubricItems]);

  const { data, isLoading, error, trigger: refetch } = useWebhook<AssessmentListPayload, AssessmentListResponse | RawAssignmentItem[]>({
    eventName: 'ASSESSMENT_LIST',
    payload: { ...filters, pageSize },
    allowRawResponse: true,
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplaySearch(e.target.value);
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleRowClick = (assessmentId: string) => {
    router.push(`/teacher/assessments/${assessmentId}/select-student`);
  };

  const normalizedData = useMemo(() => {
    // If backend handles search/page, we just normalize. 
    // Helper handles both flat lists and paged responses.
    return normalizeAssessmentList(data ?? null, filters, pageSize, globalRubricName);
  }, [data, filters, pageSize, globalRubricName]);

  const items = normalizedData.items.filter((item) => !deletedAssessmentIds.includes(item.assessmentId));
  const pagination = normalizedData.pagination;

  const pageNumber = pagination?.page ?? 1;
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1;

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (pageNumber > 3) pages.push('ellipsis');
      
      const start = Math.max(2, pageNumber - 1);
      const end = Math.min(totalPages - 1, pageNumber + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (pageNumber < totalPages - 2) pages.push('ellipsis');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  const handleOpenDeleteConfirmation = (item: AssessmentListItem) => {
    setAssessmentPendingDelete(item);
    setDeleteDialogStep('confirm');
  };

  const handleDeleteAssignment = useCallback(async () => {
    if (!assessmentPendingDelete?.title) {
      return;
    }

    const assignmentName = assessmentPendingDelete.title;
    const assignmentId = assessmentPendingDelete.assessmentId;

    setIsDeleteDialogOpen(false);
    setDeleteDialogStep('list');
    setIsDeletingAssignment(true);

    try {
      const response = await fetch(DELETE_ASSIGNMENT_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assessment_name: assignmentName,
          assessmentName: assignmentName,
          name: assignmentName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Delete webhook failed with status ${response.status}`);
      }

      setDeletedAssessmentIds((previous) => [...previous, assignmentId]);
      toast({
        title: 'Assignment deleted',
        description: `Deleted ${assignmentName}.`,
      });
      refetch();
    } catch (deleteError) {
      console.error('[Assessments] Failed to delete assignment:', deleteError);
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: 'Could not delete this assignment. Please try again.',
      });
    } finally {
      setIsDeletingAssignment(false);
      setAssessmentPendingDelete(null);
    }
  }, [assessmentPendingDelete, toast, refetch]);

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

  const showingStart = (pageNumber - 1) * pageSize + 1;
  const showingEnd = Math.min(pageNumber * pageSize, pagination?.total ?? 0);

  return (
    <div className="w-full space-y-6">
      <OnboardingTour />
      <PageHeader
        title="Assignments"
        description="Select an assignment and choose which student's work to grade. All assignments use one shared rubric."
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl h-11 px-6 font-bold"
              onClick={() => {
                setDeleteDialogStep('list');
                setAssessmentPendingDelete(null);
                setIsDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete Assignments
            </Button>
            <Button id="onboarding-new-assessment" asChild className="rounded-xl h-11 px-6 bg-primary hover:opacity-90 font-bold shadow-md shadow-primary/20">
              <Link href="/teacher/assessments/new"><FilePlus className="mr-2 h-4 w-4 stroke-[3]" /> New Assignment</Link>
            </Button>
          </div>
        }
      />
      
      <Card id="onboarding-assessment-list" className="border-border shadow-sm overflow-hidden rounded-[2rem] bg-card">
        <CardHeader className="bg-card pb-6 px-8 pt-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                 <div className="relative w-full max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Search assignments..."
                        className="w-full rounded-2xl bg-secondary/50 border-none focus:ring-2 focus:ring-primary/20 pl-12 h-12 text-base transition-all placeholder:text-muted-foreground font-medium"
                        value={displaySearch}
                        onChange={handleSearchChange}
                    />
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-0">
            {items.length > 0 ? (
                <Table>
                    <TableHeader className="bg-secondary/30">
                    <TableRow className="hover:bg-transparent border-b border-border">
                        <TableHead className="font-bold text-foreground h-14 pl-8 uppercase tracking-widest text-[10px]">Assignment</TableHead>
                        <TableHead className="font-bold text-foreground h-14 uppercase tracking-widest text-[10px]">Notes</TableHead>
                        <TableHead className="text-right w-12 pr-8 h-14"><span className="sr-only">View</span></TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {items.map((item) => (
                        <TableRow key={item.assessmentId} onClick={() => handleRowClick(item.assessmentId)} className="group cursor-pointer hover:bg-secondary/50 transition-colors border-b border-border last:border-0">
                        <TableCell className="font-bold text-foreground py-4.5 pl-8 text-sm">{item.title}</TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-xs truncate py-4.5">{item.notes || '-'}</TableCell>
                        <TableCell className="text-right py-4.5 pr-8">
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            ) : (
                <EmptyState />
            )}
        </CardContent>
      </Card>

      {/* Replicated Luxury Pagination Pill */}
      {pagination && pagination.total > 0 && (
        <div className="flex justify-center mt-4">
          <div className="flex items-center bg-white dark:bg-slate-900 border border-border shadow-[0_15px_40px_rgba(0,0,0,0.12)] rounded-full p-1.5 px-6 w-fit min-w-[480px]">
            <Pagination className="mx-0 w-auto">
              <PaginationContent className="gap-2">
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => pageNumber > 1 && handlePageChange(pageNumber - 1)}
                    disabled={pageNumber <= 1}
                    className={cn(
                      "text-foreground hover:bg-secondary/50 h-9 px-4 transition-colors",
                      pageNumber <= 1 && "pointer-events-none opacity-30"
                    )}
                  />
                </PaginationItem>
                
                <div className="flex items-center gap-1 mx-4">
                  {getPageNumbers().map((page, idx) => (
                    <PaginationItem key={idx}>
                      {page === 'ellipsis' ? (
                        <PaginationEllipsis className="text-muted-foreground" />
                      ) : (
                        <PaginationLink 
                          isActive={page === pageNumber}
                          onClick={() => handlePageChange(page as number)}
                          className={cn(
                            "h-9 w-9 font-bold transition-all",
                            page === pageNumber 
                              ? "bg-primary text-white shadow-md shadow-primary/30" 
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                          )}
                        >
                          {page}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                </div>

                <PaginationItem>
                  <PaginationNext 
                    onClick={() => pageNumber < totalPages && handlePageChange(pageNumber + 1)}
                    disabled={pageNumber >= totalPages}
                    className={cn(
                      "text-foreground hover:bg-secondary/50 h-9 px-4 transition-colors",
                      pageNumber >= totalPages && "pointer-events-none opacity-30"
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>

            <div className="flex items-center gap-4 ml-6 pl-6 border-l border-border h-6">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                Showing <span className="text-foreground">{showingStart}-{showingEnd}</span> of <span className="text-foreground">{pagination.total}</span> results
              </span>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open && !isDeletingAssignment) {
            setDeleteDialogStep('list');
            setAssessmentPendingDelete(null);
          }
        }}
      >
        <DialogContent className="max-w-xl rounded-2xl">
          {deleteDialogStep === 'list' ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold">Delete Assignments</DialogTitle>
                <DialogDescription>Select an assignment to delete from the database.</DialogDescription>
              </DialogHeader>
              <div className="max-h-[420px] overflow-y-auto border rounded-xl">
                {items.length > 0 ? (
                  <div className="divide-y divide-border">
                    {items.map((item) => (
                      <button
                        key={`delete-${item.assessmentId}`}
                        type="button"
                        onClick={() => handleOpenDeleteConfirmation(item)}
                        className="w-full px-4 py-3 text-left hover:bg-secondary/50 transition-colors"
                      >
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{item.notes || 'No notes'}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">No assignments available to delete.</div>
                )}
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold">Delete this assignment?</DialogTitle>
                <DialogDescription>
                  This will delete {assessmentPendingDelete?.title || 'this assignment'} from the database. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={isDeletingAssignment}
                  onClick={() => {
                    setDeleteDialogStep('list');
                    setAssessmentPendingDelete(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={isDeletingAssignment}
                  onClick={() => {
                    if (!isDeletingAssignment) {
                      handleDeleteAssignment();
                    }
                  }}
                >
                  {isDeletingAssignment ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}