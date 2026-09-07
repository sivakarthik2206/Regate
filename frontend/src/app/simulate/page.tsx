"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { animate } from "framer-motion";
import { ArrowRight, Building2, Loader2, TrendingDown } from "lucide-react";
import { getHospital, simulateIntervention } from "@/lib/api";
import type { InterventionRequest, InterventionResult, WhatIfPrediction } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { RiskGauge } from "@/components/ui/RiskGauge";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { cn, formatCurrency, probToPct } from "@/lib/utils";

// Condition definitions — key is the API intervention key, rateKey is the baseline field
const CONDITIONS = [
  { key: "heart_failure", label: "Heart Failure", urlParam: "hf", rateKey: "hf_readmission_rate", condCode: "HF", defaultRate: 23 },
  { key: "pneumonia",     label: "Pneumonia",     urlParam: "pn", rateKey: "pneumonia_readmission_rate", condCode: "PN", defaultRate: 18 },
  { key: "ami",           label: "AMI",           urlParam: "ami", rateKey: "ami_readmission_rate", condCode: "AMI", defaultRate: 16.5 },
  { key: "copd",          label: "COPD",          urlParam: "copd", rateKey: "copd_readmission_rate", condCode: "COPD", defaultRate: 21 },
  { key: "hip_knee",      label: "Hip / Knee",    urlParam: "hk", rateKey: "hip_knee_readmission_rate", condCode: "HK", defaultRate: 4.5 },
  { key: "cabg",          label: "CABG",          urlParam: "cabg", rateKey: "cabg_readmission_rate", condCode: "CABG", defaultRate: 13 },
] as const;

export default function SimulatePage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-slate-400">Loading simulator…</div>}>
      <SimulatorInner />
    </Suspense>
  );
}

function SimulatorInner() {
  const searchParams = useSearchParams();
  const hospitalParam = searchParams.get("hospital") ?? "";

  // Per-condition current rates (from URL params, hospital API, or defaults)
  const [baseRates, setBaseRates] = useState<Record<string, number>>(() => {
    const rates: Record<string, number> = {};
    for (const c of CONDITIONS) {
      const v = searchParams.get(c.urlParam);
      rates[c.key] = v ? Number(v) : c.defaultRate;
    }
    return rates;
  });

  const [avgRate, setAvgRate] = useState<number>(() => {
    const v = searchParams.get("rate");
    if (v) return Number(v);
    // Compute from condition defaults so avg is consistent with displayed rates
    return Math.round((CONDITIONS.reduce((s, c) => s + c.defaultRate, 0) / CONDITIONS.length) * 10) / 10;
  });

  // Reduction sliders 0–50
  const [reductions, setReductions] = useState<Record<string, number>>({});

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const mutation = useMutation<InterventionResult, Error, InterventionRequest>({
    mutationFn: simulateIntervention,
  });

  // Fetch hospital profile when ?hospital= is set
  const { data: hospitalData } = useQuery({
    queryKey: ["hospital", hospitalParam],
    queryFn: () => getHospital(hospitalParam),
    enabled: !!hospitalParam.trim(),
  });

  // When hospital loads, extract per-condition rates and sync avg readmission rate
  useEffect(() => {
    if (!hospitalData?.condition_breakdown) return;
    const updated: Record<string, number> = { ...baseRates };
    const condRates: number[] = [];
    for (const item of hospitalData.condition_breakdown) {
      const cond = CONDITIONS.find((c) => c.condCode === item.condition);
      if (cond && item.readmission_rate) {
        updated[cond.key] = item.readmission_rate;
        condRates.push(item.readmission_rate);
      }
    }
    setBaseRates(updated);
    if (condRates.length > 0) {
      const avg = condRates.reduce((a, b) => a + b, 0) / condRates.length;
      setAvgRate(Math.round(avg * 10) / 10);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalData]);

  // Keep avgRate in sync with manual baseRate edits (no hospital loaded)
  useEffect(() => {
    if (hospitalParam.trim() || hospitalData) return;
    const vals = CONDITIONS.map((c) => baseRates[c.key] ?? c.defaultRate);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    setAvgRate(Math.round(avg * 10) / 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseRates]);

  const triggerSim = useCallback(
    (nextReductions: Record<string, number>) => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const interventions = Object.entries(nextReductions)
          .filter(([, p]) => p > 0)
          .map(([condition, reduction_pct]) => ({ condition, reduction_pct }));
        const baseline = hospitalParam.trim()
          ? undefined
          : {
              avg_readmission_rate: avgRate,
              ...Object.fromEntries(CONDITIONS.map((c) => [c.rateKey, baseRates[c.key]])),
            };
        mutation.mutate({ provider_id: hospitalParam.trim() || undefined, baseline, interventions });
      }, 300);
    },
    [avgRate, baseRates, hospitalParam, mutation],
  );

  const setReduction = (key: string, val: number) => {
    const next = { ...reductions, [key]: val };
    setReductions(next);
    triggerSim(next);
  };

  // Run an initial simulation on mount
  useEffect(() => {
    triggerSim(reductions);
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <DemoBanner />
      <PageHeader
        eyebrow="What-if Analysis"
        title="Intervention Simulator"
        subtitle="Model how targeted readmission reductions change a hospital's penalty risk and dollar exposure."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
        {/* ── Left: Controls (40%) ── */}
        <div className="space-y-5">
          {/* Hospital context card */}
          {hospitalParam.trim() ? (
            <div className="card p-5">
              {hospitalData ? (
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan" />
                  <div>
                    <p className="font-display font-bold text-white">{hospitalData.name ?? "—"}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {[hospitalData.city, hospitalData.state].filter(Boolean).join(", ")} ·{" "}
                      {hospitalData.ownership_type}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <MetaChip label="Current penalty" value={`${(hospitalData.penalty_pct ?? 0).toFixed(2)}%`} />
                      <MetaChip label="Risk tier" value={hospitalData.risk_tier ?? "—"} />
                      <MetaChip label="Star rating" value={`${hospitalData.star_rating ?? "—"} ★`} />
                      <MetaChip label="Penalized" value={hospitalData.penalized ? "Yes" : "No"} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin text-cyan" />
                  Loading hospital data…
                </div>
              )}
            </div>
          ) : (
            <div className="card space-y-4 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Baseline Configuration
              </p>
              <label className="block">
                <span className="mb-1.5 block text-xs text-slate-400">Avg Readmission Rate (%)</span>
                <input
                  type="number"
                  step="0.1"
                  value={avgRate}
                  onChange={(e) => setAvgRate(Number(e.target.value))}
                  className="field"
                />
              </label>
              <p className="text-[11px] text-slate-500">
                Adjust individual condition rates below, or open a hospital from the{" "}
                <span className="text-cyan">Hospital Explorer</span> to load its real readmission data.
              </p>
            </div>
          )}

          {/* Intervention sliders */}
          <div className="card space-y-5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Readmission Interventions
            </p>
            {CONDITIONS.map((c) => {
              const reduction = reductions[c.key] ?? 0;
              const currentRate = baseRates[c.key] ?? c.defaultRate;
              const newRate = +(currentRate * (1 - reduction / 100)).toFixed(1);
              return (
                <div key={c.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-200">{c.label}</span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">{currentRate}%</span>
                      {reduction > 0 && (
                        <>
                          <ArrowRight className="h-3 w-3 text-slate-600" />
                          <span className="font-semibold text-safe-light">{newRate}%</span>
                          <span className="rounded bg-safe/10 px-1.5 py-0.5 text-safe-light">
                            -{reduction}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={1}
                    value={reduction}
                    onChange={(e) => setReduction(c.key, Number(e.target.value))}
                    aria-label={`${c.label} readmission reduction percent`}
                    className="w-full accent-cyan"
                  />
                </div>
              );
            })}

            {mutation.isPending && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan" />
                Recalculating…
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Before/After (60%) ── */}
        <div className="space-y-5">
          {mutation.data ? (
            <SimulationResult result={mutation.data} />
          ) : (
            <div className="card flex min-h-[480px] flex-col items-center justify-center py-16 text-center text-slate-500">
              <TrendingDown className="h-12 w-12 text-navy-400" />
              <p className="mt-3 text-sm">Adjust the sliders to see the impact in real time</p>
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
    <div className="space-y-5">
      {/* Before / After gauges */}
      <div className="grid grid-cols-2 gap-4">
        <PredictionCard label="Before" pred={result.before} tone="risk" />
        <PredictionCard label="After" pred={result.after} tone="safe" />
      </div>

      {/* Savings callout */}
      <div className="card p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-safe-light">
          Projected Improvement
        </p>
        <p className="mt-3 font-display text-4xl font-bold text-safe">
          <CountUp value={imp.dollar_savings} formatter={formatCurrency} />
        </p>
        <p className="mt-1 text-sm text-slate-400">estimated annual savings</p>
        <div className="mt-3 flex flex-col items-center gap-1 text-sm text-slate-300">
          <p>
            Penalty reduced{" "}
            <span className="font-semibold text-risk-light">
              {result.before.estimated_penalty_pct.toFixed(2)}%
            </span>{" "}
            →{" "}
            <span className="font-semibold text-safe-light">
              {result.after.estimated_penalty_pct.toFixed(2)}%
            </span>
          </p>
          <div className="mt-1 inline-flex items-center gap-2">
            <span className="text-xs text-slate-500">Risk tier</span>
            {imp.tier_change.split("->").map((t, i, arr) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                <RiskBadge tier={t.trim()} size="sm" />
                {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-slate-500" />}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Interventions table */}
      {result.interventions_applied.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b border-navy-300 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Interventions Applied
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-300 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2.5">Condition</th>
                <th className="px-4 py-2.5 text-right">Original Rate</th>
                <th className="px-4 py-2.5 text-right">New Rate</th>
                <th className="px-4 py-2.5 text-right">Reduction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-300/50">
              {result.interventions_applied.map((iv, i) => (
                <tr key={i}>
                  <td className="px-4 py-2.5 capitalize text-slate-300">
                    {iv.condition.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-400">
                    {iv.original_rate}%
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-safe-light">
                    {iv.new_rate}%
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-safe">
                    -{iv.reduction_pct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Disclaimer */}
      <p className="rounded-xl border border-navy-300/40 bg-navy-100/40 px-4 py-3 text-[11px] leading-relaxed text-slate-500">
        These projections are model-based estimates, not guarantees. Actual CMS penalties depend on
        risk-adjusted performance over a 3-year measurement period.
      </p>
    </div>
  );
}

function PredictionCard({
  label,
  pred,
  tone,
}: {
  label: string;
  pred: WhatIfPrediction;
  tone: "risk" | "safe";
}) {
  return (
    <div
      className={cn(
        "card flex flex-col items-center p-5",
        tone === "risk"
          ? "border-risk/20 bg-risk/5"
          : "border-safe/20 bg-safe/5",
      )}
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <RiskGauge value={pred.penalty_probability} size="sm" />
      <div className="mt-3">
        <RiskBadge tier={pred.penalty_tier} size="sm" />
      </div>
      <p className="mt-3 text-[11px] text-slate-500">
        {pred.estimated_penalty_pct.toFixed(2)}% penalty ·{" "}
        <span
          className={cn(
            "font-semibold",
            tone === "risk" ? "text-risk-light" : "text-safe-light",
          )}
        >
          {formatCurrency(pred.estimated_dollar_impact)}
        </span>
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {probToPct(pred.penalty_probability)} probability
      </p>
    </div>
  );
}

// Animated count-up using framer-motion's animate()
function CountUp({
  value,
  formatter,
}: {
  value: number;
  formatter: (v: number) => string;
}) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = value;
    const controls = animate(from, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate(v: number) {
        setDisplay(v);
      },
    });
    return () => controls.stop();
  }, [value]);

  return <>{formatter(display)}</>;
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-navy-300 bg-navy-200/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-200">{value}</p>
    </div>
  );
}
