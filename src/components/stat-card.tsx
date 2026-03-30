'use client';

import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  variant?: 'amber' | 'primary' | 'purple' | 'red';
  onClick?: () => void;
}

const variants = {
  amber: {
    border: "border-l-amber-500",
    iconBg: "bg-amber-100 dark:bg-amber-500/15",
    iconColor: "text-amber-600 dark:text-amber-500",
    hover: "hover:bg-amber-50/30 dark:hover:bg-amber-500/5",
  },
  primary: {
    border: "border-l-primary",
    iconBg: "bg-secondary dark:bg-primary/15",
    iconColor: "text-primary dark:text-primary",
    hover: "hover:bg-secondary/30 dark:hover:bg-primary/5",
  },
  purple: {
    border: "border-l-purple-500",
    iconBg: "bg-purple-100 dark:bg-purple-500/15",
    iconColor: "text-purple-600 dark:text-purple-500",
    hover: "hover:bg-purple-50/30 dark:hover:bg-purple-500/5",
  },
  red: {
    border: "border-l-red-500",
    iconBg: "bg-red-100 dark:bg-red-500/15",
    iconColor: "text-red-600 dark:text-red-500",
    hover: "hover:bg-red-50/30 dark:hover:bg-red-500/5",
  },
};

export function StatCard({ title, value, icon: Icon, description, variant = 'primary', onClick }: StatCardProps) {
  const style = variants[variant];

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "relative group overflow-hidden border-none shadow-[0_8px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all duration-300 rounded-2xl bg-white dark:bg-[#111827] p-7 border-l-4",
        style.border,
        onClick && "cursor-pointer hover:-translate-y-1",
        style.hover
      )}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-1">
            {title}
          </p>
          <div className="text-3xl font-extrabold text-[#111827] dark:text-[#E5E7EB] tracking-tight">
            {value}
          </div>
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed pt-1">
              {description}
            </p>
          )}
        </div>
        <div className={cn("h-11 w-11 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110", style.iconBg)}>
          <Icon className={cn("h-5 w-5", style.iconColor)} />
        </div>
      </div>
    </Card>
  );
}

export function StatCardSkeleton() {
    return (
        <Card className="border-none rounded-2xl bg-white dark:bg-[#111827] p-7 shadow-sm">
            <div className="flex justify-between items-start">
                <div className="space-y-3">
                    <Skeleton className="h-2 w-16" />
                    <Skeleton className="h-8 w-14" />
                    <Skeleton className="h-2 w-24" />
                </div>
                <Skeleton className="h-11 w-11 rounded-full" />
            </div>
        </Card>
    )
}
