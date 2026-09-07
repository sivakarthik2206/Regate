"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { PenaltiesByOwnershipItem } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { ChartReveal, tooltipStyle } from "./chartUtils";

interface OwnershipDonutProps {
  data: PenaltiesByOwnershipItem[];
}

const SEGMENTS: { key: string; color: string }[] = [
  { key: "Government", color: "#404040" },
  { key: "Proprietary", color: "#FF4D6D" },
  { key: "Voluntary Non-profit", color: "#00C896" },
  { key: "Other", color: "#F7A800" },
];

function matchSegment(ownership: string): string {
  const v = ownership.toLowerCase();
  if (v.includes("gov")) return "Government";
  if (v.includes("propriet")) return "Proprietary";
  if (v.includes("non-profit") || v.includes("voluntary") || v.includes("nonprofit"))
    return "Voluntary Non-profit";
  return "Other";
}

export function OwnershipDonut({ data }: OwnershipDonutProps) {
  const { rows, totalHospitals } = useMemo(() => {
    const buckets = new Map<string, { penalized: number; total: number; rateSum: number; n: number }>();
    for (const seg of SEGMENTS) buckets.set(seg.key, { penalized: 0, total: 0, rateSum: 0, n: 0 });
    let total = 0;
    for (const item of data) {
      const key = matchSegment(item.ownership_type);
      const b = buckets.get(key)!;
      b.penalized += item.penalized_count;
      b.total += item.total_count;
      b.rateSum += item.penalty_rate_pct;
      b.n += 1;
      total += item.total_count;
    }
    const rows = SEGMENTS.map((seg) => {
      const b = buckets.get(seg.key)!;
      const rate = b.total > 0 ? (b.penalized / b.total) * 100 : b.n > 0 ? b.rateSum / b.n : 0;
      return {
        name: seg.key,
        color: seg.color,
        penalty_rate_pct: Number(rate.toFixed(1)),
        total: b.total,
        penalized: b.penalized,
      };
    }).filter((r) => r.total > 0);
    return { rows, totalHospitals: total };
  }, [data]);

  return (
    <div>
      <ChartReveal height={260}>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={rows}
              dataKey="penalty_rate_pct"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={2}
              stroke="#000"
              strokeWidth={2}
            >
              {rows.map((row) => (
                <Cell key={row.name} fill={row.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number, _n, entry) => {
                const p = entry?.payload as (typeof rows)[number] | undefined;
                return [
                  `${value.toFixed(1)}% penalized`,
                  p ? `${p.name} (${formatNumber(p.total)} hospitals)` : "",
                ];
              }}
            />
            <text
              x="50%"
              y="46%"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#ffffff"
              fontFamily="var(--font-display)"
              fontSize={22}
              fontWeight={700}
            >
              {formatNumber(totalHospitals)}
            </text>
            <text
              x="50%"
              y="57%"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#737373"
              fontSize={10}
              fontFamily="var(--font-sans)"
            >
              hospitals
            </text>
          </PieChart>
        </ResponsiveContainer>
      </ChartReveal>

      <ul className="mt-4 space-y-2">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-white/60">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: row.color }} />
              {row.name}
            </span>
            <span className="tabular-nums font-semibold text-white">
              {row.penalty_rate_pct.toFixed(1)}%
              <span className="ml-1 text-xs font-normal text-white/30">
                ({formatNumber(row.total)})
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
