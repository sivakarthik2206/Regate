import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps): JSX.Element {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-white/5",
        className
      )}
    />
  );
}
