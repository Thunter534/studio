import { cn } from "@/lib/utils";

export function LoadingSpinner({
  className,
  fullScreen,
}: {
  className?: string;
  fullScreen?: boolean;
}) {
  const spinner = (
    <div
      className={cn(
        "flex items-center justify-center",
        fullScreen && "h-screen w-screen",
        className
      )}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  return spinner;
}
