'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirecting to home page where the integrated splash-to-login
 * animation now resides.
 */
export default function LoginPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen w-full bg-[#FDFBF7] flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
    </div>
  );
}
