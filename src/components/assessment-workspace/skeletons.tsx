'use client';

import { Skeleton } from "@/components/ui/skeleton";

export function AssessmentWorkspaceSkeleton() {
    return (
        <div className="w-full">
            {/* Header Skeleton */}
            <div className="mb-6">
                <div className="mb-4">
                    <Skeleton className="h-9 w-36" />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <Skeleton className="h-9 w-64 mb-2" />
                        <Skeleton className="h-5 w-48" />
                    </div>
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-6 w-24 rounded-full" />
                        <Skeleton className="h-11 w-40" />
                    </div>
                </div>
            </div>

            {/* Body Skeleton */}
            <div className="grid grid-cols-12 gap-6 h-[80vh]">
                {/* Left Panel */}
                <div className="col-span-3 p-4 border rounded-lg">
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-48 mb-6" />
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-px w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-11 w-36" />
                    </div>
                </div>
                {/* Center Panel */}
                <div className="col-span-5 p-4 border rounded-lg">
                    <Skeleton className="h-6 w-36 mb-2" />
                    <Skeleton className="h-4 w-52 mb-4" />
                    <div className="rounded-md border p-4 space-y-3 h-full">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-[90%]" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-[80%]" />
                        <Skeleton className="h-4 w-full" />
                         <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-[90%]" />
                    </div>
                </div>
                {/* Right Panel */}
                <div className="col-span-4 p-4 border rounded-lg">
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-64 mb-6" />
                    <div className="space-y-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-px w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}
