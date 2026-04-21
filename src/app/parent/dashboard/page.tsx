'use client';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWebhook } from "@/lib/hooks";
import type { ParentChildrenListResponse, ParentChild } from "@/lib/events";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, User, ChevronRight, Activity } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

function ChildCard({ child }: { child: ParentChild }) {
    return (
        <Card className="rounded-[2rem] border-border bg-white dark:bg-[#111827] shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-8 pt-8">
                <CardTitle className="text-xl font-bold">{child.childName}</CardTitle>
                <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center border border-border">
                    <User className="h-5 w-5 text-primary" />
                </div>
            </CardHeader>
            <CardContent className="px-8">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{child.gradeLabel}</p>
                <p className="text-[10px] font-bold text-muted-foreground/60 mt-4 uppercase tracking-widest">
                    Last Sync: {child.latestReportAt ? format(new Date(child.latestReportAt), 'dd MMM yyyy') : 'No records yet'}
                </p>
            </CardContent>
            <div className="p-8 pt-4">
                <Button asChild className="w-full bg-primary hover:opacity-90 font-bold rounded-xl h-11">
                    <Link href={`/parent/children/${child.childId}/reports`}>
                        View Records <ChevronRight className="ml-2 h-4 w-4" />
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
                <Card key={i} className="rounded-[2rem]">
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
      suppressErrorToast: true
  });

  if (isLoading) {
      return (
          <div>
              <PageHeader
                title="Parent Portal"
                description="View your child’s progress reports."
                hideBack
              />
              <DashboardSkeleton />
          </div>
      )
  }

  // If there's a sync error and no cached data
  if (error && (!data || !data.children)) {
      return (
          <div className="space-y-6">
            <PageHeader
                title="Parent Portal"
                description="Connection notice."
                hideBack
            />
            <div className="max-w-2xl mx-auto p-12 text-center bg-card rounded-[2.5rem] border border-border shadow-sm">
                <div className="h-16 w-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Activity className="h-8 w-8 text-muted-foreground animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Sync Notice</h3>
                <p className="text-sm font-medium text-muted-foreground mb-8 max-w-md mx-auto">We encountered a temporary connection issue while retrieving your child's records. Please try again or contact your administrator.</p>
                <Button onClick={() => trigger()} variant="outline" className="h-12 px-10 font-bold rounded-xl border-border">Retry Sync</Button>
            </div>
          </div>
      )
  }

  return (
    <div>
      <PageHeader
        title="Parent Portal"
        description="Select a student to view their academic records and finalized reports."
        hideBack
      />
      
      {data?.children && data.children.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {data.children.map(child => <ChildCard key={child.childId} child={child} />)}
          </div>
      ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-card rounded-[2rem] border border-dashed border-border w-full shadow-sm mt-8">
              <User className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-bold">No students are currently linked to your portal account.</p>
              <p className="text-xs text-muted-foreground/60 mt-1 uppercase tracking-widest">Contact your school administrator to enroll.</p>
          </div>
      )}
    </div>
  );
}
