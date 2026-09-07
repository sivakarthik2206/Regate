"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Phone,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { getHospital, getSimilarHospitals } from "@/lib/api";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { RiskGauge } from "@/components/ui/RiskGauge";
import { ExportButton } from "@/components/ui/ExportButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { DemoBanner } from "@/components/ui/DemoBanner";
import type { ConditionBreakdownItem } from "@/lib/types";
import { cn, formatCurrency, formatPct, normalizeTier } from "@/lib/utils";

export default function HospitalDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const profile = useQuery({
    queryKey: ["hospital", id],
    queryFn: () => getHospital(id),
    enabled: !!id,
  });
  const similar = useQuery({
    queryKey: ["similar", id],
    queryFn: () => getSimilarHospitals(id),
    enabled: !!id,
  });

  const p = profile.data;

  if (profile.isLoading || !p) {
    return (
      <div className="space-y-6">
        <DemoBanner />
        <Skeleton variant="card" className="h-36" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton variant="card" className="h-48" />
          <Skeleton variant="card" className="h-48" />
          <Skeleton variant="card" className="h-48" />
        </div>
        <Skeleton variant="chart" className="h-64" />
      </div>
    );
  }

  const tier = normalizeTier(p.risk_tier);
  const fullAddress = [p.address, p.city, p.state, p.zip].filter(Boolean).join(", ");

  return (
    <div>
      <DemoBanner />

      <button
        type="button"
        onClick={() => router.back()}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-cyan transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to hospitals
      </button>

      {/* ── HEADER ── */}
      <div className="card mb-6 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <h1 className="font-display text-[28px] font-bold leading-tight text-white">
              {p.name ?? "Unknown Hospital"}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
              {fullAddress && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-cyan" />
                  {fullAddress}
                </span>
              )}
              {p.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-cyan" />
                  {p.phone}
                </span>
              )}
            </div>

            {p.provider_id && (
              <p className="mt-2 font-mono text-xs text-slate-500">
                Provider ID: {p.provider_id}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* Star rating */}
              {p.star_rating != null && (
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={cn(
                        "h-4 w-4",
                        s <= p.star_rating! ? "text-amber" : "text-slate-700",
                      )}
                      fill={s <= p.star_rating! ? "currentColor" : "none"}
                    />
                  ))}
                  <span className="ml-1 text-xs text-slate-400">{p.star_rating}-star</span>
                </div>
              )}

              {/* Ownership badge */}
              {p.ownership_type && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-navy-300 bg-navy-200/60 px-2.5 py-0.5 text-xs text-slate-300">
                  <Users className="h-3 w-3 text-cyan" />
                  {p.ownership_type}
                </span>
              )}

              {/* ER badge */}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                  p.emergency_services
                    ? "border-safe/30 bg-safe/10 text-safe-light"
                    : "border-amber/30 bg-amber/10 text-amber-light",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    p.emergency_services ? "bg-safe" : "bg-amber",
                  )}
                />
                {p.emergency_services ? "ER Available" : "No ER"}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={p.cms_compare_url}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost"
            >
              <ExternalLink className="h-4 w-4" />
              Verify on CMS
            </a>
            {p.provider_id && <ExportButton providerId={p.provider_id} format="csv" />}
            {p.provider_id && <ExportButton providerId={p.provider_id} format="pdf" />}
          </div>
        </div>
      </div>

      {/* ── RISK OVERVIEW (3 cards) ── */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Card 1: Risk gauge */}
        <div className="card flex flex-col items-center justify-center p-6">
          <RiskGauge value={p.risk_score ?? 0} size="md" label="Penalty risk" />
          <div className="mt-3">
            <RiskBadge tier={p.risk_tier} size="lg" />
          </div>
        </div>

        {/* Card 2: Penalty impact */}
        <div className="card flex flex-col justify-center p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Penalty Impact
          </p>
          <p
            className={cn(
              "mt-2 font-display text-3xl font-bold",
              p.penalized ? "text-risk-light" : "text-safe-light",
            )}
          >
            {p.penalized ? formatPct(p.penalty_pct, 2) : "No Penalty"}
          </p>
          <p className="mt-1 text-xs text-slate-500">payment reduction</p>
          <div className="mt-4 rounded-xl border border-navy-300 bg-navy-200/40 p-3">
            <p className="text-xs text-slate-400">Estimated annual impact</p>
            <p className="mt-1 font-display text-lg font-bold text-cyan">
              {p.estimated_penalty_usd > 0
                ? formatCurrency(p.estimated_penalty_usd, false)
                : "—"}
            </p>
          </div>
          {p.penalty_tier && (
            <p className="mt-2 text-xs text-slate-500">
              Severity tier: <span className="text-slate-300">{p.penalty_tier}</span>
            </p>
          )}
        </div>

        {/* Card 3: Peer comparison */}
        <div className="card flex flex-col justify-center p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Peer Comparison
          </p>
          <p className="mt-2 font-display text-4xl font-bold text-cyan">
            {p.peer_comparison.percentile}
            <span className="text-xl">th</span>
          </p>
          <p className="text-sm text-slate-400">
            percentile among {p.peer_comparison.peer_group}
          </p>

          {/* Percentile bar */}
          <div className="mt-4">
            <div className="relative h-3 overflow-hidden rounded-full bg-navy-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-safe via-amber to-risk"
                style={{ width: "100%" }}
              />
              <div
                className="absolute top-0 h-full w-1 -translate-x-1/2 rounded-full bg-white shadow"
                style={{ left: `${p.peer_comparison.percentile}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-slate-600">
              <span>Better</span>
              <span>Worse</span>
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            {p.peer_comparison.peer_count} comparable hospitals
          </div>
        </div>
      </div>

      {/* ── CONDITION BREAKDOWN (full width) ── */}
      <div className="card mb-6 p-6">
        <h2 className="mb-5 font-display text-lg font-semibold text-white">
          Condition Breakdown
        </h2>
        <ConditionTable conditions={p.condition_breakdown} />
      </div>

      {/* ── RISK FACTORS + RECOMMENDATIONS (2-col) ── */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Risk factors */}
        <div className="card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-white">Risk Factors</h2>
          <ul className="space-y-4">
            {p.risk_factors.map((rf) => (
              <li key={rf.factor}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[11px] font-bold uppercase",
                        rf.impact === "High" && "bg-risk/15 text-risk-light",
                        rf.impact === "Medium" && "bg-amber/15 text-amber-light",
                        rf.impact === "Low" && "bg-safe/15 text-safe-light",
                      )}
                    >
                      {rf.impact}
                    </span>
                    <p className="text-sm font-medium text-slate-200">{rf.factor}</p>
                  </div>
                  <span className="font-mono text-xs text-slate-400">{String(rf.value)}</span>
                </div>
                {/* Impact bar */}
                <div className="h-1.5 overflow-hidden rounded-full bg-navy-200">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      rf.impact === "High" && "bg-risk",
                      rf.impact === "Medium" && "bg-amber",
                      rf.impact === "Low" && "bg-safe",
                    )}
                    style={{
                      width:
                        rf.impact === "High" ? "90%" : rf.impact === "Medium" ? "55%" : "25%",
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">{rf.description}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Recommendations */}
        <div className="card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-white">
            Recommendations
          </h2>
          <ul className="space-y-3">
            {p.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
                <p className="text-sm text-slate-300">{rec}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── SIMILAR HOSPITALS ── */}
      {similar.data && similar.data.similar.length > 0 && (
        <div className="card mb-6 p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-white">
            Similar Hospitals
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {similar.data.similar.slice(0, 5).map((h) => {
              const hTier = normalizeTier(h.risk_score != null ? (h.risk_score > 0.7 ? "High" : h.risk_score > 0.4 ? "Medium" : "Low") : null);
              return (
                <Link
                  key={h.provider_id}
                  href={`/hospitals/${h.provider_id}`}
                  className="card card-hover flex flex-col gap-2 p-4 transition-all hover:-translate-y-0.5"
                >
                  <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">
                    {h.name ?? "Unknown"}
                  </p>
                  <p className="text-xs text-slate-500">{h.state ?? "—"}</p>
                  <div className="mt-auto">
                    <span
                      className={cn(
                        "font-display text-xl font-bold",
                        hTier === "High" && "text-risk-light",
                        hTier === "Medium" && "text-amber-light",
                        (hTier === "Low" || hTier === "No Risk") && "text-safe-light",
                      )}
                    >
                      {h.risk_score != null ? `${Math.round(h.risk_score * 100)}%` : "—"}
                    </span>
                    {h.penalty_pct != null && h.penalty_pct > 0 && (
                      <p className="text-xs text-risk-light">{formatPct(h.penalty_pct, 2)}</p>
                    )}
                  </div>
                  <span className="text-xs text-cyan hover:underline">Compare →</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── INTERVENTION SIMULATOR CTA ── */}
      <div className="card border-cyan/20 bg-gradient-to-br from-cyan/5 to-navy-200/50 p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-cyan/10 px-3 py-1 text-xs font-semibold text-cyan">
              <Zap className="h-3.5 w-3.5" />
              Intervention Simulator
            </div>
            <h3 className="font-display text-xl font-bold text-white">
              What if you improved?
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Model readmission reductions and see the projected penalty savings for this
              hospital.
            </p>
          </div>
          <Link
            href={`/simulate${p.provider_id ? `?hospital=${p.provider_id}` : ""}`}
            className="btn-primary shrink-0 gap-2"
          >
            Simulate interventions
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Condition Table ── */

function ConditionTable({ conditions }: { conditions: ConditionBreakdownItem[] }) {
  if (!conditions.length) {
    return <p className="text-sm text-slate-500">No condition data available.</p>;
  }

  // Max gap for bar scaling
  const maxGap = Math.max(
    1,
    ...conditions.map((c) => Math.abs((c.readmission_rate ?? 0) - (c.national_avg ?? 0))),
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-navy-300/60">
            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              Condition
            </th>
            <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
              Hospital
            </th>
            <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
              National
            </th>
            <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
              Gap
            </th>
            <th className="pb-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
              Status
            </th>
            <th className="pb-3 pl-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 min-w-[140px]">
              vs. National Avg
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-300/40">
          {conditions.map((c) => {
            const rate = c.readmission_rate ?? 0;
            const nat = c.national_avg ?? 0;
            const gap = rate - nat;
            const worse = c.compared_to_national.toLowerCase() === "worse";
            const better = c.compared_to_national.toLowerCase() === "better";
            const gapPct = maxGap > 0 ? (Math.abs(gap) / maxGap) * 50 : 0;

            return (
              <tr key={c.condition} className="group">
                <td className="py-3 pr-4">
                  <p className="font-medium text-slate-200">{c.condition_name}</p>
                  <p className="font-mono text-[10px] text-slate-600">{c.condition}</p>
                </td>
                <td className="py-3 pr-4 text-right font-mono text-slate-200">
                  {rate ? `${rate.toFixed(1)}%` : "—"}
                </td>
                <td className="py-3 pr-4 text-right font-mono text-slate-500">
                  {nat ? `${nat.toFixed(1)}%` : "—"}
                </td>
                <td className="py-3 pr-4 text-right font-mono">
                  <span className={cn(worse ? "text-risk-light" : better ? "text-safe-light" : "text-slate-400")}>
                    {gap >= 0 ? "+" : ""}
                    {gap.toFixed(1)}
                  </span>
                </td>
                <td className="py-3 px-2 text-center">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase",
                      worse && "bg-risk/15 text-risk-light",
                      better && "bg-safe/15 text-safe-light",
                      !worse && !better && "bg-navy-300/50 text-slate-400",
                    )}
                  >
                    {worse ? "Worse" : better ? "Better" : "Same"}
                  </span>
                </td>
                <td className="py-3 pl-4">
                  {/* Diverging bar centered at national avg */}
                  <div className="relative flex h-4 items-center">
                    <div className="absolute left-1/2 h-full w-px bg-slate-600" />
                    {worse ? (
                      <div
                        className="absolute left-1/2 h-2 rounded-r-sm bg-risk/70"
                        style={{ width: `${gapPct}%` }}
                      />
                    ) : better ? (
                      <div
                        className="absolute right-1/2 h-2 rounded-l-sm bg-safe/70"
                        style={{ width: `${gapPct}%` }}
                      />
                    ) : (
                      <div className="absolute left-1/2 h-2 w-1 rounded-sm bg-slate-500" />
                    )}
                  </div>
                  {c.excess_readmission_ratio != null && (
                    <p className="mt-0.5 font-mono text-[10px] text-slate-600">
                      ERR {c.excess_readmission_ratio.toFixed(3)}
                    </p>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
