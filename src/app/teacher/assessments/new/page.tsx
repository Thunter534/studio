'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useWebhook } from "@/lib/hooks";
import type { RubricListItem } from "@/lib/events";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export default function NewAssessmentPage() {
    const router = useRouter();
    const { toast } = useToast();

    const { data: rubricsData, isLoading: rubricsLoading, trigger: refreshRubrics, isLoading: isRefreshingRubrics } = useWebhook<{}, { rubrics: RubricListItem[] } | RubricListItem[]>({
        eventName: 'RUBRIC_LIST',
        payload: {},
        allowRawResponse: true,
        cacheKey: 'rubrics:list',
        forceRefreshOnMount: true,
        fallbackToCacheOnError: true,
    });

    const rubrics = Array.isArray(rubricsData) ? rubricsData : rubricsData?.rubrics ?? [];
    const globalRubric = rubrics[0];


    const handleSuccess = useCallback((data: { assessmentId: string }) => {
        toast({ title: "Draft Created", description: "Your new assessment has been saved as a draft." });
        router.push('/teacher/assessments');
    }, [router, toast]);

    // We use the `manual` option here, so the webhook is only called on form submission.
    const { trigger: createAssessment, isLoading: isCreating } = useWebhook<{
        title: string;
        notes?: string;
        rubricName: string;
        rubric_name: string;
        rubricId: string;
        rubric_id: string;
        rubric?: string;
    }, { assessmentId: string }>({
        eventName: 'ASSESSMENT_CREATE_DRAFT',
        manual: true,
        onSuccess: handleSuccess,
        allowEmptyResponse: true,
        allowEchoResponse: true,
    });

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const title = formData.get('title') as string;
        const notes = formData.get('notes') as string;
        const rubricName = globalRubric?.name?.trim();
        const rubricId = globalRubric?.id?.trim();

        if (!title || !rubricName) {
            toast({ variant: 'destructive', title: "Missing fields", description: "Please provide a title. A global rubric must also be configured." });
            return;
        }

        const resolvedRubricId = rubricId || rubricName;

        await createAssessment({
            title,
            notes: notes || undefined,
            rubricName,
            rubric_name: rubricName,
            rubric: rubricName,
            rubricId: resolvedRubricId,
            rubric_id: resolvedRubricId,
        });
    };

    return (
    <div>
      <PageHeader
        title="New Assignment"
        description="Create a new assignment that will apply to all students. It will be saved as a draft."
                actions={
                    <Button variant="outline" onClick={() => refreshRubrics()} disabled={isRefreshingRubrics}>
                        {isRefreshingRubrics ? 'Refreshing Rubrics...' : 'Refresh Rubrics'}
                    </Button>
                }
      />

        <form onSubmit={handleSubmit}>
            <Card>
                <CardHeader>
                    <CardTitle>Assignment Details</CardTitle>
                    <CardDescription>Define the assignment that will be given to all students. The configured global rubric will be used automatically.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Assignment Title</Label>
                        <Input id="title" name="title" placeholder="e.g., Unit 5 Reading Comprehension" required/>
                    </div>
                    {/* Student selection removed — assignments apply to all students */}
                    <div className="space-y-2">
                        <Label>Global Rubric</Label>
                        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                            {rubricsLoading
                                ? 'Loading rubric...'
                                : globalRubric
                                  ? `${globalRubric.name}${globalRubric.version ? ` (v${globalRubric.version})` : ''}`
                                  : 'No global rubric configured'}
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="notes">Initial Notes (Optional)</Label>
                        <Textarea id="notes" name="notes" placeholder="Any initial thoughts or instructions..."/>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isCreating || rubricsLoading || !globalRubric}>
                        {isCreating ? 'Creating Assignment...' : 'Create Assignment'}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    </div>
  );
}
