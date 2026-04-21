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
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Portal Connection Notice</h2>
        <p className="max-w-[400px] text-muted-foreground text-sm font-medium">
          We encountered an issue loading your child's information. Please try refreshing the page or contact the school administration if this issue persists.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={() => reset()} className="font-bold rounded-xl h-11 px-8 shadow-lg shadow-primary/20">
          Try Again
        </Button>
        <Button onClick={() => window.location.href = '/parent/dashboard'} variant="outline" className="font-bold rounded-xl h-11 px-8">
            Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
