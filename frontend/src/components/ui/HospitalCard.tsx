"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HospitalDetailResponse, HospitalListItem } from "@/lib/types";

export interface HospitalCardData {
  provider_id: string;
  name: string;
  city: string;
  state: string;
  ownership_type: string;
  star_rating: number | null;
  penalized: number;
  penalty_pct: number | null;
}

export interface HospitalCardSource {
  provider_id: string;
  name: string;
  city: string;
  state: string;
  ownership_type: string;
  star_rating: number | null;
  penalty_pct: number | null;
  penalized?: number;
}

interface HospitalCardProps {
  hospital: HospitalCardData;
  onClick: (hospital: HospitalCardData) => void;
}

export function HospitalCard({ hospital, onClick }: HospitalCardProps): JSX.Element {
  const penalized = hospital.penalized === 1 || hospital.penalty_pct !== null;
  return (
    <button
      type="button"
      onClick={() => onClick(hospital)}
      className="group flex h-full flex-col rounded-[24px] border border-white/8 bg-elevated-900 p-5 text-left transition hover:-translate-y-0.5 hover:border-cyan/30 hover:shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 font-display text-lg font-bold tracking-tight text-white">{hospital.name}</h3>
        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/55">
          {hospital.state}
        </span>
      </div>

      <p className="mt-2 text-sm text-white/55">
        {hospital.city}, {hospital.state}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/65">{hospital.ownership_type}</span>
        <StarBadge stars={hospital.star_rating} />
      </div>

      <div className="mt-5">
        {penalized && hospital.penalty_pct !== null ? (
          <span className="inline-flex rounded-full border border-risk-red/20 bg-risk-red/10 px-3 py-1 text-sm font-semibold text-risk-red animate-penalty-pulse">
            Penalized {(hospital.penalty_pct * 100).toFixed(1)}%
          </span>
        ) : (
          <span className="inline-flex rounded-full border border-safe-green/20 bg-safe-green/10 px-3 py-1 text-sm font-semibold text-safe-green">
            No Penalty
          </span>
        )}
      </div>
    </button>
  );
}

function StarBadge({ stars }: { stars: number | null }): JSX.Element {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-amber/20 bg-amber/10 px-3 py-1">
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} className={cn("h-3.5 w-3.5", stars !== null && index < stars ? "fill-amber text-amber" : "text-white/20")} />
      ))}
    </div>
  );
}

export function asCardData(hospital: HospitalCardSource): HospitalCardData {
  return {
    provider_id: hospital.provider_id,
    name: stringValue(hospital.name),
    city: stringValue(hospital.city),
    state: stringValue(hospital.state),
    ownership_type: stringValue(hospital.ownership_type),
    star_rating: numberOrNull(hospital.star_rating),
    penalized: typeof hospital.penalized === "number" ? hospital.penalized : hospital.penalty_pct !== null ? 1 : 0,
    penalty_pct: numberOrNull(hospital.penalty_pct),
  };
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
