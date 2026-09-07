"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RiskGaugeProps {
  value: number; // 0-1
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const DIMENSIONS = {
  sm: { w: 160, stroke: 12, font: "text-2xl" },
  md: { w: 220, stroke: 16, font: "text-4xl" },
  lg: { w: 300, stroke: 20, font: "text-5xl" },
};

const ZONES = [
  { limit: 0.45, color: "#00C896" },
  { limit: 0.55, color: "#F7A800" },
  { limit: 0.65, color: "#FF8099" },
  { limit: 1.01, color: "#FF4D6D" },
];

function colorForValue(v: number): string {
  return ZONES.find((z) => v < z.limit)?.color ?? "#FF4D6D";
}

export function RiskGauge({ value, size = "md", label, className }: RiskGaugeProps) {
  const clamped = Math.min(1, Math.max(0, value));
  const { w, stroke, font } = DIMENSIONS[size];
  const height = w / 2 + stroke;
  const cx = w / 2;
  const cy = w / 2;
  const radius = w / 2 - stroke;

  // Semi-circle from 180deg (left) to 0deg (right).
  const arcLength = Math.PI * radius;
  const activeColor = colorForValue(clamped);

  // Build 4 background zone arcs.
  const zoneBounds = [0, 0.45, 0.55, 0.65, 1];
  const describeArc = (start: number, end: number) => {
    const a0 = Math.PI - start * Math.PI;
    const a1 = Math.PI - end * Math.PI;
    const x0 = cx + radius * Math.cos(a0);
    const y0 = cy - radius * Math.sin(a0);
    const x1 = cx + radius * Math.cos(a1);
    const y1 = cy - radius * Math.sin(a1);
    return `M ${x0} ${y0} A ${radius} ${radius} 0 0 1 ${x1} ${y1}`;
  };

  const needleAngle = Math.PI - clamped * Math.PI;
  const needleLen = radius - stroke / 2;
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy - needleLen * Math.sin(needleAngle);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`}>
        {ZONES.map((zone, i) => (
          <path
            key={i}
            d={describeArc(zoneBounds[i], zoneBounds[i + 1])}
            fill="none"
            stroke={zone.color}
            strokeWidth={stroke}
            strokeOpacity={0.25}
            strokeLinecap="round"
          />
        ))}
        {/* Active fill */}
        <motion.path
          d={describeArc(0, clamped)}
          fill="none"
          stroke={activeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ strokeDasharray: arcLength, strokeDashoffset: 0 }}
        />
        {/* Needle */}
        <motion.line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke="#E2E8F0"
          strokeWidth={size === "sm" ? 2 : 3}
          strokeLinecap="round"
          initial={{ x2: cx - needleLen, y2: cy }}
          animate={{ x2: nx, y2: ny }}
          transition={{ type: "spring", stiffness: 60, damping: 12 }}
        />
        <circle cx={cx} cy={cy} r={stroke / 2} fill="#E2E8F0" />
      </svg>
      <div className="-mt-2 text-center">
        <p className={cn("font-display font-bold tabular-nums", font)} style={{ color: activeColor }}>
          {Math.round(clamped * 100)}%
        </p>
        {label && <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>}
      </div>
    </div>
  );
}
