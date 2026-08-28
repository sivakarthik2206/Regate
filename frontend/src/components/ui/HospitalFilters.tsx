"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HospitalFilterValues {
  state: string;
  ownershipTypes: string[];
  penaltyStatus: "all" | "penalized" | "not-penalized";
  starRating: number;
}

interface HospitalFiltersProps {
  value: HospitalFilterValues;
  onChange: (value: HospitalFilterValues) => void;
  onApply: () => void;
  onClear: () => void;
}

const US_STATES: { abbr: string; name: string }[] = [
  { abbr: "AL", name: "Alabama" }, { abbr: "AK", name: "Alaska" }, { abbr: "AZ", name: "Arizona" },
  { abbr: "AR", name: "Arkansas" }, { abbr: "CA", name: "California" }, { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" }, { abbr: "DE", name: "Delaware" }, { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" }, { abbr: "HI", name: "Hawaii" }, { abbr: "ID", name: "Idaho" },
  { abbr: "IL", name: "Illinois" }, { abbr: "IN", name: "Indiana" }, { abbr: "IA", name: "Iowa" },
  { abbr: "KS", name: "Kansas" }, { abbr: "KY", name: "Kentucky" }, { abbr: "LA", name: "Louisiana" },
  { abbr: "ME", name: "Maine" }, { abbr: "MD", name: "Maryland" }, { abbr: "MA", name: "Massachusetts" },
  { abbr: "MI", name: "Michigan" }, { abbr: "MN", name: "Minnesota" }, { abbr: "MS", name: "Mississippi" },
  { abbr: "MO", name: "Missouri" }, { abbr: "MT", name: "Montana" }, { abbr: "NE", name: "Nebraska" },
  { abbr: "NV", name: "Nevada" }, { abbr: "NH", name: "New Hampshire" }, { abbr: "NJ", name: "New Jersey" },
  { abbr: "NM", name: "New Mexico" }, { abbr: "NY", name: "New York" }, { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" }, { abbr: "OH", name: "Ohio" }, { abbr: "OK", name: "Oklahoma" },
  { abbr: "OR", name: "Oregon" }, { abbr: "PA", name: "Pennsylvania" }, { abbr: "RI", name: "Rhode Island" },
  { abbr: "SC", name: "South Carolina" }, { abbr: "SD", name: "South Dakota" }, { abbr: "TN", name: "Tennessee" },
  { abbr: "TX", name: "Texas" }, { abbr: "UT", name: "Utah" }, { abbr: "VT", name: "Vermont" },
  { abbr: "VA", name: "Virginia" }, { abbr: "WA", name: "Washington" }, { abbr: "WV", name: "West Virginia" },
  { abbr: "WI", name: "Wisconsin" }, { abbr: "WY", name: "Wyoming" },
];

const OWNERSHIP_TYPES = ["Government", "Proprietary", "Voluntary non-profit"] as const;

export function HospitalFilters({ value, onChange, onApply, onClear }: HospitalFiltersProps): JSX.Element {
  const [stateQuery, setStateQuery] = useState("");

  const filteredStates = useMemo(() => {
    const q = stateQuery.trim().toLowerCase();
    if (!q) return US_STATES;
    return US_STATES.filter((s) => s.name.toLowerCase().includes(q) || s.abbr.toLowerCase().includes(q));
  }, [stateQuery]);

  function update<T extends keyof HospitalFilterValues>(key: T, next: HospitalFilterValues[T]): void {
    onChange({ ...value, [key]: next });
  }

  return (
    <aside className="rounded-[28px] border border-white/8 bg-card-900 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.24)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold text-white">Filters</h2>
        <button type="button" onClick={onClear} className="text-sm font-medium text-cyan transition hover:text-cyan/85">
          Clear All
        </button>
      </div>

      <div className="mt-5 space-y-6">
        <div>
          <label className="block text-sm font-medium text-white/70">State</label>
          <div className="mt-2 rounded-2xl border border-white/10 bg-elevated-900 px-4 py-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-white/35" />
              <input
                value={stateQuery}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setStateQuery(event.target.value)}
                placeholder="Search states"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
              />
              {value.state ? (
                <button type="button" onClick={() => update("state", "")} className="text-white/40 transition hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <div className="mt-3 max-h-40 overflow-auto pr-1">
              {filteredStates.map((s) => (
                <button
                  key={s.abbr}
                  type="button"
                  onClick={() => update("state", s.abbr)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-white/5",
                    value.state === s.abbr ? "bg-cyan/10 text-cyan" : "text-white/70"
                  )}
                >
                  <span>{s.name}</span>
                  {value.state === s.abbr ? <span className="text-xs font-semibold text-cyan">{s.abbr}</span> : <span className="text-xs text-white/30">{s.abbr}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70">Ownership Type</label>
          <div className="mt-3 space-y-2">
            {OWNERSHIP_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-elevated-900 px-4 py-3 text-sm text-white/75">
                <input
                  type="checkbox"
                  checked={value.ownershipTypes.includes(type)}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    const next = checked ? [...value.ownershipTypes, type] : value.ownershipTypes.filter((item) => item !== type);
                    update("ownershipTypes", next);
                  }}
                  className="h-4 w-4 rounded border-white/20 bg-transparent text-cyan focus:ring-cyan/60"
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70">Penalty Status</label>
          <div className="mt-3 grid gap-2">
            {[
              { label: "All", value: "all" as const },
              { label: "Penalized Only", value: "penalized" as const },
              { label: "Not Penalized", value: "not-penalized" as const },
            ].map((option) => (
              <label key={option.value} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-elevated-900 px-4 py-3 text-sm text-white/75">
                <input
                  type="radio"
                  name="penaltyStatus"
                  checked={value.penaltyStatus === option.value}
                  onChange={() => update("penaltyStatus", option.value)}
                  className="h-4 w-4 border-white/20 text-cyan focus:ring-cyan/60"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-white/70">Star Rating</label>
            <span className="text-xs text-white/40">
              {value.starRating === 0 ? "Any" : `${value.starRating}+ stars`}
            </span>
          </div>
          <div className="mt-3 rounded-2xl border border-white/10 bg-elevated-900 px-4 py-4">
            <input
              type="range"
              min={0}
              max={5}
              step={1}
              value={value.starRating}
              onChange={(event) => update("starRating", Number(event.target.value))}
              className="w-full accent-cyan"
            />
            <div className="mt-2 flex justify-between text-[11px] text-white/35">
              <span>Any</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
          </div>
        </div>

        <button type="button" onClick={onApply} className="inline-flex w-full items-center justify-center rounded-2xl bg-cyan px-5 py-3 font-semibold text-navy transition hover:brightness-110">
          Apply Filters
        </button>
      </div>
    </aside>
  );
}
