"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
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

export function HospitalDetailModal({
  hospital,
  onClose,
  onRunAssessment,
}: HospitalDetailModalProps): JSX.Element {
  useEffect(() => {
    if (!hospital) return;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, hospital]);

  if (typeof document === "undefined") return <></>;

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
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 md:items-center md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
        >
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="flex w-full max-w-[800px] max-h-[92vh] flex-col overflow-hidden shadow-[0_30px_120px_rgba(0,0,0,0.6)]"
            style={{
              background: "#0E1628",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "28px 28px 0 0",
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-white/8 p-5 md:p-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-white md:text-3xl">{hospital.name}</h2>
                <p className="mt-1.5 text-sm text-white/50">
                  {hospital.street ? `${hospital.street}, ` : ""}
                  {hospital.city}, {hospital.state}
                  {hospital.zip ? ` ${hospital.zip}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Badge>{hospital.ownership_type}</Badge>
                  <Badge>
                    {hospital.star_rating ? `${hospital.star_rating} star` : "Unrated"}
                  </Badge>
                  <Badge>
                    {hospital.has_emergency_services ? "Emergency Services" : "No Emergency Services"}
                  </Badge>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-full border border-white/10 p-2 text-white/50 transition hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 md:p-6">
              <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                {/* Penalty status */}
                <section
                  className="rounded-[20px] border border-white/8 p-5"
                  style={{ background: "#141C30" }}
                >
                  <h3 className="font-display text-lg font-bold text-white">Penalty Status</h3>
                  <div className="mt-4 rounded-[18px] border border-white/8 bg-white/[0.03] p-5 text-center">
                    <div
                      className={cn(
                        "font-display text-5xl font-bold",
                        hospital.penalty_pct !== null
                          ? "text-risk-red animate-penalty-pulse-red"
                          : "text-safe-green"
                      )}
                    >
                      {hospital.penalty_pct !== null
                        ? `${hospital.penalty_pct.toFixed(2)}%`
                        : "Not Penalized"}
                    </div>
                    <div className="mt-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/55">
                      {hospital.penalty_tier ?? "No Penalty"}
                    </div>
                  </div>

                  {/* Risk breakdown rows */}
                  <div className="mt-4 grid gap-2">
                    {CONDITIONS.map((condition) => {
                      const val = toNumber(hospital[condition.key]);
                      const avg = hospital.avg_readmission_rate ?? val;
                      const worse = val > avg;
                      return (
                        <div
                          key={condition.key}
                          className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm"
                        >
                          <span className="text-white/75">{condition.label}</span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                              worse
                                ? "border-risk-red/20 bg-risk-red/10 text-risk-red"
                                : "border-safe-green/20 bg-safe-green/10 text-safe-green"
                            )}
                          >
                            {worse ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                            {worse ? "Worse" : "Better"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Radar chart */}
                <section
                  className="rounded-[20px] border border-white/8 p-5"
                  style={{ background: "#141C30" }}
                >
                  <h3 className="font-display text-lg font-bold text-white">Readmission Rates</h3>
                  <div className="mt-2 h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={chartData}>
                        <PolarGrid stroke="rgba(255,255,255,0.10)" />
                        <PolarAngleAxis
                          dataKey="condition"
                          tick={{ fill: "rgba(255,255,255,0.60)", fontSize: 11 }}
                        />
                        <PolarRadiusAxis
                          angle={30}
                          domain={[0, 40]}
                          tick={{ fill: "rgba(255,255,255,0.30)", fontSize: 10 }}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#1A2340",
                            border: "1px solid rgba(255,255,255,0.10)",
                            borderRadius: 14,
                            fontSize: 12,
                          }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.50)" }}
                        />
                        <Radar
                          name="Hospital"
                          dataKey="hospital"
                          stroke="#00D4FF"
                          fill="#00D4FF"
                          fillOpacity={0.18}
                        />
                        <Radar
                          name="National Avg"
                          dataKey="national"
                          stroke="#FF4D6D"
                          fill="#FF4D6D"
                          fillOpacity={0.12}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => onRunAssessment(hospital)}
                  className="rounded-2xl bg-cyan px-6 py-3 font-semibold text-navy-950 transition hover:brightness-110"
                >
                  Run Risk Assessment
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

function Badge({ children }: { children: string }): JSX.Element {
  return (
    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/65">
      {children}
    </span>
  );
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
