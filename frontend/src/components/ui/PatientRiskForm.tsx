"use client";

import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PatientRiskFormValues {
  age: number;
  timeInHospital: number;
  numMedications: number;
  numberDiagnoses: number;
  numLabProcedures: number;
  numProcedures: number;
  a1cResult: "Normal" | ">7" | ">8" | "Not Tested";
  insulin: "No" | "Steady" | "Up" | "Down";
  diabetesMed: boolean;
}

interface PatientRiskFormProps {
  onSubmit: (values: PatientRiskFormValues) => Promise<void>;
  demoValues: PatientRiskFormValues;
  isLoading: boolean;
}

const DEFAULT_VALUES: PatientRiskFormValues = {
  age: 58,
  timeInHospital: 4,
  numMedications: 16,
  numberDiagnoses: 7,
  numLabProcedures: 32,
  numProcedures: 1,
  a1cResult: "Not Tested",
  insulin: "Steady",
  diabetesMed: true,
};

export function patientDemoValues(): PatientRiskFormValues {
  return {
    age: 73,
    timeInHospital: 9,
    numMedications: 24,
    numberDiagnoses: 11,
    numLabProcedures: 58,
    numProcedures: 2,
    a1cResult: ">8",
    insulin: "Up",
    diabetesMed: true,
  };
}

export function PatientRiskForm({ onSubmit, demoValues, isLoading }: PatientRiskFormProps): JSX.Element {
  const [values, setValues] = useState<PatientRiskFormValues>(DEFAULT_VALUES);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void onSubmit(values);
  }

  function handleNumberChange(key: keyof PatientRiskFormValues) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const parsed = Number(event.target.value);
      setValues((current) => ({ ...current, [key]: Number.isFinite(parsed) ? parsed : current[key] as number }));
    };
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-[28px] border border-white/8 bg-card-900/95 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.28)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white">Patient Readmission Risk</h2>
          <p className="mt-2 text-sm text-white/55">Assess the likelihood of 30-day readmission from core clinical inputs.</p>
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
        <Field label="Patient Age">
          <input type="number" value={values.age} onChange={handleNumberChange("age")} className="w-full rounded-2xl border border-white/10 bg-elevated-900 px-4 py-3 text-white outline-none transition focus:border-cyan/60" />
        </Field>
        <Field label="Days in Hospital">
          <SliderField value={values.timeInHospital} min={1} max={14} onChange={(timeInHospital) => setValues((current) => ({ ...current, timeInHospital }))} />
        </Field>
        <Field label="Number of Medications">
          <SliderField value={values.numMedications} min={0} max={80} onChange={(numMedications) => setValues((current) => ({ ...current, numMedications }))} />
        </Field>
        <Field label="Number of Diagnoses">
          <SliderField value={values.numberDiagnoses} min={1} max={16} onChange={(numberDiagnoses) => setValues((current) => ({ ...current, numberDiagnoses }))} />
        </Field>
        <Field label="Lab Procedures Count">
          <input type="number" value={values.numLabProcedures} onChange={handleNumberChange("numLabProcedures")} className="w-full rounded-2xl border border-white/10 bg-elevated-900 px-4 py-3 text-white outline-none transition focus:border-cyan/60" />
        </Field>
        <Field label="Surgical Procedures Count">
          <SliderField value={values.numProcedures} min={0} max={6} onChange={(numProcedures) => setValues((current) => ({ ...current, numProcedures }))} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="HbA1c Result">
          <select value={values.a1cResult} onChange={(event) => setValues((current) => ({ ...current, a1cResult: event.target.value as PatientRiskFormValues["a1cResult"] }))} className="w-full rounded-2xl border border-white/10 bg-elevated-900 px-4 py-3 text-white outline-none transition focus:border-cyan/60">
            <option value="Normal">Normal</option>
            <option value=">7">&gt;7</option>
            <option value=">8">&gt;8</option>
            <option value="Not Tested">Not Tested</option>
          </select>
        </Field>
        <Field label="Insulin">
          <select value={values.insulin} onChange={(event) => setValues((current) => ({ ...current, insulin: event.target.value as PatientRiskFormValues["insulin"] }))} className="w-full rounded-2xl border border-white/10 bg-elevated-900 px-4 py-3 text-white outline-none transition focus:border-cyan/60">
            <option value="No">No</option>
            <option value="Steady">Steady</option>
            <option value="Up">Up</option>
            <option value="Down">Down</option>
          </select>
        </Field>
      </div>

      <Field label="On Diabetes Medication">
        <button
          type="button"
          role="switch"
          aria-checked={values.diabetesMed}
          onClick={() => setValues((current) => ({ ...current, diabetesMed: !current.diabetesMed }))}
          className={cn(
            "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
            values.diabetesMed ? "border-safe-green/30 bg-safe-green/10 text-safe-green" : "border-white/10 bg-elevated-900 text-white/60"
          )}
        >
          <span className={cn("relative h-6 w-11 rounded-full transition", values.diabetesMed ? "bg-safe-green/35" : "bg-white/10")}>
            <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition", values.diabetesMed ? "left-5" : "left-0.5")} />
          </span>
          <span className="text-sm font-medium">{values.diabetesMed ? "Yes" : "No"}</span>
        </button>
      </Field>

      <button type="submit" disabled={isLoading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan px-5 py-4 font-semibold text-navy transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Assess Readmission Risk
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

function SliderField({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (value: number) => void }): JSX.Element {
  return (
    <div className="rounded-2xl border border-white/10 bg-elevated-900 px-4 py-4">
      <input type="range" min={min} max={max} step={1} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-cyan" />
      <div className="mt-2 flex items-center justify-between text-[11px] text-white/35">
        <span>{min}</span>
        <span className="font-mono text-white/55">{value}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
