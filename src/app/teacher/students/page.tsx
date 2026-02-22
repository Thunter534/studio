'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, FileText, ChevronRight, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { StudentListItem } from '@/lib/events';
import { Skeleton } from '@/components/ui/skeleton';
import { AddStudentDrawer } from '@/components/add-student-drawer';
import { Input } from '@/components/ui/input';

const N8N_STUDENT_LIST_WEBHOOK = 'https://n8n.srv1336679.hstgr.cloud/webhook-test/0889db3b-9b44-46a2-a5a2-0e1513fb884b';
const STUDENT_LIST_CACHE_KEY = 'n8n:student-list';

const readStudentsCache = (): { timestamp: number; data: StudentListItem[] } | null => {
    if (typeof window === 'undefined') {
        return null;
    }
    const rawValue = window.localStorage.getItem(STUDENT_LIST_CACHE_KEY);
    if (!rawValue) {
        return null;
    }
    try {
        return JSON.parse(rawValue) as { timestamp: number; data: StudentListItem[] };
    } catch {
        window.localStorage.removeItem(STUDENT_LIST_CACHE_KEY);
        return null;
    }
};

const writeStudentsCache = (data: StudentListItem[]) => {
    if (typeof window === 'undefined') {
        return;
    }
    window.localStorage.setItem(
        STUDENT_LIST_CACHE_KEY,
        JSON.stringify({ timestamp: Date.now(), data })
    );
};

function StudentListSkeleton() {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle><Skeleton className="h-6 w-32" /></CardTitle>
                <CardDescription><Skeleton className="h-4 w-48" /></CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead>Student ID</TableHead>
                            <TableHead>Last Assessment</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right w-[50px]"><span className="sr-only">View</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-5 w-5" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function EmptyState({ onAddStudent }: { onAddStudent: () => void }) {
    return (
        <div className="text-center py-16 border-dashed border-2 rounded-lg w-full">
            <h3 className="text-xl font-semibold">No students yet</h3>
            <p className="text-muted-foreground mt-2 mb-4">Add your first student to start creating assessments.</p>
            <Button onClick={onAddStudent}>
                <PlusCircle className="mr-2" />
                Add Student
            </Button>
        </div>
    )
}

export default function StudentsPage() {
    const router = useRouter();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [students, setStudents] = useState<StudentListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const fetchStudents = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            console.log('[StudentList] Fetching from n8n webhook...');
            
            const response = await fetch(N8N_STUDENT_LIST_WEBHOOK, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('[StudentList] Response from n8n:', result);

            // Handle array response from n8n with snake_case field mapping
            if (Array.isArray(result)) {
                const mappedStudents = result.map((student: any) => ({
                    name: student.name,
                    studentIdNumber: student.student_id,
                    grade: student.grade,
                    studentEmail: student.student_email,
                    parentEmail: student.parent_email,
                }));
                setStudents(mappedStudents);
                writeStudentsCache(mappedStudents);
            } else if (result.success && result.data?.students) {
                // Handle wrapped format if n8n changes to that
                const mappedStudents = result.data.students.map((student: any) => ({
                    name: student.name,
                    studentIdNumber: student.student_id,
                    grade: student.grade,
                    studentEmail: student.student_email,
                    parentEmail: student.parent_email,
                }));
                setStudents(mappedStudents);
                writeStudentsCache(mappedStudents);
            } else {
                console.warn('[StudentList] Unexpected response format:', result);
                setStudents([]);
            }
            
        } catch (err) {
            console.error('[StudentList] Error:', err);
            const cached = readStudentsCache();
            if (cached?.data?.length) {
                setStudents(cached.data);
                setError(null);
            } else {
                setError(err instanceof Error ? err.message : 'Failed to load students');
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const handleRowClick = (studentIdNumber: string) => {
        router.push(`/teacher/students/${encodeURIComponent(studentIdNumber)}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>, studentIdNumber: string) => {
        if (e.key === 'Enter') {
            handleRowClick(studentIdNumber);
        }
    };

    
    if (isLoading) return (
        <div className="w-full">
             <PageHeader
                title="Students"
                description="All students in your classes."
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/teacher/assessments"><FileText/> View Assessments</Link>
                        </Button>
                        <Button onClick={() => setIsDrawerOpen(true)}><PlusCircle/> Add Student</Button>
                    </div>
                }
            />
            <StudentListSkeleton />
        </div>
    );
    
    if (error) return (
        <div className="w-full">
            <PageHeader
                title="Students"
                description="All students in your classes."
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/teacher/assessments"><FileText/> View Assessments</Link>
                        </Button>
                        <Button onClick={() => setIsDrawerOpen(true)}><PlusCircle/> Add Student</Button>
                    </div>
                }
            />
            <p className="text-destructive">Failed to load students: {error}</p>
            <Button onClick={fetchStudents} className="mt-4">Retry</Button>
        </div>
    );

    return (
        <div className="w-full">
            <AddStudentDrawer
                isOpen={isDrawerOpen}
                onOpenChange={setIsDrawerOpen}
                onSuccess={() => {
                    setIsDrawerOpen(false);
                    fetchStudents();
                }}
            />
            <PageHeader
                title="Students"
                description="All students in your classes."
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/teacher/assessments"><FileText/> View Assessments</Link>
                        </Button>
                        <Button onClick={() => setIsDrawerOpen(true)}><PlusCircle/> Add Student</Button>
                    </div>
                }
            />

            {students.length > 0 ? (
                 <Card className="w-full">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>All Students ({students.length})</CardTitle>
                            </div>
                             <div className="relative w-full max-w-sm">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search student name..."
                                    className="w-full rounded-lg bg-secondary pl-8 h-9"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Grade</TableHead>
                                    <TableHead>Student ID</TableHead>
                                    <TableHead className="text-right w-[50px]"><span className="sr-only">View</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.map((student: StudentListItem) => (
                                    <TableRow 
                                        key={student.studentIdNumber}
                                        role="link"
                                        tabIndex={0}
                                        className="cursor-pointer"
                                        onClick={() => handleRowClick(student.studentIdNumber)}
                                        onKeyDown={(e) => handleKeyDown(e, student.studentIdNumber)}
                                    >
                                        <TableCell className="font-medium">{student.name}</TableCell>
                                        <TableCell>{student.grade}</TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">{student.studentIdNumber}</TableCell>
                                        <TableCell className="text-right">
                                            <ChevronRight className="h-4 w-4 text-muted-foreground inline-block opacity-50 group-hover:opacity-100 transition-opacity" />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : (
                <EmptyState onAddStudent={() => setIsDrawerOpen(true)} />
            )}
        </div>
    );
}
