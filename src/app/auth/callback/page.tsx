'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { completeCognitoSignIn } from '@/lib/cognito';
import { getDefaultDashboardPath } from '@/lib/auth';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const authError = searchParams.get('error_description') || searchParams.get('error');

  const ready = useMemo(() => !!code && !!state, [code, state]);

  useEffect(() => {
    if (authError) {
      setError(authError);
      return;
    }

    if (!code && !state) {
      setError('Missing OAuth callback parameters. Start sign-in from the app home page and try again.');
      return;
    }

    if (!ready || !code || !state) {
      setError('Incomplete OAuth callback parameters. Please sign in again from the app.');
      return;
    }

    void (async () => {
      try {
        const session = await completeCognitoSignIn(code, state);
        router.replace(getDefaultDashboardPath(session.user.role));
      } catch (err: any) {
        setError(err?.message || 'Could not complete sign in.');
      }
    })();
  }, [authError, ready, code, state, router]);

  return (
    <div className="min-h-screen w-full bg-[#FDFBF7] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-md p-8 text-center space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Signing you in</h1>
        {!error ? (
          <>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
            <p className="text-sm text-slate-600">Completing secure login with Cognito...</p>
          </>
        ) : (
          <>
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={() => router.replace('/')}
              className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold bg-slate-900 text-white"
            >
              Back to sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function CognitoCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-[#FDFBF7] flex items-center justify-center p-6">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
