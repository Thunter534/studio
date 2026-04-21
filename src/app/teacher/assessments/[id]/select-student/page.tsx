'use client';
 
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { getWebhookUrl } from '@/lib/webhook-config';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { decodeMaybeEncodedParam } from '@/lib/utils';
 
const STUDENT_LIST_CACHE_KEY = 'n8n:student-list';
 
type StudentItem = {
  name: string;
  studentIdNumber: string;
  grade?: string;
  studentEmail?: string;
  parentEmail?: string;
};
 
function StudentListSkeleton() {
  return (
    <div className="w-full">
      <PageHeader title="Select Student" description="Choose a student to assess." />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
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
 
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="w-full">
      <PageHeader title="Select Student" description="Choose a student to assess." />
      <Alert variant="destructive" className="mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Failed to Load Students</AlertTitle>
        <AlertDescription>
          There was an issue fetching the student list. Please try again.
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="destructive" onClick={onRetry}>Retry</Button>
            <Button variant="outline" asChild>
              <Link href="/teacher/students">Go to Student Roster</Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
 
export default function SelectStudentPage() {
  const router = useRouter();
  const params = useParams();
  const assessmentId = params?.id as string;
  const { user, isLoading: isAuthLoading } = useAuth();
  const actor = useMemo(
    () => (user ? { role: user.role, userId: user.id, userName: user.name } : undefined),
    [user?.id, user?.role, user?.name]
  );
 
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
 
  const readStudentsCache = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    const rawValue = window.localStorage.getItem(STUDENT_LIST_CACHE_KEY);
    if (!rawValue) {
      return null;
    }
    try {
      return JSON.parse(rawValue) as { timestamp: number; data: StudentItem[] };
    } catch {
      window.localStorage.removeItem(STUDENT_LIST_CACHE_KEY);
      return null;
    }
  }, []);
 
  const writeStudentsCache = useCallback((data: StudentItem[]) => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(
      STUDENT_LIST_CACHE_KEY,
      JSON.stringify({ timestamp: Date.now(), data })
    );
  }, []);
 
  const fetchStudents = useCallback(async () => {
    if (isAuthLoading) {
      return;
    }
 
    if (!user) {
      setIsLoading(false);
      return;
    }
 
    setIsLoading(true);
    setError(null);
 
    try {
      const webhookUrl = getWebhookUrl('STUDENT_LIST');
      if (!webhookUrl) {
        throw new Error('Student list webhook URL is not configured');
      }
     
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: user?.name,
          ...(actor ? { actor } : {}),
        }),
      });
 
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
 
      const result = await response.json();
 
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
        setStudents([]);
      }
    } catch (err) {
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
  }, [isAuthLoading, user, actor, readStudentsCache, writeStudentsCache]);
 
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);
 
  const handleStudentClick = (student: StudentItem) => {
    if (!assessmentId) {
      setError('Assessment ID is missing from the route.');
      return;
    }
 
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('currentStudentId', student.studentIdNumber);
      sessionStorage.setItem('currentStudentName', student.name);
    }
 
    const normalizedAssessmentId = decodeMaybeEncodedParam(String(assessmentId)) ?? String(assessmentId);
    const routeAssessmentId = encodeURIComponent(normalizedAssessmentId);
    const query = new URLSearchParams({ studentId: String(student.studentIdNumber) }).toString();
    router.push(`/teacher/assessments/${routeAssessmentId}/setup?${query}`);
  };
 
  if (isLoading) {
    return <StudentListSkeleton />;
  }
 
  if (error) {
    return <ErrorState onRetry={fetchStudents} />;
  }
 
  if (students.length === 0) {
    return (
      <div className="w-full">
        <PageHeader title="Select Student" description="Choose a student to assess." />
        <Card>
          <CardContent className="pt-6 text-center py-16 border-dashed border-2 rounded-lg">
            <h3 className="text-xl font-semibold">No students available</h3>
            <p className="text-muted-foreground mt-2">There are no students in the system.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button variant="outline" asChild>
                <Link href="/teacher/students">Add Student</Link>
              </Button>
              <Button variant="outline" onClick={() => router.back()}>
                Back to Assignments
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
 
  return (
    <div className="w-full">
      <PageHeader
        title="Select Student"
        description="Choose a student to assess."
      />
 
      <Card>
        <CardHeader>
          <CardTitle>All Students</CardTitle>
          <CardDescription>{students.length} student{students.length !== 1 ? 's' : ''} available</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow
                  key={student.studentIdNumber}
                  onClick={() => handleStudentClick(student)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Open ${student.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleStudentClick(student);
                      }}
                    >
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
