"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ApiReadmissionRateItem } from "@/lib/types";

interface ReadmissionRatesChartProps {
  data: ApiReadmissionRateItem[];
}

export function ReadmissionRatesChart({ data }: ReadmissionRatesChartProps): JSX.Element {
  const chartData = React.useMemo(() => {
    // Map backend shorthand to human readable conditions
    const conditionMap: Record<string, string> = {
      AMI: "AMI (Heart Attack)",
      HF: "Heart Failure",
      PN: "Pneumonia",
      COPD: "COPD",
      HIP_KNEE: "Hip/Knee",
      CABG: "CABG (Bypass)",
    };

    return data.map((item) => ({
      ...item,
      displayName: conditionMap[item.condition] || item.condition,
      "National Average": item.national_avg,
      "Penalized Hospitals": item.penalized_avg,
      "Safe Hospitals": item.safe_avg,
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-2xl border border-white/10 bg-navy-950 p-4 shadow-xl backdrop-blur-md">
          <p className="font-display font-bold text-white text-sm">{label}</p>
          <div className="mt-3 space-y-2 text-xs">
            {payload.map((p: any) => (
              <div key={p.name} className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-1.5 text-white/50">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span>{p.name}:</span>
                </div>
                <span className="font-mono font-bold text-white">{p.value.toFixed(2)}%</span>
              </div>
            ))}
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
          30-Day Readmission Rates by Condition
        </h3>
        <p className="text-xs text-white/50">Comparison of readmission percentages across clinical pathways</p>
      </div>

      <div className="flex-1 min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="displayName"
              stroke="rgba(255,255,255,0.4)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="rgba(255,255,255,0.4)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              unit="%"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{
                fontSize: "12px",
                color: "rgba(255,255,255,0.6)",
                paddingTop: "15px",
              }}
            />
            <Bar
              dataKey="National Average"
              fill="#00D4FF"
              radius={[4, 4, 0, 0]}
              maxBarSize={30}
              style={{ filter: "drop-shadow(0 2px 4px rgba(0, 212, 255, 0.15))" }}
            />
            <Bar
              dataKey="Penalized Hospitals"
              fill="#FF4D6D"
              radius={[4, 4, 0, 0]}
              maxBarSize={30}
              style={{ filter: "drop-shadow(0 2px 4px rgba(255, 77, 109, 0.15))" }}
            />
            <Bar
              dataKey="Safe Hospitals"
              fill="#00C896"
              radius={[4, 4, 0, 0]}
              maxBarSize={30}
              style={{ filter: "drop-shadow(0 2px 4px rgba(0, 200, 150, 0.15))" }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
