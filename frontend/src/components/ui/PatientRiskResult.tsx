"use client";

import { motion } from "framer-motion";
import { Check, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PatientRiskOutput } from "@/lib/types";

interface PatientRiskResultProps {
  result: PatientRiskOutput;
}

export function PatientRiskResult({ result }: PatientRiskResultProps): JSX.Element {
  return (
    <motion.section
      initial={{ opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-5 rounded-[28px] border border-white/8 bg-elevated-900/95 p-6"
    >
      <div className="rounded-[24px] border border-white/10 bg-card-900 p-5">
        <div className={cn("inline-flex rounded-full border px-4 py-1 text-sm font-semibold", riskPillStyles[result.risk_level])}>{result.risk_level}</div>
        <div className="mt-4 font-display text-5xl font-bold tracking-tight text-white">{(result.readmission_probability * 100).toFixed(1)}%</div>
        <div className="mt-2 text-sm text-white/55">Probability of 30-day readmission</div>
      </div>

      <div className="rounded-[24px] border border-cyan/20 bg-cyan/10 p-5 text-cyan">
        <div className="text-sm font-medium text-cyan/85">If readmitted, estimated cost</div>
        <div className="mt-2 font-display text-3xl font-bold text-white">${result.estimated_cost_if_readmitted.toLocaleString()}</div>
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
        <h3 className="font-display text-xl font-bold text-white">Recommended Interventions</h3>
        <ul className="mt-4 space-y-2">
          {result.recommended_interventions.map((item) => (
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

const riskPillStyles: Record<PatientRiskOutput["risk_level"], string> = {
  Low: "border-safe-green/25 bg-safe-green/10 text-safe-green",
  Moderate: "border-amber/25 bg-amber/10 text-amber",
  High: "border-risk-red/25 bg-risk-red/10 text-risk-red",
  Critical: "border-risk-red/35 bg-risk-red/15 text-risk-red",
};

const impactStyles: Record<"high" | "medium" | "low", string> = {
  high: "border-risk-red/20 bg-risk-red/10 text-risk-red",
  medium: "border-amber/20 bg-amber/10 text-amber",
  low: "border-white/10 bg-white/5 text-white/50",
};

function formatFactorValue(value: string | number | boolean | null): string {
  if (value === null) {
    return "n/a";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return String(value);
}
