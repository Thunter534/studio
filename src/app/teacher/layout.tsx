'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { MainLayout } from '@/components/main-layout';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart,
  Users,
  FileText,
  Home,
  Settings,
  Plus,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/loading-spinner';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const mainNavLinks = [
  { href: '/teacher/dashboard', icon: Home, label: 'Home' },
  { href: '/teacher/students', icon: Users, label: 'Students' },
  { href: '/teacher/assessments', icon: FileText, label: 'Assignments' },
  { href: '/teacher/reports', icon: BarChart, label: 'Reports' },
  { href: '/teacher/settings', icon: Settings, label: 'Settings' },
];

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'teacher')) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !isAuthenticated || user?.role !== 'teacher') {
    return <LoadingSpinner fullScreen />;
  }

  const navItems = (
    <div className="flex flex-col h-full justify-between pb-4">
      <SidebarMenu className="gap-4">
        {mainNavLinks.map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href);
          return (
            <SidebarMenuItem key={href} className="flex justify-center px-2">
              <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={label}
                className={cn(
                  "h-12 w-full flex items-center transition-all duration-300 rounded-xl px-3",
                  "group-data-[state=collapsed]:w-12 group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:rounded-full group-data-[state=collapsed]:px-0",
                  isActive 
                    ? "bg-white/15 text-white shadow-lg" 
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                )}
              >
                <Link href={href} className="flex items-center w-full">
                  <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-white/60")} />
                  <span className="text-sm font-bold ml-3 transition-opacity duration-300 group-data-[state=collapsed]:hidden whitespace-nowrap overflow-hidden">
                    {label}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>

      <div className="mt-auto px-2">
        <SidebarMenuItem className="flex justify-center">
          <SidebarMenuButton
            asChild
            tooltip="New Assignment"
            className={cn(
              "h-12 w-full flex items-center transition-all duration-300 rounded-xl px-3 bg-white/5 text-white/60 hover:bg-primary hover:text-white",
              "group-data-[state=collapsed]:w-12 group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:rounded-full group-data-[state=collapsed]:px-0"
            )}
          >
            <Link href="/teacher/assessments/new">
              <Plus className="h-6 w-6 shrink-0" />
              <span className="text-sm ml-3 font-bold transition-opacity duration-300 group-data-[state=collapsed]:hidden whitespace-nowrap overflow-hidden">
                New Assignment
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </div>
    </div>
  );

  return <MainLayout navItems={navItems}>{children}</MainLayout>;
}
