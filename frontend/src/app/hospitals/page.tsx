"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { getHospital, getHospitals, searchHospitals } from "@/lib/api";
import type { HospitalListItem, HospitalSearchItem } from "@/lib/types";
import { HospitalFilters, type HospitalFilterValues } from "@/components/ui/HospitalFilters";
import { HospitalCard, asCardData, type HospitalCardData } from "@/components/ui/HospitalCard";
import { HospitalDetailModal, type HospitalDetailData } from "@/components/ui/HospitalDetailModal";
import { cn } from "@/lib/utils";

type Mode = "browse" | "search";

const PAGE_SIZE = 20;

export default function HospitalsPage(): JSX.Element {
  const router = useRouter();
  const [filters, setFilters] = useState<HospitalFilterValues>({
    state: "",
    ownershipTypes: [],
    penaltyStatus: "all",
    starRating: 0,
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [mode, setMode] = useState<Mode>("browse");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [browseRows, setBrowseRows] = useState<HospitalListItem[]>([]);
  const [searchMatches, setSearchMatches] = useState<HospitalDetailData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<HospitalDetailData | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        if (debouncedSearch) {
          setMode("search");
          const matches = await searchHospitals(debouncedSearch);
          const detailed = await Promise.all(matches.map((item) => enrichSearchResult(item)));
          if (active) {
            const filtered = applyClientFilters(detailed, appliedFilters);
            setSearchMatches(filtered);
            setTotal(filtered.length);
            setPage(1);
          }
        } else {
          setMode("browse");
          const response = await getHospitals({
            state: appliedFilters.state || undefined,
            penalized:
              appliedFilters.penaltyStatus === "all"
                ? undefined
                : appliedFilters.penaltyStatus === "penalized",
            min_stars: appliedFilters.starRating > 0 ? appliedFilters.starRating : undefined,
            page,
            page_size: PAGE_SIZE,
          });
          if (active) {
            const filtered = applyBrowseFilters(response.items, appliedFilters);
            setBrowseRows(filtered);
            setTotal(response.total);
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [appliedFilters, debouncedSearch, page]);

  const visibleHospitals = useMemo(() => {
    if (mode === "search") {
      return paginate(searchMatches, page, PAGE_SIZE);
    }
    return browseRows;
  }, [browseRows, mode, page, searchMatches]);

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 lg:px-10">
      <section className="mx-auto max-w-[1600px] space-y-6">
        <div className="rounded-[32px] border border-white/8 bg-card-900/90 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.28)] md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <h1 className="font-display text-4xl font-bold tracking-tight text-white md:text-5xl">Hospital Explorer</h1>
              <p className="mt-3 max-w-2xl text-white/60">
                Search, compare, and prioritize hospitals by state, ownership, star rating, and penalty risk.
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-elevated-900 px-4 py-3 text-sm text-white/60">
              Showing {total} hospitals
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <HospitalFilters
            value={filters}
            onChange={setFilters}
            onApply={() => {
              setAppliedFilters(filters);
              setPage(1);
            }}
            onClear={() => {
              const cleared = { state: "", ownershipTypes: [], penaltyStatus: "all" as const, starRating: 0 };
              setFilters(cleared);
              setAppliedFilters(cleared);
              setPage(1);
            }}
          />

          <div className="space-y-5">
            <div className="rounded-[28px] border border-white/8 bg-card-900 p-5">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-elevated-900 px-4 py-3">
                <Building2 className="h-4 w-4 text-white/40" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search hospitals by name, city, or state"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                />
                {searchInput ? (
                  <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    className="text-white/35 transition hover:text-white"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <div className="mt-3 text-sm text-white/50">Showing {total} hospitals</div>
            </div>

            {loading ? <div className="rounded-[28px] border border-white/8 bg-card-900 p-6 text-white/50">Loading hospitals…</div> : null}

            {!loading && visibleHospitals.length === 0 ? (
              <div className="rounded-[28px] border border-white/8 bg-card-900 p-10 text-center text-white/55">
                <p className="font-display text-2xl font-bold text-white">No hospitals found. Try adjusting your filters.</p>
                <button
                  type="button"
                  onClick={() => {
                    const cleared = { state: "", ownershipTypes: [], penaltyStatus: "all" as const, starRating: 0 };
                    setFilters(cleared);
                    setAppliedFilters(cleared);
                    setSearchInput("");
                    setPage(1);
                  }}
                  className="mt-5 rounded-2xl border border-cyan/20 bg-cyan/10 px-4 py-2 font-semibold text-cyan"
                >
                  Clear filters
                </button>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleHospitals.map((hospital) => (
                <HospitalCard key={hospital.provider_id} hospital={asCardData(hospital)} onClick={(item) => void openHospital(item, setSelectedHospital)} />
              ))}
            </div>

            <Pagination total={total} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </div>
        </div>
      </section>

      <HospitalDetailModal
        hospital={selectedHospital}
        onClose={() => setSelectedHospital(null)}
        onRunAssessment={(hospital) => {
          const params = new URLSearchParams({
            name: hospital.name,
            city: hospital.city,
            state: hospital.state,
            ownership_type: hospital.ownership_type,
            star_rating: String(hospital.star_rating ?? ""),
            has_emergency_services: String(hospital.has_emergency_services),
          });
          router.push(`/predict?${params.toString()}`);
        }}
      />
    </main>
  );
}

async function enrichSearchResult(item: HospitalSearchItem): Promise<HospitalDetailData> {
  const detail = await getHospital(item.provider_id);
  return toDetailData(detail, item);
}

function applyBrowseFilters(items: HospitalListItem[], filters: HospitalFilterValues): HospitalListItem[] {
  return items.filter((item) => {
    if (filters.state && item.state !== filters.state) return false;
    if (filters.ownershipTypes.length > 0 && !filters.ownershipTypes.includes(item.ownership_type)) return false;
    if (filters.penaltyStatus === "penalized" && !(item.penalized === 1 || item.penalty_pct !== null)) return false;
    if (filters.penaltyStatus === "not-penalized" && (item.penalized === 1 || item.penalty_pct !== null)) return false;
    if (filters.starRating > 0 && item.star_rating !== null && item.star_rating < filters.starRating) return false;
    return true;
  });
}

function applyClientFilters(items: HospitalDetailData[], filters: HospitalFilterValues): HospitalDetailData[] {
  return items.filter((item) => {
    if (filters.state && item.state !== filters.state) return false;
    if (filters.ownershipTypes.length > 0 && !filters.ownershipTypes.includes(item.ownership_type)) return false;
    if (filters.starRating > 0 && (item.star_rating ?? 0) < filters.starRating) return false;
    return true;
  });
}

function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function Pagination({ total, page, pageSize, onPageChange }: { total: number; page: number; pageSize: number; onPageChange: (page: number) => void }): JSX.Element {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).slice(Math.max(0, page - 3), Math.min(totalPages, page + 2));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/8 bg-card-900 p-4">
      <div className="text-sm text-white/55">
        Page {page} of {totalPages}
      </div>
      <div className="flex flex-wrap gap-2">
        <PageButton label="Prev" disabled={page <= 1} onClick={() => onPageChange(page - 1)} />
        {pages.map((value) => (
          <PageButton key={value} label={String(value)} active={value === page} onClick={() => onPageChange(value)} />
        ))}
        <PageButton label="Next" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} />
      </div>
    </div>
  );
}

function PageButton({
  label,
  onClick,
  active = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
        active ? "border-cyan/30 bg-cyan/10 text-cyan" : "border-white/10 bg-elevated-900 text-white/65 hover:bg-white/5",
      )}
    >
      {label}
    </button>
  );
}

function toDetailData(detail: Record<string, unknown>, item: HospitalSearchItem): HospitalDetailData {
  return {
    provider_id: item.provider_id,
    name: stringValue(detail.name, item.name),
    city: stringValue(detail.city, item.city),
    state: stringValue(detail.state, item.state),
    street: stringValue(detail.street, ""),
    zip: stringValue(detail.zip, ""),
    ownership_type: stringValue(detail.ownership_type, "Unknown"),
    star_rating: numberOrNull(detail.star_rating),
    has_emergency_services: booleanValue(detail.has_emergency_services),
    penalty_pct: numberOrNull(detail.penalty_pct),
    penalty_tier: stringValue(detail.penalty_tier, null),
    avg_readmission_rate: numberOrNull(detail.avg_readmission_rate),
    ami_readmission_rate: numberOrNull(detail.ami_readmission_rate),
    hf_readmission_rate: numberOrNull(detail.hf_readmission_rate),
    pneumonia_readmission_rate: numberOrNull(detail.pneumonia_readmission_rate),
    copd_readmission_rate: numberOrNull(detail.copd_readmission_rate),
    hip_knee_readmission_rate: numberOrNull(detail.hip_knee_readmission_rate),
    cabg_readmission_rate: numberOrNull(detail.cabg_readmission_rate),
  };
}

function stringValue(value: unknown, fallback: string | null): string {
  return typeof value === "string" && value.trim() ? value : fallback ?? "";
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanValue(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

async function openHospital(hospital: HospitalCardData, setSelectedHospital: (value: HospitalDetailData) => void): Promise<void> {
  const detail = await getHospital(hospital.provider_id);
  setSelectedHospital(
    toDetailData(detail, {
      provider_id: hospital.provider_id,
      name: hospital.name,
      city: hospital.city,
      state: hospital.state,
    }),
  );
}
