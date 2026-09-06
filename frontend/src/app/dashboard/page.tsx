"use client";

import { motion, type Variants } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  getBacktesting,
  getFeatureImportance,
  getPenaltiesByOwnership,
  getPenaltiesByState,
  getReadmissionBenchmarks,
  getSummary,
} from "@/lib/api";
import type { BacktestSample, PenaltiesByStateItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { USMap } from "@/components/charts/USMap";
import { OwnershipDonut } from "@/components/charts/OwnershipDonut";
import { ReadmissionRatesChart } from "@/components/charts/ReadmissionRatesChart";
import { FeatureImportanceChart } from "@/components/charts/FeatureImportanceChart";
import { ConfusionMatrix } from "@/components/charts/ConfusionMatrix";
import { cn, formatNumber } from "@/lib/utils";

/** Clamp a percentage into 0-100, guarding against double-scaled (>100) values. */
function pct(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return value > 100 ? value / 100 : value;
}

export default function DashboardPage() {
  const summary = useQuery({ queryKey: ["summary"], queryFn: getSummary });
  const states = useQuery({ queryKey: ["states"], queryFn: getPenaltiesByState });
  const ownership = useQuery({ queryKey: ["ownership"], queryFn: getPenaltiesByOwnership });
  const benchmarks = useQuery({ queryKey: ["benchmarks"], queryFn: getReadmissionBenchmarks });
  const features = useQuery({ queryKey: ["feature-importance"], queryFn: getFeatureImportance });
  const backtest = useQuery({ queryKey: ["backtesting"], queryFn: getBacktesting });

  const s = summary.data;

  return (
    <div>
      <DemoBanner />
      <PageHeader
        eyebrow="Analytics Command Center"
        title="National HRRP Penalty Dashboard"
        subtitle={
          s
            ? `${formatNumber(s.total_hospitals)} hospitals analyzed · Predictions apply to ${s.predictions_apply_to} · CMS performance period ${s.cms_performance_period}`
            : "Loading national readmission penalty intelligence…"
        }
      />

      {/* ROW 1 — KPI stat cards */}
      {summary.isLoading || !s ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="card" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Hospitals Analyzed" value={s.total_hospitals} accentColor="cyan" subtitle="With CMS ERR data" />
          <StatCard title="Currently Penalized" value={s.total_penalized} accentColor="risk" subtitle={`${(pct(s.penalty_rate_pct) ?? 0).toFixed(1)}% penalty rate`} />
          <StatCard title="Avg Penalty Rate" value={s.avg_penalty_pct} decimals={2} suffix="%" accentColor="amber" subtitle={`Median ${s.median_penalty_pct.toFixed(2)}%`} />
          <StatCard title="Est. Total Penalties" value={s.estimated_total_penalties_usd} prefix="$" compact accentColor="safe" subtitle="Across all hospitals" />
        </div>
      )}

      {/* ROW 2 — US map + ownership donut */}
      <Section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-white">Penalty Rate by State</h2>
            <span className="text-xs text-slate-500">Hover a state for detail</span>
          </div>
          {states.isLoading || !states.data ? (
            <Skeleton variant="chart" className="border-0 bg-transparent p-0" />
          ) : (
            <>
              <USMap data={states.data} />
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                Showing {states.data.length} states with complete CMS Excess Readmission Ratio data.
                States in gray have insufficient data for penalty analysis.
              </p>
            </>
          )}
        </div>

        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 font-display text-lg font-semibold text-white">Penalty Rate by Ownership</h2>
          {ownership.isLoading || !ownership.data ? (
            <Skeleton variant="chart" className="border-0 bg-transparent p-0" />
          ) : (
            <OwnershipDonut data={ownership.data} />
          )}
        </div>
      </Section>

      {/* ROW 3 — readmission rates */}
      <Section className="mt-6">
        <div className="card p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-white">
              Readmission Rates by Condition
            </h2>
            <span className="text-xs text-slate-500">National vs penalized vs safe hospitals</span>
          </div>
          {benchmarks.isLoading || !benchmarks.data ? (
            <Skeleton variant="chart" className="border-0 bg-transparent p-0" />
          ) : (
            <ReadmissionRatesChart data={benchmarks.data} />
          )}
        </div>
      </Section>

      {/* ROW 4 — feature importance + top states table */}
      <Section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-display text-lg font-semibold text-white">
            What Drives the Prediction
          </h2>
          {features.isLoading || !features.data ? (
            <Skeleton variant="chart" className="border-0 bg-transparent p-0" />
          ) : (
            <FeatureImportanceChart data={features.data} />
          )}
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-white">Top Penalized States</h2>
            <span className="text-xs text-slate-500">Ranked by penalty rate</span>
          </div>
          {states.isLoading || !states.data ? (
            <Skeleton variant="chart" />
          ) : (
            <TopStatesTable data={states.data} />
          )}
        </div>
      </Section>

      {/* ROW 5 — backtesting validation */}
      <Section className="mt-6">
        <div className="card p-6">
          <div className="mb-1 flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-safe" />
            <h2 className="font-display text-lg font-semibold text-white">
              Model Validation Against Actual CMS Penalties
            </h2>
          </div>
          <p className="mb-6 text-sm text-slate-400">
            Predictions cross-checked against real HRRP outcomes for a held-out set of hospitals.
          </p>

          {backtest.isLoading || !backtest.data ? (
            <Skeleton variant="chart" className="border-0 bg-transparent p-0" />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Confusion Matrix · {formatNumber(backtest.data.total_hospitals_tested)} hospitals tested
                  </p>
                  <ConfusionMatrix
                    truePositive={backtest.data.correctly_predicted_penalized}
                    trueNegative={backtest.data.correctly_predicted_safe}
                    falsePositive={backtest.data.false_positives}
                    falseNegative={backtest.data.false_negatives}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard title="Accuracy" value={backtest.data.accuracy_pct} decimals={1} suffix="%" accentColor="cyan" />
                  <StatCard title="Precision" value={backtest.data.precision_pct} decimals={1} suffix="%" accentColor="safe" />
                  <StatCard title="Recall" value={backtest.data.recall_pct} decimals={1} suffix="%" accentColor="amber" />
                  <StatCard title="F1 Score" value={backtest.data.f1_pct} decimals={1} suffix="%" accentColor="cyan" />
                </div>
              </div>

              <BacktestSampleTable samples={backtest.data.sample_predictions} />

              <p className="mt-4 text-xs italic text-slate-500">
                This model was validated against actual CMS HRRP penalty data.
              </p>
            </>
          )}
        </div>
      </Section>

      {/* ROW 6 — data freshness */}
      <p className="mt-6 text-center text-xs text-slate-600">
        Data last updated: {s?.data_last_updated ?? "June 2024"} · Predictions apply to:{" "}
        {s?.predictions_apply_to ?? "FY2027"} · Performance period:{" "}
        {s?.cms_performance_period ?? "July 2021 – June 2024"}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Top penalized states table                                          */
/* ------------------------------------------------------------------ */

function RateBadge({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-slate-500">—</span>;
  const tone =
    rate > 50
      ? "bg-risk/15 text-risk-light border-risk/30"
      : rate >= 30
        ? "bg-amber/15 text-amber-light border-amber/30"
        : "bg-safe/15 text-safe-light border-safe/30";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums",
        tone,
      )}
    >
      {rate.toFixed(1)}%
    </span>
  );
}

function TopStatesTable({ data }: { data: PenaltiesByStateItem[] }) {
  const rows = [...data]
    .map((r) => ({ ...r, penalty_rate_pct: pct(r.penalty_rate_pct) ?? 0 }))
    .sort((a, b) => b.penalty_rate_pct - a.penalty_rate_pct)
    .slice(0, 15);

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: "state",
      header: "State",
      accessor: (r) => r.state_name,
      render: (r) => (
        <span className="font-medium text-white">
          {r.state_name}
          <span className="ml-1.5 text-xs text-slate-500">{r.state}</span>
        </span>
      ),
    },
    { key: "penalized", header: "Penalized", align: "right", accessor: (r) => r.penalized_count, render: (r) => <span className="tabular-nums">{formatNumber(r.penalized_count)}</span> },
    { key: "total", header: "Total", align: "right", accessor: (r) => r.total_count, render: (r) => <span className="tabular-nums text-slate-400">{formatNumber(r.total_count)}</span> },
    { key: "rate", header: "Rate", align: "right", accessor: (r) => r.penalty_rate_pct, render: (r) => <RateBadge rate={r.penalty_rate_pct} /> },
    { key: "avg", header: "Avg Penalty", align: "right", accessor: (r) => r.avg_penalty_pct, render: (r) => <span className="tabular-nums text-amber-light">{r.avg_penalty_pct.toFixed(2)}%</span> },
  ];

  return <DataTable columns={columns} data={rows} rowKey={(r) => r.state} pageSize={15} />;
}

/* ------------------------------------------------------------------ */
/* Backtesting sample predictions table                                */
/* ------------------------------------------------------------------ */

function BacktestSampleTable({ samples }: { samples: BacktestSample[] }) {
  const rows = samples.slice(0, 20);
  return (
    <div className="mt-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Validation Predictions
      </p>
      <div className="max-h-80 overflow-auto rounded-xl border border-navy-300">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-navy-200/95 backdrop-blur">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-3 py-2.5">Hospital</th>
              <th className="px-3 py-2.5">State</th>
              <th className="px-3 py-2.5">Predicted</th>
              <th className="px-3 py-2.5">Actual</th>
              <th className="px-3 py-2.5 text-right">Pred. Prob</th>
              <th className="px-3 py-2.5 text-right">Actual Penalty</th>
              <th className="px-3 py-2.5 text-center">Correct?</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={`${row.provider_id ?? "row"}-${i}`}
                className={cn(
                  "border-t border-navy-300/40",
                  row.correct ? "bg-safe/[0.06]" : "bg-risk/[0.06]",
                )}
              >
                <td className="px-3 py-2.5 text-slate-200">{row.hospital_name ?? "—"}</td>
                <td className="px-3 py-2.5 text-slate-400">{row.state ?? "—"}</td>
                <td className="px-3 py-2.5">
                  <StatusPill on={row.predicted_penalized} labelOn="Penalized" labelOff="Safe" />
                </td>
                <td className="px-3 py-2.5">
                  <StatusPill on={row.actually_penalized} labelOn="Penalized" labelOff="Safe" />
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">
                  {row.predicted_probability !== null
                    ? `${(row.predicted_probability * 100).toFixed(0)}%`
                    : "—"}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">
                  {row.actual_penalty_pct !== null ? `${row.actual_penalty_pct.toFixed(2)}%` : "—"}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className={row.correct ? "text-safe-light" : "text-risk-light"}>
                    {row.correct ? "✓" : "✕"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ on, labelOn, labelOff }: { on: boolean; labelOn: string; labelOff: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        on ? "bg-risk/15 text-risk-light" : "bg-safe/15 text-safe-light",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", on ? "bg-risk" : "bg-safe")} />
      {on ? labelOn : labelOff}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Scroll-in section wrapper                                           */
/* ------------------------------------------------------------------ */

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

function Section({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.section
      variants={sectionVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      className={className}
    >
      {children}
    </motion.section>
  );
}
