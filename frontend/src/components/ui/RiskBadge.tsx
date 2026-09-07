import { cn, normalizeTier, type RiskTier } from "@/lib/utils";

interface RiskBadgeProps {
  tier: string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const STYLES: Record<RiskTier, string> = {
  "No Risk": "bg-safe/15 text-safe-light border-safe/30",
  Low: "bg-safe/15 text-safe-light border-safe/30",
  Medium: "bg-amber/15 text-amber-light border-amber/30",
  High: "bg-risk/15 text-risk-light border-risk/40 animate-pulse-glow-risk",
};

const SIZES = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3.5 py-1.5 text-sm",
};

export function RiskBadge({ tier, size = "md", className }: RiskBadgeProps) {
  const normalized = normalizeTier(tier);
  const label = normalized === "No Risk" ? "No Risk" : `${normalized} Risk`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wide",
        STYLES[normalized],
        SIZES[size],
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          normalized === "High" && "bg-risk",
          normalized === "Medium" && "bg-amber",
          (normalized === "Low" || normalized === "No Risk") && "bg-safe",
        )}
      />
      {label}
    </span>
  );
}
