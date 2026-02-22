'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { StudentListItem } from "@/lib/events";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter, useParams } from "next/navigation";
import { StudentAssessmentsTab } from "@/components/student-assessments-tab";
import { StudentReportsTab } from "@/components/student-reports-tab";
import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const N8N_STUDENT_GET_WEBHOOK = 'https://n8n.srv1336679.hstgr.cloud/webhook-test/36517d38-9339-4bc2-b94a-80010891c64e';
const STUDENT_DETAIL_CACHE_KEY_PREFIX = 'n8n:student-detail:';

function ProfilePageSkeleton() {
    return (
        <div>
            <div className="mb-4">
                <Skeleton className="h-9 w-36" />
            </div>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <Skeleton className="h-9 w-48 mb-3" />
                    <Skeleton className="h-5 w-64" />
                </div>
                <Skeleton className="h-11 w-40" />
            </div>
            
            <div className="grid gap-6 mt-6 md:grid-cols-3">
                <div className="md:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Student Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="grid grid-cols-2">
                                   <Skeleton className="h-4 w-20" />
                                   <Skeleton className="h-4 w-32" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-2">
                     <Tabs defaultValue="assessments">
                        <TabsList>
                            <TabsTrigger value="assessments">Assessments</TabsTrigger>
                            <TabsTrigger value="reports">Reports</TabsTrigger>
                        </TabsList>
                        <TabsContent value="assessments">
                             <Skeleton className="h-[300px] w-full mt-2" />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <Alert variant="destructive" className="max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to Load Student Profile</AlertTitle>
            <AlertDescription>
                There was a problem fetching the student's data. Please try again.
                <div className="mt-4">
                    <Button variant="destructive" onClick={onRetry}>Retry</Button>
                </div>
            </AlertDescription>
        </Alert>
    );
}


export default function StudentDetailPage() {
  const router = useRouter();
  const pageParams = useParams<{ studentIdNumber: string }>();
  const [student, setStudent] = useState<StudentListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheKey = `${STUDENT_DETAIL_CACHE_KEY_PREFIX}${pageParams.studentIdNumber}`;

  const fetchStudent = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[StudentDetail] Fetching student:', pageParams.studentIdNumber);
      
      const response = await fetch(N8N_STUDENT_GET_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ student_id: pageParams.studentIdNumber }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('[StudentDetail] Response from n8n:', result);

      // Map snake_case to camelCase
      if (result && result.name) {
        const mappedStudent: StudentListItem = {
          name: result.name,
          studentIdNumber: result.student_id,
          grade: result.grade,
          studentEmail: result.student_email,
          parentEmail: result.parent_email,
        };
        setStudent(mappedStudent);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            cacheKey,
            JSON.stringify({ timestamp: Date.now(), data: mappedStudent })
          );
        }
      } else if (Array.isArray(result) && result.length > 0) {
        // Handle if n8n returns array
        const mappedStudent: StudentListItem = {
          name: result[0].name,
          studentIdNumber: result[0].student_id,
          grade: result[0].grade,
          studentEmail: result[0].student_email,
          parentEmail: result[0].parent_email,
        };
        setStudent(mappedStudent);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            cacheKey,
            JSON.stringify({ timestamp: Date.now(), data: mappedStudent })
          );
        }
      } else {
        throw new Error('Student not found');
      }
      
    } catch (err) {
      console.error('[StudentDetail] Error:', err);
      if (typeof window !== 'undefined') {
        const rawValue = window.localStorage.getItem(cacheKey);
        if (rawValue) {
          try {
            const cached = JSON.parse(rawValue) as { timestamp: number; data: StudentListItem };
            if (cached?.data) {
              setStudent(cached.data);
              setError(null);
              return;
            }
          } catch {
            window.localStorage.removeItem(cacheKey);
          }
        }
      }
      setError(err instanceof Error ? err.message : 'Failed to load student');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (pageParams.studentIdNumber) {
      fetchStudent();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageParams.studentIdNumber]);

  if (isLoading && !student) {
    return <ProfilePageSkeleton />;
  }

  if (error) {
    return (
        <div>
            <div className="mb-4">
                <Button asChild variant="outline" size="sm">
                    <Link href="/teacher/students"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Students</Link>
                </Button>
            </div>
            <ErrorState onRetry={fetchStudent} />
        </div>
    )
  }

  if (!student) {
    return <div>
         <div className="mb-4">
            <Button asChild variant="outline" size="sm">
                <Link href="/teacher/students"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Students</Link>
            </Button>
        </div>
        <p>Student not found.</p>
    </div>;
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <Button asChild variant="outline" size="sm">
            <Link href="/teacher/students"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Students</Link>
        </Button>
      </div>
      
      <PageHeader
        title={student.name}
        description={
            <span className="flex items-center gap-4 text-muted-foreground">
                <span>{student.grade}</span>
                <span className="font-mono text-xs">{student.studentIdNumber}</span>
            </span>
        }
      />
      
        <div className="grid gap-6 mt-6 md:grid-cols-3">
            <div className="md:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Student Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 items-center">
                           <span className="text-muted-foreground">Student ID</span>
                           <span className="font-mono text-xs">{student.studentIdNumber}</span>
                        </div>
                        <div className="grid grid-cols-2 items-center">
                           <span className="text-muted-foreground">Grade</span>
                           <span>{student.grade}</span>
                        </div>
                        <div className="grid grid-cols-2 items-center">
                           <span className="text-muted-foreground">Student Email</span>
                           <span className="truncate">{student.studentEmail || 'N/A'}</span>
                        </div>
                        <div className="grid grid-cols-2 items-center">
                           <span className="text-muted-foreground">Parent Email</span>
                           <span className="truncate">{student.parentEmail}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-2">
                <Tabs defaultValue="assessments">
                    <TabsList>
                        <TabsTrigger value="assessments">Assessments</TabsTrigger>
                        <TabsTrigger value="reports">Reports</TabsTrigger>
                    </TabsList>
                    <TabsContent value="assessments">
                        <StudentAssessmentsTab studentId={student.studentIdNumber} />
                    </TabsContent>
                    <TabsContent value="reports">
                        <StudentReportsTab studentId={student.studentIdNumber} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    </div>
  );
}
