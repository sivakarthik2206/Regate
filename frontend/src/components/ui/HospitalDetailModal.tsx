"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { cn } from "@/lib/utils";

export interface HospitalDetailData {
  provider_id: string;
  name: string;
  city: string;
  state: string;
  street?: string;
  zip?: string;
  ownership_type: string;
  star_rating: number | null;
  has_emergency_services: boolean;
  penalty_pct: number | null;
  penalty_tier: string | null;
  avg_readmission_rate?: number | null;
  ami_readmission_rate?: number | null;
  hf_readmission_rate?: number | null;
  pneumonia_readmission_rate?: number | null;
  copd_readmission_rate?: number | null;
  hip_knee_readmission_rate?: number | null;
  cabg_readmission_rate?: number | null;
}

interface HospitalDetailModalProps {
  hospital: HospitalDetailData | null;
  onClose: () => void;
  onRunAssessment: (hospital: HospitalDetailData) => void;
}

const CONDITIONS = [
  { key: "ami_readmission_rate", label: "AMI" },
  { key: "hf_readmission_rate", label: "Heart Failure" },
  { key: "pneumonia_readmission_rate", label: "Pneumonia" },
  { key: "copd_readmission_rate", label: "COPD" },
  { key: "hip_knee_readmission_rate", label: "Hip/Knee" },
  { key: "cabg_readmission_rate", label: "CABG" },
] as const;

export function HospitalDetailModal({ hospital, onClose, onRunAssessment }: HospitalDetailModalProps): JSX.Element {
  useEffect(() => {
    if (!hospital) return;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, hospital]);

  if (typeof document === "undefined") {
    return <></>;
  }

  const chartData = hospital
    ? CONDITIONS.map((condition) => {
        const value = toNumber(hospital[condition.key]);
        return {
          condition: condition.label,
          hospital: value,
          national: (hospital.avg_readmission_rate ?? value) || value,
        };
      })
    : [];

  return createPortal(
    <AnimatePresence>
      {hospital ? (
      <motion.div className="fixed inset-0 z-50 bg-black/65 p-3 backdrop-blur-sm md:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          transition={{ duration: 0.2 }}
          className="mx-auto flex h-full w-full max-w-[800px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-navy-950 shadow-[0_30px_120px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-start justify-between gap-4 border-b border-white/8 p-5 md:p-6">
            <div>
              <h2 className="font-display text-3xl font-bold text-white">{hospital.name}</h2>
              <p className="mt-2 text-sm text-white/55">
                {hospital.street ? `${hospital.street}, ` : ""}
                {hospital.city}, {hospital.state}
                {hospital.zip ? ` ${hospital.zip}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Badge>{hospital.ownership_type}</Badge>
                <Badge>{hospital.star_rating ? `${hospital.star_rating} star` : "Unrated"}</Badge>
                <Badge>{hospital.has_emergency_services ? "Emergency Services" : "No Emergency Services"}</Badge>
              </div>
            </div>
            <button onClick={onClose} aria-label="Close" className="rounded-full border border-white/10 p-2 text-white/60 transition hover:bg-white/5 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid flex-1 gap-5 overflow-y-auto p-5 md:p-6">
            <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
              <section className="rounded-[24px] border border-white/8 bg-card-900 p-5">
                <h3 className="font-display text-xl font-bold text-white">Penalty Status</h3>
                <div className="mt-4 rounded-[22px] border border-white/8 bg-elevated-900 p-5 text-center">
                  <div className={cn("font-display text-5xl font-bold", hospital.penalty_pct !== null ? "text-risk-red animate-penalty-pulse" : "text-safe-green")}>
                    {hospital.penalty_pct !== null ? `${(hospital.penalty_pct * 100).toFixed(1)}%` : "Not Penalized"}
                  </div>
                  <div className="mt-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/60">
                    {hospital.penalty_tier ?? "No Penalty"}
                  </div>
                </div>
              </section>

              <section className="rounded-[24px] border border-white/8 bg-card-900 p-5">
                <h3 className="font-display text-xl font-bold text-white">Readmission Rates</h3>
                <div className="mt-2 h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={chartData}>
                      <PolarGrid stroke="rgba(255,255,255,0.12)" />
                      <PolarAngleAxis dataKey="condition" tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 40]} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: "#1A2340", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16 }} />
                      <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }} />
                      <Radar name="Hospital" dataKey="hospital" stroke="#00D4FF" fill="#00D4FF" fillOpacity={0.18} />
                      <Radar name="National Avg" dataKey="national" stroke="#FF4D6D" fill="#FF4D6D" fillOpacity={0.12} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>

            <section className="rounded-[24px] border border-white/8 bg-card-900 p-5">
              <h3 className="font-display text-xl font-bold text-white">Risk Breakdown</h3>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {CONDITIONS.map((condition) => {
                  const value = toNumber(hospital[condition.key]);
                  const avg = hospital.avg_readmission_rate ?? value;
                  const worse = value > avg;
                  return (
                    <div key={condition.key} className="flex items-center justify-between rounded-2xl border border-white/8 bg-elevated-900 px-4 py-3 text-sm">
                      <span className="text-white/80">{condition.label}</span>
                      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold", worse ? "border-risk-red/20 bg-risk-red/10 text-risk-red" : "border-safe-green/20 bg-safe-green/10 text-safe-green")}>
                        {worse ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                        {worse ? "Worse" : "Better"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onRunAssessment(hospital)}
                className="rounded-2xl bg-cyan px-5 py-3 font-semibold text-navy transition hover:brightness-110"
              >
                Run Risk Assessment
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function Badge({ children }: { children: string }): JSX.Element {
  return <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/70">{children}</span>;
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
