import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  trend: "up" | "down" | "neutral";
  trendValue: string;
  accentColor: "cyan" | "risk-red" | "amber" | "safe-green";
}

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  accentColor,
}: StatCardProps): JSX.Element {
  const accentClasses = {
    cyan: "border-l-cyan shadow-[0_0_15px_rgba(0,212,255,0.08)]",
    "risk-red": "border-l-risk-red shadow-[0_0_15px_rgba(255,77,109,0.08)]",
    amber: "border-l-amber shadow-[0_0_15px_rgba(247,168,0,0.08)]",
    "safe-green": "border-l-safe-green shadow-[0_0_15px_rgba(0,200,150,0.08)]",
  };

  const trendColors = {
    up: "text-risk-red bg-risk-red/10 border-risk-red/20",
    down: "text-safe-green bg-safe-green/10 border-safe-green/20",
    neutral: "text-white/40 bg-white/5 border-white/10",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[24px] border border-white/8 bg-card-900/90 p-6 border-l-4 transition-all duration-300 hover:translate-y-[-2px] hover:border-white/12",
        accentClasses[accentColor]
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium tracking-wide text-white/50">{title}</span>
        <div
          className={cn(
            "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
            trendColors[trend]
          )}
        >
          {trend === "up" && <TrendingUp className="h-3 w-3" />}
          {trend === "down" && <TrendingDown className="h-3 w-3" />}
          {trend === "neutral" && <Minus className="h-3 w-3" />}
          <span>{trendValue}</span>
        </div>
      </div>

      <div className="mt-4 font-display text-[48px] font-bold leading-none tracking-tight text-white">
        {value}
      </div>

      <div className="mt-2 text-xs text-white/40">{subtitle}</div>
    </div>
  );
}
