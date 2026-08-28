"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { HospitalPenaltyByOwnership } from "@/lib/types";

interface OwnershipChartProps {
  data: HospitalPenaltyByOwnership[];
}

const COLORS = ["#00D4FF", "#F7A800", "#FF4D6D", "#00C896", "#a78bfa", "#f472b6"];

export function OwnershipChart({ data }: OwnershipChartProps): JSX.Element {
  const chartData = React.useMemo(() => {
    return data.map((item) => ({
      name: item.ownership,
      value: item.count,
      rate: item.penalty_rate * 100,
    }));
  }, [data]);

  const totalHospitals = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.value, 0);
  }, [chartData]);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string; payload: { name: string; value: number; rate: number } }> }) => {
    if (active && payload && payload.length) {
      const entry = payload[0];
      const pct = ((entry.value / totalHospitals) * 100).toFixed(1);
      return (
        <div className="rounded-2xl border border-white/10 bg-navy-950 p-4 shadow-xl backdrop-blur-md">
          <p className="font-display font-bold text-white text-sm">{entry.name}</p>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between gap-6">
              <span className="text-white/50">Hospitals:</span>
              <span className="font-mono font-semibold text-white">
                {entry.value} ({pct}%)
              </span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-white/50">Avg Penalty Rate:</span>
              <span className="font-mono font-semibold text-amber">
                {entry.payload.rate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex h-full flex-col justify-between rounded-[28px] border border-white/8 bg-card-900 p-6 shadow-lg">
      <div>
        <h3 className="font-display text-lg font-bold tracking-tight text-white">Penalty Rate by Hospital Type</h3>
        <p className="text-xs text-white/50">Segmentation by hospital ownership type</p>
      </div>

      <div className="relative my-4 flex items-center justify-center min-h-[220px]">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={4}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  stroke="#1A2340"
                  strokeWidth={2}
                  style={{
                    filter: `drop-shadow(0 4px 12px ${COLORS[index % COLORS.length]}22)`,
                    outline: "none",
                  }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Custom Legend */}
      <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-4">
        {chartData.map((item, idx) => (
          <div key={item.name} className="flex items-start gap-2">
            <span
              className="mt-1 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
            />
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-white/70">{item.name}</div>
              <div className="text-[10px] text-white/40 font-mono">
                {item.value} hosp · {item.rate.toFixed(1)}% rate
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
