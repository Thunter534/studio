'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Only log to console in development
    if (process.env.NODE_ENV === 'development') {
        console.error(error);
    }
  }, [error]);

  return (
    <div className="flex h-[60vh] flex-col items-center justify-center space-y-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <AlertCircle className="h-10 w-10 text-primary" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Workspace Sync Notice</h2>
        <p className="max-w-[400px] text-muted-foreground text-sm font-medium">
          Athena was unable to load this section of your workspace. Please try refreshing your session or contact your system administrator for assistance.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={() => reset()} className="font-bold rounded-xl h-11 px-8 shadow-lg shadow-primary/20">
          Retry Sync
        </Button>
        <Button onClick={() => window.location.href = '/teacher/dashboard'} variant="outline" className="font-bold rounded-xl h-11 px-8">
            Return Home
        </Button>
      </div>
    </div>
  );
}
