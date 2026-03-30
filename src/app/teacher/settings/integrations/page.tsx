
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page's content has been merged into the main /teacher/settings page.
// This component now just redirects to the new settings page.
export default function OldIntegrationsPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/teacher/settings?tab=integrations');
    }, [router]);
    
  return null;
}
