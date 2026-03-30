'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { MainLayout } from '@/components/main-layout';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';
import { LoadingSpinner } from '@/components/loading-spinner';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/parent/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
];

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'parent')) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !isAuthenticated || user?.role !== 'parent') {
    return <LoadingSpinner fullScreen />;
  }

  const navItems = (
    <SidebarMenu className="gap-2">
      {navLinks.map(({ href, icon: Icon, label }) => {
        const isActive = pathname.startsWith(href);
        return (
          <SidebarMenuItem key={href} className="flex justify-center px-2">
            <SidebarMenuButton
              asChild
              isActive={isActive}
              tooltip={label}
              className={cn(
                "h-11 w-full flex items-center transition-all duration-200 rounded-xl px-4",
                "group-data-[state=collapsed]:w-11 group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:rounded-full group-data-[state=collapsed]:px-0",
                isActive 
                  ? "bg-white/10 text-white font-bold shadow-sm" 
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <Link href={href} className="flex items-center w-full">
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-white/60")} />
                <span className="text-sm ml-3 transition-opacity duration-300 group-data-[state=collapsed]:hidden whitespace-nowrap overflow-hidden">
                  {label}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return <MainLayout navItems={navItems}>{children}</MainLayout>;
}
