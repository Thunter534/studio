'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { UserNav } from './user-nav';
import { Logo } from './logo';
import { getDefaultDashboardPath } from '@/lib/auth';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { LogOut, Bell, Sun, Moon, ChevronRight, ChevronLeft, X } from 'lucide-react';
import Link from 'next/link';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { activityTracker, type ActivityEntry } from '@/lib/activity-tracker';

type NotificationItem = {
  id: string;
  text: string;
  time: string;
  isNew: boolean;
};

const NOTIFICATION_SEEN_AT_KEY = 'athena_notifications_seen_at';
const DISMISSED_NOTIFICATION_IDS_KEY = 'athena_notifications_dismissed_ids';

const getDismissedNotificationIds = (): Set<string> => {
  if (typeof window === 'undefined') {
    return new Set();
  }
  const raw = window.localStorage.getItem(DISMISSED_NOTIFICATION_IDS_KEY);
  if (!raw) {
    return new Set();
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map((id) => String(id))) : new Set();
  } catch {
    return new Set();
  }
};

const persistDismissedNotificationIds = (ids: Set<string>) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(DISMISSED_NOTIFICATION_IDS_KEY, JSON.stringify(Array.from(ids)));
};

const formatNotificationTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Just now';
  }
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const mapActivitiesToNotifications = (entries: ActivityEntry[]): NotificationItem[] => {
  const seenAtRaw = typeof window !== 'undefined' ? window.localStorage.getItem(NOTIFICATION_SEEN_AT_KEY) : null;
  const seenAt = seenAtRaw ? new Date(seenAtRaw) : null;
  const seenTime = seenAt && !Number.isNaN(seenAt.getTime()) ? seenAt.getTime() : 0;
  const dismissedIds = getDismissedNotificationIds();

  return entries.map((entry) => {
    const updatedTime = new Date(entry.updatedAt).getTime();
    return {
      id: entry.id,
      text: entry.subtitle ? `${entry.title}: ${entry.subtitle}` : entry.title,
      time: formatNotificationTime(entry.updatedAt),
      isNew: Number.isFinite(updatedTime) ? updatedTime > seenTime : true,
    };
  }).filter((entry) => !dismissedIds.has(entry.id));
};

function CustomSidebarTrigger() {
  const { toggleSidebar, state } = useSidebar();
  return (
    <button
      onClick={toggleSidebar}
      className="absolute -right-3.5 top-8 z-50 h-7 w-7 rounded-full bg-[#0F172A] border-2 border-white dark:border-[#0F172A] text-white flex items-center justify-center shadow-md hover:scale-110 transition-all"
    >
      {state === 'collapsed' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
    </button>
  );
}

export function MainLayout({
  children,
  navItems,
}: {
  children: React.ReactNode;
  navItems: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotificationsMenuOpen, setIsNotificationsMenuOpen] = useState(false);
  const [isAlertsDialogOpen, setIsAlertsDialogOpen] = useState(false);
  
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const refreshNotifications = () => {
      const entries = activityTracker.get();
      setNotifications(mapActivitiesToNotifications(entries));
    };

    refreshNotifications();
    window.addEventListener('athena_activity_updated', refreshNotifications);
    return () => window.removeEventListener('athena_activity_updated', refreshNotifications);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const dismissNotification = (notificationId: string) => {
    const dismissedIds = getDismissedNotificationIds();
    dismissedIds.add(notificationId);
    persistDismissedNotificationIds(dismissedIds);
    setNotifications((previous) => previous.filter((item) => item.id !== notificationId));
  };

  const markNotificationsAsSeen = () => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(NOTIFICATION_SEEN_AT_KEY, new Date().toISOString());
    setNotifications(mapActivitiesToNotifications(activityTracker.get()));
  };

  const openAllAlertsDialog = () => {
    setIsNotificationsMenuOpen(false);
    markNotificationsAsSeen();
    window.setTimeout(() => {
      setIsAlertsDialogOpen(true);
    }, 0);
  };

  if (!user) return null;

  const dashboardLink = getDefaultDashboardPath(user.role);

  return (
    <SidebarProvider defaultOpen={false}>
        <div className="relative flex min-h-screen w-full">
          <Sidebar collapsible="icon" className="border-none shadow-2xl bg-[#0F172A] z-40 transition-all duration-300 ease-in-out group-data-[state=collapsed]:w-[4.5rem]" id="onboarding-sidebar">
            <CustomSidebarTrigger />
            
            <SidebarHeader className="h-24 flex items-center justify-center pt-8 mb-4">
              <Link href={dashboardLink} className="transition-transform hover:scale-105 active:scale-95">
                <Logo />
              </Link>
            </SidebarHeader>
            
            <SidebarContent className="px-0 overflow-visible">
              {navItems}
            </SidebarContent>

            <SidebarFooter className="p-4 mt-auto border-none flex justify-center pb-8">
              <button 
                className="flex items-center justify-center h-10 w-10 text-primary hover:text-white hover:bg-primary/20 rounded-full transition-all duration-300"
                onClick={logout}
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </SidebarFooter>
          </Sidebar>

          <div className="flex flex-1 flex-col h-screen min-w-0 bg-transparent dark:bg-transparent overflow-y-auto">
            <header className="flex h-16 items-center gap-4 px-4 sm:px-6 shrink-0">
                <div className="w-full flex-1" />
                <div className="flex items-center gap-3 pr-2">
                  {/* Floating Circular Theme Toggle */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 bg-white dark:bg-slate-800 shadow-sm rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border border-border/40"
                    onClick={toggleTheme}
                  >
                    {theme === 'light' ? <Moon className="h-4.5 w-4.5 text-slate-600" /> : <Sun className="h-4.5 w-4.5 text-slate-300" />}
                  </Button>

                  {/* Floating Circular Notifications */}
                  <DropdownMenu
                    open={isNotificationsMenuOpen}
                    onOpenChange={(open) => {
                      setIsNotificationsMenuOpen(open);
                      if (!open) {
                        return;
                      }
                      markNotificationsAsSeen();
                    }}
                  >
                    <DropdownMenuTrigger asChild>
                      <div className="relative cursor-pointer">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 bg-white dark:bg-slate-800 shadow-sm rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border border-border/40"
                        >
                          <Bell className="h-4.5 w-4.5 text-slate-600 dark:text-slate-300" />
                        </Button>
                        {notifications.length > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-orange-500 border border-white dark:border-slate-900" />
                        )}
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-80 rounded-2xl shadow-xl mt-2" align="end">
                      <DropdownMenuLabel className="font-bold text-xs uppercase tracking-widest px-4 py-3">Notifications</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <div className="max-h-[300px] overflow-y-auto">
                        {notifications.length > 0 ? notifications.map((notif) => (
                          <DropdownMenuItem key={notif.id} className="p-4 cursor-pointer focus:bg-secondary/50 rounded-none border-b border-border/50 last:border-0">
                            <div className="flex w-full gap-3 items-start">
                              {notif.isNew && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                              <div className="space-y-1 min-w-0 flex-1">
                                <p className={cn("text-sm leading-tight", notif.isNew ? "font-bold text-foreground" : "font-medium text-muted-foreground")}>
                                  {notif.text}
                                </p>
                                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">{notif.time}</p>
                              </div>
                              <button
                                type="button"
                                aria-label="Dismiss notification"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  dismissNotification(notif.id);
                                }}
                                className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/70 flex items-center justify-center transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </DropdownMenuItem>
                        )) : (
                          <div className="px-4 py-8 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">No notifications</div>
                        )}
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="justify-center p-3 font-bold text-[10px] text-primary uppercase tracking-widest cursor-pointer rounded-b-2xl"
                        onClick={openAllAlertsDialog}
                        onSelect={openAllAlertsDialog}
                      >
                        View All Alerts
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Dialog open={isAlertsDialogOpen} onOpenChange={setIsAlertsDialogOpen}>
                    <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden">
                      <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
                        <DialogTitle className="text-base font-bold uppercase tracking-widest">All Alerts</DialogTitle>
                        <DialogDescription>Review your recent activity notifications.</DialogDescription>
                      </DialogHeader>
                      <div className="max-h-[60vh] overflow-y-auto">
                        {notifications.length > 0 ? notifications.map((notif) => (
                          <div key={`dialog-${notif.id}`} className="px-6 py-4 border-b border-border/60 last:border-0">
                            <div className="flex w-full gap-3 items-start">
                              {notif.isNew && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                              <div className="space-y-1 min-w-0 flex-1">
                                <p className={cn("text-sm leading-tight", notif.isNew ? "font-bold text-foreground" : "font-medium text-muted-foreground")}>
                                  {notif.text}
                                </p>
                                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">{notif.time}</p>
                              </div>
                              <button
                                type="button"
                                aria-label="Dismiss notification"
                                onClick={() => dismissNotification(notif.id)}
                                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/70 flex items-center justify-center transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )) : (
                          <div className="px-6 py-12 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">No notifications</div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  <div className="h-5 w-px bg-slate-300/50 mx-1 hidden sm:block" />
                  
                  {/* Floating Pill Profile */}
                  <UserNav />
                </div>
            </header>
            <main className="flex-1">
              <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
                {children}
              </div>
            </main>
          </div>
        </div>
    </SidebarProvider>
  );
}
