"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { PenaltiesByStateItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DC_MARKER, STATE_SHAPES, US_MAP_VIEWBOX } from "./usStateShapes";

interface USMapProps {
  data: PenaltiesByStateItem[];
  className?: string;
}

/** Normalise a percentage that may arrive as a 0-1 fraction or a >100 artefact into 0-100. */
function normalizePct(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  let v = value;
  if (v > 100) v = v / 100; // safety: guard against double-scaled values
  return v;
}

const NO_DATA = "#1A2440"; // navy-200

function colorFor(rate: number | null): string {
  if (rate === null) return NO_DATA;
  if (rate < 20) return "#00C896"; // safe green
  if (rate < 35) return "#F7A800"; // amber
  if (rate < 50) return "#FF8099"; // risk light
  return "#FF4D6D"; // risk red
}

interface TooltipState {
  x: number;
  y: number;
  code: string;
  name: string;
  rate: number | null;
  penalized: number | null;
  total: number | null;
  avg: number | null;
}

export function USMap({ data, className }: USMapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const byCode = useMemo(() => {
    const map = new Map<string, PenaltiesByStateItem>();
    for (const row of data) map.set(row.state, row);
    return map;
  }, [data]);

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={US_MAP_VIEWBOX}
        className="h-auto w-full"
        role="img"
        aria-label="US map of hospital readmission penalty rates by state"
        onMouseLeave={() => setTooltip(null)}
      >
        {STATE_SHAPES.map((shape, i) => {
          const row = byCode.get(shape.code);
          const rate = normalizePct(row?.penalty_rate_pct);
          const fill = colorFor(rate);
          const isActive = tooltip?.code === shape.code;
          return (
            <motion.path
              key={shape.code}
              d={shape.d}
              fill={fill}
              stroke="#0A0F1E"
              strokeWidth={1}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: Math.min(i * 0.012, 0.6) }}
              className="cursor-pointer outline-none transition-[filter,opacity]"
              style={{
                filter: isActive ? "brightness(1.35)" : undefined,
                opacity: tooltip && !isActive ? 0.72 : 1,
              }}
              tabIndex={-1}
              aria-label={
                row
                  ? `${shape.name}: ${rate?.toFixed(1) ?? "—"}% penalty rate`
                  : `${shape.name}: no data`
              }
              onMouseMove={(e) => {
                const svg = (e.target as SVGPathElement).ownerSVGElement;
                const bounds = svg?.getBoundingClientRect();
                setTooltip({
                  x: bounds ? e.clientX - bounds.left : 0,
                  y: bounds ? e.clientY - bounds.top : 0,
                  code: shape.code,
                  name: shape.name,
                  rate,
                  penalized: row?.penalized_count ?? null,
                  total: row?.total_count ?? null,
                  avg: row?.avg_penalty_pct ?? null,
                });
              }}
            />
          );
        })}

        {/* District of Columbia marker */}
        {(() => {
          const row = byCode.get(DC_MARKER.code);
          const rate = normalizePct(row?.penalty_rate_pct);
          const isActive = tooltip?.code === DC_MARKER.code;
          return (
            <circle
              cx={DC_MARKER.cx}
              cy={DC_MARKER.cy}
              r={4}
              fill={colorFor(rate)}
              stroke="#E2E8F0"
              strokeWidth={1}
              className="cursor-pointer transition-[filter]"
              style={{ filter: isActive ? "brightness(1.4)" : undefined }}
              onMouseMove={(e) => {
                const svg = (e.target as SVGCircleElement).ownerSVGElement;
                const bounds = svg?.getBoundingClientRect();
                setTooltip({
                  x: bounds ? e.clientX - bounds.left : 0,
                  y: bounds ? e.clientY - bounds.top : 0,
                  code: DC_MARKER.code,
                  name: DC_MARKER.name,
                  rate,
                  penalized: row?.penalized_count ?? null,
                  total: row?.total_count ?? null,
                  avg: row?.avg_penalty_pct ?? null,
                });
              }}
            />
          );
        })()}
      </svg>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-navy-300 bg-navy-100 px-3 py-2 text-xs shadow-xl"
          style={{ left: tooltip.x, top: tooltip.y - 10 }}
        >
          <p className="font-display font-semibold text-white">{tooltip.name}</p>
          {tooltip.total !== null ? (
            <>
              <p className="mt-0.5 text-slate-300">
                {tooltip.penalized} penalized / {tooltip.total} total
                {tooltip.rate !== null && (
                  <span className="ml-1 font-semibold text-cyan">({tooltip.rate.toFixed(1)}%)</span>
                )}
              </p>
              <p className="text-slate-400">
                Avg penalty:{" "}
                <span className="text-amber-light">
                  {tooltip.avg !== null ? `${tooltip.avg.toFixed(2)}%` : "—"}
                </span>
              </p>
            </>
          ) : (
            <p className="mt-0.5 text-slate-500">No data</p>
          )}
        </div>
      )}

      <MapLegend />
    </div>
  );
}

const LEGEND: { label: string; color: string }[] = [
  { label: "< 20%", color: "#00C896" },
  { label: "20–35%", color: "#F7A800" },
  { label: "35–50%", color: "#FF8099" },
  { label: "> 50%", color: "#FF4D6D" },
  { label: "No data", color: NO_DATA },
];

function MapLegend() {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
        Penalty rate
      </span>
      {LEGEND.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-xs text-slate-400">
          <span
            className="h-3 w-3 rounded-sm"
            style={{ background: item.color, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
