"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  Star,
  Stethoscope,
  User,
} from "lucide-react";
import Link from "next/link";
import { predictHospitalPenalty, predictPatientReadmission } from "@/lib/api";
import type {
  HospitalPenaltyInput,
  HospitalPenaltyResult,
  Impact,
  PatientReadmissionInput,
  PatientReadmissionResult,
} from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { RiskGauge } from "@/components/ui/RiskGauge";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { cn, formatCurrency } from "@/lib/utils";

type Tab = "hospital" | "patient";

export default function PredictPage() {
  const [tab, setTab] = useState<Tab>("hospital");

  return (
    <div>
      <DemoBanner />
      <PageHeader
        eyebrow="Prediction"
        title="Risk Calculator"
        subtitle="Estimate HRRP penalty risk for a hospital, or 30-day readmission risk for a patient."
      />

      <div className="mb-6 flex border-b border-navy-300">
        <TabBtn active={tab === "hospital"} onClick={() => setTab("hospital")} icon={Stethoscope}>
          Hospital Penalty Risk
        </TabBtn>
        <TabBtn active={tab === "patient"} onClick={() => setTab("patient")} icon={User}>
          Patient Readmission Risk
        </TabBtn>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "hospital" ? <HospitalCalculator /> : <PatientCalculator />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function TabBtn({
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
        "relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors",
        active ? "text-white" : "text-slate-400 hover:text-slate-200",
      )}
    >
      <Icon className={cn("h-4 w-4", active && "text-cyan")} />
      {children}
      {active && (
        <motion.span
          layoutId="tab-underline"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan"
        />
      )}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

// ─── Hospital Calculator ─────────────────────────────────────────────────────

const OWNERSHIPS = ["Voluntary Non-profit", "Proprietary", "Government", "Other"];

const DEMO_VALS: HospitalPenaltyInput = {
  avg_readmission_rate: 21.5,
  conditions_above_national: 4,
  star_rating: 2,
  ownership_type: "Proprietary",
  has_emergency_services: true,
  hf_readmission_rate: 24.1,
  pneumonia_readmission_rate: 19.2,
};

function HospitalCalculator() {
  const [form, setForm] = useState<HospitalPenaltyInput>({
    avg_readmission_rate: 19.5,
    conditions_above_national: 2,
    has_emergency_services: true,
    ownership_type: "Voluntary Non-profit",
    star_rating: 3,
  });
  const [showRates, setShowRates] = useState(false);

  const mutation = useMutation<HospitalPenaltyResult, Error, HospitalPenaltyInput>({
    mutationFn: predictHospitalPenalty,
  });

  const set = (patch: Partial<HospitalPenaltyInput>) => setForm((f) => ({ ...f, ...patch }));
  const num = (v: string) => (v === "" ? undefined : Number(v));

  const simulateHref = (() => {
    const p = new URLSearchParams();
    p.set("rate", String(form.avg_readmission_rate));
    p.set("conditions", String(form.conditions_above_national ?? 0));
    if (form.hf_readmission_rate) p.set("hf", String(form.hf_readmission_rate));
    if (form.pneumonia_readmission_rate) p.set("pn", String(form.pneumonia_readmission_rate));
    if (form.ami_readmission_rate) p.set("ami", String(form.ami_readmission_rate));
    if (form.copd_readmission_rate) p.set("copd", String(form.copd_readmission_rate));
    if (form.hip_knee_readmission_rate) p.set("hk", String(form.hip_knee_readmission_rate));
    if (form.cabg_readmission_rate) p.set("cabg", String(form.cabg_readmission_rate));
    return `/simulate?${p.toString()}`;
  })();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* ── Left: Form ── */}
      <form
        className="card space-y-5 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(form);
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-lg font-bold text-white">
            Hospital Penalty Risk Calculator
          </h2>
          <button
            type="button"
            onClick={() => setForm(DEMO_VALS)}
            className="shrink-0 text-xs text-cyan hover:underline"
          >
            Try Demo Values
          </button>
        </div>

        <Field label="Average Readmission Rate (%)">
          <input
            type="number"
            step="0.1"
            required
            value={form.avg_readmission_rate}
            onChange={(e) => set({ avg_readmission_rate: Number(e.target.value) })}
            className="field"
          />
        </Field>

        {/* Segmented control for conditions */}
        <div>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Conditions Worse Than National
          </span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => set({ conditions_above_national: i })}
                className={cn(
                  "flex-1 rounded-lg py-2 text-sm font-semibold transition-colors",
                  form.conditions_above_national === i
                    ? "bg-cyan text-navy"
                    : "border border-navy-300 text-slate-400 hover:border-cyan/40 hover:text-slate-200",
                )}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        {/* Star rating */}
        <div>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Star Rating
          </span>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set({ star_rating: s })}
                className="transition-transform hover:scale-110"
                aria-label={`${s} star${s > 1 ? "s" : ""}`}
              >
                <Star
                  className={cn(
                    "h-7 w-7",
                    s <= (form.star_rating ?? 0)
                      ? "fill-amber text-amber"
                      : "fill-none text-navy-400",
                  )}
                />
              </button>
            ))}
          </div>
        </div>

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

        {/* Emergency services toggle */}
        <div
          role="button"
          tabIndex={0}
          aria-pressed={form.has_emergency_services}
          onClick={() => set({ has_emergency_services: !form.has_emergency_services })}
          onKeyDown={(e) =>
            e.key === "Enter" && set({ has_emergency_services: !form.has_emergency_services })
          }
          className="flex cursor-pointer items-center justify-between rounded-xl border border-navy-300 px-4 py-3"
        >
          <span className="text-sm text-slate-300">Emergency Services</span>
          <div
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors duration-200",
              form.has_emergency_services ? "bg-cyan" : "bg-navy-300",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200",
                form.has_emergency_services ? "left-[22px]" : "left-0.5",
              )}
            />
          </div>
        </div>

        {/* Expandable per-condition rates */}
        <div className="rounded-xl border border-navy-300">
          <button
            type="button"
            onClick={() => setShowRates(!showRates)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-300 hover:text-white"
          >
            Per-Condition Rates
            {showRates ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>
          <AnimatePresence>
            {showRates && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-3 border-t border-navy-300 p-4">
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
                        placeholder="—"
                        value={(form[key] as number | undefined) ?? ""}
                        onChange={(e) =>
                          set({ [key]: num(e.target.value) } as Partial<HospitalPenaltyInput>)
                        }
                        className="field"
                      />
                    </Field>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Calculate Penalty Risk
        </button>
      </form>

      {/* ── Right: Results ── */}
      <div className="card flex min-h-[480px] flex-col p-6">
        <AnimatePresence mode="wait">
          {mutation.data ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35 }}
              className="flex flex-1 flex-col"
            >
              <HospitalResult result={mutation.data} simulateHref={simulateHref} />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-1 flex-col items-center justify-center py-16 text-center text-slate-500"
            >
              <Activity className="h-12 w-12 text-navy-400" />
              <p className="mt-3 text-sm">Enter hospital metrics to see risk assessment</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function HospitalResult({
  result,
  simulateHref,
}: {
  result: HospitalPenaltyResult;
  simulateHref: string;
}) {
  const topFactors = result.top_risk_factors.slice(0, 5);
  const maxGap = Math.max(1, ...topFactors.map((f) => Math.abs(f.gap ?? 0)));

  return (
    <div className="flex flex-1 flex-col gap-5">
      {/* Gauge */}
      <div className="flex flex-col items-center">
        <RiskGauge value={result.penalty_probability} size="lg" label="Penalty Probability" />
        <RiskBadge tier={result.penalty_tier} size="lg" className="mt-3" />
      </div>

      {/* Financial impact */}
      <div className="rounded-xl border border-navy-300 bg-navy-200/40 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Financial Impact
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Estimated Penalty</p>
            <p className="mt-0.5 font-display text-2xl font-bold text-white">
              {result.estimated_penalty_pct.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Potential Impact</p>
            <p className="mt-0.5 font-display text-2xl font-bold text-risk-light">
              {formatCurrency(result.estimated_dollar_impact)}
            </p>
          </div>
        </div>
      </div>

      {/* Risk factors with impact bars scaled to actual gap magnitude */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Risk Factors
        </h3>
        <ul className="space-y-2">
          {topFactors.map((f) => (
            <li key={f.factor} className="rounded-lg bg-navy-200/40 px-3 py-2.5">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-slate-300">{f.label}</span>
                <ImpactBadge impact={f.impact} />
              </div>
              <div className="h-1 w-full rounded-full bg-navy-300">
                <div
                  className={cn(
                    "h-1 rounded-full",
                    f.impact === "High"
                      ? "bg-risk"
                      : f.impact === "Medium"
                        ? "bg-amber"
                        : "bg-safe",
                  )}
                  style={{ width: `${Math.max(6, (Math.abs(f.gap ?? 0) / maxGap) * 90)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Recommendations */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Recommendations
        </h3>
        <ul className="space-y-2">
          {result.recommendations.map((r, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-300">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
              {r}
            </li>
          ))}
        </ul>
      </div>

      {/* Simulate link */}
      <Link
        href={simulateHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan hover:underline"
      >
        Simulate improvements <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

// ─── Patient Calculator ───────────────────────────────────────────────────────

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
        className="card space-y-5 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(form);
        }}
      >
        <h2 className="font-display text-lg font-bold text-white">
          Patient Readmission Risk Calculator
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {(
            [
              ["age", "Age (years)"],
              ["time_in_hospital", "Days in Hospital"],
              ["num_medications", "Medications"],
              ["number_diagnoses", "Diagnoses"],
              ["num_lab_procedures", "Lab Procedures"],
              ["num_procedures", "Surgical Procedures"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                type="number"
                min={0}
                value={(form[key] as number | undefined) ?? ""}
                onChange={(e) =>
                  set({ [key]: Number(e.target.value) } as Partial<PatientReadmissionInput>)
                }
                className="field"
              />
            </Field>
          ))}

          <Field label="HbA1c Result">
            <select
              value={form.a1c_result}
              onChange={(e) => set({ a1c_result: e.target.value })}
              className="field"
            >
              {["none", "Norm", ">7", ">8"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>

          <Field label="Insulin">
            <select
              value={form.insulin}
              onChange={(e) => set({ insulin: e.target.value })}
              className="field"
            >
              {["No", "Steady", "Up", "Down"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
        </div>

        <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={form.diabetes_med === "Yes" || form.diabetes_med === true}
            onChange={(e) => set({ diabetes_med: e.target.checked ? "Yes" : "No" })}
            className="h-4 w-4 accent-cyan"
          />
          Currently on diabetes medication
        </label>

        <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Predict Readmission Risk
        </button>
      </form>

      <div className="card flex min-h-[480px] flex-col p-6">
        <AnimatePresence mode="wait">
          {mutation.data ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35 }}
              className="flex flex-1 flex-col"
            >
              <PatientResult result={mutation.data} />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-1 flex-col items-center justify-center py-16 text-center text-slate-500"
            >
              <User className="h-12 w-12 text-navy-400" />
              <p className="mt-3 text-sm">Enter patient details to see risk assessment</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PatientResult({ result }: { result: PatientReadmissionResult }) {
  const levelColor =
    result.risk_level === "Critical"
      ? "bg-risk/15 text-risk-light border-risk/30"
      : result.risk_level === "High"
        ? "bg-risk/10 text-risk-light border-risk/25"
        : result.risk_level === "Moderate"
          ? "bg-amber/15 text-amber-light border-amber/30"
          : "bg-safe/15 text-safe-light border-safe/30";

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col items-center">
        <RiskGauge value={result.readmission_probability} size="lg" label="30-day readmission" />
        <span
          className={cn(
            "mt-3 rounded-full border px-4 py-1 text-sm font-semibold uppercase tracking-wide",
            levelColor,
          )}
        >
          {result.risk_level} Risk
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-navy-300 bg-navy-200/40 p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Risk Percentile</p>
          <p className="mt-0.5 font-display text-2xl font-bold text-white">
            {result.risk_percentile}th
          </p>
        </div>
        <div className="rounded-xl border border-navy-300 bg-navy-200/40 p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Est. Cost if Readmitted</p>
          <p className="mt-0.5 font-display text-2xl font-bold text-risk-light">
            {formatCurrency(result.estimated_cost_if_readmitted)}
          </p>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Risk Factors
        </h3>
        <ul className="space-y-2">
          {result.top_risk_factors.map((f) => (
            <li key={f.factor} className="rounded-lg bg-navy-200/40 px-3 py-2.5">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-slate-300">{f.label}</span>
                <ImpactBadge impact={f.impact} />
              </div>
              <div className="h-1 w-full rounded-full bg-navy-300">
                <div
                  className={cn(
                    "h-1 rounded-full",
                    f.impact === "High"
                      ? "bg-risk"
                      : f.impact === "Medium"
                        ? "bg-amber"
                        : "bg-safe",
                  )}
                  style={{ width: f.impact === "High" ? "80%" : f.impact === "Medium" ? "52%" : "25%" }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Recommended Interventions
        </h3>
        <ul className="space-y-2">
          {result.recommended_interventions.map((r, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-300">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
              {r}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function ImpactBadge({ impact }: { impact: Impact }) {
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
