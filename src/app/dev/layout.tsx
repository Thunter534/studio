'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default function DevLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      router.replace('/');
    }
  }, [router]);

  if (process.env.NODE_ENV !== 'development') {
    return (
        <div className="flex h-screen items-center justify-center">
             <Alert variant="destructive" className="max-w-md">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>
                    This page is only available in the development environment.
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  return (
    <div className="m-4">
        <Alert className="mb-4 bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Developer Mode</AlertTitle>
            <AlertDescription>
                You are viewing a developer-only page. This will not be accessible in production.
            </AlertDescription>
        </Alert>
        {children}
    </div>
    );
}
