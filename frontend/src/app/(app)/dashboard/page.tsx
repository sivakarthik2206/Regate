"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useInView } from "framer-motion";
import { AlertCircle, ArrowDownRight, ArrowUpRight, RefreshCw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DEMO_FEATURE_IMPORTANCE,
  DEMO_PENALTIES_BY_STATE,
  DEMO_READMISSION_RATES,
  DEMO_SUMMARY,
  getFeatureImportance,
  getPenaltiesByState,
  getReadmissionRates,
  getSummary,
} from "@/lib/api";
import type {
  ApiPenaltiesByStateItem,
  ApiReadmissionRateItem,
  HospitalPenaltyByOwnership,
  PredictionFeatureImportanceItem,
} from "@/lib/types";
import { Skeleton } from "@/components/ui/Skeleton";
import { UsPenaltyMap, type DashboardStateMetric } from "@/components/dashboard/UsPenaltyMap";

const CARD_BACKGROUND = "#141C30";
const CARD_BORDER = "#263252";
const PAGE_BACKGROUND = "#0A0F1E";
const CYAN = "#00D4FF";
const RED = "#FF4D6D";
const GREEN = "#00C896";
const AMBER = "#F7A800";

type TrendDirection = "up" | "down";

interface OwnershipSlice {
  name: "Government" | "Proprietary" | "Voluntary Non-profit" | "Other";
  count: number;
  rate: number;
  fill: string;
}

interface ReadmissionDatum {
  label: string;
  nationalAverage: number;
  penalized: number;
  safe: number;
}

interface FeatureDatum {
  label: string;
  importance: number;
}

interface TooltipEntry {
  color?: string;
  dataKey?: string | number;
  name?: string;
  payload?: Record<string, number | string>;
  value?: number;
}

export default function DashboardPage(): JSX.Element {
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

  const summary = summaryQuery.data || DEMO_SUMMARY;
  const penaltiesByState = stateQuery.data || DEMO_PENALTIES_BY_STATE;
  const featureImportance = importanceQuery.data || DEMO_FEATURE_IMPORTANCE;
  const readmissionRates = readmissionQuery.data || DEMO_READMISSION_RATES;

  const normalizedPenaltyRatePct = normalizeDisplayPercent(summary.penalty_rate_pct);
  const normalizedAvgPenaltyPct = summary.avg_penalty_pct ?? 0;

  const stateMetrics = React.useMemo(
    () => penaltiesByState.map(toDashboardStateMetric),
    [penaltiesByState],
  );

  const ownershipData = React.useMemo(
    () => groupOwnership(summary.penalty_by_ownership),
    [summary.penalty_by_ownership],
  );

  const readmissionData = React.useMemo(
    () => normalizeReadmissionRates(readmissionRates),
    [readmissionRates],
  );

  const featureData = React.useMemo(
    () => normalizeFeatureImportance(featureImportance),
    [featureImportance],
  );

  const topStates = React.useMemo(
    () => [...stateMetrics].sort((a, b) => b.penaltyRate - a.penaltyRate).slice(0, 10),
    [stateMetrics],
  );

  const stateCoveragePct = React.useMemo(() => {
    if (summary.total_hospitals_analyzed <= 0) return 0;
    const covered = penaltiesByState.reduce((total, item) => total + item.total_count, 0);
    return (covered / summary.total_hospitals_analyzed) * 100;
  }, [penaltiesByState, summary.total_hospitals_analyzed]);

  const penaltyMixPct = React.useMemo(() => {
    if (summary.total_hospitals_analyzed <= 0) return 0;
    return (summary.total_penalized / summary.total_hospitals_analyzed) * 100;
  }, [summary.total_hospitals_analyzed, summary.total_penalized]);

  const handleRefetch = React.useCallback(() => {
    summaryQuery.refetch();
    stateQuery.refetch();
    importanceQuery.refetch();
    readmissionQuery.refetch();
  }, [importanceQuery, readmissionQuery, stateQuery, summaryQuery]);

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 md:px-10 md:py-10" style={{ backgroundColor: PAGE_BACKGROUND }}>
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(38,50,82,0.32) 1px, transparent 1px), linear-gradient(90deg, rgba(38,50,82,0.32) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,212,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,77,109,0.08),transparent_22%)]" />

      <section className="relative mx-auto max-w-7xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <h1 className="text-[36px] font-semibold tracking-tight text-white">Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/55">
              National readmission penalty intelligence with state-level exposure, ownership mix, and predictor drivers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {demoMode ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-[#5B4A1A] bg-[#2A2110] px-3 py-1.5 text-xs font-medium text-[#FFD16E]">
                <AlertCircle className="h-3.5 w-3.5" />
                Demo Mode
              </span>
            ) : null}
            <button
              onClick={handleRefetch}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-[10px] border px-3.5 py-2 text-sm text-white/80"
              style={{ backgroundColor: CARD_BACKGROUND, borderColor: CARD_BORDER }}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Sync data
            </button>
          </div>
        </motion.div>

        {demoMode ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="rounded-[12px] border px-4 py-3"
            style={{ backgroundColor: "rgba(247,168,0,0.08)", borderColor: "rgba(247,168,0,0.2)" }}
          >
            <div className="flex items-start gap-3 text-sm text-white/70">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#FFD16E]" />
              <p>
                Live analytics are unavailable, so the dashboard is rendering demo data from the existing frontend fallback path at{" "}
                <code className="rounded bg-black/20 px-1.5 py-0.5 text-xs text-white/85">
                  {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}
                </code>
                .
              </p>
            </div>
          </motion.div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-[172px] rounded-[12px]" />)
          ) : (
            <>
              <KpiCard
                delay={0}
                title="Hospitals Analyzed"
                value={summary.total_hospitals_analyzed}
                format="integer"
                accent={CYAN}
                subtitle="Total CMS-aligned hospital registry"
                trendDirection="up"
                trendValue={stateCoveragePct}
              />
              <KpiCard
                delay={0.1}
                title="Currently Penalized"
                value={summary.total_penalized}
                format="integer"
                accent={RED}
                subtitle={`${normalizedPenaltyRatePct.toFixed(1)}% of hospitals in scope`}
                trendDirection="up"
                trendValue={normalizedPenaltyRatePct}
              />
              <KpiCard
                delay={0.2}
                title="Avg Penalty Rate"
                value={normalizedAvgPenaltyPct}
                format="percent"
                accent={AMBER}
                subtitle="Mean HRRP reimbursement reduction"
                trendDirection="down"
                trendValue={normalizedAvgPenaltyPct}
              />
              <KpiCard
                delay={0.3}
                title="Est. Total Penalties"
                value={summary.estimated_total_penalties_usd}
                format="currencyCompact"
                accent={GREEN}
                subtitle="Annualized penalty exposure"
                trendDirection="up"
                trendValue={penaltyMixPct}
              />
            </>
          )}
        </section>

        <RevealSection className="grid gap-6 xl:grid-cols-[1.6fr_0.95fr]">
          {isLoading ? (
            <>
              <Skeleton className="h-[520px] rounded-[12px]" />
              <Skeleton className="h-[520px] rounded-[12px]" />
            </>
          ) : (
            <>
              <UsPenaltyMap data={stateMetrics} />
              <OwnershipDonutCard data={ownershipData} />
            </>
          )}
        </RevealSection>

        <RevealSection>
          {isLoading ? (
            <Skeleton className="h-[430px] rounded-[12px]" />
          ) : (
            <ReadmissionChartCard data={readmissionData} />
          )}
        </RevealSection>

        <RevealSection className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          {isLoading ? (
            <>
              <Skeleton className="h-[420px] rounded-[12px]" />
              <Skeleton className="h-[420px] rounded-[12px]" />
            </>
          ) : (
            <>
              <FeatureImportanceCard data={featureData} />
              <TopStatesTableCard data={topStates} />
            </>
          )}
        </RevealSection>
      </section>
    </main>
  );
}

function RevealSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <motion.section
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function KpiCard({
  delay,
  title,
  value,
  format,
  accent,
  subtitle,
  trendDirection,
  trendValue,
}: {
  delay: number;
  title: string;
  value: number;
  format: "integer" | "percent" | "currencyCompact";
  accent: string;
  subtitle: string;
  trendDirection: TrendDirection;
  trendValue: number;
}): JSX.Element {
  const displayValue = useCountUp(value, format);

  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      whileHover={{ y: -2, boxShadow: "0 18px 40px rgba(0,0,0,0.22)" }}
      className="rounded-[12px] border px-5 py-5"
      style={{
        backgroundColor: CARD_BACKGROUND,
        borderColor: CARD_BORDER,
        borderLeftColor: accent,
        borderLeftWidth: 3,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="text-sm uppercase tracking-[0.16em] text-white/45">{title}</div>
        <TrendBadge direction={trendDirection} value={trendValue} accent={accent} />
      </div>
      <div className="mt-6 font-display text-[42px] font-semibold leading-none tracking-tight text-white md:text-[48px]">
        {displayValue}
      </div>
      <p className="mt-3 text-sm text-white/55">{subtitle}</p>
    </motion.div>
  );
}

function TrendBadge({
  direction,
  value,
  accent,
}: {
  direction: TrendDirection;
  value: number;
  accent: string;
}): JSX.Element {
  const Icon = direction === "up" ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium"
      style={{
        borderColor: `${accent}33`,
        backgroundColor: `${accent}14`,
        color: accent,
      }}
    >
      <Icon className="h-3.5 w-3.5" />
      {direction === "up" ? "+" : "-"}
      {value.toFixed(1)}%
    </span>
  );
}

function OwnershipDonutCard({ data }: { data: OwnershipSlice[] }): JSX.Element {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const total = React.useMemo(() => data.reduce((sum, item) => sum + item.count, 0), [data]);

  return (
    <div
      ref={ref}
      className="rounded-[12px] border p-5 md:p-6"
      style={{ backgroundColor: CARD_BACKGROUND, borderColor: CARD_BORDER, boxShadow: "0 22px 50px rgba(4, 10, 24, 0.45)" }}
    >
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-white">Penalty by Hospital Type</h2>
        <p className="mt-1 text-sm text-white/55">Ownership categories consolidated to the operational mix that matters</p>
      </div>

      <div className="mt-6 h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<OwnershipTooltip total={total} />} />
            <Pie
              data={data}
              dataKey="count"
              nameKey="name"
              innerRadius={78}
              outerRadius={112}
              paddingAngle={3}
              stroke="#0A0F1E"
              strokeWidth={2}
              isAnimationActive={inView}
              animationDuration={1000}
              animationEasing="ease-out"
              labelLine={false}
              label={(props) => renderPieLabel(props, total)}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between rounded-[10px] border border-white/6 bg-white/[0.03] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
              <span className="text-sm text-white/75">{entry.name}</span>
            </div>
            <span className="font-display text-base font-medium text-white">{Math.round((entry.count / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadmissionChartCard({ data }: { data: ReadmissionDatum[] }): JSX.Element {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.28 });

  return (
    <div
      ref={ref}
      className="rounded-[12px] border p-5 md:p-6"
      style={{ backgroundColor: CARD_BACKGROUND, borderColor: CARD_BORDER, boxShadow: "0 22px 50px rgba(4, 10, 24, 0.45)" }}
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">Readmission Rates by Condition</h2>
          <p className="mt-1 text-sm text-white/55">National average versus penalized and safe cohorts</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-white/55">
          <LegendChip color={CYAN} label="National Average" />
          <LegendChip color={RED} label="Penalized" />
          <LegendChip color={GREEN} label="Safe" />
        </div>
      </div>

      <div className="mt-6 h-[320px] md:h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 18, right: 12, left: -18, bottom: 10 }} barGap={8}>
            <defs>
              <linearGradient id="readmission-grid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.01)" />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="url(#readmission-grid)" />
            <XAxis
              dataKey="label"
              tick={{ fill: "rgba(255,255,255,0.58)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-18}
              textAnchor="end"
              height={62}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={44}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip content={<ReadmissionTooltip />} />
            <Bar dataKey="nationalAverage" name="National Average" fill={CYAN} radius={[4, 4, 0, 0]} isAnimationActive={inView} animationDuration={850}>
              <LabelList dataKey="nationalAverage" position="top" formatter={formatValueLabel} className="fill-white/65 text-[10px]" />
            </Bar>
            <Bar dataKey="penalized" name="Penalized" fill={RED} radius={[4, 4, 0, 0]} isAnimationActive={inView} animationDuration={1000}>
              <LabelList dataKey="penalized" position="top" formatter={formatValueLabel} className="fill-white/65 text-[10px]" />
            </Bar>
            <Bar dataKey="safe" name="Safe" fill={GREEN} radius={[4, 4, 0, 0]} isAnimationActive={inView} animationDuration={1150}>
              <LabelList dataKey="safe" position="top" formatter={formatValueLabel} className="fill-white/65 text-[10px]" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function FeatureImportanceCard({ data }: { data: FeatureDatum[] }): JSX.Element {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const maxImportance = data[0]?.importance ?? 1;

  return (
    <div
      ref={ref}
      className="rounded-[12px] border p-5 md:p-6"
      style={{ backgroundColor: CARD_BACKGROUND, borderColor: CARD_BORDER, boxShadow: "0 22px 50px rgba(4, 10, 24, 0.45)" }}
    >
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-white">Feature Importance</h2>
        <p className="mt-1 text-sm text-white/55">Most influential signals used by the penalty prediction model</p>
      </div>

      <div className="mt-6 space-y-4">
        {data.map((item, index) => {
          const width = `${(item.importance / maxImportance) * 100}%`;
          const color = mixHex("#4B556E", CYAN, index / Math.max(data.length - 1, 1));

          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
            >
              <div className="mb-2 flex items-center justify-between gap-4">
                <span className="max-w-[80%] text-sm text-white/78">{item.label}</span>
                <span className="font-display text-sm font-medium text-white">{item.importance.toFixed(3)}</span>
              </div>
              <div className="h-3 rounded-full bg-white/[0.05]">
                <motion.div
                  className="h-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={inView ? { width } : { width: 0 }}
                  transition={{ duration: 0.7, delay: index * 0.08 }}
                  style={{
                    width,
                    background: `linear-gradient(90deg, ${color} 0%, ${CYAN} 100%)`,
                    boxShadow: `0 0 18px ${color}33`,
                  }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function TopStatesTableCard({ data }: { data: DashboardStateMetric[] }): JSX.Element {
  return (
    <div
      className="rounded-[12px] border p-5 md:p-6"
      style={{ backgroundColor: CARD_BACKGROUND, borderColor: CARD_BORDER, boxShadow: "0 22px 50px rgba(4, 10, 24, 0.45)" }}
    >
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-white">Top Penalized States</h2>
        <p className="mt-1 text-sm text-white/55">Rates recalculated from penalized and total counts to eliminate malformed percentages</p>
      </div>

      <div className="mt-5 overflow-hidden rounded-[10px] border border-white/6">
        <div className="grid grid-cols-[0.95fr_0.95fr_0.9fr_0.95fr] bg-[#11192B] px-4 py-3 text-xs uppercase tracking-[0.16em] text-white/45">
          <span>State</span>
          <span className="text-right">Penalized</span>
          <span className="text-right">Total</span>
          <span className="text-right">Rate</span>
        </div>
        <div>
          {data.map((row, index) => (
            <motion.div
              key={row.state}
              initial={{ opacity: 0, x: 22 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              className="grid grid-cols-[0.95fr_0.95fr_0.9fr_0.95fr] items-center px-4 py-3"
              style={{ backgroundColor: index % 2 === 0 ? CARD_BACKGROUND : PAGE_BACKGROUND }}
            >
              <div>
                <div className="font-medium text-white">{row.name}</div>
                <div className="text-xs text-white/42">{row.state}</div>
              </div>
              <div className="text-right font-display text-base text-white">{row.penalizedCount.toLocaleString()}</div>
              <div className="text-right font-display text-base text-white/72">{row.totalCount.toLocaleString()}</div>
              <div className="text-right">
                <RateBadge rate={row.penaltyRate} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OwnershipTooltip({
  total,
  active,
  payload,
}: {
  total: number;
  active?: boolean;
  payload?: TooltipEntry[];
}): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;

  const entry = payload[0];
  const count = typeof entry.value === "number" ? entry.value : 0;
  const rate = typeof entry.payload?.rate === "number" ? entry.payload.rate : 0;

  return (
    <div
      className="rounded-[12px] border px-3 py-2.5 text-sm shadow-2xl"
      style={{ backgroundColor: "rgba(12, 17, 31, 0.96)", borderColor: CARD_BORDER, backdropFilter: "blur(10px)" }}
    >
      <div className="font-medium text-white">{String(entry.name ?? "")}</div>
      <div className="mt-2 space-y-1.5 text-xs text-white/65">
        <div className="flex items-center justify-between gap-6">
          <span>Hospitals</span>
          <span className="font-display text-white">{count.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span>Share</span>
          <span className="font-display text-white">{total > 0 ? ((count / total) * 100).toFixed(1) : "0.0"}%</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span>Penalty rate</span>
          <span className="font-display text-white">{formatFractionRate(rate)}</span>
        </div>
      </div>
    </div>
  );
}

function ReadmissionTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: TooltipEntry[];
}): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className="rounded-[12px] border px-3 py-2.5 text-sm shadow-2xl"
      style={{ backgroundColor: "rgba(12, 17, 31, 0.96)", borderColor: CARD_BORDER, backdropFilter: "blur(10px)" }}
    >
      <div className="font-medium text-white">{label}</div>
      <div className="mt-2 space-y-1.5 text-xs text-white/65">
        {payload.map((entry) => (
          <div key={String(entry.name)} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color || "#fff" }} />
              <span>{String(entry.name ?? "")}</span>
            </div>
            <span className="font-display text-white">{typeof entry.value === "number" ? `${entry.value.toFixed(1)}%` : "N/A"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LegendChip({ color, label }: { color: string; label: string }): JSX.Element {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}

function RateBadge({ rate }: { rate: number }): JSX.Element {
  const percent = rate * 100;
  const color = percent > 40 ? RED : percent >= 30 ? AMBER : GREEN;

  return (
    <span
      className="inline-flex min-w-[72px] items-center justify-center rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{
        borderColor: `${color}33`,
        backgroundColor: `${color}14`,
        color,
      }}
    >
      {percent.toFixed(1)}%
    </span>
  );
}

function useCountUp(value: number, format: "integer" | "percent" | "currencyCompact"): string {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    let frame = 0;
    const duration = 1100;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(value * eased);
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  switch (format) {
    case "percent":
      return `${displayValue.toFixed(1)}%`;
    case "currencyCompact":
      return formatCompactCurrency(displayValue);
    case "integer":
    default:
      return Math.round(displayValue).toLocaleString();
  }
}

function renderPieLabel(
  props: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    percent?: number;
  },
  total: number,
): JSX.Element | null {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (
    typeof cx !== "number" ||
    typeof cy !== "number" ||
    typeof midAngle !== "number" ||
    typeof innerRadius !== "number" ||
    typeof outerRadius !== "number" ||
    typeof percent !== "number"
  ) {
    return null;
  }

  const valuePct = total > 0 ? percent * 100 : 0;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.52;
  const radians = (-midAngle * Math.PI) / 180;
  const x = cx + radius * Math.cos(radians);
  const y = cy + radius * Math.sin(radians);

  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill="#F8FAFC" fontSize="11" fontWeight={600}>
      {`${valuePct.toFixed(0)}%`}
    </text>
  );
}

function normalizeDisplayPercent(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  if (Math.abs(value) <= 1) return value * 100;
  if (Math.abs(value) > 100) return value / 100;
  return value;
}

function recalculatePenaltyRate(item: ApiPenaltiesByStateItem): number {
  if (item.total_count > 0) {
    return item.penalized_count / item.total_count;
  }

  const raw = item.penalty_rate;
  if (!Number.isFinite(raw)) return 0;
  if (raw > 1) return raw / 100;
  return raw;
}

function toDashboardStateMetric(item: ApiPenaltiesByStateItem): DashboardStateMetric {
  const rate = recalculatePenaltyRate(item);

  return {
    state: item.state,
    name: STATE_NAMES[item.state] ?? item.state,
    penalizedCount: item.penalized_count,
    totalCount: item.total_count,
    penaltyRate: rate,
    avgPenaltyPct: item.avg_penalty_pct ?? null,
  };
}

function groupOwnership(data: HospitalPenaltyByOwnership[]): OwnershipSlice[] {
  const buckets: Record<OwnershipSlice["name"], OwnershipSlice> = {
    Government: { name: "Government", count: 0, rate: 0, fill: CYAN },
    Proprietary: { name: "Proprietary", count: 0, rate: 0, fill: RED },
    "Voluntary Non-profit": { name: "Voluntary Non-profit", count: 0, rate: 0, fill: GREEN },
    Other: { name: "Other", count: 0, rate: 0, fill: AMBER },
  };

  for (const item of data) {
    const key = toOwnershipBucket(item.ownership);
    const bucket = buckets[key];
    bucket.count += item.count;
    bucket.rate += recalculateOwnershipRate(item.penalty_rate) * item.count;
  }

  return (Object.keys(buckets) as OwnershipSlice["name"][])
    .map((key) => {
      const bucket = buckets[key];
      return {
        ...bucket,
        rate: bucket.count > 0 ? bucket.rate / bucket.count : 0,
      };
    })
    .filter((item) => item.count > 0);
}

function normalizeReadmissionRates(data: ApiReadmissionRateItem[]): ReadmissionDatum[] {
  const conditionMap: Record<string, string> = {
    AMI: "AMI",
    HF: "Heart Failure",
    PN: "Pneumonia",
    COPD: "COPD",
    HIP_KNEE: "Hip/Knee",
    CABG: "CABG",
  };

  return data.map((item) => ({
    label: conditionMap[item.condition] ?? item.condition,
    nationalAverage: item.national_avg,
    penalized: item.penalized_avg,
    safe: item.safe_avg,
  }));
}

function normalizeFeatureImportance(data: PredictionFeatureImportanceItem[]): FeatureDatum[] {
  return [...data]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 5)
    .map((item) => ({
      label: FEATURE_LABELS[item.feature] ?? item.description,
      importance: item.importance,
    }));
}

function toOwnershipBucket(value: string): OwnershipSlice["name"] {
  const normalized = value.toLowerCase();
  if (normalized.includes("government")) return "Government";
  if (normalized.includes("proprietary")) return "Proprietary";
  if (normalized.includes("voluntary")) return "Voluntary Non-profit";
  return "Other";
}

function recalculateOwnershipRate(rate: number): number {
  if (!Number.isFinite(rate)) return 0;
  if (rate > 1) return rate / 100;
  return rate;
}

function formatCompactCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${Math.round(value)}`;
}

function formatFractionRate(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatValueLabel(value: number): string {
  return `${value.toFixed(1)}%`;
}

function mixHex(start: string, end: string, amount: number): string {
  const [r1, g1, b1] = hexToRgb(start);
  const [r2, g2, b2] = hexToRgb(end);
  const t = clamp(amount, 0, 1);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(value: string): [number, number, number] {
  const normalized = value.replace("#", "");
  const parsed = Number.parseInt(normalized, 16);
  return [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

const FEATURE_LABELS: Record<string, string> = {
  avg_readmission_rate: "Mean readmission rate",
  conditions_above_national: "Count of conditions above national avg",
  has_emergency_services: "Whether hospital has emergency services",
  ownership_type: "Ownership category",
  star_rating: "Hospital overall quality rating",
};

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DC: "District of Columbia",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  IA: "Iowa",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  MA: "Massachusetts",
  MD: "Maryland",
  ME: "Maine",
  MI: "Michigan",
  MN: "Minnesota",
  MO: "Missouri",
  MS: "Mississippi",
  MT: "Montana",
  NC: "North Carolina",
  ND: "North Dakota",
  NE: "Nebraska",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NV: "Nevada",
  NY: "New York",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VA: "Virginia",
  VT: "Vermont",
  WA: "Washington",
  WI: "Wisconsin",
  WV: "West Virginia",
  WY: "Wyoming",
};
