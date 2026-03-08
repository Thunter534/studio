'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { getWebhookUrl } from '@/lib/webhook-config';

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
          <div className="mt-4">
            <Button variant="destructive" onClick={onRetry}>Retry</Button>
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

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const readStudentsCache = () => {
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
  };

  const writeStudentsCache = (data: StudentItem[]) => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(
      STUDENT_LIST_CACHE_KEY,
      JSON.stringify({ timestamp: Date.now(), data })
    );
  };

  const fetchStudents = async () => {
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
        body: JSON.stringify({}),
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
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleStudentClick = (student: StudentItem) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('currentStudentId', student.studentIdNumber);
      sessionStorage.setItem('currentStudentName', student.name);
    }
    router.push(`/teacher/assessments/${assessmentId}/setup?studentId=${student.studentIdNumber}`);
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
            <Button className="mt-4" variant="outline" onClick={() => router.back()}>
              Back to Assignments
            </Button>
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
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
