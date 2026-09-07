"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Loader2, Sliders, TrendingDown } from "lucide-react";
import { simulateIntervention } from "@/lib/api";
import type { InterventionResult, WhatIfPrediction } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { cn, formatCurrency, probToPct } from "@/lib/utils";

const CONDITIONS = [
  { key: "heart_failure", label: "Heart Failure", rateKey: "hf_readmission_rate", default: 23 },
  { key: "pneumonia", label: "Pneumonia", rateKey: "pneumonia_readmission_rate", default: 18 },
  { key: "ami", label: "AMI", rateKey: "ami_readmission_rate", default: 16.5 },
  { key: "copd", label: "COPD", rateKey: "copd_readmission_rate", default: 21 },
  { key: "hip_knee", label: "Hip/Knee", rateKey: "hip_knee_readmission_rate", default: 4.5 },
  { key: "cabg", label: "CABG", rateKey: "cabg_readmission_rate", default: 13 },
];

export default function SimulatorPage() {
  const [providerId, setProviderId] = useState("");
  const [reductions, setReductions] = useState<Record<string, number>>({
    heart_failure: 15,
    copd: 10,
  });

  const mutation = useMutation<InterventionResult, Error>({
    mutationFn: () => {
      const interventions = Object.entries(reductions)
        .filter(([, pct]) => pct > 0)
        .map(([condition, reduction_pct]) => ({ condition, reduction_pct }));
      const baseline = providerId.trim()
        ? undefined
        : Object.fromEntries(CONDITIONS.map((c) => [c.rateKey, c.default]));
      return simulateIntervention({
        provider_id: providerId.trim() || undefined,
        baseline,
        interventions,
      });
    },
  });

  const setReduction = (key: string, val: number) =>
    setReductions((r) => ({ ...r, [key]: val }));

  return (
    <div>
      <DemoBanner />
      <PageHeader
        eyebrow="What-if Analysis"
        title="Intervention Simulator"
        subtitle="Model how targeted readmission reductions change a hospital's penalty risk and dollar exposure."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="card space-y-5 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Provider ID (optional)
            </label>
            <input
              type="text"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              placeholder="e.g. 100002 — leave blank to use a synthetic baseline"
              className="field font-mono"
            />
          </div>

          <div className="space-y-4 border-t border-navy-300 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Readmission reduction per condition
            </p>
            {CONDITIONS.map((c) => (
              <div key={c.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-300">{c.label}</span>
                  <span className="font-mono text-cyan">-{reductions[c.key] ?? 0}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  value={reductions[c.key] ?? 0}
                  onChange={(e) => setReduction(c.key, Number(e.target.value))}
                  className="w-full accent-cyan"
                  aria-label={`${c.label} reduction percent`}
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="btn-primary w-full"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sliders className="h-4 w-4" />}
            Run Simulation
          </button>
        </div>

        <div className="card flex flex-col p-6">
          {mutation.data ? (
            <SimulationResult result={mutation.data} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center text-slate-500">
              <TrendingDown className="h-10 w-10 text-navy-400" />
              <p className="mt-3 text-sm">Adjust the reduction sliders and run the simulation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SimulationResult({ result }: { result: InterventionResult }) {
  const imp = result.improvement;
  return (
    <div className="flex flex-1 flex-col">
      <div className="grid grid-cols-2 gap-4">
        <BeforeAfter label="Before" pred={result.before} tone="risk" />
        <BeforeAfter label="After" pred={result.after} tone="safe" />
      </div>

      <div className="mt-6 rounded-xl border border-safe/30 bg-safe/10 p-5 text-center">
        <p className="text-xs uppercase tracking-wider text-safe-light">Projected Improvement</p>
        <p className="mt-2 font-display text-3xl font-bold text-safe">
          {formatCurrency(imp.dollar_savings)}
        </p>
        <p className="mt-1 text-sm text-slate-300">
          estimated annual savings · risk down {probToPct(imp.probability_reduction)}
        </p>
        <p className="mt-2 inline-flex items-center gap-2 text-xs text-slate-400">
          {imp.tier_change.split("->").map((t, i, arr) => (
            <span key={i} className="inline-flex items-center gap-2">
              <RiskBadge tier={t.trim()} size="sm" />
              {i < arr.length - 1 && <ArrowRight className="h-3 w-3" />}
            </span>
          ))}
        </p>
      </div>

      {result.interventions_applied.length > 0 && (
        <>
          <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Interventions Applied
          </h3>
          <ul className="mt-2 space-y-2">
            {result.interventions_applied.map((iv, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg bg-navy-200/40 px-3 py-2 text-sm">
                <span className="capitalize text-slate-300">{iv.condition.replace(/_/g, " ")}</span>
                <span className="font-mono text-xs text-slate-400">
                  {iv.original_rate}% → <span className="text-safe-light">{iv.new_rate}%</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function BeforeAfter({
  label,
  pred,
  tone,
}: {
  label: string;
  pred: WhatIfPrediction;
  tone: "risk" | "safe";
}) {
  return (
    <div className="rounded-xl border border-navy-300 bg-navy-200/40 p-4 text-center">
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p
        className={cn(
          "mt-2 font-display text-3xl font-bold",
          tone === "risk" ? "text-risk" : "text-safe",
        )}
      >
        {probToPct(pred.penalty_probability)}
      </p>
      <p className="text-[11px] text-slate-500">penalty probability</p>
      <div className="mt-3">
        <RiskBadge tier={pred.penalty_tier} size="sm" />
      </div>
      <p className="mt-3 text-xs text-slate-400">
        {pred.estimated_penalty_pct.toFixed(2)}% · {formatCurrency(pred.estimated_dollar_impact)}
      </p>
    </div>
  );
}
