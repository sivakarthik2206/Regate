"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { PredictionFeatureImportanceItem } from "@/lib/types";

interface FeatureImportanceChartProps {
  data: PredictionFeatureImportanceItem[];
}

export function FeatureImportanceChart({ data }: FeatureImportanceChartProps): JSX.Element {
  const chartData = React.useMemo(() => {
    // Sort descending by importance
    return [...data]
      .sort((a, b) => b.importance - a.importance)
      .map((item) => {
        // Classify importance impact tier
        let category: "high" | "medium" | "low" = "low";
        if (item.importance > 0.15) {
          category = "high";
        } else if (item.importance > 0.05) {
          category = "medium";
        }

        return {
          ...item,
          category,
        };
      });
  }, [data]);

  const getColor = (category: "high" | "medium" | "low") => {
    switch (category) {
      case "high":
        return "#00D4FF"; // cyan
      case "medium":
        return "#F7A800"; // amber
      case "low":
      default:
        return "#374151"; // muted gray/slate
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      return (
        <div className="max-w-[320px] rounded-2xl border border-white/10 bg-navy-950 p-4 shadow-xl backdrop-blur-md">
          <p className="font-display font-bold text-white text-sm">{entry.description}</p>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between gap-6">
              <span className="text-white/50">Internal ID:</span>
              <span className="font-mono text-white/80">{entry.feature}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-white/50">Importance Score:</span>
              <span className="font-mono font-bold text-cyan">
                {entry.importance.toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-white/50">Impact Tier:</span>
              <span
                className={`font-semibold uppercase tracking-wider text-[10px] ${
                  entry.category === "high"
                    ? "text-cyan"
                    : entry.category === "medium"
                    ? "text-amber"
                    : "text-white/40"
                }`}
              >
                {entry.category}
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
      <div className="mb-4">
        <h3 className="font-display text-lg font-bold tracking-tight text-white">
          Key Drivers of Penalty Risk
        </h3>
        <p className="text-xs text-white/50">Top features influencing the penalty predictor model</p>
      </div>

      <div className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 10, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="description"
              stroke="rgba(255,255,255,0.7)"
              fontSize={11}
              width={140}
              tickLine={false}
              axisLine={false}
              tickFormatter={(text) => {
                if (text.length > 20) {
                  return `${text.substring(0, 18)}...`;
                }
                return text;
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="importance" radius={[0, 4, 4, 0]} maxBarSize={16}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getColor(entry.category)}
                  style={{
                    filter: `drop-shadow(0 0 4px ${getColor(entry.category)}44)`,
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
