"use client";

import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { ChevronDown, Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HospitalRiskFormValues {
  avgReadmissionRate: number;
  conditionsAboveNational: number;
  hasEmergencyServices: boolean;
  ownershipType: "Government" | "Proprietary" | "Voluntary non-profit";
  starRating: number;
  amiReadmissionRate: number;
  hfReadmissionRate: number;
  pneumoniaReadmissionRate: number;
  copdReadmissionRate: number;
  hipKneeReadmissionRate: number;
  cabgReadmissionRate: number;
}

interface HospitalRiskFormProps {
  onSubmit: (values: HospitalRiskFormValues) => Promise<void>;
  demoValues: HospitalRiskFormValues;
  isLoading: boolean;
}

const DEFAULT_VALUES: HospitalRiskFormValues = {
  avgReadmissionRate: 17.8,
  conditionsAboveNational: 2,
  hasEmergencyServices: true,
  ownershipType: "Voluntary non-profit",
  starRating: 3,
  amiReadmissionRate: 18.9,
  hfReadmissionRate: 21.1,
  pneumoniaReadmissionRate: 13.4,
  copdReadmissionRate: 16.8,
  hipKneeReadmissionRate: 10.8,
  cabgReadmissionRate: 14.6,
};

function toNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function hospitalDemoValues(): HospitalRiskFormValues {
  return {
    avgReadmissionRate: 22.4,
    conditionsAboveNational: 4,
    hasEmergencyServices: true,
    ownershipType: "Government",
    starRating: 2,
    amiReadmissionRate: 26.1,
    hfReadmissionRate: 24.7,
    pneumoniaReadmissionRate: 18.5,
    copdReadmissionRate: 21.3,
    hipKneeReadmissionRate: 12.9,
    cabgReadmissionRate: 17.4,
  };
}

export function HospitalRiskForm({ onSubmit, demoValues, isLoading }: HospitalRiskFormProps): JSX.Element {
  const [values, setValues] = useState<HospitalRiskFormValues>(DEFAULT_VALUES);
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void onSubmit(values);
  }

  function handleNumberChange(key: keyof HospitalRiskFormValues) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setValues((current) => ({ ...current, [key]: toNumber(event.target.value, current[key] as number) }));
    };
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-[28px] border border-white/8 bg-card-900/95 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.28)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white">Hospital Penalty Risk</h2>
          <p className="mt-2 text-sm text-white/55">Estimate CMS penalty exposure from hospital-level quality indicators.</p>
        </div>
        <button
          type="button"
          onClick={() => setValues(demoValues)}
          className="rounded-full border border-cyan/30 bg-cyan/10 px-4 py-2 text-sm font-semibold text-cyan transition hover:bg-cyan/15"
        >
          Try Demo Values
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Average Readmission Rate (%)">
          <input
            type="number"
            min={10}
            max={30}
            step={0.1}
            value={values.avgReadmissionRate}
            onChange={handleNumberChange("avgReadmissionRate")}
            className="w-full rounded-2xl border border-white/10 bg-elevated-900 px-4 py-3 text-white outline-none transition focus:border-cyan/60"
          />
        </Field>

        <Field label="Overall Star Rating">
          <StarPicker value={values.starRating} onChange={(starRating) => setValues((current) => ({ ...current, starRating }))} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Conditions Worse Than National Average">
          <div className="rounded-2xl border border-white/10 bg-elevated-900 px-4 py-4">
            <input
              type="range"
              min={0}
              max={6}
              step={1}
              value={values.conditionsAboveNational}
              onChange={handleNumberChange("conditionsAboveNational")}
              className="w-full accent-cyan"
            />
            <div className="mt-2 flex justify-between text-[11px] text-white/35">
              {Array.from({ length: 7 }, (_, index) => (
                <span key={index}>{index}</span>
              ))}
            </div>
          </div>
        </Field>

        <Field label="Hospital Ownership Type">
          <select
            value={values.ownershipType}
            onChange={(event) => setValues((current) => ({ ...current, ownershipType: event.target.value as HospitalRiskFormValues["ownershipType"] }))}
            className="w-full rounded-2xl border border-white/10 bg-elevated-900 px-4 py-3 text-white outline-none transition focus:border-cyan/60"
          >
            <option value="Government">Government</option>
            <option value="Proprietary">Proprietary</option>
            <option value="Voluntary non-profit">Voluntary non-profit</option>
          </select>
        </Field>
      </div>

      <Field label="Emergency Services">
        <button
          type="button"
          role="switch"
          aria-checked={values.hasEmergencyServices}
          onClick={() => setValues((current) => ({ ...current, hasEmergencyServices: !current.hasEmergencyServices }))}
          className={cn(
            "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
            values.hasEmergencyServices ? "border-safe-green/30 bg-safe-green/10 text-safe-green" : "border-white/10 bg-elevated-900 text-white/60"
          )}
        >
          <span
            className={cn(
              "relative h-6 w-11 rounded-full transition",
              values.hasEmergencyServices ? "bg-safe-green/35" : "bg-white/10"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white transition",
                values.hasEmergencyServices ? "left-5" : "left-0.5"
              )}
            />
          </span>
          <span className="text-sm font-medium">{values.hasEmergencyServices ? "Available" : "Unavailable"}</span>
        </button>
      </Field>

      <button
        type="button"
        onClick={() => setAdvancedOpen((current) => !current)}
        className="flex items-center gap-2 text-sm font-medium text-cyan transition hover:text-cyan/90"
      >
        <ChevronDown className={cn("h-4 w-4 transition-transform", advancedOpen ? "rotate-180" : "")} />
        Advanced: Per-Condition Rates
      </button>

      {advancedOpen ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="AMI">
            <input type="number" step={0.1} value={values.amiReadmissionRate} onChange={handleNumberChange("amiReadmissionRate")} className="w-full rounded-2xl border border-white/10 bg-elevated-900 px-4 py-3 text-white outline-none transition focus:border-cyan/60" />
          </Field>
          <Field label="Heart Failure">
            <input type="number" step={0.1} value={values.hfReadmissionRate} onChange={handleNumberChange("hfReadmissionRate")} className="w-full rounded-2xl border border-white/10 bg-elevated-900 px-4 py-3 text-white outline-none transition focus:border-cyan/60" />
          </Field>
          <Field label="Pneumonia">
            <input type="number" step={0.1} value={values.pneumoniaReadmissionRate} onChange={handleNumberChange("pneumoniaReadmissionRate")} className="w-full rounded-2xl border border-white/10 bg-elevated-900 px-4 py-3 text-white outline-none transition focus:border-cyan/60" />
          </Field>
          <Field label="COPD">
            <input type="number" step={0.1} value={values.copdReadmissionRate} onChange={handleNumberChange("copdReadmissionRate")} className="w-full rounded-2xl border border-white/10 bg-elevated-900 px-4 py-3 text-white outline-none transition focus:border-cyan/60" />
          </Field>
          <Field label="Hip/Knee">
            <input type="number" step={0.1} value={values.hipKneeReadmissionRate} onChange={handleNumberChange("hipKneeReadmissionRate")} className="w-full rounded-2xl border border-white/10 bg-elevated-900 px-4 py-3 text-white outline-none transition focus:border-cyan/60" />
          </Field>
          <Field label="CABG">
            <input type="number" step={0.1} value={values.cabgReadmissionRate} onChange={handleNumberChange("cabgReadmissionRate")} className="w-full rounded-2xl border border-white/10 bg-elevated-900 px-4 py-3 text-white outline-none transition focus:border-cyan/60" />
          </Field>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan px-5 py-4 font-semibold text-navy transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Calculate Penalty Risk
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <label className="space-y-2">
      <span className="block text-sm font-medium text-white/70">{label}</span>
      {children}
    </label>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (value: number) => void }): JSX.Element {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-elevated-900 px-4 py-3">
      {Array.from({ length: 5 }, (_, index) => {
        const star = index + 1;
        const active = star <= value;
        return (
          <button key={star} type="button" onClick={() => onChange(star)} className="rounded-md p-1 transition hover:scale-105">
            <Star className={cn("h-5 w-5", active ? "fill-amber text-amber" : "text-white/25")} />
          </button>
        );
      })}
    </div>
  );
}
