import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center transition-all duration-300", className)}>
      <div className="flex items-center select-none font-extrabold font-logo tracking-tight text-2xl md:text-3xl leading-none">
        <span className="text-primary transition-all duration-300 group-data-[state=collapsed]:hidden uppercase">
          ATHENA
        </span>
        <span className="text-primary hidden transition-all duration-300 group-data-[state=collapsed]:block group-data-[state=collapsed]:scale-125 font-extrabold">
          A
        </span>
      </div>
    </div>
  );
}
