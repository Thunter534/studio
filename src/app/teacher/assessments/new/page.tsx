'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useWebhook } from "@/lib/hooks";
import type { RubricListItem } from "@/lib/events";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
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


    const handleSuccess = useCallback((data: { assessmentId: string }) => {
        toast({ title: "Draft Created", description: "Your new assessment has been saved as a draft." });
        router.push('/teacher/assessments');
    }, [router, toast]);

    // We use the `manual` option here, so the webhook is only called on form submission.
    const { trigger: createAssessment, isLoading: isCreating } = useWebhook<{ title: string, rubricName: string, notes?: string }, { assessmentId: string }>({
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
        const rubricName = formData.get('rubricName') as string;
        const notes = formData.get('notes') as string;

        if (!title || !rubricName) {
            toast({ variant: 'destructive', title: "Missing fields", description: "Please provide a title and select a rubric." });
            return;
        }

        await createAssessment({ title, rubricName, notes: notes || undefined });
    };

    return (
    <div>
        <div className="mb-4">
            <Button asChild variant="outline" size="sm">
                <Link href="/teacher/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
            </Button>
        </div>
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
                    <CardDescription>Define the assignment that will be given to all students. You must select a rubric to continue.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Assignment Title</Label>
                        <Input id="title" name="title" placeholder="e.g., Unit 5 Reading Comprehension" required/>
                    </div>
                    {/* Student selection removed — assignments apply to all students */}
                    <div className="space-y-2">
                        <Label htmlFor="rubricName">Rubric</Label>
                         <Select name="rubricName" required>
                            <SelectTrigger id="rubricName" disabled={rubricsLoading}>
                                <SelectValue placeholder={rubricsLoading ? "Loading rubrics..." : "Select a rubric"} />
                            </SelectTrigger>
                            <SelectContent>
                                {rubrics.map((rubric, index) => (
                                    <SelectItem key={`${rubric.name}-${index}`} value={rubric.name}>
                                        {rubric.name}
                                        {rubric.version ? (
                                          <span className="text-muted-foreground ml-2">(v{rubric.version})</span>
                                        ) : null}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="notes">Initial Notes (Optional)</Label>
                        <Textarea id="notes" name="notes" placeholder="Any initial thoughts or instructions..."/>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isCreating || rubricsLoading}>
                        {isCreating ? 'Creating Assignment...' : 'Create Assignment'}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    </div>
  );
}
