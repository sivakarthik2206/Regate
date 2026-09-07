"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Building2, ChevronDown, ExternalLink, Star, X } from "lucide-react";
import { getHospitals } from "@/lib/api";
import { useDebounce } from "@/lib/hooks";
import type { HospitalSummaryRow } from "@/lib/types";
import { SearchInput } from "@/components/ui/SearchInput";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { cn, formatPct, normalizeTier, US_STATES } from "@/lib/utils";

const PAGE_SIZE = 21;

const OWNERSHIP_OPTIONS = [
  { label: "Government", value: "Government" },
  { label: "Proprietary", value: "Proprietary" },
  { label: "Non-profit", value: "Voluntary Non-profit" },
  { label: "Other", value: "Other" },
];

const SORT_OPTIONS = [
  { label: "Risk Score ↓", sort_by: "risk_score", sort_order: "desc" as const },
  { label: "Penalty % ↓", sort_by: "penalty_pct", sort_order: "desc" as const },
  { label: "Name A-Z", sort_by: "name", sort_order: "asc" as const },
  { label: "Star Rating ↓", sort_by: "star_rating", sort_order: "desc" as const },
];

interface Filters {
  state?: string;
  ownerships: string[];
  penalized?: boolean;
  min_stars?: number;
  risk_tier?: string;
  sort_idx: number;
}

const DEFAULT_FILTERS: Filters = { ownerships: [], sort_idx: 0 };

export default function HospitalsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setSearch(q);
  }, []);

  const sort = SORT_OPTIONS[filters.sort_idx] ?? SORT_OPTIONS[0];

  const query = useQuery({
    queryKey: ["hospitals", debouncedSearch, filters, page],
    queryFn: () =>
      getHospitals({
        q: debouncedSearch || undefined,
        state: filters.state || undefined,
        ownership: filters.ownerships.length === 1 ? filters.ownerships[0] : undefined,
        penalized: filters.penalized,
        min_stars: filters.min_stars,
        risk_tier: filters.risk_tier || undefined,
        sort_by: sort.sort_by,
        sort_order: sort.sort_order,
        page,
        page_size: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  const data = query.data;
  const rows = data?.hospitals ?? [];

  const hasFilters =
    !!filters.state ||
    filters.ownerships.length > 0 ||
    filters.penalized !== undefined ||
    filters.min_stars !== undefined ||
    !!filters.risk_tier;

  const set = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const toggleOwnership = (val: string) => {
    set({
      ownerships: filters.ownerships[0] === val ? [] : [val],
    });
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const pageList = useMemo(() => {
    if (!data) return [];
    const total = data.total_pages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const list: (number | "…")[] = [1];
    if (page > 3) list.push("…");
    for (let p = Math.max(2, page - 1); p <= Math.min(total - 1, page + 1); p++) list.push(p);
    if (page < total - 2) list.push("…");
    list.push(total);
    return list;
  }, [data, page]);

  return (
    <div>
      <DemoBanner />

      {/* Hero search */}
      <div className="mb-6">
        <h1 className="mb-1 font-display text-3xl font-bold text-white">Hospital Explorer</h1>
        <p className="mb-5 text-sm text-slate-400">
          Browse and filter all 4,812 hospitals scored for FY2027 HRRP penalty risk.
        </p>
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search by hospital name, city, state, or provider ID..."
          className="w-full"
        />
      </div>

      {/* Horizontal filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* State */}
        <div className="relative">
          <select
            value={filters.state ?? ""}
            onChange={(e) => set({ state: e.target.value || undefined })}
            className="h-9 appearance-none rounded-lg border border-navy-300 bg-navy-200/60 pl-3 pr-8 text-sm text-slate-200 focus:border-cyan focus:outline-none"
            aria-label="Filter by state"
          >
            <option value="">All States</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Ownership pills */}
        {OWNERSHIP_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => toggleOwnership(o.value)}
            className={cn(
              "h-9 rounded-full border px-3 text-xs font-medium transition-colors",
              filters.ownerships.includes(o.value)
                ? "border-cyan bg-cyan/10 text-cyan"
                : "border-navy-300 text-slate-400 hover:border-cyan/40 hover:text-slate-200",
            )}
          >
            {o.label}
          </button>
        ))}

        {/* Penalty status toggle */}
        <div className="flex rounded-lg border border-navy-300 overflow-hidden">
          {(
            [
              { label: "All", val: undefined as boolean | undefined },
              { label: "Penalized", val: true as boolean | undefined },
              { label: "Safe", val: false as boolean | undefined },
            ] as const
          ).map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => set({ penalized: opt.val })}
              className={cn(
                "h-9 border-r border-navy-300 px-3 text-xs font-medium transition-colors last:border-r-0",
                filters.penalized === opt.val
                  ? "bg-cyan/10 text-cyan"
                  : "text-slate-400 hover:text-slate-200",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Star rating */}
        <div className="flex items-center gap-0.5 rounded-lg border border-navy-300 px-2 py-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => set({ min_stars: filters.min_stars === star ? undefined : star })}
              aria-label={`Minimum ${star} stars`}
              className="rounded p-0.5 transition-colors"
            >
              <Star
                className={cn(
                  "h-4 w-4",
                  (filters.min_stars ?? 0) >= star ? "text-amber" : "text-slate-700 hover:text-slate-500",
                )}
                fill={(filters.min_stars ?? 0) >= star ? "currentColor" : "none"}
              />
            </button>
          ))}
        </div>

        {/* Risk tier toggle */}
        <div className="flex rounded-lg border border-navy-300 overflow-hidden">
          {(
            [
              { label: "All", val: undefined as string | undefined },
              { label: "High", val: "high" },
              { label: "Medium", val: "medium" },
              { label: "Low", val: "low" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => set({ risk_tier: opt.val })}
              className={cn(
                "h-9 border-r border-navy-300 px-3 text-xs font-medium transition-colors last:border-r-0",
                filters.risk_tier === opt.val
                  ? "bg-cyan/10 text-cyan"
                  : "text-slate-400 hover:text-slate-200",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={filters.sort_idx}
            onChange={(e) => set({ sort_idx: Number(e.target.value) })}
            className="h-9 appearance-none rounded-lg border border-navy-300 bg-navy-200/60 pl-3 pr-8 text-sm text-slate-200 focus:border-cyan focus:outline-none"
            aria-label="Sort hospitals"
          >
            {SORT_OPTIONS.map((o, i) => (
              <option key={i} value={i}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-cyan transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear Filters
          </button>
        )}
      </div>

      {/* Result count */}
      <p className="mb-5 text-sm text-slate-500" aria-live="polite">
        {data
          ? `Showing ${rows.length.toLocaleString()} of ${data.total_count.toLocaleString()} hospitals`
          : " "}
      </p>

      {/* Card grid */}
      {query.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="h-56" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No hospitals match"
          description="Try widening your filters or clearing the search query."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((h, i) => (
            <HospitalCard
              key={h.provider_id ?? i}
              h={h}
              onClick={() => h.provider_id && router.push(`/hospitals/${h.provider_id}`)}
            />
          ))}
        </div>
      )}

      {/* Numbered pagination */}
      {data && data.total_pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-1.5">
          {pageList.map((p, i) =>
            p === "…" ? (
              <span key={`ellipsis-${i}`} className="w-9 text-center text-slate-500">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                  page === p
                    ? "bg-cyan font-bold text-navy"
                    : "border border-navy-300 text-slate-400 hover:border-cyan/50 hover:text-white",
                )}
              >
                {p}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-xs text-slate-600">No rating</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn("h-3.5 w-3.5", star <= rating ? "text-amber" : "text-slate-700")}
          fill={star <= rating ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

function HospitalCard({ h, onClick }: { h: HospitalSummaryRow; onClick: () => void }) {
  const tier = normalizeTier(h.risk_tier);
  const riskPct = h.risk_score != null ? Math.round(h.risk_score * 100) : null;
  const cmsUrl = h.provider_id
    ? `https://www.medicare.gov/care-compare/details/hospital/${h.provider_id}`
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="card card-hover group flex cursor-pointer flex-col gap-3 p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/30"
    >
      {/* Name + CMS link */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 flex-1 font-display font-bold leading-snug text-white">
          {h.name ?? "Unknown Hospital"}
        </h3>
        {cmsUrl && (
          <a
            href={cmsUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label="View on Medicare Care Compare"
            className="mt-0.5 shrink-0 rounded p-1 text-slate-500 transition-colors hover:bg-cyan/10 hover:text-cyan"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {/* Location */}
      <div>
        <p className="text-sm text-slate-400">
          {[h.city, h.state].filter(Boolean).join(", ") || "—"}
        </p>
        {h.ownership_type && (
          <p className="mt-0.5 text-[11px] text-slate-600">{ownershipShort(h.ownership_type)}</p>
        )}
      </div>

      {/* Stars */}
      <div className="flex items-center">
        <StarRating rating={h.star_rating} />
      </div>

      {/* Risk score */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "font-display text-3xl font-bold tabular-nums",
            tier === "High" && "text-risk-light",
            tier === "Medium" && "text-amber-light",
            (tier === "Low" || tier === "No Risk") && "text-safe-light",
          )}
        >
          {riskPct !== null ? `${riskPct}%` : "—"}
        </span>
        <RiskBadge tier={h.risk_tier} size="sm" />
      </div>

      {/* Penalty + top condition */}
      <div className="flex flex-wrap items-center justify-between gap-1 text-sm">
        {h.penalized ? (
          <span className="font-mono font-semibold text-risk-light">
            Penalized {formatPct(h.penalty_pct, 2)}{" "}
            <span className="font-normal text-[10px] text-slate-600">of Medicare</span>
          </span>
        ) : (
          <span className="font-semibold text-safe-light">No Penalty</span>
        )}
        {h.top_risk_condition && (
          <span className="text-xs text-slate-500">
            Top risk: {h.top_risk_condition}
          </span>
        )}
      </div>
    </button>
  );
}

function ownershipShort(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("non-profit") || t.includes("voluntary")) return "Non-profit";
  if (t.includes("proprietary")) return "Proprietary";
  if (t.includes("government")) return "Government";
  return type;
}
