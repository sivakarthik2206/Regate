"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, RefreshCw } from "lucide-react";
import {
  getSummary,
  getPenaltiesByState,
  getFeatureImportance,
  getReadmissionRates,
  DEMO_SUMMARY,
  DEMO_PENALTIES_BY_STATE,
  DEMO_FEATURE_IMPORTANCE,
  DEMO_READMISSION_RATES,
} from "@/lib/api";
import { StatCard } from "@/components/ui/StatCard";
import { StatePenaltyMap } from "@/components/charts/StatePenaltyMap";
import { OwnershipChart } from "@/components/charts/OwnershipChart";
import { ReadmissionRatesChart } from "@/components/charts/ReadmissionRatesChart";
import { FeatureImportanceChart } from "@/components/charts/FeatureImportanceChart";
import { StatesTable } from "@/components/ui/StatesTable";
import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardPage(): JSX.Element {
  // Use React Query for data fetching
  const summaryQuery = useQuery({
    queryKey: ["summary"],
    queryFn: getSummary,
    retry: 1,
  });

  const stateQuery = useQuery({
    queryKey: ["penaltiesByState"],
    queryFn: getPenaltiesByState,
    retry: 1,
  });

  const importanceQuery = useQuery({
    queryKey: ["featureImportance"],
    queryFn: getFeatureImportance,
    retry: 1,
  });

  const readmissionQuery = useQuery({
    queryKey: ["readmissionRates"],
    queryFn: getReadmissionRates,
    retry: 1,
  });

  const isLoading =
    summaryQuery.isLoading ||
    stateQuery.isLoading ||
    importanceQuery.isLoading ||
    readmissionQuery.isLoading;

  const demoMode =
    summaryQuery.isError ||
    stateQuery.isError ||
    importanceQuery.isError ||
    readmissionQuery.isError;

  // Aggregate stats / data
  const summary = summaryQuery.data || DEMO_SUMMARY;
  const penaltiesByState = stateQuery.data || DEMO_PENALTIES_BY_STATE;
  const featureImportance = importanceQuery.data || DEMO_FEATURE_IMPORTANCE;
  const readmissionRates = readmissionQuery.data || DEMO_READMISSION_RATES;

  // Format Estimated Penalties (e.g. $142m)
  const formatEstimatedPenalties = (amount: number): string => {
    if (amount >= 1e9) {
      return `$${(amount / 1e9).toFixed(1)}b`;
    }
    return `$${(amount / 1e6).toFixed(0)}m`;
  };

  const handleRefetch = () => {
    summaryQuery.refetch();
    stateQuery.refetch();
    importanceQuery.refetch();
    readmissionQuery.refetch();
  };

  return (
    <main className="min-h-screen px-4 py-8 md:px-10 md:py-10">
      <section className="mx-auto max-w-7xl space-y-8">
        {/* Header Block */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-white">
              Regate Executive Dashboard
            </h1>
            <p className="mt-1.5 text-sm text-white/50">
              Real-time analytics on CMS Hospital Readmissions Reduction Program (HRRP) exposure.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {demoMode && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber/20 bg-amber/10 px-3.5 py-1 text-xs font-semibold text-amber shadow-[0_0_15px_rgba(247,168,0,0.1)]">
                <AlertCircle className="h-3.5 w-3.5" />
                Demo Mode
              </span>
            )}
            <button
              onClick={handleRefetch}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/10 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
              Sync Data
            </button>
          </div>
        </div>

        {/* Error/Demo Banner */}
        {demoMode && (
          <div className="relative overflow-hidden rounded-[20px] border border-amber/30 bg-gradient-to-r from-amber/20 to-transparent p-5">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-amber/20 p-2 text-amber">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-display font-semibold text-white">
                  Running in demo mode — connect the API for live data
                </h4>
                <p className="mt-1 text-xs text-white/60">
                  We could not reach the backend service at{" "}
                  <code className="rounded bg-navy-950 px-1 py-0.5 text-[10px] text-amber">
                    {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}
                  </code>
                  . Rendering realistic national Medicare datasets.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* FIRST ROW: KPI STAT CARDS */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={`kpi-sk-${i}`} className="h-32" />
            ))
          ) : (
            <>
              <StatCard
                title="Hospitals Analyzed"
                value={summary.total_hospitals_analyzed.toLocaleString()}
                subtitle="CMS Registry matching filters"
                trend="neutral"
                trendValue="v1.0"
                accentColor="cyan"
              />
              <StatCard
                title="Currently Penalized"
                value={summary.total_penalized.toLocaleString()}
                subtitle={`${summary.penalty_rate_pct?.toFixed(1)}% of registry`}
                trend="up"
                trendValue="+1.2%"
                accentColor="risk-red"
              />
              <StatCard
                title="Avg Penalty Rate"
                value={`${summary.avg_penalty_pct?.toFixed(1)}%`}
                subtitle="Mean HRRP reimbursement cut"
                trend="down"
                trendValue="-0.4%"
                accentColor="amber"
              />
              <StatCard
                title="Est. Total Penalties"
                value={formatEstimatedPenalties(summary.estimated_total_penalties_usd)}
                subtitle="Aggregated annual risk"
                trend="neutral"
                trendValue="Annual"
                accentColor="safe-green"
              />
            </>
          )}
        </div>

        {/* SECOND ROW: US choropleth map + Penalty by Ownership donut */}
        <div className="grid gap-6 lg:grid-cols-[60%_40%]">
          {isLoading ? (
            <>
              <Skeleton className="h-[430px]" />
              <Skeleton className="h-[430px]" />
            </>
          ) : (
            <>
              <StatePenaltyMap data={penaltiesByState} />
              <OwnershipChart data={summary.penalty_by_ownership} />
            </>
          )}
        </div>

        {/* THIRD ROW: Readmission rates comparison bar chart */}
        <div className="w-full">
          {isLoading ? (
            <Skeleton className="h-[400px]" />
          ) : (
            <ReadmissionRatesChart data={readmissionRates} />
          )}
        </div>

        {/* FOURTH ROW: Feature importance + Top penalized states table */}
        <div className="grid gap-6 md:grid-cols-2">
          {isLoading ? (
            <>
              <Skeleton className="h-[400px]" />
              <Skeleton className="h-[400px]" />
            </>
          ) : (
            <>
              <FeatureImportanceChart data={featureImportance} />
              <StatesTable data={penaltiesByState} />
            </>
          )}
        </div>
      </section>
    </main>
  );
}
