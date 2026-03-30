'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, FileText, ChevronRight, Search, Users, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { StudentListItem, StudentListResponse } from '@/lib/events';
import { Skeleton } from '@/components/ui/skeleton';
import { AddStudentDrawer } from '@/components/add-student-drawer';
import { Input } from '@/components/ui/input';
import { OnboardingTour } from '@/components/onboarding-tour';
import { Badge } from '@/components/ui/badge';
import { useWebhook } from '@/lib/hooks';
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

function StudentListSkeleton() {
    return (
        <div className="w-full">
            <PageHeader
                title="Student Roster"
                description="Manage enrollment and track performance for all students."
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
    );
}

function EmptyState({ onAddStudent }: { onAddStudent: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-card rounded-[2rem] border border-dashed border-border w-full shadow-sm mt-8">
            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <Users className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">Build Your Roster</h3>
            <p className="text-muted-foreground mt-2 mb-8 max-w-sm">No students found. Start by manually adding your first student or importing your class roster.</p>
            <Button onClick={onAddStudent} size="lg" className="bg-primary hover:bg-primary/90 font-bold px-8 h-12 rounded-xl">
                <PlusCircle className="mr-2 h-5 w-5" />
                Enroll First Student
            </Button>
        </div>
    )
}

export default function StudentsPage() {
    const router = useRouter();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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

    const { data, isLoading, error, trigger: refetch } = useWebhook<{ search?: string }, StudentListResponse | StudentListItem[]>({
        eventName: 'STUDENT_LIST',
        payload: { search: dbSearch },
        allowRawResponse: true,
        cacheKey: `student-list:${dbSearch}`,
        cacheTtlMs: 60_000,
        fallbackToCacheOnError: true,
    });

    const { items, pagination } = useMemo(() => {
        if (!data) return { items: [], pagination: { page: 1, pageSize, total: 0 } };
        let baseList: StudentListItem[] = [];
        
        if (Array.isArray(data)) {
            baseList = data.map((student: any) => ({
                name: student.name,
                studentIdNumber: student.student_id ?? student.studentIdNumber,
                grade: student.grade,
                studentEmail: student.student_email ?? student.studentEmail,
                parentEmail: student.parent_email ?? student.parentEmail,
            }));
        } else if ((data as any).success && (data as any).data?.students) {
            baseList = (data as any).data.students.map((student: any) => ({
                name: student.name,
                studentIdNumber: student.student_id ?? student.studentIdNumber,
                grade: student.grade,
                studentEmail: student.student_email ?? student.studentEmail,
                parentEmail: student.parent_email ?? student.parentEmail,
            }));
        }

        const filteredList = displaySearch 
            ? baseList.filter(student => 
                student.name.toLowerCase().includes(displaySearch.toLowerCase()) || 
                student.studentIdNumber.toLowerCase().includes(displaySearch.toLowerCase())
              )
            : baseList;

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

    const handleRowClick = (studentIdNumber: string) => {
        router.push(`/teacher/students/${encodeURIComponent(studentIdNumber)}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>, studentIdNumber: string) => {
        if (e.key === 'Enter') {
            handleRowClick(studentIdNumber);
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    if (isLoading && !data) return <StudentListSkeleton />;
    
    if (error && !data) return (
        <div className="space-y-6">
            <PageHeader title="Student Roster" description="Manage enrollment." hideBack />
            <div className="p-12 text-center bg-card rounded-[2rem] border border-destructive/20 shadow-sm">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4 opacity-20" />
                <p className="text-destructive font-bold text-lg">Synchronization Offline</p>
                <p className="text-muted-foreground mb-6">{error?.message || 'Failed to load students'}</p>
                <Button onClick={() => refetch()} variant="outline" className="font-bold">Retry Sync</Button>
            </div>
        </div>
    );

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

    return (
        <div className="space-y-6">
            <OnboardingTour />
            <AddStudentDrawer
                isOpen={isDrawerOpen}
                onOpenChange={setIsDrawerOpen}
                onSuccess={() => {
                    setIsDrawerOpen(false);
                    refetch();
                }}
            />
            
            <PageHeader
                title="Student Roster"
                description="The central directory for all students across your active classes."
                hideBack
                actions={
                    <div className="flex gap-3">
                        <Button variant="outline" className="h-11 rounded-xl font-bold border-border bg-card text-foreground" asChild>
                            <Link href="/teacher/assessments"><FileText className="mr-2 h-4 w-4" /> Assignments</Link>
                        </Button>
                        <Button id="onboarding-add-student" onClick={() => setIsDrawerOpen(true)} className="bg-primary hover:bg-primary/90 h-11 rounded-xl font-bold px-6 shadow-md shadow-primary/20 transition-all">
                            <PlusCircle className="mr-2 h-4 w-4 stroke-[3]" /> Add Student
                        </Button>
                    </div>
                }
            />

            {items.length > 0 || displaySearch ? (
                 <Card id="onboarding-student-list" className="border-border shadow-sm overflow-hidden rounded-[2rem] bg-card">
                    <CardHeader className="bg-card pb-6 px-8 pt-6">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                             <div className="relative w-full max-w-sm">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    placeholder="Find student by name..."
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
                                        <TableHead className="font-bold text-foreground h-14 pl-8 uppercase tracking-widest text-[10px]">Name</TableHead>
                                        <TableHead className="font-bold text-foreground h-14 uppercase tracking-widest text-[10px]">Academic Level</TableHead>
                                        <TableHead className="font-bold text-foreground h-14 uppercase tracking-widest text-[10px]">Identifier</TableHead>
                                        <TableHead className="text-right w-24 h-14 pr-8"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((student: StudentListItem) => (
                                        <TableRow 
                                            key={student.studentIdNumber}
                                            role="link"
                                            tabIndex={0}
                                            className="group cursor-pointer hover:bg-secondary/50 transition-colors border-b border-border last:border-0"
                                            onClick={() => handleRowClick(student.studentIdNumber)}
                                            onKeyDown={(e) => handleKeyDown(e, student.studentIdNumber)}
                                        >
                                            <TableCell className="font-bold text-foreground py-4.5 pl-8 text-sm">{student.name}</TableCell>
                                            <TableCell className="py-4.5">
                                                <Badge variant="secondary" className="bg-secondary text-foreground border-none font-bold rounded-md px-3 py-1">
                                                    {(student.grade || '').toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground py-4.5 tracking-widest uppercase">{student.studentIdNumber}</TableCell>
                                            <TableCell className="text-right py-4.5 pr-8">
                                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                            </TableCell>
                                        </TableRow>
                                    ))}
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
            ) : (
                <EmptyState onAddStudent={() => setIsDrawerOpen(true)} />
            )}

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
        </div>
    );
}