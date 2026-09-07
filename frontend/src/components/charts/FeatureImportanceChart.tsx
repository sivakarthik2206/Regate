"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FeatureImportanceItem } from "@/lib/types";
import { ChartReveal, tooltipStyle } from "./chartUtils";

interface FeatureImportanceChartProps {
  data: FeatureImportanceItem[];
}

// White → dark gray gradient for bar importance
function importanceColor(t: number): string {
  // t=0 (most important) → white; t=1 (least) → dark gray
  const v = Math.round(255 - t * 200);
  return `rgb(${v}, ${v}, ${v})`;
}

export function FeatureImportanceChart({ data }: FeatureImportanceChartProps) {
  const rows = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.importance - a.importance);
    const n = Math.max(1, sorted.length - 1);
    return sorted.map((item, i) => ({
      label: item.label,
      description: item.description,
      importance: Number((item.importance * 100).toFixed(1)),
      color: importanceColor(i / n),
    }));
  }, [data]);

  return (
    <ChartReveal height={Math.max(260, rows.length * 54)}>
      <ResponsiveContainer width="100%" height={Math.max(260, rows.length * 54)}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 44, bottom: 4, left: 8 }}
        >
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey="label"
            width={190}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#737373", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            formatter={(v: number) => [`${v.toFixed(1)}% importance`, ""]}
            labelFormatter={(l) => String(l)}
          />
          <Bar dataKey="importance" radius={[0, 4, 4, 0]} barSize={22}>
            {rows.map((row) => (
              <Cell key={row.label} fill={row.color} />
            ))}
            <LabelList
              dataKey="importance"
              position="right"
              fill="#737373"
              fontSize={11}
              formatter={(v: number) => `${v.toFixed(1)}%`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartReveal>
  );
}
