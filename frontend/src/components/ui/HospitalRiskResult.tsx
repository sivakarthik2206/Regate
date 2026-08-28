"use client";

import { AlertTriangle, Check, Info } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { HospitalRiskOutput } from "@/lib/types";

interface HospitalRiskResultProps {
  result: HospitalRiskOutput;
}

const arcPath = "M 56 160 A 104 104 0 0 1 264 160";

export function HospitalRiskResult({ result }: HospitalRiskResultProps): JSX.Element {
  const probability = clamp(result.penalty_probability, 0, 1) * 100;
  const highRisk = result.penalty_tier === "High Risk";
  const pulseClass = highRisk ? "animate-penalty-pulse" : "";

  return (
    <motion.section
      initial={{ opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-5 rounded-[28px] border border-white/8 bg-elevated-900/95 p-6"
    >
      <div className={cn("rounded-[30px] border border-white/10 bg-card-900 p-5", pulseClass)}>
        <div className="relative mx-auto flex max-w-[340px] flex-col items-center">
          <svg viewBox="0 0 320 190" className="h-auto w-full overflow-visible">
            <defs>
              <linearGradient id="riskArc" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00c896" />
                <stop offset="25%" stopColor="#f7a800" />
                <stop offset="50%" stopColor="#ff8c42" />
                <stop offset="75%" stopColor="#ff4d6d" />
                <stop offset="100%" stopColor="#ff4d6d" />
              </linearGradient>
            </defs>
            <path d={arcPath} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="20" strokeLinecap="round" />
            <path d={arcPath} fill="none" stroke="url(#riskArc)" strokeWidth="20" strokeLinecap="round" strokeDasharray="3 18" />
            <g transform={`rotate(${mapProbabilityToAngle(probability)} 160 160)`}>
              <line x1="160" y1="160" x2="160" y2="70" stroke="#e5faff" strokeWidth="4" strokeLinecap="round" />
              <circle cx="160" cy="160" r="10" fill="#e5faff" />
            </g>
            {Array.from({ length: 5 }, (_, index) => {
              const angle = -180 + index * 45;
              const radians = ((angle - 90) * Math.PI) / 180;
              const x1 = 160 + Math.cos(radians) * 92;
              const y1 = 160 + Math.sin(radians) * 92;
              const x2 = 160 + Math.cos(radians) * 106;
              const y2 = 160 + Math.sin(radians) * 106;
              return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.25)" strokeWidth="3" strokeLinecap="round" />;
            })}
          </svg>
          <div className="mt-[-10px] text-center">
            <div className="font-display text-5xl font-bold tracking-tight text-white">{probability.toFixed(1)}%</div>
            <div className="mt-2 inline-flex rounded-full border px-4 py-1 text-sm font-semibold" style={{ borderColor: tierStyles[result.penalty_tier].border, color: tierStyles[result.penalty_tier].text, backgroundColor: tierStyles[result.penalty_tier].bg }}>
              {result.penalty_tier}
            </div>
          </div>
        </div>
      </div>

      <div className={cn("rounded-[24px] border p-5", result.penalty_tier === "High Risk" ? "border-risk-red/25 bg-risk-red/10" : "border-safe-green/20 bg-safe-green/10")}>
        <div className="text-sm text-white/55">Financial Impact</div>
        <div className="mt-2 font-display text-3xl font-bold text-white">Estimated Penalty: {result.estimated_penalty_pct.toFixed(2)}%</div>
        <div className="mt-1 text-white/70">Estimated Dollar Impact: {formatDollar(result.estimated_dollar_impact)}</div>
      </div>

      <div className="rounded-[24px] border border-white/8 bg-card-900 p-5">
        <h3 className="font-display text-xl font-bold text-white">Top Risk Factors</h3>
        <div className="mt-4 space-y-3">
          {result.top_risk_factors.slice(0, 5).map((factor) => (
            <div key={`${factor.factor}-${String(factor.value)}`} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-elevated-900 px-4 py-3">
              {factor.impact === "high" ? <AlertTriangle className="mt-0.5 h-4 w-4 text-risk-red" /> : <Info className="mt-0.5 h-4 w-4 text-amber" />}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white">{factor.factor}</div>
                <div className="mt-1 text-xs text-white/45">Value: {formatFactorValue(factor.value)}</div>
              </div>
              <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide", impactStyles[factor.impact])}>{factor.impact}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[24px] border border-white/8 bg-card-900 p-5">
        <h3 className="font-display text-xl font-bold text-white">Recommendations</h3>
        <ul className="mt-4 space-y-2">
          {result.recommendations.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-white/70">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}

const tierStyles: Record<HospitalRiskOutput["penalty_tier"], { border: string; bg: string; text: string }> = {
  "No Risk": { border: "rgba(0,200,150,0.35)", bg: "rgba(0,200,150,0.08)", text: "#00c896" },
  "Low Risk": { border: "rgba(0,212,255,0.35)", bg: "rgba(0,212,255,0.08)", text: "#00d4ff" },
  "Medium Risk": { border: "rgba(247,168,0,0.35)", bg: "rgba(247,168,0,0.10)", text: "#f7a800" },
  "High Risk": { border: "rgba(255,77,109,0.35)", bg: "rgba(255,77,109,0.10)", text: "#ff4d6d" },
};

const impactStyles: Record<"high" | "medium" | "low", string> = {
  high: "border-risk-red/20 bg-risk-red/10 text-risk-red",
  medium: "border-amber/20 bg-amber/10 text-amber",
  low: "border-white/10 bg-white/5 text-white/50",
};

function mapProbabilityToAngle(probability: number): number {
  return -90 + (probability / 100) * 180;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatDollar(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatFactorValue(value: string | number | boolean | null): string {
  if (value === null) {
    return "n/a";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return String(value);
}
