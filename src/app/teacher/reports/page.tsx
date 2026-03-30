'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, FileText, ChevronRight, Search } from "lucide-react";
import { useWebhook } from "@/lib/hooks";
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { OnboardingTour } from '@/components/onboarding-tour';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

function ReportsPageSkeleton() {
    return (
        <div className="w-full space-y-6">
            <PageHeader
                title="Academic Reports"
                description="Browse all finalized student performance records."
                hideBack
            />
            <Card className="border-border bg-card shadow-sm overflow-hidden rounded-[2rem]">
                <CardHeader className="bg-card pb-6 px-8 pt-6">
                    <Skeleton className="h-12 w-full max-w-sm rounded-xl" />
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-secondary/30">
                            <TableRow className="hover:bg-transparent border-b border-border">
                                <TableHead className="h-14 pl-8"><Skeleton className="h-3 w-20" /></TableHead>
                                <TableHead className="h-14"><Skeleton className="h-3 w-24" /></TableHead>
                                <TableHead className="h-14"><Skeleton className="h-3 w-20" /></TableHead>
                                <TableHead className="text-right w-24 h-14 pr-8"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(5)].map((_, i) => (
                                <TableRow key={i} className="border-b border-border">
                                    <TableCell className="py-4.5 pl-8"><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell className="py-4.5"><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell className="py-4.5"><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell className="text-right py-4.5 pr-8"><Skeleton className="h-5 w-5 ml-auto" /></TableCell>
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
        <div className="flex flex-col items-center justify-center py-24 text-center bg-card rounded-[2rem] border border-dashed border-border w-full shadow-sm mt-8">
            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <FileText className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">No Reports Found</h3>
            <p className="text-muted-foreground mt-2 mb-8 max-w-sm">Finalized assessments will automatically generate records here.</p>
        </div>
    )
}

function formatGeneratedDate(value: any): string {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) return 'N/A';
    const numericValue = Number(trimmed);
    if (Number.isFinite(numericValue) && trimmed.length >= 10) {
        const dateFromTimestamp = new Date(trimmed.length === 13 ? numericValue : numericValue * 1000);
        if (!Number.isNaN(dateFromTimestamp.getTime())) return format(dateFromTimestamp, 'dd MMM yyyy');
    }
    const parsedDate = new Date(trimmed);
    if (!Number.isNaN(parsedDate.getTime())) return format(parsedDate, 'dd MMM yyyy');
    return 'N/A';
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="space-y-6">
            <PageHeader title="Academic Reports" description="Manage records." hideBack />
            <div className="p-12 text-center bg-card rounded-[2rem] border border-destructive/20 shadow-sm">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4 opacity-20" />
                <p className="text-destructive font-bold text-lg">Synchronization Offline</p>
                <p className="text-muted-foreground mb-6">Failed to load reports history.</p>
                <Button onClick={() => onRetry()} variant="outline" className="font-bold">Retry Sync</Button>
            </div>
        </div>
    );
}

export default function ReportsPage() {
    const router = useRouter();
    const [displaySearch, setDisplaySearch] = useState('');
    const [dbSearch, setDbSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    useEffect(() => {
        const timer = setTimeout(() => {
            setDbSearch(displaySearch);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [displaySearch]);

    const { data, isLoading, error, trigger: refetch } = useWebhook<{}, any>({
        eventName: 'REPORTS_LIST',
        payload: {},
        cacheKey: 'reports-list',
        cacheTtlMs: 300_000,
        fallbackToCacheOnError: true,
        suppressErrorToast: true,
    });

    const { items, pagination } = useMemo(() => {
        const rawItems = Array.isArray(data) ? data : (data?.reports ?? data?.items ?? []);
        if (!rawItems) return { items: [], pagination: { page: 1, pageSize, total: 0 } };

        const filteredList = displaySearch 
            ? rawItems.filter((report: any) => 
                (report.student_name ?? report.studentName ?? '').toLowerCase().includes(displaySearch.toLowerCase()) || 
                (report.assignment_title ?? report.assignmentTitle ?? '').toLowerCase().includes(displaySearch.toLowerCase())
              )
            : rawItems;

        const total = filteredList.length;
        const startIndex = (currentPage - 1) * pageSize;
        const slicedItems = filteredList.slice(startIndex, startIndex + pageSize);

        return {
            items: slicedItems,
            pagination: {
                page: currentPage,
                pageSize,
                total
            }
        };
    }, [data, displaySearch, currentPage]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const totalPages = Math.ceil(pagination.total / pagination.pageSize);
    const showingStart = (currentPage - 1) * pageSize + 1;
    const showingEnd = Math.min(currentPage * pageSize, pagination.total);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;
        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('ellipsis');
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) pages.push(i);
            }
            if (currentPage < totalPages - 2) pages.push('ellipsis');
            if (!pages.includes(totalPages)) pages.push(totalPages);
        }
        return pages;
    };

    if (isLoading && !data) return <ReportsPageSkeleton />;
    if (error && !data) return <ErrorState onRetry={refetch} />;

    return (
        <div className="space-y-6">
            <OnboardingTour />
            <PageHeader
                title="Academic Reports"
                description="The central archive for all finalized student assessments and progress records."
                hideBack
            />
            
            {items.length > 0 || displaySearch ? (
                <>
                    <Card id="onboarding-report-history" className="border-border shadow-sm overflow-hidden rounded-[2rem] bg-card">
                        <CardHeader className="bg-card pb-6 px-8 pt-6">
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                                <div className="relative w-full max-w-sm">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by student or assignment..."
                                        className="w-full rounded-2xl bg-secondary/50 border-none focus:ring-2 focus:ring-primary/20 pl-12 h-12 text-base transition-all placeholder:text-muted-foreground font-medium"
                                        value={displaySearch}
                                        onChange={(e) => setDisplaySearch(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {items.length > 0 ? (
                                <Table>
                                    <TableHeader className="bg-secondary/30">
                                        <TableRow className="hover:bg-transparent border-b border-border">
                                            <TableHead className="font-bold text-foreground h-14 pl-8 uppercase tracking-widest text-[10px]">Student</TableHead>
                                            <TableHead className="font-bold text-foreground h-14 uppercase tracking-widest text-[10px]">Assignment</TableHead>
                                            <TableHead className="font-bold text-foreground h-14 uppercase tracking-widest text-[10px]">Finalized On</TableHead>
                                            <TableHead className="text-right w-24 h-14 pr-8"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((report: any, index: number) => {
                                            const reportId = report.id ?? report.reportId ?? report.report_id ?? `report-${index}`;
                                            const createdAt = report.Timestamp ?? report.timestamp ?? report.created_at ?? report.createdAt ?? report.finalized_at ?? null;
                                            
                                            return (
                                                <TableRow 
                                                    key={reportId} 
                                                    className="group cursor-pointer hover:bg-secondary/50 transition-colors border-b border-border last:border-0"
                                                    onClick={() => router.push(`/teacher/reports/${reportId}`)}
                                                >
                                                    <TableCell className="font-bold text-foreground py-4.5 pl-8 text-sm">{report.student_name ?? report.studentName ?? 'Unknown'}</TableCell>
                                                    <TableCell className="text-muted-foreground py-4.5 text-sm">{report.assignment_title ?? report.assignmentTitle ?? 'Untitled'}</TableCell>
                                                    <TableCell className="text-muted-foreground py-4.5 text-sm">{formatGeneratedDate(createdAt)}</TableCell>
                                                    <TableCell className="text-right py-4.5 pr-8">
                                                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="py-24 text-center px-6">
                                    <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Search className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-xl font-bold text-foreground">No results for &quot;{displaySearch}&quot;</h3>
                                    <p className="text-muted-foreground mt-1">Check the spelling or try a broader search term.</p>
                                    <Button variant="ghost" onClick={() => setDisplaySearch('')} className="mt-6 text-primary font-bold hover:bg-primary/10">
                                        Reset Filters
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {pagination.total > 0 && (
                        <div className="flex justify-center mt-4">
                            <div className="flex items-center bg-white dark:bg-slate-900 border border-border shadow-[0_15px_40px_rgba(0,0,0,0.12)] rounded-full p-1.5 px-6 w-fit min-w-[480px]">
                                <Pagination className="mx-0 w-auto">
                                    <PaginationContent className="gap-2">
                                        <PaginationItem>
                                            <PaginationPrevious 
                                                onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                                                disabled={currentPage <= 1}
                                                className={cn(
                                                    "text-foreground hover:bg-secondary/50 h-9 px-4 transition-colors",
                                                    currentPage <= 1 && "pointer-events-none opacity-30"
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
                                                            isActive={page === currentPage}
                                                            onClick={() => handlePageChange(page as number)}
                                                            className={cn(
                                                                "h-9 w-9 font-bold transition-all",
                                                                page === currentPage 
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
                                                onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                                                disabled={currentPage >= totalPages}
                                                className={cn(
                                                    "text-foreground hover:bg-secondary/50 h-9 px-4 transition-colors",
                                                    currentPage >= totalPages && "pointer-events-none opacity-30"
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
                </>
            ) : (
                <EmptyState />
            )}
        </div>
    );
}
