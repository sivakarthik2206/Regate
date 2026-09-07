"use client";

import { useMemo, useState } from "react";
import { ChevronDown, SlidersHorizontal, Star } from "lucide-react";
import { cn, US_STATES } from "@/lib/utils";

export interface HospitalFilters {
  state?: string;
  ownership?: string;
  penalized?: boolean;
  min_stars?: number;
  risk_tier?: string;
}

interface FilterPanelProps {
  value: HospitalFilters;
  onApply: (filters: HospitalFilters) => void;
  className?: string;
}

const OWNERSHIP_OPTIONS = ["Voluntary Non-profit", "Proprietary", "Government", "Other"];
const RISK_TIERS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export function FilterPanel({ value, onApply, className }: FilterPanelProps) {
  const [draft, setDraft] = useState<HospitalFilters>(value);
  const [collapsed, setCollapsed] = useState(false);
  const [stateQuery, setStateQuery] = useState("");

  const filteredStates = useMemo(() => {
    const q = stateQuery.trim().toLowerCase();
    if (!q) return US_STATES;
    return US_STATES.filter(
      (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q),
    );
  }, [stateQuery]);

  const set = (patch: Partial<HospitalFilters>) => setDraft((d) => ({ ...d, ...patch }));

  const clearAll = () => {
    const empty: HospitalFilters = {};
    setDraft(empty);
    setStateQuery("");
    onApply(empty);
  };

  return (
    <aside className={cn("card p-5", className)}>
      <div className="flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 font-display text-sm font-semibold text-white">
          <SlidersHorizontal className="h-4 w-4 text-cyan" />
          Filters
        </h3>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="rounded p-1 text-slate-400 hover:text-white lg:hidden"
          aria-label={collapsed ? "Expand filters" : "Collapse filters"}
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", collapsed && "-rotate-90")} />
        </button>
      </div>

      <div className={cn("mt-4 space-y-5", collapsed && "hidden lg:block")}>
        {/* State */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            State
          </label>
          <input
            type="text"
            value={stateQuery}
            onChange={(e) => setStateQuery(e.target.value)}
            placeholder="Filter states…"
            className="field mb-2"
            aria-label="Filter states"
          />
          <select
            value={draft.state ?? ""}
            onChange={(e) => set({ state: e.target.value || undefined })}
            className="field"
            aria-label="Select state"
          >
            <option value="">All states</option>
            {filteredStates.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        {/* Ownership */}
        <fieldset>
          <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Ownership
          </legend>
          <div className="space-y-1.5">
            {OWNERSHIP_OPTIONS.map((o) => (
              <label key={o} className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="radio"
                  name="ownership"
                  checked={draft.ownership === o}
                  onChange={() => set({ ownership: draft.ownership === o ? undefined : o })}
                  onClick={() => draft.ownership === o && set({ ownership: undefined })}
                  className="accent-cyan"
                />
                {o}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Penalty status */}
        <fieldset>
          <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Penalty Status
          </legend>
          <div className="flex gap-2">
            {[
              { label: "All", val: undefined },
              { label: "Penalized", val: true },
              { label: "Safe", val: false },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => set({ penalized: opt.val })}
                className={cn(
                  "flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                  draft.penalized === opt.val
                    ? "border-cyan bg-cyan/10 text-cyan"
                    : "border-navy-300 text-slate-400 hover:border-cyan/40",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Star rating */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Minimum Star Rating
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => set({ min_stars: draft.min_stars === star ? undefined : star })}
                aria-label={`${star} stars and up`}
                className={cn(
                  "flex-1 rounded-lg border py-1.5 transition-colors",
                  (draft.min_stars ?? 0) >= star
                    ? "border-amber/50 bg-amber/10 text-amber"
                    : "border-navy-300 text-slate-600 hover:border-amber/30",
                )}
              >
                <Star className="mx-auto h-4 w-4" fill={(draft.min_stars ?? 0) >= star ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
        </div>

        {/* Risk tier */}
        <fieldset>
          <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Risk Tier
          </legend>
          <div className="flex gap-2">
            {RISK_TIERS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => set({ risk_tier: draft.risk_tier === t.value ? undefined : t.value })}
                className={cn(
                  "flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                  draft.risk_tier === t.value
                    ? "border-cyan bg-cyan/10 text-cyan"
                    : "border-navy-300 text-slate-400 hover:border-cyan/40",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex items-center justify-between pt-1">
          <button type="button" onClick={clearAll} className="text-xs font-medium text-slate-400 hover:text-cyan">
            Clear All
          </button>
          <button type="button" onClick={() => onApply(draft)} className="btn-primary">
            Apply
          </button>
        </div>
      </div>
    </aside>
  );
}
