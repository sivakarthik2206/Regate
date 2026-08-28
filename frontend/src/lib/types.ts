export interface HospitalRiskInput {
  avg_readmission_rate: number;
  conditions_above_national: number;
  has_emergency_services: boolean;
  ownership_type: string;
  star_rating?: number | null;
  ami_readmission_rate?: number | null;
  hf_readmission_rate?: number | null;
  pneumonia_readmission_rate?: number | null;
  copd_readmission_rate?: number | null;
  hip_knee_readmission_rate?: number | null;
  cabg_readmission_rate?: number | null;
}

export interface HospitalRiskFactor {
  factor: string;
  impact: "high" | "medium" | "low";
  value: string | number | boolean | null;
}

export interface HospitalRiskOutput {
  penalty_probability: number;
  penalty_tier: "No Risk" | "Low Risk" | "Medium Risk" | "High Risk";
  estimated_penalty_pct: number;
  estimated_dollar_impact: number;
  top_risk_factors: HospitalRiskFactor[];
  recommendations: string[];
}

export interface PatientRiskInput {
  age: number;
  time_in_hospital: number;
  num_medications: number;
  number_diagnoses: number;
  num_lab_procedures: number;
  num_procedures: number;
  a1c_result: string;
  insulin: string;
  diabetes_med: boolean;
}

export interface PatientRiskFactor {
  factor: string;
  impact: "high" | "medium" | "low";
  value: string | number | boolean | null;
}

export interface PatientRiskOutput {
  readmission_probability: number;
  risk_level: "Low" | "Moderate" | "High" | "Critical";
  top_risk_factors: PatientRiskFactor[];
  recommended_interventions: string[];
  estimated_cost_if_readmitted: number;
}

export interface HealthStatus {
  status: "ok";
  models_loaded: boolean;
}

export interface HospitalSummaryConditionImpact {
  condition: string;
  avg_readmission_rate: number;
  hospitals_penalized: number;
}

export interface HospitalPenaltyByOwnership {
  ownership: string;
  penalty_rate: number;
  count: number;
}

export interface HospitalSummaryResponse {
  total_hospitals_analyzed: number;
  total_penalized: number;
  penalty_rate_pct: number;
  avg_penalty_pct: number;
  estimated_total_penalties_usd: number;
  conditions_by_impact: HospitalSummaryConditionImpact[];
  penalty_by_ownership: HospitalPenaltyByOwnership[];
  penalty_trend_note: string;
}

export interface ApiPenaltiesByStateItem {
  state: string;
  penalized_count: number;
  total_count: number;
  avg_penalty_pct: number | null;
  penalty_rate: number;
}

export interface PredictionFeatureImportanceItem {
  feature: string;
  importance: number;
  description: string;
}

export interface ApiReadmissionRateItem {
  condition: string;
  national_avg: number;
  penalized_avg: number;
  safe_avg: number;
}

export interface HospitalListItem {
  provider_id: string;
  name: string;
  state: string;
  city: string;
  ownership_type: string;
  star_rating: number | null;
  penalized: number;
  penalty_pct: number | null;
  penalty_tier: number | null;
}

export interface ApiHospitalListResponse {
  page: number;
  page_size: number;
  total: number;
  items: HospitalListItem[];
}

export interface HospitalSearchItem {
  provider_id: string;
  name: string;
  city: string;
  state: string;
}

export interface HospitalDetailResponse {
  provider_id: string;
  [key: string]: string | number | boolean | null | undefined;
}
