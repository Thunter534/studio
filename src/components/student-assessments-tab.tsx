'use client';

import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { AlertCircle } from "lucide-react";
import { useWebhook } from "@/lib/hooks";
import type { StudentAssessmentListItem } from "@/lib/events";
import { normalizeAssessmentIdentifier } from "@/lib/utils";

type Assignment = {
  id: string;
  title: string;
  rubricName?: string;
  notes?: string;
    status?: StudentSubmissionStatus;
};

type StudentSubmissionStatus = 'N/A' | 'Graded';

const STUDENT_ASSESSMENT_STATUS_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_STUDENT_ASSESSMENT_STATUS_URL;

type WebhookStatusRecord = {
    assessmentName: string;
    status: StudentSubmissionStatus;
};

const normalizeAssessmentName = (value: string): string => value.trim().toLowerCase();



const normalizeStatus = (value: string | undefined): StudentSubmissionStatus => {
    if (!value) {
        return 'N/A';
    }
    const normalized = value.toLowerCase();
    if (normalized === 'graded' || normalized === 'finalized') {
        return 'Graded';
    }
    return 'N/A';
};

const normalizeAssignment = (item: any, index: number): Assignment | null => {
    const rawId = item.id ?? item.assessment_id ?? item.assessmentId ?? item.assignment_id ?? item.assignmentId;
    const title = item.title ?? item.name ?? `Untitled Assignment ${index + 1}`;
    const id = rawId || title.toString().trim();

    return {
        id,
        title,
        rubricName: item.rubricName ?? item.rubric_name ?? item.rubricId ?? item.rubric_id,
        notes: item.notes ?? item.note,
        status: normalizeStatus(item.status ?? item.assessmentStatus ?? item.assessment_status),
    };
};

function AssessmentsTableSkeleton() {
    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Assessment Name</TableHead>
                            <TableHead>Rubric</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(3)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to Load Assessments</AlertTitle>
            <AlertDescription>
                There was a problem fetching this student's assessments.
                <div className="mt-4">
                    <Button variant="destructive" onClick={onRetry}>Retry</Button>
                </div>
            </AlertDescription>
        </Alert>
    );
}

export function StudentAssessmentsTab({ studentId, studentName }: { studentId: string; studentName?: string }) {
    const router = useRouter();
    const [statusByAssessmentName, setStatusByAssessmentName] = useState<Record<string, StudentSubmissionStatus>>({});
    const [globalRubricName, setGlobalRubricName] = useState<string>('No global rubric configured');

    const { data, isLoading, error, trigger: refetch } = useWebhook<
        { studentId: string },
        { assessments: StudentAssessmentListItem[] }
    >({
        eventName: 'ASSESSMENT_LIST',
        payload: { studentId },
        cacheKey: `assessments:${studentId}`,
        cacheTtlMs: 60_000,
    });

    useEffect(() => {
        const fetchStatuses = async () => {
            if (!studentName) {
                setStatusByAssessmentName({});
                return;
            }

            if (!STUDENT_ASSESSMENT_STATUS_WEBHOOK_URL) {
                console.warn('[StudentAssessmentsTab] Missing NEXT_PUBLIC_N8N_STUDENT_ASSESSMENT_STATUS_URL');
                setStatusByAssessmentName({});
                return;
            }

            try {
                const response = await fetch(STUDENT_ASSESSMENT_STATUS_WEBHOOK_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        student_name: studentName,
                        studentName,
                        student_id: studentName,
                        studentId: studentName,
                        name: studentName,
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Status webhook error: ${response.status}`);
                }

                const payload = await response.json();
                const items = Array.isArray(payload)
                    ? payload
                    : payload?.data?.items
                      ?? payload?.data
                      ?? payload?.items
                      ?? payload?.assessments
                      ?? [];

                if (!Array.isArray(items)) {
                    setStatusByAssessmentName({});
                    return;
                }

                const mapped = items.reduce<Record<string, StudentSubmissionStatus>>((acc, item: any) => {
                    const assessmentName = String(
                        item?.assessment_id
                        ?? item?.assessmentId
                        ?? item?.assessment_name
                        ?? item?.assessmentName
                        ?? item?.assignment_name
                        ?? item?.assignmentName
                        ?? item?.id
                        ?? ''
                    ).trim();

                    if (!assessmentName) {
                        return acc;
                    }

                    const normalizedStatus = normalizeStatus(item?.status);
                    acc[normalizeAssessmentName(assessmentName)] = normalizedStatus;
                    return acc;
                }, {});

                setStatusByAssessmentName(mapped);
            } catch (fetchError) {
                console.error('[StudentAssessmentsTab] Failed to fetch status map:', fetchError);
                setStatusByAssessmentName({});
            }
        };

        fetchStatuses();
    }, [studentId, studentName]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const rawValue = window.sessionStorage.getItem('rubrics:list');
        if (!rawValue) {
            return;
        }

        try {
            const cached = JSON.parse(rawValue) as { data?: Array<{ name?: string }> | { rubrics?: Array<{ name?: string }> } };
            const rubrics = Array.isArray(cached?.data)
                ? cached.data
                : cached?.data?.rubrics ?? [];
            const firstRubricName = rubrics[0]?.name;
            if (firstRubricName) {
                setGlobalRubricName(firstRubricName);
            }
        } catch {
            window.sessionStorage.removeItem('rubrics:list');
        }
    }, []);

    const assignments = useMemo(() => {
        const rawItems = Array.isArray(data)
            ? data
            : data?.assessments ?? (data as any)?.items ?? (data as any)?.data?.assessments ?? [];
        if (!Array.isArray(rawItems)) {
            return [] as Assignment[];
        }
        return rawItems
            .map((item, index) => normalizeAssignment(item, index))
            .filter((item): item is Assignment => item !== null)
            .map((item) => {
                const mappedStatus = statusByAssessmentName[normalizeAssessmentName(item.title)];
                return {
                    ...item,
                    status: mappedStatus ?? 'N/A',
                };
            });
    }, [data, statusByAssessmentName]);

    const getStatusVariant = (status: StudentSubmissionStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
        switch (status) {
            case 'Graded': return 'default';
            case 'N/A': return 'secondary';
            default: return 'secondary';
        }
    };

    const getStatusLabel = (status: StudentSubmissionStatus): string => {
        return status;
    };


    const handleRowClick = (assignment: Assignment) => {
        // Persist assignment metadata for downstream pages.
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('currentStudentId', studentId);
            sessionStorage.setItem('currentRubricName', assignment.rubricName || globalRubricName);
            sessionStorage.setItem('currentAssignmentTitle', assignment.title);
        }

        router.push(`/teacher/assessments/${assignment.id}/setup?studentId=${studentId}`);
    };

    if (isLoading) {
        return <AssessmentsTableSkeleton />;
    }

    if (error) {
        return <ErrorState onRetry={refetch} />;
    }

    if (assignments.length === 0) {
        return (
            <div className="text-center py-16 border-dashed border-2 rounded-lg mt-2">
                <h3 className="text-xl font-semibold">No assessments available</h3>
                <p className="text-muted-foreground mt-2">Create assessments from the Assessments page.</p>
            </div>
        );
    }

    return (
        <Card className="mt-2">
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Assessment Name</TableHead>
                            <TableHead>Rubric</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {assignments.map((assignment) => {
                            const status = assignment.status ?? 'N/A';
                            return (
                                <TableRow
                                    key={assignment.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => handleRowClick(assignment)}
                                >
                                    <TableCell className="font-medium">{assignment.title}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {assignment.rubricName || globalRubricName}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(status)}>
                                            {getStatusLabel(status)}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
