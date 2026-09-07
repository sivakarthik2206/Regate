"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Activity, Loader2, Sparkles, Stethoscope, User } from "lucide-react";
import { predictHospitalPenalty, predictPatientReadmission } from "@/lib/api";
import type {
  HospitalPenaltyInput,
  HospitalPenaltyResult,
  PatientReadmissionInput,
  PatientReadmissionResult,
} from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { RiskGauge } from "@/components/ui/RiskGauge";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { cn, formatCurrency, probToPct } from "@/lib/utils";

type Tab = "hospital" | "patient";

export default function CalculatorPage() {
  const [tab, setTab] = useState<Tab>("hospital");

  return (
    <div>
      <DemoBanner />
      <PageHeader
        eyebrow="Prediction"
        title="Risk Calculator"
        subtitle="Estimate HRRP penalty risk for a hospital, or 30-day readmission risk for a patient."
      />

      <div className="mb-6 inline-flex rounded-xl border border-navy-300 bg-navy-100/60 p-1">
        <TabButton active={tab === "hospital"} onClick={() => setTab("hospital")} icon={Stethoscope}>
          Hospital Penalty
        </TabButton>
        <TabButton active={tab === "patient"} onClick={() => setTab("patient")} icon={User}>
          Patient Readmission
        </TabButton>
      </div>

      {tab === "hospital" ? <HospitalCalculator /> : <PatientCalculator />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Activity;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        active ? "bg-cyan text-navy" : "text-slate-400 hover:text-white",
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-600">{hint}</span>}
    </label>
  );
}

// ---------------- Hospital ----------------

const OWNERSHIPS = ["Voluntary Non-profit", "Proprietary", "Government", "Other"];

function HospitalCalculator() {
  const [form, setForm] = useState<HospitalPenaltyInput>({
    avg_readmission_rate: 19.5,
    conditions_above_national: 3,
    has_emergency_services: true,
    ownership_type: "Proprietary",
    star_rating: 2,
    ami_readmission_rate: 16.5,
    hf_readmission_rate: 23,
    pneumonia_readmission_rate: 18,
    copd_readmission_rate: 21,
  });

  const mutation = useMutation<HospitalPenaltyResult, Error, HospitalPenaltyInput>({
    mutationFn: predictHospitalPenalty,
  });

  const num = (v: string) => (v === "" ? undefined : Number(v));
  const set = (patch: Partial<HospitalPenaltyInput>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <form
        className="card space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(form);
        }}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Avg Readmission Rate (%)">
            <input
              type="number"
              step="0.1"
              required
              value={form.avg_readmission_rate}
              onChange={(e) => set({ avg_readmission_rate: Number(e.target.value) })}
              className="field"
            />
          </Field>
          <Field label="Conditions Above National" hint="0-6">
            <input
              type="number"
              min={0}
              max={6}
              value={form.conditions_above_national ?? 0}
              onChange={(e) => set({ conditions_above_national: num(e.target.value) })}
              className="field"
            />
          </Field>
          <Field label="Ownership Type">
            <select
              value={form.ownership_type ?? ""}
              onChange={(e) => set({ ownership_type: e.target.value })}
              className="field"
            >
              {OWNERSHIPS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="Star Rating" hint="1-5">
            <input
              type="number"
              min={1}
              max={5}
              value={form.star_rating ?? ""}
              onChange={(e) => set({ star_rating: num(e.target.value) })}
              className="field"
            />
          </Field>
        </div>

        <p className="border-t border-navy-300 pt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Condition-specific rates (optional)
        </p>
        <div className="grid grid-cols-2 gap-4">
          {(
            [
              ["ami_readmission_rate", "AMI"],
              ["hf_readmission_rate", "Heart Failure"],
              ["pneumonia_readmission_rate", "Pneumonia"],
              ["copd_readmission_rate", "COPD"],
              ["hip_knee_readmission_rate", "Hip/Knee"],
              ["cabg_readmission_rate", "CABG"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                type="number"
                step="0.1"
                value={(form[key] as number | undefined) ?? ""}
                onChange={(e) => set({ [key]: num(e.target.value) } as Partial<HospitalPenaltyInput>)}
                className="field"
              />
            </Field>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={form.has_emergency_services ?? false}
            onChange={(e) => set({ has_emergency_services: e.target.checked })}
            className="accent-cyan"
          />
          Operates an emergency department
        </label>

        <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Predict Penalty Risk
        </button>
      </form>

      <div className="card flex flex-col p-6">
        {mutation.data ? (
          <HospitalResult result={mutation.data} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center text-slate-500">
            <Activity className="h-10 w-10 text-navy-400" />
            <p className="mt-3 text-sm">Enter hospital metrics and run the prediction.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function HospitalResult({ result }: { result: HospitalPenaltyResult }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col items-center">
        <RiskGauge value={result.penalty_probability} label="Penalty probability" />
        <RiskBadge tier={result.penalty_tier} size="lg" className="mt-2" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <Stat label="Est. payment reduction" value={`${result.estimated_penalty_pct.toFixed(2)}%`} />
        <Stat label="Est. dollar impact" value={formatCurrency(result.estimated_dollar_impact)} />
        <Stat
          label="Confidence interval"
          value={`${probToPct(result.estimated_confidence_interval.lower)}–${probToPct(result.estimated_confidence_interval.upper)}`}
        />
        <Stat label="Comparable hospitals" value={String(result.comparable_hospitals)} />
      </div>

      <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">Top Risk Factors</h3>
      <ul className="mt-2 space-y-2">
        {result.top_risk_factors.slice(0, 5).map((f) => (
          <li key={f.factor} className="flex items-center justify-between rounded-lg bg-navy-200/40 px-3 py-2 text-sm">
            <span className="text-slate-300">{f.label}</span>
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-400">{String(f.value)}</span>
              <ImpactDot impact={f.impact} />
            </span>
          </li>
        ))}
      </ul>

      <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">Recommendations</h3>
      <ul className="mt-2 space-y-2 text-sm text-slate-300">
        {result.recommendations.map((r, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-cyan">›</span>
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------- Patient ----------------

function PatientCalculator() {
  const [form, setForm] = useState<PatientReadmissionInput>({
    age: 72,
    time_in_hospital: 6,
    num_medications: 18,
    number_diagnoses: 8,
    num_lab_procedures: 45,
    num_procedures: 2,
    a1c_result: ">8",
    insulin: "Up",
    diabetes_med: "Yes",
  });

  const mutation = useMutation<PatientReadmissionResult, Error, PatientReadmissionInput>({
    mutationFn: predictPatientReadmission,
  });

  const set = (patch: Partial<PatientReadmissionInput>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <form
        className="card grid grid-cols-2 gap-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(form);
        }}
      >
        {(
          [
            ["age", "Age"],
            ["time_in_hospital", "Length of Stay (days)"],
            ["num_medications", "Medications"],
            ["number_diagnoses", "Diagnoses"],
            ["num_lab_procedures", "Lab Procedures"],
            ["num_procedures", "Procedures"],
          ] as const
        ).map(([key, label]) => (
          <Field key={key} label={label}>
            <input
              type="number"
              value={(form[key] as number | undefined) ?? ""}
              onChange={(e) => set({ [key]: Number(e.target.value) } as Partial<PatientReadmissionInput>)}
              className="field"
            />
          </Field>
        ))}
        <Field label="A1C Result">
          <select value={form.a1c_result} onChange={(e) => set({ a1c_result: e.target.value })} className="field">
            {["none", "Norm", ">7", ">8"].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </Field>
        <Field label="Insulin">
          <select value={form.insulin} onChange={(e) => set({ insulin: e.target.value })} className="field">
            {["No", "Steady", "Up", "Down"].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </Field>
        <label className="col-span-2 flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={form.diabetes_med === "Yes" || form.diabetes_med === true}
            onChange={(e) => set({ diabetes_med: e.target.checked ? "Yes" : "No" })}
            className="accent-cyan"
          />
          Currently on diabetes medication
        </label>
        <button type="submit" disabled={mutation.isPending} className="btn-primary col-span-2 w-full">
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Predict Readmission Risk
        </button>
      </form>

      <div className="card flex flex-col p-6">
        {mutation.data ? (
          <PatientResult result={mutation.data} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center text-slate-500">
            <User className="h-10 w-10 text-navy-400" />
            <p className="mt-3 text-sm">Enter patient details and run the prediction.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PatientResult({ result }: { result: PatientReadmissionResult }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col items-center">
        <RiskGauge value={result.readmission_probability} label="30-day readmission" />
        <span className="mt-2 rounded-full border border-cyan/30 bg-cyan/10 px-4 py-1 text-sm font-semibold text-cyan">
          {result.risk_level} Risk
        </span>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <Stat label="Risk percentile" value={`${result.risk_percentile}th`} />
        <Stat label="Est. cost if readmitted" value={formatCurrency(result.estimated_cost_if_readmitted)} />
      </div>

      <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">Top Risk Factors</h3>
      <ul className="mt-2 space-y-2">
        {result.top_risk_factors.map((f) => (
          <li key={f.factor} className="flex items-center justify-between rounded-lg bg-navy-200/40 px-3 py-2 text-sm">
            <span className="text-slate-300">{f.label}</span>
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-400">{f.value}</span>
              <ImpactDot impact={f.impact} />
            </span>
          </li>
        ))}
      </ul>

      <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">Recommended Interventions</h3>
      <ul className="mt-2 space-y-2 text-sm text-slate-300">
        {result.recommended_interventions.map((r, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-cyan">›</span>
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-navy-300 bg-navy-200/40 p-4">
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 font-display text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function ImpactDot({ impact }: { impact: "High" | "Medium" | "Low" }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
        impact === "High" && "bg-risk/15 text-risk-light",
        impact === "Medium" && "bg-amber/15 text-amber-light",
        impact === "Low" && "bg-safe/15 text-safe-light",
      )}
    >
      {impact}
    </span>
  );
}
