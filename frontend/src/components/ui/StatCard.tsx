"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { useCountUp } from "@/lib/hooks";
import { cn, formatNumber } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  subtitle?: string;
  trend?: "up" | "down";
  trendValue?: string;
  accentColor?: "cyan" | "risk" | "safe" | "amber";
  decimals?: number;
  compact?: boolean;
  className?: string;
}

const ACCENTS: Record<string, string> = {
  cyan: "text-white",
  risk: "text-risk",
  safe: "text-safe",
  amber: "text-amber",
};

export function StatCard({
  title,
  value,
  prefix,
  suffix,
  subtitle,
  trend,
  trendValue,
  accentColor = "cyan",
  decimals = 0,
  compact = false,
  className,
}: StatCardProps) {
  const { ref, value: animated } = useCountUp(value, 1200, false);

  const display = compact ? formatCompact(animated) : formatNumber(animated, decimals);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={cn(
        "card card-hover relative overflow-hidden p-6",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">{title}</p>
        {trend && trendValue && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              trend === "up" ? "bg-risk/10 text-risk" : "bg-safe/10 text-safe",
            )}
          >
            {trend === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trendValue}
          </span>
        )}
      </div>
      <p className={cn("mt-4 font-display text-3xl font-bold tabular-nums", ACCENTS[accentColor])}>
        {prefix}
        {display}
        {suffix}
      </p>
      {subtitle && <p className="mt-1.5 text-xs text-white/30">{subtitle}</p>}
    </div>
  );
}

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return formatNumber(value, 0);
}
