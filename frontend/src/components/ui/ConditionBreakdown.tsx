import type { ConditionBreakdownItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ConditionBreakdownProps {
  conditions: ConditionBreakdownItem[];
  className?: string;
}

export function ConditionBreakdown({ conditions, className }: ConditionBreakdownProps) {
  const maxRate = Math.max(
    1,
    ...conditions.map((c) => Math.max(c.readmission_rate ?? 0, c.national_avg ?? 0)),
  );

  return (
    <div className={cn("space-y-4", className)}>
      {conditions.map((c) => {
        const rate = c.readmission_rate ?? 0;
        const nat = c.national_avg ?? 0;
        const worse = c.compared_to_national.toLowerCase() === "worse";
        const gap = rate - nat;
        const barColor = worse ? "bg-risk" : "bg-safe";
        return (
          <div key={c.condition}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-200">{c.condition_name}</span>
              <span className="font-mono text-xs text-slate-400">
                {rate ? `${rate.toFixed(1)}%` : "—"}
                {nat ? <span className="text-slate-600"> vs {nat.toFixed(1)}%</span> : null}
              </span>
            </div>
            <div className="relative mt-1.5 h-3 overflow-hidden rounded-full bg-navy-200">
              {/* National average marker */}
              {nat > 0 && (
                <div
                  className="absolute top-0 z-10 h-full w-0.5 bg-slate-300"
                  style={{ left: `${(nat / maxRate) * 100}%` }}
                  title={`National avg ${nat.toFixed(1)}%`}
                />
              )}
              <div
                className={cn("h-full rounded-full transition-all", barColor)}
                style={{ width: `${(rate / maxRate) * 100}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span
                className={cn(
                  "font-semibold",
                  worse ? "text-risk-light" : "text-safe-light",
                )}
              >
                {gap >= 0 ? "+" : ""}
                {gap.toFixed(1)} pts {worse ? "above" : "below"} national
              </span>
              <span className="text-slate-500">{c.risk_contribution_pct.toFixed(0)}% of risk</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
