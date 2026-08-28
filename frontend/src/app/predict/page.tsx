"use client";

import { useState } from "react";
import { AlertCircle, Sparkles } from "lucide-react";
import { HospitalRiskForm, hospitalDemoValues, type HospitalRiskFormValues } from "@/components/ui/HospitalRiskForm";
import { HospitalRiskResult } from "@/components/ui/HospitalRiskResult";
import { PatientRiskForm, patientDemoValues, type PatientRiskFormValues } from "@/components/ui/PatientRiskForm";
import { PatientRiskResult } from "@/components/ui/PatientRiskResult";
import { predictHospitalPenalty, predictPatientReadmission } from "@/lib/api";
import type { HospitalRiskOutput, PatientRiskOutput } from "@/lib/types";

type PendingRequest = "hospital" | "patient" | null;

export default function PredictPage(): JSX.Element {
  const [hospitalResult, setHospitalResult] = useState<HospitalRiskOutput | null>(null);
  const [patientResult, setPatientResult] = useState<PatientRiskOutput | null>(null);
  const [pendingRequest, setPendingRequest] = useState<PendingRequest>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleHospitalSubmit(values: HospitalRiskFormValues): Promise<void> {
    setPendingRequest("hospital");
    setError(null);
    try {
      const result = await predictHospitalPenalty({
        avg_readmission_rate: values.avgReadmissionRate,
        conditions_above_national: values.conditionsAboveNational,
        has_emergency_services: values.hasEmergencyServices,
        ownership_type: values.ownershipType,
        star_rating: values.starRating,
        ami_readmission_rate: values.amiReadmissionRate,
        hf_readmission_rate: values.hfReadmissionRate,
        pneumonia_readmission_rate: values.pneumoniaReadmissionRate,
        copd_readmission_rate: values.copdReadmissionRate,
        hip_knee_readmission_rate: values.hipKneeReadmissionRate,
        cabg_readmission_rate: values.cabgReadmissionRate,
      });
      setHospitalResult(result);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to calculate hospital penalty risk.");
    } finally {
      setPendingRequest(null);
    }
  }

  async function handlePatientSubmit(values: PatientRiskFormValues): Promise<void> {
    setPendingRequest("patient");
    setError(null);
    try {
      const result = await predictPatientReadmission({
        age: values.age,
        time_in_hospital: values.timeInHospital,
        num_medications: values.numMedications,
        number_diagnoses: values.numberDiagnoses,
        num_lab_procedures: values.numLabProcedures,
        num_procedures: values.numProcedures,
        a1c_result: values.a1cResult,
        insulin: values.insulin,
        diabetes_med: values.diabetesMed,
      });
      setPatientResult(result);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to calculate patient readmission risk.");
    } finally {
      setPendingRequest(null);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 lg:px-10">
      <section className="mx-auto max-w-[1600px] space-y-8">
        <div className="rounded-[32px] border border-white/8 bg-card-900/90 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.3)] md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-xs font-semibold text-cyan">
                <Sparkles className="h-3.5 w-3.5" />
                Regate Risk Calculator
              </div>
              <h1 className="font-display text-4xl font-bold tracking-tight text-white md:text-6xl">
                Predict hospital penalty and patient readmission risk
              </h1>
              <p className="max-w-2xl text-base text-white/60 md:text-lg">
                Run both calculators side by side to compare operational penalty exposure with patient-level readmission risk.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-elevated-900 px-4 py-3 text-sm text-white/60">
              Fill in the details to see your risk assessment.
            </div>
          </div>

          {error ? (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-risk-red/20 bg-risk-red/10 px-4 py-3 text-sm text-risk-red">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <CalculatorColumn
            form={<HospitalRiskForm onSubmit={handleHospitalSubmit} demoValues={hospitalDemoValues()} isLoading={pendingRequest === "hospital"} />}
            result={hospitalResult ? <HospitalRiskResult result={hospitalResult} /> : <PlaceholderPanel />}
          />
          <CalculatorColumn
            form={<PatientRiskForm onSubmit={handlePatientSubmit} demoValues={patientDemoValues()} isLoading={pendingRequest === "patient"} />}
            result={patientResult ? <PatientRiskResult result={patientResult} /> : <PlaceholderPanel />}
          />
        </div>
      </section>
    </main>
  );
}

function CalculatorColumn({ form, result }: { form: JSX.Element; result: JSX.Element }): JSX.Element {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.85fr)] lg:items-start">
      <div>{form}</div>
      <div className="lg:pt-2">{result}</div>
    </div>
  );
}

function PlaceholderPanel(): JSX.Element {
  return (
    <div className="flex min-h-[340px] items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-elevated-900/60 p-8 text-center text-white/45">
      <div className="max-w-sm">
        <div className="font-display text-2xl font-bold text-white/70">Fill in the details to see your risk assessment</div>
        <p className="mt-3 text-sm leading-6">
          Submit the form or try demo values to view the projected penalty or readmission profile.
        </p>
      </div>
    </div>
  );
}
