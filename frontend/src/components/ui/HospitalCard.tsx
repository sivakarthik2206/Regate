"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

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
      className="group w-full flex flex-col text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
      style={{
        background: "#141C30",
        border: "1px solid #263252",
        borderRadius: "12px",
      }}
    >
      <div className="p-5 flex flex-col gap-3 w-full">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-bold text-white truncate leading-snug group-hover:text-cyan transition-colors">
            {hospital.name}
          </h3>
          <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/50">
            {hospital.state}
          </span>
        </div>

        <p className="text-sm text-white/50">
          {hospital.city}, {hospital.state}
        </p>

        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              className={cn(
                "h-3.5 w-3.5",
                hospital.star_rating !== null && i < hospital.star_rating
                  ? "fill-amber text-amber"
                  : "fill-none text-white/20"
              )}
            />
          ))}
        </div>

        <span className="inline-flex w-fit rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/55">
          {hospital.ownership_type}
        </span>

        <div>
          {penalized && hospital.penalty_pct !== null ? (
            <span className="inline-flex w-fit rounded-full border border-risk-red/20 bg-risk-red/10 px-3 py-1 text-sm font-semibold text-risk-red animate-penalty-pulse-red">
              Penalized {hospital.penalty_pct.toFixed(2)}%
            </span>
          ) : (
            <span className="inline-flex w-fit rounded-full border border-safe-green/20 bg-safe-green/10 px-3 py-1 text-sm font-semibold text-safe-green">
              No Penalty
            </span>
          )}
        </div>
      </div>
    </button>
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
    penalized:
      typeof hospital.penalized === "number"
        ? hospital.penalized
        : hospital.penalty_pct !== null
        ? 1
        : 0,
    penalty_pct: numberOrNull(hospital.penalty_pct),
  };
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
