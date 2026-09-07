import { cn } from "@/lib/utils";

interface SkeletonProps {
  variant?: "card" | "chart" | "table" | "text";
  className?: string;
  rows?: number;
}

export function Skeleton({ variant = "text", className, rows = 5 }: SkeletonProps) {
  if (variant === "card") {
    return (
      <div className={cn("card animate-pulse p-6", className)}>
        <div className="h-3 w-24 rounded bg-navy-300" />
        <div className="mt-4 h-8 w-32 rounded bg-navy-300" />
        <div className="mt-3 h-3 w-40 rounded bg-navy-200" />
      </div>
    );
  }
  if (variant === "chart") {
    return (
      <div className={cn("card animate-pulse p-6", className)}>
        <div className="h-3 w-32 rounded bg-navy-300" />
        <div className="mt-6 flex h-48 items-end gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-navy-300"
              style={{ height: `${30 + ((i * 37) % 60)}%` }}
            />
          ))}
        </div>
      </div>
    );
  }
  if (variant === "table") {
    return (
      <div className={cn("card animate-pulse overflow-hidden", className)}>
        <div className="h-11 w-full bg-navy-200" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 border-t border-navy-300/50 px-4 py-3">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-3 flex-1 rounded bg-navy-300" />
            ))}
          </div>
        ))}
      </div>
    );
  }
  return <div className={cn("h-4 w-full animate-pulse rounded bg-navy-300", className)} />;
}
