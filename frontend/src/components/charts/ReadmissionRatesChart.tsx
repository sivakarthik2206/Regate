"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReadmissionBenchmarkItem } from "@/lib/types";
import { ChartReveal, tooltipLabelStyle, tooltipStyle } from "./chartUtils";

interface ReadmissionRatesChartProps {
  data: ReadmissionBenchmarkItem[];
}

const SERIES = [
  { key: "national_avg", name: "National Avg", color: "#525252" },
  { key: "penalized_avg", name: "Penalized", color: "#FF4D6D" },
  { key: "safe_avg", name: "Safe", color: "#00C896" },
] as const;

function WrappedTick({ x, y, payload }: any) {
  const words: string[] = String(payload.value).split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > 16) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`;
    }
  }
  if (current) lines.push(current.trim());
  return (
    <g transform={`translate(${x},${y + 10})`}>
      {lines.map((line, i) => (
        <text key={i} x={0} y={i * 12} textAnchor="middle" fill="#737373" fontSize={11}>
          {line}
        </text>
      ))}
    </g>
  );
}

export function ReadmissionRatesChart({ data }: ReadmissionRatesChartProps) {
  const chartData = data.map((d) => ({
    condition: d.condition_full_name,
    national_avg: d.national_avg,
    penalized_avg: d.penalized_avg,
    safe_avg: d.safe_avg,
  }));

  return (
    <ChartReveal height={380}>
      <ResponsiveContainer width="100%" height={380}>
        <BarChart data={chartData} margin={{ top: 24, right: 8, bottom: 40, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="condition"
            stroke="rgba(255,255,255,0.1)"
            tickLine={false}
            interval={0}
            height={56}
            tick={<WrappedTick />}
          />
          <YAxis stroke="rgba(255,255,255,0.1)" fontSize={12} tickLine={false} unit="%" tick={{ fill: "#737373" }} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={tooltipLabelStyle}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            formatter={(v: number) => [`${v?.toFixed?.(1) ?? v}%`, ""]}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#737373", paddingTop: 8 }} />
          {SERIES.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[3, 3, 0, 0]}>
              <LabelList
                dataKey={s.key}
                position="top"
                fill="#525252"
                fontSize={9}
                formatter={(v: number) => (v != null ? v.toFixed(1) : "")}
              />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartReveal>
  );
}
