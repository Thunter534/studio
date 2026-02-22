'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { UserNav } from './user-nav';
import { Logo } from './logo';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
} from '@/components/ui/sidebar';

export function MainLayout({
  children,
  navItems,
}: {
  children: React.ReactNode;
  navItems: React.ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();
  
  if (!user) return null;

  return (
    <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <Logo />
          </SidebarHeader>
          <SidebarContent>{navItems}</SidebarContent>
        </Sidebar>
        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.back()}
                  aria-label="Go back"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </div>
              <div className="w-full flex-1">
                {/* Global search could go here */}
              </div>
              <UserNav />
          </header>
          <main className="flex-1 bg-muted/40">
            <div className="mx-auto w-full max-w-6xl p-6">
              {children}
            </div>
          </main>
        </div>
    </SidebarProvider>
  );
}
