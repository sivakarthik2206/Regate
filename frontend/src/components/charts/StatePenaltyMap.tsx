"use client";

import React from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ApiPenaltiesByStateItem } from "@/lib/types";

// Approximate centroid positions for US States (X: longitude scale roughly 0 to 100, Y: latitude scale roughly 0 to 100)
// This lets us plot a beautiful US map shape with Recharts ScatterChart!
const STATE_COORDINATES: Record<string, { x: number; y: number; name: string }> = {
  AL: { x: 74, y: 30, name: "Alabama" },
  AK: { x: 15, y: 15, name: "Alaska" },
  AZ: { x: 26, y: 38, name: "Arizona" },
  AR: { x: 61, y: 40, name: "Arkansas" },
  CA: { x: 12, y: 55, name: "California" },
  CO: { x: 38, y: 54, name: "Colorado" },
  CT: { x: 92, y: 70, name: "Connecticut" },
  DE: { x: 90, y: 58, name: "Delaware" },
  FL: { x: 82, y: 18, name: "Florida" },
  GA: { x: 78, y: 32, name: "Georgia" },
  HI: { x: 25, y: 10, name: "Hawaii" },
  ID: { x: 22, y: 76, name: "Idaho" },
  IL: { x: 67, y: 59, name: "Illinois" },
  IN: { x: 72, y: 59, name: "Indiana" },
  IA: { x: 57, y: 64, name: "Iowa" },
  KS: { x: 48, y: 50, name: "Kansas" },
  KY: { x: 73, y: 51, name: "Kentucky" },
  LA: { x: 59, y: 26, name: "Louisiana" },
  ME: { x: 95, y: 84, name: "Maine" },
  MD: { x: 87, y: 56, name: "Maryland" },
  MA: { x: 93, y: 73, name: "Massachusetts" },
  MI: { x: 71, y: 70, name: "Michigan" },
  MN: { x: 54, y: 77, name: "Minnesota" },
  MS: { x: 67, y: 30, name: "Mississippi" },
  MO: { x: 59, y: 51, name: "Missouri" },
  MT: { x: 33, y: 82, name: "Montana" },
  NE: { x: 46, y: 62, name: "Nebraska" },
  NV: { x: 16, y: 62, name: "Nevada" },
  NH: { x: 93, y: 79, name: "New Hampshire" },
  NJ: { x: 90, y: 64, name: "New Jersey" },
  NM: { x: 35, y: 38, name: "New Mexico" },
  NY: { x: 86, y: 73, name: "New York" },
  NC: { x: 83, y: 46, name: "North Carolina" },
  ND: { x: 45, y: 81, name: "North Dakota" },
  OH: { x: 77, y: 59, name: "Ohio" },
  OK: { x: 49, y: 39, name: "Oklahoma" },
  OR: { x: 13, y: 76, name: "Oregon" },
  PA: { x: 84, y: 64, name: "Pennsylvania" },
  RI: { x: 94, y: 70, name: "Rhode Island" },
  SC: { x: 80, y: 39, name: "South Carolina" },
  SD: { x: 45, y: 71, name: "South Dakota" },
  TN: { x: 70, y: 44, name: "Tennessee" },
  TX: { x: 46, y: 22, name: "Texas" },
  UT: { x: 26, y: 56, name: "Utah" },
  VT: { x: 91, y: 79, name: "Vermont" },
  VA: { x: 83, y: 52, name: "Virginia" },
  WA: { x: 15, y: 85, name: "Washington" },
  WV: { x: 80, y: 53, name: "West Virginia" },
  WI: { x: 64, y: 71, name: "Wisconsin" },
  WY: { x: 34, y: 69, name: "Wyoming" },
};

interface StatePenaltyMapProps {
  data: ApiPenaltiesByStateItem[];
}

export function StatePenaltyMap({ data }: StatePenaltyMapProps): JSX.Element {
  const chartData = React.useMemo(() => {
    return data
      .map((item) => {
        const coord = STATE_COORDINATES[item.state.toUpperCase()];
        if (!coord) return null;
        return {
          ...item,
          x: coord.x,
          y: coord.y,
          fullName: coord.name,
          penalty_rate_pct: item.penalty_rate * 100,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [data]);

  // Color interpolation from green (#00C896) to red (#FF4D6D)
  const getColor = (rate: number) => {
    // scale rate from 0 to 0.5 (50% max penalty)
    const factor = Math.min(Math.max(rate / 0.4, 0), 1);
    const r = Math.round(0 + (255 - 0) * factor);
    const g = Math.round(200 + (77 - 200) * factor);
    const b = Math.round(150 + (109 - 150) * factor);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { fullName: string; state: string; penalized_count: number; total_count: number; penalty_rate_pct: number } }> }) => {
    if (active && payload && payload.length) {
      const info = payload[0].payload;
      return (
        <div className="rounded-2xl border border-white/10 bg-navy-950 p-4 shadow-xl backdrop-blur-md">
          <p className="font-display font-bold text-white text-base">{info.fullName} ({info.state})</p>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between gap-6">
              <span className="text-white/50">Penalized:</span>
              <span className="font-mono font-semibold text-white">{info.penalized_count}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-white/50">Total:</span>
              <span className="font-mono font-semibold text-white">{info.total_count}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-white/50">Penalty Rate:</span>
              <span className="font-mono font-semibold text-risk-red">
                {info.penalty_rate_pct.toFixed(1)}%
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
        <h3 className="font-display text-lg font-bold tracking-tight text-white">Penalty Risk by State</h3>
        <p className="text-xs text-white/50">Hover dots to inspect state-level breakdown</p>
      </div>

      <div className="relative my-6 flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
            <XAxis type="number" dataKey="x" domain={[5, 100]} hide />
            <YAxis type="number" dataKey="y" domain={[5, 95]} hide />
            <ZAxis type="number" dataKey="penalized_count" range={[60, 600]} />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Scatter
              name="States"
              data={chartData}
              shape={(props: { cx?: number; cy?: number; payload?: { state: string; penalized_count: number; penalty_rate: number } }) => {
                const { cx = 0, cy = 0, payload } = props;
                if (!payload) return <g />;
                const color = getColor(payload.penalty_rate);
                // Scale radius: sqrt of penalized count, clamped 6–20px
                const r = Math.min(20, Math.max(6, Math.sqrt(payload.penalized_count) * 1.5));
                return (
                  <g key={`dot-${payload.state}`}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={color}
                      fillOpacity={0.85}
                      style={{ filter: `drop-shadow(0 0 8px ${color}99)`, cursor: "pointer" }}
                    />
                    <text
                      x={cx}
                      y={cy + r + 10}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.45)"
                      fontSize={8}
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {payload.state}
                    </text>
                  </g>
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
        <div className="flex items-center justify-between text-xs text-white/40">
          <span>Safe (Low Risk)</span>
          <span>Moderate Risk</span>
          <span>Penalized (High Risk)</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gradient-to-r from-safe-green via-amber to-risk-red opacity-80" />
      </div>
    </div>
  );
}
