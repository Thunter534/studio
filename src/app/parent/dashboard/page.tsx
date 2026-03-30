'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWebhook } from "@/lib/hooks";
import type { ParentChildrenListResponse, ParentChild } from "@/lib/events";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, User, ChevronRight } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

function ChildCard({ child }: { child: ParentChild }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl">{child.childName}</CardTitle>
                <User className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">{child.gradeLabel}</p>
                <p className="text-xs text-muted-foreground mt-2">
                    Latest Report: {child.latestReportAt ? format(new Date(child.latestReportAt), 'dd MMM yyyy') : 'None'}
                </p>
            </CardContent>
            <div className="p-6 pt-0">
                <Button asChild className="w-full">
                    <Link href={`/parent/children/${child.childId}/reports`}>
                        View Reports <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>
        </Card>
    )
}

function DashboardSkeleton() {
    return (
         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             {[...Array(2)].map((_, i) => (
                <Card key={i}>
                    <CardHeader className="pb-2">
                        <Skeleton className="h-6 w-3/4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-4 w-1/4 mb-2" />
                        <Skeleton className="h-3 w-1/2" />
                    </CardContent>
                    <div className="p-6 pt-0">
                         <Skeleton className="h-11 w-full" />
                    </div>
                </Card>
             ))}
         </div>
    )
}

export default function ParentDashboard() {
  const { data, isLoading, error, trigger } = useWebhook<{}, ParentChildrenListResponse>({
      eventName: 'PARENT_CHILDREN_LIST',
  });

  if (isLoading) {
      return (
          <div>
              <PageHeader
                title="Parent Portal"
                description="View your child’s progress reports."
              />
              <DashboardSkeleton />
          </div>
      )
  }

  if (error) {
      return (
          <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                  Could not load your information. Please try again.
                   <div className="mt-4">
                        <Button variant="destructive" onClick={() => trigger()}>Retry</Button>
                    </div>
              </AlertDescription>
          </Alert>
      )
  }

  return (
    <div>
      <PageHeader
        title="Parent Portal"
        description="View your child’s progress reports."
      />
      
      {data?.children && data.children.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {data.children.map(child => <ChildCard key={child.childId} child={child} />)}
          </div>
      ) : (
          <Card>
              <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No children are currently linked to your account.</p>
              </CardContent>
          </Card>
      )}
    </div>
  );
}
